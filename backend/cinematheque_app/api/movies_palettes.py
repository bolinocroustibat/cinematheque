import json
from datetime import datetime

from django.db import IntegrityError
from django.http import Http404
from django.utils import timezone
from django.utils.text import slugify
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field, field_validator

from cinematheque_app.api.auth import api_write_key, parse_optional_datetime
from cinematheque_app.models import Movie, MovieColorPalette

router = Router()


class PaletteSchema(Schema):
    id: str
    movie_id: int
    active: int
    colors: list[str]
    calculation_date: str
    calculation_duration_seconds: float | None
    is_black_and_white: int
    clusters_nb: int
    frame_skip: int | None
    resize_width: int | None
    resize_height: int | None
    batch_size: int | None
    clustering_method: str | None
    saturation_factor: str | None
    saturation_threshold: int | None
    runtime: str | None


class PaletteCreate(Schema):
    id: str = Field(min_length=6, max_length=6)
    movie_id: int
    colors: list[str]
    clusters_nb: int = Field(ge=1)
    active: bool = True
    calculation_date: str | datetime | None = None
    calculation_duration_seconds: float | None = Field(default=None, ge=0)
    is_black_and_white: bool = False
    frame_skip: int | None = Field(default=None, ge=1)
    resize_width: int | None = Field(default=None, ge=1)
    resize_height: int | None = Field(default=None, ge=1)
    batch_size: int | None = Field(default=None, ge=1)
    clustering_method: str | None = None
    saturation_factor: str | None = None
    saturation_threshold: int | None = Field(default=None, ge=0)
    runtime: str | None = None

    @field_validator("colors")
    @classmethod
    def colors_non_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("colors must be a non-empty list.")
        return value


class PalettesResponse(Schema):
    class Movie(Schema):
        id: int
        title: str
        director: str | None
        year: str | None

    movie: Movie
    palettes: list[PaletteSchema]


def serialize_palette(palette: MovieColorPalette, *, movie_id: int) -> dict:
    """Serialize a MovieColorPalette row to the API palette payload."""
    try:
        raw_colors = json.loads(palette.colors) if palette.colors else []
    except (json.JSONDecodeError, TypeError):
        raw_colors = []
    colors = [
        f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" if isinstance(c, list) else c
        for c in raw_colors
    ]
    return {
        "id": palette.id,
        "movie_id": movie_id,
        "active": 1 if palette.active else 0,
        "colors": colors,
        "calculation_date": palette.calculation_date.isoformat(),
        "calculation_duration_seconds": palette.calculation_duration_seconds,
        "is_black_and_white": 1 if palette.is_black_and_white else 0,
        "clusters_nb": palette.clusters_nb,
        "frame_skip": palette.frame_skip,
        "resize_width": palette.resize_width,
        "resize_height": palette.resize_height,
        "batch_size": palette.batch_size,
        "clustering_method": palette.clustering_method,
        "saturation_factor": palette.saturation_factor,
        "saturation_threshold": palette.saturation_threshold,
        "runtime": palette.runtime,
    }


@router.get("/{movie_slug}", response=PalettesResponse)
def get_palettes_by_movie_slug(request, movie_slug: str):
    """
    Get a movie and all its color palettes by movie slug.
    """
    movie = next(
        (
            m
            for m in Movie.objects.prefetch_related("color_palettes")
            if slugify(m.title) == movie_slug
        ),
        None,
    )
    if movie is None:
        raise Http404("Movie not found")

    return {
        "movie": {
            "id": movie.id,
            "title": movie.title,
            "director": movie.director,
            "year": movie.year,
        },
        "palettes": [
            serialize_palette(palette, movie_id=movie.id)
            for palette in movie.color_palettes.all()
        ],
    }


@router.post("", response={201: PaletteSchema}, auth=api_write_key)
def create_palette(request, payload: PaletteCreate):
    """Create a movie color palette. Requires X-API-Key."""
    if not Movie.objects.filter(pk=payload.movie_id).exists():
        raise HttpError(404, f"Movie with id={payload.movie_id} not found.")

    calc_date = parse_optional_datetime(payload.calculation_date)
    try:
        palette = MovieColorPalette.objects.create(
            id=payload.id,
            movie_id=payload.movie_id,
            active=payload.active,
            calculation_date=calc_date if calc_date is not None else timezone.now(),
            calculation_duration_seconds=payload.calculation_duration_seconds,
            is_black_and_white=payload.is_black_and_white,
            colors=json.dumps(payload.colors),
            clusters_nb=payload.clusters_nb,
            frame_skip=payload.frame_skip,
            resize_width=payload.resize_width,
            resize_height=payload.resize_height,
            batch_size=payload.batch_size,
            clustering_method=payload.clustering_method,
            saturation_factor=payload.saturation_factor,
            saturation_threshold=payload.saturation_threshold,
            runtime=payload.runtime,
        )
    except IntegrityError as e:
        raise HttpError(
            409, "Conflict: a record with a unique field already exists."
        ) from e
    return 201, serialize_palette(palette, movie_id=palette.movie_id)
