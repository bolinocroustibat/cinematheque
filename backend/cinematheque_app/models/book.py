from django.core.validators import MinValueValidator
from django.db import models

from .base import MediaItem


class Book(MediaItem):
    """
    Book model inheriting from MediaItem.
    Includes book-specific fields like author, pages, and ISBN.
    """

    BOOK_TYPE_CHOICES = [
        ("book", "Book"),
        ("comic", "Comic"),
    ]
    type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=BOOK_TYPE_CHOICES,
        help_text="Kind of publication: book or comic.",
    )
    author = models.CharField(max_length=255, null=True, blank=True)
    pages = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Number of pages.",
    )
    isbn = models.CharField(max_length=20, null=True, blank=True, unique=True)
    publisher = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "books"
        verbose_name = "Book"
        verbose_name_plural = "Books"

    def __str__(self):
        author_str = f" by {self.author}" if self.author else ""
        return f"{self.title} ({self.year}){author_str}"
