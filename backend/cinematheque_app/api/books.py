from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Book


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
    consumed_at: str | None = None
    country: str | None = None


class BooksResponse(Schema):
    books: list[BookSchema]


router = Router()


def _book_kind(b: Book) -> str:
    return b.type if b.type in ("book", "comic") else "book"


@router.get("", response=BooksResponse)
def get_books(request):
    """
    Get all books and comics (single list; use `type` to split).
    """
    books = Book.objects.all()
    books_data = [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "year": b.year,
            "slug": slugify(b.title),
            "type": _book_kind(b),
            "poster": b.poster,
            "rating": b.rating,
            "recommendation_source": b.recommendation_source,
            "consumed_at": b.consumed_at.isoformat() if b.consumed_at else None,
            "country": b.country,
        }
        for b in books
    ]
    return {"books": books_data}
