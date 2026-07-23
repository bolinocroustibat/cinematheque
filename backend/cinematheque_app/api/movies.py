from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.api.movies_palettes import PaletteSchema, serialize_palette
from cinematheque_app.models import Movie


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
        palettes_data = [
            serialize_palette(palette, movie_id=movie.id) for palette in palettes
        ]

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
                "acquired_at": movie.acquired_at.isoformat()
                if movie.acquired_at
                else None,
                "consumed_at": movie.consumed_at.isoformat()
                if movie.consumed_at
                else None,
                "country": movie.country,
            }
        )

    return {"movies": movies_data}
