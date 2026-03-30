import json

from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Movie


class PaletteSchema(Schema):
    id: str
    movie_id: int
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


class MovieSchema(Schema):
    id: int
    title: str
    director: str | None
    year: str | None
    slug: str
    palettes: list[PaletteSchema]


class MoviesResponse(Schema):
    movies: list[MovieSchema]


router = Router()


@router.get("", response=MoviesResponse)
def get_movies(request):
    """
    Get all movies with their color palettes.
    """
    movies = Movie.objects.prefetch_related("color_palettes").all()

    movies_data = []
    for movie in movies:
        # Generate slug from title
        slug = slugify(movie.title)

        # Get active palettes for this movie
        palettes = movie.color_palettes.filter(active=True)

        palettes_data = []
        for palette in palettes:
            try:
                raw_colors = json.loads(palette.colors) if palette.colors else []
            except (json.JSONDecodeError, TypeError):
                raw_colors = []
            colors = [
                f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" if isinstance(c, list) else c
                for c in raw_colors
            ]

            palettes_data.append(
                {
                    "id": palette.id,
                    "movie_id": movie.id,
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
            )

        movies_data.append(
            {
                "id": movie.id,
                "title": movie.title,
                "director": movie.director,
                "year": movie.year,
                "slug": slug,
                "palettes": palettes_data,
            }
        )

    return {"movies": movies_data}
