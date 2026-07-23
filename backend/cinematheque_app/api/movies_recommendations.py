from typing import Any

import orjson
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from cinematheque_app.services.movie_recommendations_llm import (
    MovieRecommendationsLLMError,
    generate_recommendations_json,
)

router = Router()

MAX_WATCHED_FILMS = 20

SYSTEM_INSTRUCTION = """You are an expert at movies and can recommend what someone should watch next using one or more films they give you as reference. Those films are anchors for taste, mood, or interests—they simply represent what they are in the mood for or want more of.

Your response must be a single JSON object with exactly one key "recommendations", whose value is an array of objects. Each object must have:
* title: The title of the movie.
* year: The year it was released (integer).
* reason: A one sentence explanation for why the film was recommended.

Do not include any text outside the JSON object."""


class WatchedFilmSchema(Schema):
    """A reference title+year used as a taste/mood anchor (not a viewing history).

    ``title`` is a free-form human-readable name. Only leading/trailing whitespace
    is stripped; there is no other normalization, and the value is not matched
    against the local movie DB or IMDB (no IDs). Prefer the commonly known or
    original title as listed on IMDB (or similar), plus the correct release
    ``year``, so the LLM can disambiguate remakes and homonyms.
    """

    title: str
    year: int


class MovieRecommendationsRequestSchema(Schema):
    watched: list[WatchedFilmSchema] = Field(
        min_length=1,
        max_length=MAX_WATCHED_FILMS,
    )


class RecommendedMovieSchema(Schema):
    title: str
    year: int | None = None
    reason: str


class MovieRecommendationResponse(Schema):
    watched: list[WatchedFilmSchema]
    recommendations: list[RecommendedMovieSchema]


def _normalize_watched_titles(films: list[WatchedFilmSchema]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for f in films:
        t = f.title.strip()
        if not t:
            raise HttpError(400, "Each reference film must have a non-empty title.")
        out.append({"title": t, "year": f.year})
    return out


def build_user_prompt(watched: list[dict[str, Any]]) -> str:
    if len(watched) == 1:
        f = watched[0]
        return (
            f'Use "{f["title"]}" ({f["year"]}) as the reference film. '
            "Recommend other films they might like in a similar vein, following the JSON format in your instructions."
        )

    lines = "\n".join(f'- "{f["title"]}" ({f["year"]})' for f in watched)
    return (
        "These films are the reference set (taste, mood, or themes—not necessarily a viewing history):\n"
        f"{lines}\n\n"
        "Recommend other films they might enjoy, drawing on what these titles have in common "
        "or the overall sensibility they suggest, following the JSON format in your instructions."
    )


def _parse_year(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_recommendations(raw: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        t = item.get("title")
        if not isinstance(t, str) or not t.strip():
            continue
        reason = item.get("reason")
        reason_str = reason.strip() if isinstance(reason, str) else ""
        out.append(
            {
                "title": t.strip(),
                "year": _parse_year(item.get("year")),
                "reason": reason_str,
            }
        )
    return out


def _parse_recommendations_payload(text: str) -> list[dict[str, Any]]:
    """Parse provider JSON text into normalized recommendation dicts."""
    try:
        data = orjson.loads(text)
    except orjson.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from model: {e}") from e

    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("recommendations")
        if items is None:
            raise ValueError("Model response missing 'recommendations' array.")
    else:
        raise ValueError("Unexpected model response shape.")

    if not isinstance(items, list):
        raise ValueError("Recommendations must be a JSON array.")

    return _normalize_recommendations(items)


def fetch_recommendations(user_prompt: str) -> list[dict[str, Any]]:
    try:
        text = generate_recommendations_json(
            user_prompt, system_instruction=SYSTEM_INSTRUCTION
        )
    except MovieRecommendationsLLMError as e:
        raise HttpError(e.http_status, str(e)) from e

    try:
        return _parse_recommendations_payload(text)
    except ValueError as e:
        raise HttpError(502, str(e)) from e


def _recommendations_for_watched(watched: list[dict[str, Any]]) -> dict[str, Any]:
    user_prompt = build_user_prompt(watched)
    recommendations = fetch_recommendations(user_prompt)
    return {
        "watched": watched,
        "recommendations": recommendations,
    }


@router.get("", response=MovieRecommendationResponse)
def get_movies_recommendations(request, title: str, year: int):
    """Recommendations from one reference film (query: ``title``, ``year``).

    Same title rules as ``WatchedFilmSchema``: free-form name (whitespace-stripped
    only), not resolved against the DB or IMDB. Prefer a well-known / original
    title plus release year for disambiguation.
    """
    watched = _normalize_watched_titles([WatchedFilmSchema(title=title, year=year)])
    return _recommendations_for_watched(watched)


@router.post("", response=MovieRecommendationResponse)
def post_movies_recommendations(request, payload: MovieRecommendationsRequestSchema):
    """Recommendations from one or more reference films (body: ``watched``, max 20).

    Each item is ``{ "title": str, "year": int }``. Titles are free-form
    (whitespace-stripped only): not normalized further, not required to match
    the local DB, and not IMDB IDs. Prefer commonly known or original titles
    as on IMDB (or similar), with the correct release year, so the model can
    identify the film. Returned recommendations follow the same loose title
    convention (LLM-generated strings, not DB rows).
    """
    watched = _normalize_watched_titles(payload.watched)
    return _recommendations_for_watched(watched)
