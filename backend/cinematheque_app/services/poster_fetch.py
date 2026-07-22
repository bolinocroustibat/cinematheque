"""
Resolve poster/cover image URLs via TMDB (movies/TV), OMDb (movies), or Google Books.
"""

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse, urlunparse

import niquests
from django.conf import settings
from django.db.models import Model, Q

logger = logging.getLogger(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMG_W154 = "https://image.tmdb.org/t/p/w154"
OMDB_BASE_URL = "https://www.omdbapi.com"
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"

MediaType = Literal["movie", "tv"]

REQUEST_TIMEOUT = 10.0
DEFAULT_FILL_DELAY = 0.2


def _year_param(year: int | str | None) -> str | None:
    if year is None or year == "":
        return None
    s = str(year).strip()
    if not s:
        return None
    # "2020-01-01" or "2020" -> use first 4 digits when possible
    for sep in ("-", "/", " "):
        if sep in s:
            s = s.split(sep, 1)[0]
            break
    return s[:4] if s[:4].isdigit() else None


def _tmdb_poster_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    return f"{TMDB_IMG_W154}{poster_path}"


def _ensure_https(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme == "http":
        return urlunparse(parsed._replace(scheme="https"))
    return url


def resolve_poster_url(
    title: str,
    year: int | str | None,
    media_type: MediaType = "movie",
) -> str | None:
    """
    TMDB search first; OMDb title lookup only for media_type \"movie\".
    """
    api_key = (settings.TMDB_API_KEY or "").strip()
    if not api_key:
        return None

    year_str = _year_param(year)
    endpoint = "search/movie" if media_type == "movie" else "search/tv"
    params: dict[str, str] = {
        "api_key": api_key,
        "query": title,
        "language": "en-US",
    }
    if year_str:
        if media_type == "movie":
            params["year"] = year_str
        else:
            params["first_air_date_year"] = year_str

    try:
        with niquests.Session(timeout=REQUEST_TIMEOUT) as session:
            r = session.get(f"{TMDB_BASE_URL}/{endpoint}", params=params)
            r.raise_for_status()
            data = r.json()
            results = data.get("results") or []
            first = results[0] if results else None
            if first and first.get("poster_path"):
                return _tmdb_poster_url(first["poster_path"])
    except (niquests.RequestException, KeyError, TypeError, ValueError) as e:
        logger.debug("TMDB poster search failed for %r: %s", title, e)

    if media_type != "movie":
        return None

    omdb_key = (settings.OMDB_API_KEY or "").strip()
    if not omdb_key or not year_str:
        return None

    try:
        with niquests.Session(timeout=REQUEST_TIMEOUT) as session:
            r = session.get(
                OMDB_BASE_URL,
                params={
                    "apikey": omdb_key,
                    "t": title,
                    "y": year_str,
                    "type": "movie",
                },
            )
            r.raise_for_status()
            data = r.json()
            poster = data.get("Poster")
            if poster and poster != "N/A":
                return str(poster)
    except (niquests.RequestException, TypeError, ValueError) as e:
        logger.debug("OMDb poster lookup failed for %r: %s", title, e)

    return None


def _google_books_cover_from_items(items: list) -> str | None:
    for item in items:
        info = item.get("volumeInfo") or {}
        links = info.get("imageLinks") or {}
        for key in ("thumbnail", "smallThumbnail"):
            url = links.get(key)
            if url:
                return _ensure_https(str(url))
    return None


def _prefer_year_match(items: list, year_str: str | None) -> list:
    if not year_str or not items:
        return items
    matched = [
        item
        for item in items
        if str((item.get("volumeInfo") or {}).get("publishedDate") or "").startswith(
            year_str
        )
    ]
    return matched or items


def resolve_book_cover_url(
    title: str,
    author: str | None = None,
    year: int | str | None = None,
    isbn: str | None = None,
) -> str | None:
    """
    Resolve a cover URL via Google Books (ISBN first, then title + author).
    """
    queries: list[str] = []
    isbn_clean = (isbn or "").strip().replace("-", "")
    if isbn_clean:
        queries.append(f"isbn:{isbn_clean}")

    title_clean = (title or "").strip()
    author_clean = (author or "").strip()
    if title_clean:
        parts = [f"intitle:{title_clean}"]
        if author_clean:
            parts.append(f"inauthor:{author_clean}")
        queries.append(" ".join(parts))

    if not queries:
        return None

    year_str = _year_param(year)
    try:
        with niquests.Session(timeout=REQUEST_TIMEOUT) as session:
            for q in queries:
                r = session.get(
                    GOOGLE_BOOKS_URL,
                    params={"q": q, "maxResults": 5},
                )
                r.raise_for_status()
                data = r.json()
                items = _prefer_year_match(data.get("items") or [], year_str)
                cover = _google_books_cover_from_items(items)
                if cover:
                    return cover
    except (niquests.RequestException, KeyError, TypeError, ValueError) as e:
        logger.debug("Google Books cover search failed for %r: %s", title, e)

    return None


@dataclass(frozen=True)
class FillMissingPostersResult:
    processed: int
    updated: int
    ids: list[int]
    more_pending: bool


def missing_poster_queryset(model: type[Model]):
    return model.objects.filter(Q(poster__isnull=True) | Q(poster="")).order_by("id")


def fill_missing_posters_for(
    model: type[Model],
    *,
    resolve: Callable[[Model], str | None],
    limit: int | None = None,
    delay: float = DEFAULT_FILL_DELAY,
    dry_run: bool = False,
) -> FillMissingPostersResult:
    """
    Resolve and optionally save posters for rows missing a poster URL.
    """
    qs = missing_poster_queryset(model)
    if limit is not None:
        batch = max(1, limit)
        chunk = list(qs[:batch])
        more_pending = len(chunk) == batch
    else:
        chunk = list(qs)
        more_pending = False

    updated_ids: list[int] = []
    for i, obj in enumerate(chunk):
        poster_url = resolve(obj)
        if poster_url:
            if not dry_run:
                obj.poster = poster_url
                obj.save(update_fields=["poster"])
            updated_ids.append(obj.pk)
        if delay > 0 and i < len(chunk) - 1:
            time.sleep(delay)

    return FillMissingPostersResult(
        processed=len(chunk),
        updated=len(updated_ids),
        ids=updated_ids,
        more_pending=more_pending,
    )


def require_tmdb_api_key() -> None:
    if not (settings.TMDB_API_KEY or "").strip():
        raise RuntimeError("TMDB_API_KEY is not configured.")
