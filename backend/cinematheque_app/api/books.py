from datetime import datetime
from typing import Literal

from django.db import IntegrityError
from django.utils.text import slugify
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from cinematheque_app.api.auth import api_write_key, parse_optional_datetime
from cinematheque_app.models import Book

router = Router()


class BookSchema(Schema):
    id: int
    title: str
    author: str | None
    year: str | None
    slug: str
    type: str
    poster: str | None = None
    rating: int | None = None
    recommendation_source: str | None = None
    acquired_at: str | None = None
    consumed_at: str | None = None
    country: str | None = None


class BooksResponse(Schema):
    books: list[BookSchema]


class BookCreate(Schema):
    title: str
    type: Literal["book", "comic"] = "book"
    author: str | None = None
    year: str | None = None
    poster: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    recommendation_source: str | None = None
    acquired_at: str | datetime | None = None
    consumed_at: str | datetime | None = None
    country: str | None = None
    pages: int | None = Field(default=None, ge=0)
    isbn: str | None = None
    publisher: str | None = None
    path: str | None = None
    scan_status: str | None = None


def _book_kind(book: Book) -> str:
    return book.type if book.type in ("book", "comic") else "book"


def _serialize_book(book: Book) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "year": book.year,
        "slug": slugify(book.title),
        "type": _book_kind(book),
        "poster": book.poster,
        "rating": book.rating,
        "recommendation_source": book.recommendation_source,
        "acquired_at": book.acquired_at.isoformat() if book.acquired_at else None,
        "consumed_at": book.consumed_at.isoformat() if book.consumed_at else None,
        "country": book.country,
    }


@router.get("", response=BooksResponse)
def get_books(request):
    """
    Get all books and comics (single list; use `type` to split).
    """
    return {"books": [_serialize_book(b) for b in Book.objects.all()]}


@router.post("", response={201: BookSchema}, auth=api_write_key)
def create_book(request, payload: BookCreate):
    """Create a book or comic. Requires X-API-Key."""
    title = payload.title.strip()
    if not title:
        raise HttpError(400, "title must be non-empty.")

    try:
        book = Book.objects.create(
            title=title,
            type=payload.type,
            author=payload.author,
            year=payload.year,
            poster=payload.poster,
            rating=payload.rating,
            recommendation_source=payload.recommendation_source,
            acquired_at=parse_optional_datetime(payload.acquired_at),
            consumed_at=parse_optional_datetime(payload.consumed_at),
            country=payload.country,
            pages=payload.pages,
            isbn=payload.isbn,
            publisher=payload.publisher,
            path=payload.path,
            scan_status=payload.scan_status,
        )
    except IntegrityError as e:
        raise HttpError(
            409, "Conflict: a record with a unique field already exists."
        ) from e
    return 201, _serialize_book(book)
