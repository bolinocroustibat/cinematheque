"""
Fill missing book/comic cover URLs via Google Books.

Run from the backend directory:
    uv run python manage.py fill_book_posters
    uv run python manage.py fill_book_posters --dry-run
"""

from django.core.management.base import BaseCommand

from cinematheque_app.models import Book
from cinematheque_app.services.poster_fetch import (
    DEFAULT_FILL_DELAY,
    fill_missing_posters_for,
    missing_poster_queryset,
    resolve_book_cover_url,
)


class Command(BaseCommand):
    help = "Resolve and save cover URLs for books and comics missing a poster"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delay",
            type=float,
            default=DEFAULT_FILL_DELAY,
            help=f"Pause between HTTP calls in seconds (default: {DEFAULT_FILL_DELAY}).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Resolve posters but do not write to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        pending_before = missing_poster_queryset(Book).count()
        self.stdout.write(
            f"Books: {pending_before} row(s) missing a poster"
            + (" [dry-run]" if dry_run else "")
        )

        def resolve(book: Book) -> str | None:
            url = resolve_book_cover_url(book.title, book.author, book.year, book.isbn)
            if url:
                action = "Would update" if dry_run else "Updated"
                self.stdout.write(f"  {action} id={book.pk} {book.title!r} -> {url}")
            else:
                self.stdout.write(f"  No poster for id={book.pk} {book.title!r}")
            return url

        result = fill_missing_posters_for(
            Book,
            resolve=resolve,
            delay=options["delay"],
            dry_run=dry_run,
        )
        pending_after = (
            missing_poster_queryset(Book).count() if not dry_run else pending_before
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Done: processed={result.processed} updated={result.updated} "
                f"still_missing={pending_after}"
            )
        )
