"""
Fill missing movie poster URLs via TMDB (OMDb fallback).

Run from the backend directory:
    uv run python manage.py fill_movie_posters
    uv run python manage.py fill_movie_posters --dry-run
"""

from django.core.management.base import BaseCommand, CommandError

from cinematheque_app.models import Movie
from cinematheque_app.services.poster_fetch import (
    DEFAULT_FILL_DELAY,
    fill_missing_posters_for,
    missing_poster_queryset,
    require_tmdb_api_key,
    resolve_poster_url,
)


class Command(BaseCommand):
    help = "Resolve and save poster URLs for movies missing a poster"

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
        try:
            require_tmdb_api_key()
        except RuntimeError as e:
            raise CommandError(str(e)) from e

        dry_run = options["dry_run"]
        pending_before = missing_poster_queryset(Movie).count()
        self.stdout.write(
            f"Movies: {pending_before} row(s) missing a poster"
            + (" [dry-run]" if dry_run else "")
        )

        def resolve(movie: Movie) -> str | None:
            url = resolve_poster_url(movie.title, movie.year, "movie")
            if url:
                action = "Would update" if dry_run else "Updated"
                self.stdout.write(f"  {action} id={movie.pk} {movie.title!r} -> {url}")
            else:
                self.stdout.write(f"  No poster for id={movie.pk} {movie.title!r}")
            return url

        result = fill_missing_posters_for(
            Movie,
            resolve=resolve,
            delay=options["delay"],
            dry_run=dry_run,
        )
        pending_after = (
            missing_poster_queryset(Movie).count() if not dry_run else pending_before
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Done: processed={result.processed} updated={result.updated} "
                f"still_missing={pending_after}"
            )
        )
