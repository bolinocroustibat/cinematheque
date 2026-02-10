from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Series


class SeriesSchema(Schema):
    id: int
    title: str
    creator: str | None
    year: str | None
    slug: str


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
        }
        for s in series
    ]
    return {"series": series_data}
