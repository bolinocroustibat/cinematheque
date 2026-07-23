import json

from django.http import Http404
from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Movie


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


def serialize_palette(palette, *, movie_id: int) -> dict:
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


class PalettesResponse(Schema):
    class Movie(Schema):
        id: int
        title: str
        director: str | None
        year: str | None

    movie: Movie
    palettes: list[PaletteSchema]


router = Router()


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

    palettes_data = [
        serialize_palette(palette, movie_id=movie.id)
        for palette in movie.color_palettes.all()
    ]

    return {
        "movie": {
            "id": movie.id,
            "title": movie.title,
            "director": movie.director,
            "year": movie.year,
        },
        "palettes": palettes_data,
    }
