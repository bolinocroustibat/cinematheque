import json
import time

from django.db.models import Q
from django.utils.text import slugify
from ninja import Router, Schema
from ninja.errors import HttpError

from cinematheque_app.models import Movie
from cinematheque_app.services.poster_fetch import resolve_poster_url


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
    type: str
    palettes: list[PaletteSchema]
    poster: str | None = None
    rating: int | None = None
    recommendation_source: str | None = None
    consumed_at: str | None = None
    country: str | None = None


class MoviesResponse(Schema):
    movies: list[MovieSchema]


class FillMissingPostersResponse(Schema):
    updated: int
    ids: list[int]
    processed: int
    more_pending: bool


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
                "type": movie.type or "movie",
                "palettes": palettes_data,
                "poster": movie.poster,
                "rating": movie.rating,
                "recommendation_source": movie.recommendation_source,
                "consumed_at": movie.consumed_at.isoformat()
                if movie.consumed_at
                else None,
                "country": movie.country,
            }
        )

    return {"movies": movies_data}


FILL_POSTER_MAX_BATCH = 50


@router.post(
    "fill-missing-posters",
    response=FillMissingPostersResponse,
)
def fill_missing_posters(request, limit: int = 25):
    """
    Resolve poster URLs for up to ``limit`` movies currently missing a poster.

    Re-call while ``more_pending`` is true to walk the queue in bounded HTTP requests.
    As rows get a poster, the next call naturally takes the next slice of the queue.
    """
    from django.conf import settings as django_settings

    if not (django_settings.TMDB_API_KEY or "").strip():
        raise HttpError(
            503,
            "Poster fill is unavailable: TMDB_API_KEY is not configured.",
        )

    batch = max(1, min(int(limit), FILL_POSTER_MAX_BATCH))
    qs = Movie.objects.filter(Q(poster__isnull=True) | Q(poster="")).order_by("id")
    chunk = list(qs[:batch])
    updated_ids: list[int] = []

    for movie in chunk:
        poster_url = resolve_poster_url(movie.title, movie.year, "movie")
        if poster_url:
            movie.poster = poster_url
            movie.save(update_fields=["poster"])
            updated_ids.append(movie.id)
        time.sleep(0.2)

    processed = len(chunk)
    # True if the queue might still have rows (caller should re-fetch; queue shrinks as posters are set).
    more_pending = processed == batch
    return {
        "updated": len(updated_ids),
        "ids": updated_ids,
        "processed": processed,
        "more_pending": more_pending,
    }
