"""
Sync local Drive MOVIES / DOCUMENTARIES / SERIES under DRIVE_BASE_PATH into
Movie / Series rows (library-relative paths).

Movies/docs follow the legacy Colab notebook (one video file per folder).
OpenCV length/frames is opt-in via ``--with-length`` (slow on large libraries).
Series use season folders or flat episode filenames.

    export DRIVE_BASE_PATH=".../My Drive"
    uv run manage.py sync_local_drive
    uv run manage.py sync_local_drive --movies --dry-run
    uv run manage.py sync_local_drive --movies --with-length
"""

import os
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Q

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


# --- Movies / documentaries (Colab-style) --------------------------------


def extract_movie_info_from_dir_name(name: str) -> tuple[str, str | None, str | None]:
    name = name.strip()
    match = re.match(
        r"^(.*?) \((\d{4}), ([A-Z][a-z]+(?:[- ][A-Z][a-z]+)+)\)$",
        name,
    )
    if match:
        title, year, director = match.groups()
        return title.strip(), year, director.strip()
    match = re.match(r"^(.*?) \((\d{4})\)$", name)
    if match:
        title, year = match.groups()
        return title.strip(), year, None
    match = re.match(
        r"^(.*?) \(([A-Z][a-z]+(?:[- ][A-Z][a-z]+)+)\)$",
        name,
    )
    if match:
        title, director = match.groups()
        return title.strip(), None, director.strip()
    return re.sub(r" \([^)]+\)$", "", name).strip(), None, None


def list_video_files(folder: Path) -> list[Path]:
    files: list[Path] = []
    for pattern in VIDEO_GLOBS:
        files.extend(folder.glob(pattern))
    return sorted(set(files), key=lambda p: p.name.lower())


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
        "Series rows. Omit flags to sync all three."
    )

    def add_arguments(self, parser):
        parser.add_argument("--movies", action="store_true")
        parser.add_argument("--documentaries", action="store_true")
        parser.add_argument("--series", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--yes", action="store_true")
        parser.add_argument(
            "--with-length",
            action="store_true",
            help=(
                "Probe each movie file with OpenCV for length (seconds) and "
                "frame count (slow; off by default)"
            ),
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        apply_all: bool = options["yes"]
        with_length: bool = options["with_length"]

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

        totals = {"created": 0, "updated": 0, "unchanged": 0, "skipped": 0}

        libraries: list[tuple[str, str]] = []
        if want_movies:
            libraries.append((LIBRARY_MOVIES, "movie"))
        if want_docs:
            libraries.append((LIBRARY_DOCUMENTARIES, "documentary"))

        for library, movie_type in libraries:
            c, u, un, s, quit_, apply_all = self._scan_movies(
                base, library, movie_type, dry_run, apply_all, with_length
            )
            totals["created"] += c
            totals["updated"] += u
            totals["unchanged"] += un
            totals["skipped"] += s
            if quit_:
                self._print_summary(dry_run, totals)
                return

        if want_series:
            c, u, un, s, quit_, apply_all = self._scan_series(base, dry_run, apply_all)
            totals["created"] += c
            totals["updated"] += u
            totals["unchanged"] += un
            totals["skipped"] += s

        self._print_summary(dry_run, totals)

    def _print_summary(self, dry_run: bool, totals: dict[str, int]) -> None:
        c_verb = "Would create" if dry_run else "Created"
        u_verb = "would update" if dry_run else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {c_verb} {totals['created']}, {u_verb} {totals['updated']}, "
                f"unchanged {totals['unchanged']}, skipped {totals['skipped']}."
            )
        )

    def _scan_movies(
        self,
        base: Path,
        library: str,
        movie_type: str,
        dry_run: bool,
        apply_all: bool,
        with_length: bool,
    ) -> tuple[int, int, int, int, bool, bool]:
        root = base / library
        self.stdout.write(
            self.style.NOTICE(f"\n=== {library} ({root}) type={movie_type} ===")
        )
        if not root.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing library root: {root}"))
            return 0, 0, 0, 0, False, apply_all

        subdirs = sorted(
            [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")],
            key=lambda p: p.name.lower(),
        )
        created_n = updated_n = unchanged_n = skipped_n = 0

        for folder in subdirs:
            files_paths = list_video_files(folder)
            file_path: Path | None = None
            if len(files_paths) == 1:
                file_path = files_paths[0]
                status = "OK"
            elif len(files_paths) == 0:
                status = "No movie file found"
            else:
                status = "More than 1 video file found:"
                for f in files_paths:
                    status += f' "{f.name}"'

            title, year, director = extract_movie_info_from_dir_name(folder.name)
            if not file_path:
                self.stdout.write(self.style.WARNING(f'  Passing "{title}": {status}'))
                skipped_n += 1
                continue
            if not title:
                self.stdout.write(
                    self.style.WARNING(f'  Passing "{file_path}": missing title')
                )
                skipped_n += 1
                continue

            length = frames = None
            if with_length:
                length, frames = video_length_and_frames(file_path)

            rel_path = to_relative_path(file_path, base)
            new_data = {
                "title": title,
                "type": movie_type,
                "scan_status": status,
                "path": rel_path,
                "director": director,
                "year": str(year) if year is not None else None,
                "length": length,
                "frames": frames,
            }

            existing = Movie.objects.filter(path=rel_path).first()
            if existing is None:
                folder_rel = f"{library}/{folder.name}"
                folder_hits = list(
                    Movie.objects.filter(
                        Q(path=folder_rel) | Q(path__startswith=f"{folder_rel}/")
                    )
                )
                if len(folder_hits) == 1:
                    existing = folder_hits[0]
                elif len(folder_hits) > 1:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Ambiguous DB match for "{title}" under '
                            f"{folder_rel!r}; skipped"
                        )
                    )
                    skipped_n += 1
                    continue

            if existing is None:
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
                    return created_n, updated_n, unchanged_n, skipped_n, True, apply_all
                if not do:
                    skipped_n += 1
                    continue
                Movie.objects.create(**new_data)
                created_n += 1
                continue

            changes = show_movie_diff(existing, new_data)
            if not changes:
                unchanged_n += 1
                continue

            action = "Would update" if dry_run else "Update"
            self.stdout.write(
                f'  {action} Movie "{existing.title}" (id={existing.id}):'
            )
            for key, v in changes.items():
                self.stdout.write(f"    {key}: {v['before']!r} -> {v['after']!r}")
            if dry_run:
                updated_n += 1
                continue
            do, apply_all, quit_ = prompt_apply(apply_all)
            if quit_:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                return created_n, updated_n, unchanged_n, skipped_n, True, apply_all
            if not do:
                skipped_n += 1
                continue
            for key, value in new_data.items():
                if value is not None:
                    setattr(existing, key, value)
            existing.path = rel_path
            existing.save(
                update_fields=[
                    f
                    for f in MOVIE_SCAN_FIELDS
                    if new_data[f] is not None or f == "path"
                ]
            )
            updated_n += 1

        return created_n, updated_n, unchanged_n, skipped_n, False, apply_all

    def _scan_series(
        self,
        base: Path,
        dry_run: bool,
        apply_all: bool,
    ) -> tuple[int, int, int, int, bool, bool]:
        root = base / LIBRARY_SERIES
        self.stdout.write(self.style.NOTICE(f"\n=== {LIBRARY_SERIES} ({root}) ==="))
        if not root.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing library root: {root}"))
            return 0, 0, 0, 0, False, apply_all

        show_dirs = sorted(
            [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")],
            key=lambda p: p.name.lower(),
        )
        created_n = updated_n = unchanged_n = skipped_n = 0

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
                    return created_n, updated_n, unchanged_n, skipped_n, True, apply_all
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
                return created_n, updated_n, unchanged_n, skipped_n, True, apply_all
            if not do:
                skipped_n += 1
                continue
            for k, v in fields.items():
                setattr(obj, k, v)
            obj.save(update_fields=list(SERIES_SCAN_FIELDS))
            updated_n += 1

        return created_n, updated_n, unchanged_n, skipped_n, False, apply_all
