"""
Sync local Drive MOVIES / DOCUMENTARIES / SERIES under DRIVE_BASE_PATH into
Movie / Series rows (library-relative paths).

Movies/docs: title from folder name; director and year from IMDB (local Cinemagoer
database when ``CINEMAGOER_DB_URI`` is set, otherwise OMDb when ``OMDB_API_KEY``
is configured).
OpenCV length/frames is opt-in via ``--with-length`` (slow on large libraries).
Series use season folders or flat episode filenames.

With ``--prune``, propose deleting DB rows whose library folder no longer
exists on disk (CLI confirm; cascades MovieColorPalette for movies).

    export DRIVE_BASE_PATH=".../My Drive"
    uv run manage.py sync_local_drive
    uv run manage.py sync_local_drive --movies --dry-run
    uv run manage.py sync_local_drive --movies --with-length
    uv run manage.py sync_local_drive --movies --prune
"""

import os
import re
from pathlib import Path

import imdb
import niquests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q
from imdb import IMDb

from cinematheque_app.models import Movie, Series

LIBRARY_MOVIES = "MOVIES"
LIBRARY_DOCUMENTARIES = "DOCUMENTARIES"
LIBRARY_SERIES = "SERIES"

VIDEO_GLOBS = ("*.avi", "*.mkv", "*.mp4", "*.mpg", "*.mpeg", "*.m4v", "*.webm", "*.mov")
VIDEO_EXTENSIONS = frozenset(p.replace("*", "") for p in VIDEO_GLOBS) | {
    ".wmv",
    ".mov",
}

MOVIE_SCAN_FIELDS = (
    "title",
    "type",
    "scan_status",
    "path",
    "director",
    "year",
    "length",
    "frames",
)
SERIES_SCAN_FIELDS = ("title", "path", "seasons", "episodes", "year", "scan_status")

REFETCH_INFO = False
OMDB_BASE_URL = "https://www.omdbapi.com"
IMDB_REQUEST_TIMEOUT = 10.0

YEAR_IN_PARENS = re.compile(r"\((19|20)\d{2}\)")
SEASON_NUM = re.compile(r"season\s*(\d+)", re.IGNORECASE)
SAISON_NUM = re.compile(r"saison\s*(\d+)", re.IGNORECASE)
SERIES_NUM = re.compile(r"series\s*(\d+)", re.IGNORECASE)
S_TOKEN = re.compile(r"\b[Ss](\d{1,2})\b")
PILOT = re.compile(r"\bpilot\b", re.IGNORECASE)
S_E_PATTERN = re.compile(r"(?i)\bS(\d{1,2})E(\d{1,3})\b")
X_X_PATTERN = re.compile(r"(?i)(?<![0-9a-z])(\d{1,2})x(\d{1,3})(?![0-9a-z])")
NNN_DASH_PATTERN = re.compile(r"^(\d)(\d{2})\s*[-–]\s*")
EPISODE_NUM_PATTERN = re.compile(r"(?i)episode\s*\.?\s*(\d{1,3})\b")
PART_NUM_PATTERN = re.compile(r"(?i)\bpart\s*\.?\s*(\d{1,3})\b")
THREE_DIGIT_PREFIX_PATTERN = re.compile(r"^(\d{3})\s+")


def get_drive_base_path() -> str:
    return os.getenv("DRIVE_BASE_PATH", "").rstrip("/")


def drive_base() -> Path:
    return Path(get_drive_base_path()).expanduser()


def prompt_apply(apply_all: bool) -> tuple[bool, bool, bool]:
    if apply_all:
        return True, True, False
    answer = input("  Apply? [y]es / [n]o / [a]ll / [q]uit: ").strip().lower()
    if answer in ("a", "all"):
        return True, True, False
    if answer in ("q", "quit"):
        return False, apply_all, True
    if answer in ("y", "yes"):
        return True, apply_all, False
    return False, apply_all, False


# --- Movies / documentaries ----------------------------------------------


_ia: IMDb | None = None


def _imdb_client() -> IMDb | None:
    """Cinemagoer S3 client when ``CINEMAGOER_DB_URI`` points at an imported IMDb DB."""
    global _ia
    if _ia is not None:
        return _ia
    uri = os.getenv("CINEMAGOER_DB_URI", "").strip()
    if not uri:
        return None
    _ia = IMDb(accessSystem="s3", uri=uri)
    return _ia


def title_from_dir_name(name: str) -> str:
    """Folder name without trailing parenthetical metadata (year, director, notes)."""
    name = name.strip()
    title = re.sub(r" \([^)]+\)$", "", name).strip()
    return title or name


def get_imdb_data(movie_title: str) -> dict | None:
    """
    Fetch director and year from IMDB for a movie title.

    Returns a dict with ``director`` and/or ``year`` when found, else None.
    """
    ia = _imdb_client()
    if ia is not None:
        return _get_imdb_data_cinemagoer(movie_title, ia)
    return _get_imdb_data_omdb(movie_title)


def _get_imdb_data_cinemagoer(movie_title: str, ia: IMDb) -> dict | None:
    try:
        movies = ia.search_movie(movie_title, results=1)
        if not movies:
            return None
        movie_id = movies[0].movieID
        movie = ia.get_movie(movie_id)
        imdb_title = movie.get("title")
        if not imdb_title or imdb_title.lower() != movie_title.lower():
            return None
        director = None
        year = None
        if movie.get("director"):
            director = movie["director"][0]["name"]
        year = movie.get("year")
        if director or year:
            return {"director": director, "year": year}
        return None
    except imdb.exceptions.IMDbError as e:
        print(f"Error fetching data for {movie_title}: {e}")
        return None


def _get_imdb_data_omdb(movie_title: str) -> dict | None:
    omdb_key = (settings.OMDB_API_KEY or "").strip()
    if not omdb_key:
        return None
    try:
        with niquests.Session(timeout=IMDB_REQUEST_TIMEOUT) as session:
            search = session.get(
                OMDB_BASE_URL,
                params={"apikey": omdb_key, "s": movie_title, "type": "movie"},
            )
            search.raise_for_status()
            payload = search.json()
            if payload.get("Response") != "True":
                return None
            results = payload.get("Search") or []
            if not results:
                return None
            hit = results[0]
            if hit.get("Title", "").lower() != movie_title.lower():
                return None
            detail = session.get(
                OMDB_BASE_URL,
                params={"apikey": omdb_key, "i": hit["imdbID"]},
            )
            detail.raise_for_status()
            data = detail.json()
            if data.get("Response") != "True":
                return None
            director = data.get("Director")
            if not director or director == "N/A":
                director = None
            year_raw = data.get("Year")
            year = None
            if year_raw and year_raw != "N/A":
                year = re.split(r"[–-]", str(year_raw), maxsplit=1)[0]
            if director or year:
                return {"director": director, "year": year}
            return None
    except (niquests.RequestException, KeyError, TypeError, ValueError) as e:
        print(f"Error fetching data for {movie_title}: {e}")
        return None


def movie_director_and_year(
    title: str,
    existing: Movie | None,
    *,
    refetch: bool = REFETCH_INFO,
) -> tuple[str | None, str | None]:
    """Resolve director/year via IMDB; reuse existing DB values when allowed."""
    if existing and not refetch and existing.director and existing.year:
        return existing.director, existing.year
    data = get_imdb_data(title)
    if not data:
        if existing:
            return existing.director, existing.year
        return None, None
    director = data.get("director")
    year = str(data["year"]) if data.get("year") is not None else None
    return director, year


def list_video_files(folder: Path) -> list[Path]:
    """Videos directly in the folder; if none, one-level nested."""
    files: list[Path] = []
    for pattern in VIDEO_GLOBS:
        files.extend(folder.glob(pattern))
    if not files:
        for pattern in VIDEO_GLOBS:
            files.extend(folder.glob(f"*/{pattern}"))
    return sorted(set(files), key=lambda p: p.name.lower())


def is_junk_video(path: Path) -> bool:
    """AppleDouble, samples, tiny release leftovers — not the movie itself."""
    name = path.name
    if name.startswith("._"):
        return True
    stem = path.stem.lower()
    if stem in {"sample", "etrg"} or stem.startswith("sample"):
        return True
    return False


def resolve_movie_video(folder: Path) -> tuple[Path | None, str]:
    """
    Pick a single video for the folder, or explain why not.

    Ignores junk files; if several remain, keeps the dominant one when it is
    clearly larger than the rest (movie + sample), otherwise reports multi.
    """
    files = [p for p in list_video_files(folder) if not is_junk_video(p)]
    if not files:
        return None, "No movie file found"
    if len(files) == 1:
        return files[0], "OK"

    sized = sorted(
        ((p, p.stat().st_size) for p in files),
        key=lambda item: item[1],
        reverse=True,
    )
    biggest, big_size = sized[0]
    second_size = sized[1][1]
    # Dominant file (e.g. real rip next to a tiny sample/extra)
    if big_size >= max(second_size * 5, 20 * 1024 * 1024):
        return biggest, "OK"

    status = "More than 1 video file found:"
    for p, _ in sized:
        status += f' "{p.name}"'
    return None, status


def video_length_and_frames(file_path: Path) -> tuple[int | None, int | None]:
    import cv2

    cap = cv2.VideoCapture(str(file_path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        frames = int(frame_count) if frame_count else None
        length = int(frame_count / fps) if fps and fps > 0 and frame_count else None
    except Exception:
        length = None
        frames = None
    finally:
        cap.release()
    return length, frames


def to_relative_path(file_path: Path, base: Path) -> str:
    return file_path.resolve().relative_to(base.resolve()).as_posix()


def library_folder_key(path: str, library: str) -> str | None:
    """
    Top-level folder under ``library`` for a library-relative path.

    ``MOVIES/Foo/bar.mkv`` → ``MOVIES/Foo``; ``SERIES/Show`` → ``SERIES/Show``.
    """
    prefix = f"{library}/"
    if not path.startswith(prefix):
        return None
    rest = path[len(prefix) :]
    folder = rest.split("/", 1)[0]
    if not folder:
        return None
    return f"{library}/{folder}"


def show_movie_diff(existing: Movie, new_data: dict) -> dict[str, dict]:
    changes: dict[str, dict] = {}
    for key in MOVIE_SCAN_FIELDS:
        new_val = new_data[key]
        if new_val is None:
            continue
        old_val = getattr(existing, key)
        if old_val != new_val:
            changes[key] = {"before": old_val, "after": new_val}
    return changes


# --- Series ---------------------------------------------------------------


def is_season_like_dir(name: str) -> bool:
    if name.startswith(".") or name.lower() == "subs":
        return False
    lower = name.lower()
    return bool(
        SEASON_NUM.search(lower)
        or SAISON_NUM.search(lower)
        or SERIES_NUM.search(lower)
        or S_TOKEN.search(name)
        or PILOT.search(name)
    )


def years_from_name(name: str) -> list[int]:
    return [int(m.group(0)[1:5]) for m in YEAR_IN_PARENS.finditer(name)]


def count_videos_under(season_dir: Path) -> int:
    if not season_dir.is_dir():
        return 0
    return sum(
        1
        for p in season_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
    )


def parse_season_from_video_filename(filename: str) -> int | None:
    if m := S_E_PATTERN.search(filename):
        return int(m.group(1))
    if m := X_X_PATTERN.search(filename):
        return int(m.group(1))
    if m := NNN_DASH_PATTERN.match(filename):
        return int(m.group(1))
    if EPISODE_NUM_PATTERN.search(filename) or PART_NUM_PATTERN.search(filename):
        return 1
    if THREE_DIGIT_PREFIX_PATTERN.match(filename):
        return 1
    return None


def analyze_show_folder(
    show_path: Path,
) -> tuple[int | None, int | None, str | None, str]:
    season_dirs = [
        c for c in show_path.iterdir() if c.is_dir() and is_season_like_dir(c.name)
    ]
    years: list[int] = []
    for d in season_dirs:
        years.extend(years_from_name(d.name))
    year_str = str(min(years)) if years else None

    if not season_dirs:
        videos = [
            p
            for p in show_path.iterdir()
            if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
        ]
        if not videos:
            return None, None, None, "No season folders matched"
        for p in videos:
            years.extend(years_from_name(p.name))
        year_str = str(min(years)) if years else None
        season_ids = {
            s
            for p in videos
            if (s := parse_season_from_video_filename(p.name)) is not None
        }
        episodes = len(videos)
        if season_ids:
            seasons = len(season_ids)
            return (
                seasons,
                episodes,
                year_str,
                f"OK (flat layout: {seasons} season(s), {episodes} episode(s))",
            )
        return (
            None,
            episodes,
            year_str,
            f"Flat folder: {episodes} video file(s); season not inferred from filenames",
        )

    episodes = sum(count_videos_under(d) for d in season_dirs)
    seasons = len(season_dirs)
    if episodes > 0:
        return (
            seasons,
            episodes,
            year_str,
            f"OK ({seasons} season(s), {episodes} episode(s))",
        )
    return (
        seasons,
        episodes,
        year_str,
        f"No video files in season folders ({seasons} season folder(s))",
    )


class Command(BaseCommand):
    help = (
        "Sync DRIVE_BASE_PATH/{MOVIES,DOCUMENTARIES,SERIES} into Movie and "
        "Series rows. Omit flags to sync all three. Use --prune to propose "
        "deleting DB rows whose library folder no longer exists on disk."
    )

    def add_arguments(self, parser):
        parser.add_argument("--movies", action="store_true")
        parser.add_argument("--documentaries", action="store_true")
        parser.add_argument("--series", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--yes", action="store_true")
        parser.add_argument(
            "--prune",
            action="store_true",
            help=(
                "After scanning, propose deleting DB rows whose library folder "
                "no longer exists on disk (cascades color palettes for movies)"
            ),
        )
        parser.add_argument(
            "--refetch-imdb",
            action="store_true",
            help="Re-fetch director and year from IMDB even when already set",
        )
        parser.add_argument(
            "--with-length",
            action="store_true",
            help=(
                "Probe each movie file with OpenCV for length (seconds) and "
                "frame count (slow; off by default)"
            ),
        )

    def handle(self, *args, **options):
        refetch_imdb: bool = options["refetch_imdb"]
        dry_run: bool = options["dry_run"]
        apply_all: bool = options["yes"]
        with_length: bool = options["with_length"]
        prune: bool = options["prune"]

        if dry_run and options["yes"]:
            self.stdout.write(self.style.WARNING("--yes is ignored during --dry-run"))

        if not get_drive_base_path():
            self.stdout.write(
                self.style.ERROR(
                    "DRIVE_BASE_PATH is empty; set it in the environment or .env"
                )
            )
            return
        base = drive_base()
        if not base.is_dir():
            self.stdout.write(
                self.style.ERROR(f"DRIVE_BASE_PATH is not a directory: {base}")
            )
            return

        want_movies = options["movies"]
        want_docs = options["documentaries"]
        want_series = options["series"]
        if not (want_movies or want_docs or want_series):
            want_movies = want_docs = want_series = True

        totals = {
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "skipped": 0,
            "deleted": 0,
        }

        libraries: list[tuple[str, str]] = []
        if want_movies:
            libraries.append((LIBRARY_MOVIES, "movie"))
        if want_docs:
            libraries.append((LIBRARY_DOCUMENTARIES, "documentary"))

        for library, movie_type in libraries:
            c, u, un, s, d, quit_, apply_all = self._scan_movies(
                base,
                library,
                movie_type,
                dry_run,
                apply_all,
                with_length,
                prune,
                refetch_imdb,
            )
            totals["created"] += c
            totals["updated"] += u
            totals["unchanged"] += un
            totals["skipped"] += s
            totals["deleted"] += d
            if quit_:
                self._print_summary(dry_run, totals, prune)
                return

        if want_series:
            c, u, un, s, d, quit_, apply_all = self._scan_series(
                base, dry_run, apply_all, prune
            )
            totals["created"] += c
            totals["updated"] += u
            totals["unchanged"] += un
            totals["skipped"] += s
            totals["deleted"] += d

        self._print_summary(dry_run, totals, prune)

    def _print_summary(
        self, dry_run: bool, totals: dict[str, int], prune: bool
    ) -> None:
        c_verb = "Would create" if dry_run else "Created"
        u_verb = "would update" if dry_run else "updated"
        parts = [
            f"{c_verb} {totals['created']}",
            f"{u_verb} {totals['updated']}",
            f"unchanged {totals['unchanged']}",
            f"skipped {totals['skipped']}",
        ]
        if prune:
            d_verb = "would delete" if dry_run else "deleted"
            parts.append(f"{d_verb} {totals['deleted']}")
        self.stdout.write(self.style.SUCCESS(f"\nDone. {', '.join(parts)}."))

    def _scan_movies(
        self,
        base: Path,
        library: str,
        movie_type: str,
        dry_run: bool,
        apply_all: bool,
        with_length: bool,
        prune: bool,
        refetch_imdb: bool,
    ) -> tuple[int, int, int, int, int, bool, bool]:
        root = base / library
        self.stdout.write(
            self.style.NOTICE(f"\n=== {library} ({root}) type={movie_type} ===")
        )
        if not root.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing library root: {root}"))
            return 0, 0, 0, 0, 0, False, apply_all

        subdirs = sorted(
            [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")],
            key=lambda p: p.name.lower(),
        )
        seen_folders = {f"{library}/{p.name}" for p in subdirs}
        created_n = updated_n = unchanged_n = skipped_n = deleted_n = 0

        for folder in subdirs:
            file_path, status = resolve_movie_video(folder)
            title = title_from_dir_name(folder.name)
            if not title:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Passing folder {folder.name!r}: missing title"
                    )
                )
                skipped_n += 1
                continue

            folder_rel = f"{library}/{folder.name}"

            # No unique video: Colab-style skip for creates; may still refresh
            # scan_status on an existing row matched by folder.
            if file_path is None:
                self.stdout.write(self.style.WARNING(f'  Passing "{title}": {status}'))
                existing = Movie.objects.filter(
                    Q(path=folder_rel) | Q(path__startswith=f"{folder_rel}/")
                )
                hits = list(existing)
                if len(hits) == 1:
                    obj = hits[0]
                    if obj.scan_status != status:
                        action = "Would update" if dry_run else "Update"
                        self.stdout.write(
                            f'  {action} Movie "{obj.title}" (id={obj.id}):'
                        )
                        self.stdout.write(
                            f"    scan_status: {obj.scan_status!r} -> {status!r}"
                        )
                        if dry_run:
                            updated_n += 1
                        else:
                            do, apply_all, quit_ = prompt_apply(apply_all)
                            if quit_:
                                self.stdout.write(
                                    self.style.WARNING("\nStopped by user.")
                                )
                                return (
                                    created_n,
                                    updated_n,
                                    unchanged_n,
                                    skipped_n,
                                    deleted_n,
                                    True,
                                    apply_all,
                                )
                            if do:
                                obj.scan_status = status
                                obj.save(update_fields=["scan_status"])
                                updated_n += 1
                            else:
                                skipped_n += 1
                    else:
                        unchanged_n += 1
                else:
                    skipped_n += 1
                continue

            length = frames = None
            if with_length:
                length, frames = video_length_and_frames(file_path)
            rel_path = to_relative_path(file_path, base)

            existing_obj = Movie.objects.filter(path=rel_path).first()
            if existing_obj is None:
                folder_hits = list(
                    Movie.objects.filter(
                        Q(path=folder_rel) | Q(path__startswith=f"{folder_rel}/")
                    )
                )
                if len(folder_hits) == 1:
                    existing_obj = folder_hits[0]
                elif len(folder_hits) > 1:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Ambiguous DB match for "{title}" under '
                            f"{folder_rel!r}; skipped"
                        )
                    )
                    skipped_n += 1
                    continue

            director, year = movie_director_and_year(
                title, existing_obj, refetch=refetch_imdb
            )

            new_data = {
                "title": title,
                "type": movie_type,
                "scan_status": status,
                "path": rel_path,
                "director": director,
                "year": year,
                "length": length,
                "frames": frames,
            }

            if existing_obj is None:
                action = "Would create" if dry_run else "Create"
                self.stdout.write(
                    f'  {action} Movie "{title}" path={rel_path!r} '
                    f"year={year!r} director={director!r}"
                )
                if dry_run:
                    created_n += 1
                    continue
                do, apply_all, quit_ = prompt_apply(apply_all)
                if quit_:
                    self.stdout.write(self.style.WARNING("\nStopped by user."))
                    return (
                        created_n,
                        updated_n,
                        unchanged_n,
                        skipped_n,
                        deleted_n,
                        True,
                        apply_all,
                    )
                if not do:
                    skipped_n += 1
                    continue
                Movie.objects.create(**new_data)
                created_n += 1
                continue

            changes = show_movie_diff(existing_obj, new_data)
            if not changes:
                unchanged_n += 1
                continue

            action = "Would update" if dry_run else "Update"
            self.stdout.write(
                f'  {action} Movie "{existing_obj.title}" (id={existing_obj.id}):'
            )
            for key, v in changes.items():
                self.stdout.write(f"    {key}: {v['before']!r} -> {v['after']!r}")
            if dry_run:
                updated_n += 1
                continue
            do, apply_all, quit_ = prompt_apply(apply_all)
            if quit_:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                return (
                    created_n,
                    updated_n,
                    unchanged_n,
                    skipped_n,
                    deleted_n,
                    True,
                    apply_all,
                )
            if not do:
                skipped_n += 1
                continue
            for key, value in new_data.items():
                if value is not None:
                    setattr(existing_obj, key, value)
            existing_obj.path = rel_path
            update_fields = [
                f for f in MOVIE_SCAN_FIELDS if new_data[f] is not None or f == "path"
            ]
            existing_obj.save(update_fields=update_fields)
            updated_n += 1

        if prune:
            d, s, quit_, apply_all = self._prune_orphan_movies(
                library, seen_folders, dry_run, apply_all
            )
            deleted_n += d
            skipped_n += s
            if quit_:
                return (
                    created_n,
                    updated_n,
                    unchanged_n,
                    skipped_n,
                    deleted_n,
                    True,
                    apply_all,
                )

        return created_n, updated_n, unchanged_n, skipped_n, deleted_n, False, apply_all

    def _prune_orphan_movies(
        self,
        library: str,
        seen_folders: set[str],
        dry_run: bool,
        apply_all: bool,
    ) -> tuple[int, int, bool, bool]:
        """Propose deleting Movie rows whose top-level library folder is gone."""
        prefix = f"{library}/"
        candidates = (
            Movie.objects.filter(path__startswith=prefix)
            .prefetch_related("color_palettes")
            .order_by("title", "id")
        )
        orphans = [
            obj
            for obj in candidates
            if (key := library_folder_key(obj.path or "", library)) is not None
            and key not in seen_folders
        ]
        if not orphans:
            self.stdout.write(
                self.style.NOTICE(f"  No orphan Movie rows under {library}/")
            )
            return 0, 0, False, apply_all

        self.stdout.write(
            self.style.NOTICE(
                f"\n--- Prune orphan Movies under {library}/ ({len(orphans)}) ---"
            )
        )
        deleted_n = skipped_n = 0
        for obj in orphans:
            palette_n = obj.color_palettes.count()
            palette_note = (
                f", cascades {palette_n} color palette(s)" if palette_n else ""
            )
            action = "Would delete" if dry_run else "Delete"
            self.stdout.write(
                f'  {action} Movie "{obj.title}" (id={obj.id}) '
                f"path={obj.path!r}{palette_note}"
            )
            if dry_run:
                deleted_n += 1
                continue
            do, apply_all, quit_ = prompt_apply(apply_all)
            if quit_:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                return deleted_n, skipped_n, True, apply_all
            if not do:
                skipped_n += 1
                continue
            obj.delete()
            deleted_n += 1
        return deleted_n, skipped_n, False, apply_all

    def _scan_series(
        self,
        base: Path,
        dry_run: bool,
        apply_all: bool,
        prune: bool,
    ) -> tuple[int, int, int, int, int, bool, bool]:
        root = base / LIBRARY_SERIES
        self.stdout.write(self.style.NOTICE(f"\n=== {LIBRARY_SERIES} ({root}) ==="))
        if not root.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing library root: {root}"))
            return 0, 0, 0, 0, 0, False, apply_all

        show_dirs = sorted(
            [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")],
            key=lambda p: p.name.lower(),
        )
        seen_folders = {f"{LIBRARY_SERIES}/{p.name}" for p in show_dirs}
        created_n = updated_n = unchanged_n = skipped_n = deleted_n = 0

        for show_path in show_dirs:
            seasons, episodes, year, scan_status = analyze_show_folder(show_path)
            rel_path = f"{LIBRARY_SERIES}/{show_path.name}"
            fields = {
                "title": show_path.name,
                "path": rel_path,
                "seasons": seasons,
                "episodes": episodes,
                "year": year,
                "scan_status": scan_status,
            }
            obj = Series.objects.filter(path=rel_path).first()

            if obj is None:
                action = "Would create" if dry_run else "Create"
                self.stdout.write(
                    f"  {action} Series {fields['title']!r} path={rel_path!r} "
                    f"seasons={seasons} episodes={episodes}"
                )
                if dry_run:
                    created_n += 1
                    continue
                do, apply_all, quit_ = prompt_apply(apply_all)
                if quit_:
                    self.stdout.write(self.style.WARNING("\nStopped by user."))
                    return (
                        created_n,
                        updated_n,
                        unchanged_n,
                        skipped_n,
                        deleted_n,
                        True,
                        apply_all,
                    )
                if not do:
                    skipped_n += 1
                    continue
                Series.objects.create(**fields)
                created_n += 1
                continue

            diffs = {
                k: (getattr(obj, k), v)
                for k, v in fields.items()
                if getattr(obj, k) != v
            }
            if not diffs:
                unchanged_n += 1
                continue

            action = "Would update" if dry_run else "Update"
            self.stdout.write(f"  {action} Series id={obj.id} {obj.title!r}:")
            for k, (old, new) in diffs.items():
                self.stdout.write(f"    {k}: {old!r} -> {new!r}")
            if dry_run:
                updated_n += 1
                continue
            do, apply_all, quit_ = prompt_apply(apply_all)
            if quit_:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                return (
                    created_n,
                    updated_n,
                    unchanged_n,
                    skipped_n,
                    deleted_n,
                    True,
                    apply_all,
                )
            if not do:
                skipped_n += 1
                continue
            for k, v in fields.items():
                setattr(obj, k, v)
            obj.save(update_fields=list(SERIES_SCAN_FIELDS))
            updated_n += 1

        if prune:
            d, s, quit_, apply_all = self._prune_orphan_series(
                seen_folders, dry_run, apply_all
            )
            deleted_n += d
            skipped_n += s
            if quit_:
                return (
                    created_n,
                    updated_n,
                    unchanged_n,
                    skipped_n,
                    deleted_n,
                    True,
                    apply_all,
                )

        return created_n, updated_n, unchanged_n, skipped_n, deleted_n, False, apply_all

    def _prune_orphan_series(
        self,
        seen_folders: set[str],
        dry_run: bool,
        apply_all: bool,
    ) -> tuple[int, int, bool, bool]:
        """Propose deleting Series rows whose show folder is gone."""
        prefix = f"{LIBRARY_SERIES}/"
        candidates = Series.objects.filter(path__startswith=prefix).order_by(
            "title", "id"
        )
        orphans = [
            obj
            for obj in candidates
            if (key := library_folder_key(obj.path or "", LIBRARY_SERIES)) is not None
            and key not in seen_folders
        ]
        if not orphans:
            self.stdout.write(
                self.style.NOTICE(f"  No orphan Series rows under {LIBRARY_SERIES}/")
            )
            return 0, 0, False, apply_all

        self.stdout.write(
            self.style.NOTICE(
                f"\n--- Prune orphan Series under {LIBRARY_SERIES}/ "
                f"({len(orphans)}) ---"
            )
        )
        deleted_n = skipped_n = 0
        for obj in orphans:
            action = "Would delete" if dry_run else "Delete"
            self.stdout.write(
                f'  {action} Series "{obj.title}" (id={obj.id}) path={obj.path!r}'
            )
            if dry_run:
                deleted_n += 1
                continue
            do, apply_all, quit_ = prompt_apply(apply_all)
            if quit_:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                return deleted_n, skipped_n, True, apply_all
            if not do:
                skipped_n += 1
                continue
            obj.delete()
            deleted_n += 1
        return deleted_n, skipped_n, False, apply_all
