from datetime import datetime
from typing import Literal

from django.db import IntegrityError
from django.utils.text import slugify
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from cinematheque_app.api.auth import api_write_key, parse_optional_datetime
from cinematheque_app.api.movies_palettes import PaletteSchema, serialize_palette
from cinematheque_app.models import Movie

router = Router()


class MovieSchema(Schema):
    id: int
    title: str
    director: str | None
    year: str | None
    slug: str
    type: str
    palettes: list[PaletteSchema]
    poster: str | None = None
    rating: int | None = None
    recommendation_source: str | None = None
    acquired_at: str | None = None
    consumed_at: str | None = None
    country: str | None = None


class MoviesResponse(Schema):
    movies: list[MovieSchema]


class MovieCreate(Schema):
    title: str
    type: Literal["movie", "documentary"] = "movie"
    director: str | None = None
    year: str | None = None
    poster: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    recommendation_source: str | None = None
    acquired_at: str | datetime | None = None
    consumed_at: str | datetime | None = None
    country: str | None = None
    length: int | None = Field(default=None, ge=0)
    frames: int | None = Field(default=None, ge=0)
    path: str | None = None
    scan_status: str | None = None


def _serialize_movie(movie: Movie, *, include_palettes: bool = True) -> dict:
    palettes_data = []
    if include_palettes:
        palettes = movie.color_palettes.filter(active=True)
        palettes_data = [
            serialize_palette(palette, movie_id=movie.id) for palette in palettes
        ]
    return {
        "id": movie.id,
        "title": movie.title,
        "director": movie.director,
        "year": movie.year,
        "slug": slugify(movie.title),
        "type": movie.type or "movie",
        "palettes": palettes_data,
        "poster": movie.poster,
        "rating": movie.rating,
        "recommendation_source": movie.recommendation_source,
        "acquired_at": movie.acquired_at.isoformat() if movie.acquired_at else None,
        "consumed_at": movie.consumed_at.isoformat() if movie.consumed_at else None,
        "country": movie.country,
    }


@router.get("", response=MoviesResponse)
def get_movies(request):
    """
    Get all movies with their color palettes.
    """
    movies = Movie.objects.prefetch_related("color_palettes").all()
    return {"movies": [_serialize_movie(movie) for movie in movies]}


@router.post("", response={201: MovieSchema}, auth=api_write_key)
def create_movie(request, payload: MovieCreate):
    """Create a movie or documentary. Requires X-API-Key."""
    title = payload.title.strip()
    if not title:
        raise HttpError(400, "title must be non-empty.")

    try:
        movie = Movie.objects.create(
            title=title,
            type=payload.type,
            director=payload.director,
            year=payload.year,
            poster=payload.poster,
            rating=payload.rating,
            recommendation_source=payload.recommendation_source,
            acquired_at=parse_optional_datetime(payload.acquired_at),
            consumed_at=parse_optional_datetime(payload.consumed_at),
            country=payload.country,
            length=payload.length,
            frames=payload.frames,
            path=payload.path,
            scan_status=payload.scan_status,
        )
    except IntegrityError as e:
        raise HttpError(
            409, "Conflict: a record with a unique field already exists."
        ) from e
    return 201, _serialize_movie(movie, include_palettes=False)
