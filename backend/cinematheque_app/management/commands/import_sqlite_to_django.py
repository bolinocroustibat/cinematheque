"""
Import movies and palettes from the legacy SQLite database (movies.db) into
the PostgreSQL/Django database.

Run from the backend directory:
    uv run manage.py import_sqlite_to_django
"""

import sqlite3
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.core.management.base import BaseCommand

from cinematheque_app.models import Movie, MovieColorPalette


class Command(BaseCommand):
    help = "Import movies and palettes from legacy SQLite database (movies.db)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db-path",
            type=str,
            default="movies.db",
            help="Path to the SQLite database file (default: movies.db)",
        )

    def handle(self, *args, **options):
        db_path = Path(options["db_path"])
        if not db_path.is_absolute():
            # Relative to backend root (where manage.py is)
            db_path = Path.cwd() / db_path

        if not db_path.exists():
            self.stdout.write(self.style.ERROR(f"Error: {db_path} not found."))
            return

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

        # 1. Import movies and build old_id -> new Movie mapping
        cursor = conn.execute(
            """
            SELECT id, title, type, status, path, director, year, length, frames, added
            FROM movies
            ORDER BY id
            """
        )
        rows = cursor.fetchall()
        old_id_to_movie = {}
        created_at_default = datetime.now(dt_timezone.utc)

        for row in rows:
            old_id = row["id"]
            added_dt = self.parse_datetime_utc(row["added"]) or created_at_default
            path_val = (
                row["path"] if (row["path"] and str(row["path"]).strip()) else None
            )
            defaults = {
                "title": row["title"] or "",
                "type": row["type"],
                "scan_status": row["status"],
                "director": row["director"],
                "year": row["year"],
                "length": row["length"],
                "frames": row["frames"],
                "created_at": added_dt,
                "acquired_at": None,
                "consumed_at": None,
            }
            if path_val is not None:
                movie, created = Movie.objects.update_or_create(
                    path=path_val,
                    defaults=defaults,
                )
            else:
                movie = Movie.objects.create(path=None, **defaults)
                created = True
            old_id_to_movie[old_id] = movie
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} movie: {movie.title} (path={movie.path})")

        self.stdout.write(
            self.style.SUCCESS(f"\nImported {len(old_id_to_movie)} movies.")
        )

        # 2. Import palettes (reference movies by old id -> new movie)
        cursor = conn.execute(
            """
            SELECT id, movie_id, active, calculation_date, calculation_duration_seconds,
                   is_black_and_white, colors, clusters_nb, frame_skip, resize_width,
                   resize_height, batch_size, clustering_method, saturation_factor,
                   saturation_threshold, runtime
            FROM palettes
            """
        )
        palette_rows = cursor.fetchall()
        skipped = 0
        for row in palette_rows:
            old_movie_id = row["movie_id"]
            movie = old_id_to_movie.get(old_movie_id)
            if not movie:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Skip palette {row['id']}: unknown movie_id={old_movie_id}"
                    )
                )
                skipped += 1
                continue

            calc_date = self.parse_datetime_utc(
                row["calculation_date"]
            ) or datetime.now(dt_timezone.utc)
            # SQLite may store booleans as 0/1 or "0"/"1"; bool("0") is True in Python
            active = self._sqlite_bool(row["active"], default=True)
            is_bw = self._sqlite_bool(row["is_black_and_white"], default=False)

            MovieColorPalette.objects.update_or_create(
                id=row["id"],
                defaults={
                    "movie_id": movie.pk,
                    "active": active,
                    "calculation_date": calc_date,
                    "calculation_duration_seconds": row["calculation_duration_seconds"],
                    "is_black_and_white": is_bw,
                    "colors": row["colors"] or "[]",
                    "clusters_nb": max(
                        1,
                        int(row["clusters_nb"])
                        if row["clusters_nb"] is not None
                        else 1,
                    ),
                    "frame_skip": row["frame_skip"],
                    "resize_width": row["resize_width"],
                    "resize_height": row["resize_height"],
                    "batch_size": row["batch_size"],
                    "clustering_method": row["clustering_method"],
                    "saturation_factor": row["saturation_factor"],
                    "saturation_threshold": row["saturation_threshold"],
                    "runtime": row["runtime"],
                },
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {len(palette_rows) - skipped} palettes (skipped {skipped})."
            )
        )

        conn.close()
        self.stdout.write(self.style.SUCCESS("Done."))

    @staticmethod
    def _sqlite_bool(value, *, default=False):
        """Convert SQLite 0/1, "0"/"1", or BLOB b'\\x00'/b'\\x01' to bool.
        Only 1, True, "1", or b'\\x01' are True. Avoids bool(b'\\x00') being True.
        """
        if value is None:
            return default
        if value is True:
            return True
        if value is False:
            return False
        if isinstance(value, int):
            return value != 0
        if isinstance(value, (bytes, bytearray)):
            return value == b"\x01" or (len(value) == 1 and value[0] != 0)
        s = str(value).strip().lower()
        return s in ("1", "true", "yes")

    @staticmethod
    def parse_datetime_utc(value):
        """Parse SQLite datetime string to timezone-aware UTC datetime or None."""
        if value is None:
            return None
        s = str(value).strip()
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            else:
                dt = dt.astimezone(dt_timezone.utc)
            return dt
        except (ValueError, TypeError):
            return None
