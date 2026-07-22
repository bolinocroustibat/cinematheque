"""
Resolve poster image URLs via TMDB search, with OMDb fallback for movies.
"""

import logging
from typing import Literal

import niquests
from django.conf import settings

logger = logging.getLogger(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMG_W154 = "https://image.tmdb.org/t/p/w154"
OMDB_BASE_URL = "https://www.omdbapi.com"

MediaType = Literal["movie", "tv"]

REQUEST_TIMEOUT = 10.0


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
        params["year"] = year_str

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
