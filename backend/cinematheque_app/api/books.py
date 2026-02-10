from django.utils.text import slugify
from ninja import Router, Schema

from cinematheque_app.models import Book


class BookSchema(Schema):
    id: int
    title: str
    author: str | None
    year: str | None
    slug: str


class BooksResponse(Schema):
    books: list[BookSchema]


router = Router()


@router.get("", response=BooksResponse)
def get_books(request):
    """
    Get all books.
    """
    books = Book.objects.all()
    books_data = [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "year": b.year,
            "slug": slugify(b.title),
        }
        for b in books
    ]
    return {"books": books_data}
