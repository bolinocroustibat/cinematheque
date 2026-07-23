from datetime import datetime

from django.db import IntegrityError
from django.utils.text import slugify
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from cinematheque_app.api.auth import api_write_key, parse_optional_datetime
from cinematheque_app.models import Series

router = Router()


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
    acquired_at: str | None = None
    consumed_at: str | None = None
    country: str | None = None


class SeriesResponse(Schema):
    series: list[SeriesSchema]


class SeriesCreate(Schema):
    title: str
    creator: str | None = None
    year: str | None = None
    seasons: int | None = Field(default=None, ge=0)
    episodes: int | None = Field(default=None, ge=0)
    poster: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    recommendation_source: str | None = None
    acquired_at: str | datetime | None = None
    consumed_at: str | datetime | None = None
    country: str | None = None
    path: str | None = None
    scan_status: str | None = None


def _serialize_series(series: Series) -> dict:
    return {
        "id": series.id,
        "title": series.title,
        "creator": series.creator,
        "year": series.year,
        "slug": slugify(series.title),
        "seasons": series.seasons,
        "poster": series.poster,
        "rating": series.rating,
        "recommendation_source": series.recommendation_source,
        "acquired_at": series.acquired_at.isoformat() if series.acquired_at else None,
        "consumed_at": series.consumed_at.isoformat() if series.consumed_at else None,
        "country": series.country,
    }


@router.get("", response=SeriesResponse)
def get_series(request):
    """
    Get all series.
    """
    return {"series": [_serialize_series(s) for s in Series.objects.all()]}


@router.post("", response={201: SeriesSchema}, auth=api_write_key)
def create_series(request, payload: SeriesCreate):
    """Create a series. Requires X-API-Key."""
    title = payload.title.strip()
    if not title:
        raise HttpError(400, "title must be non-empty.")

    try:
        series = Series.objects.create(
            title=title,
            creator=payload.creator,
            year=payload.year,
            seasons=payload.seasons,
            episodes=payload.episodes,
            poster=payload.poster,
            rating=payload.rating,
            recommendation_source=payload.recommendation_source,
            acquired_at=parse_optional_datetime(payload.acquired_at),
            consumed_at=parse_optional_datetime(payload.consumed_at),
            country=payload.country,
            path=payload.path,
            scan_status=payload.scan_status,
        )
    except IntegrityError as e:
        raise HttpError(
            409, "Conflict: a record with a unique field already exists."
        ) from e
    return 201, _serialize_series(series)
