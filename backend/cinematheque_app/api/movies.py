import json

from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Movie


class PaletteSchema(Schema):
    id: str
    movie_id: int
    colors: list[str]
    calculation_date: str
    clusters_nb: int


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
            # Parse colors JSON string
            try:
                colors = json.loads(palette.colors) if palette.colors else []
            except (json.JSONDecodeError, TypeError):
                colors = []

            palettes_data.append(
                {
                    "id": palette.id,
                    "movie_id": movie.id,
                    "colors": colors,
                    "calculation_date": palette.calculation_date.isoformat(),
                    "clusters_nb": palette.clusters_nb,
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
