from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Series


class SeriesSchema(Schema):
    id: int
    title: str
    creator: str | None
    year: str | None
    slug: str
    seasons: int | None = None
    poster: str | None = None
    rating: int | None = None
    recommendation_source: str | None = None
    consumed_at: str | None = None
    country: str | None = None


class SeriesResponse(Schema):
    series: list[SeriesSchema]


router = Router()


@router.get("", response=SeriesResponse)
def get_series(request):
    """
    Get all series.
    """
    series = Series.objects.all()
    series_data = [
        {
            "id": s.id,
            "title": s.title,
            "creator": s.creator,
            "year": s.year,
            "slug": slugify(s.title),
            "seasons": s.seasons,
            "poster": s.poster,
            "rating": s.rating,
            "recommendation_source": s.recommendation_source,
            "consumed_at": s.consumed_at.isoformat() if s.consumed_at else None,
            "country": s.country,
        }
        for s in series
    ]
    return {"series": series_data}
