"""
Scan a SERIES root folder (one directory per show, season subfolders) and
upsert Series rows keyed by resolved absolute path.

Run from the backend directory:
    uv run manage.py import_series_from_folder --root "/path/to/SERIES"
    uv run manage.py import_series_from_folder --root "/path/to/SERIES" --dry-run

Season-like child folders match: Season / Saison N, Series N, S01-style token,
or Pilot.
The ``subs`` directory is never treated as a season.

If there are no season folders but video files sit directly in the show folder,
seasons are inferred from filenames (S01E01, 01x01, ``101 - Title``, Episode.N,
Part.N, or ``001 Title`` ordinals).

When season folders exist, only videos under those folders are counted; keep
episode files inside the matching season directory (not loose in the show root).

Otherwise ``seasons`` / ``episodes`` stay empty and ``scan_status`` explains why.
"""

import re
from pathlib import Path

from django.core.management.base import BaseCommand

from cinematheque_app.models import Series

VIDEO_EXTENSIONS = frozenset(
    {".mkv", ".mp4", ".avi", ".m4v", ".webm", ".mov", ".wmv", ".mpg", ".mpeg"}
)

YEAR_IN_PARENS = re.compile(r"\((19|20)\d{2}\)")
SEASON_NUM = re.compile(r"season\s*(\d+)", re.IGNORECASE)
SAISON_NUM = re.compile(r"saison\s*(\d+)", re.IGNORECASE)
SERIES_NUM = re.compile(r"series\s*(\d+)", re.IGNORECASE)
S_TOKEN = re.compile(r"\b[Ss](\d{1,2})\b")
PILOT = re.compile(r"\bpilot\b", re.IGNORECASE)

# Flat layout: videos in show root (no season subfolders)
S_E_PATTERN = re.compile(r"(?i)\bS(\d{1,2})E(\d{1,3})\b")
# ``01x01``: \b fails between digit and ``x`` (both are word chars); use
# lookarounds so ``_-_01x01_-_`` still matches.
X_X_PATTERN = re.compile(r"(?i)(?<![0-9a-z])(\d{1,2})x(\d{1,3})(?![0-9a-z])")
NNN_DASH_PATTERN = re.compile(
    r"^(\d)(\d{2})\s*[-–]\s*"
)  # e.g. 101 - Episode (1-digit season, 2-digit episode)
EPISODE_NUM_PATTERN = re.compile(
    r"(?i)episode\s*\.?\s*(\d{1,3})\b"
)  # e.g. Episode.01 (single-season shows)
PART_NUM_PATTERN = re.compile(r"(?i)\bpart\s*\.?\s*(\d{1,3})\b")
THREE_DIGIT_PREFIX_PATTERN = re.compile(
    r"^(\d{3})\s+"
)  # e.g. 001 Title.avi (ordinal episodes, season 1)


def normalize_root_path_arg(raw: str) -> str:
    """
    Strip and fix a common shell mistake: double-quoted paths that contain a
    backslash before each space are wrong (the backslash is literal). Replace
    backslash-space with a single space.
    """
    s = raw.strip()
    return s.replace("\\ ", " ")


def is_season_like_dir(name: str) -> bool:
    """Return True if an immediate child directory should count as a season bucket."""
    if name.startswith("."):
        return False
    if name.lower() == "subs":
        return False
    lower = name.lower()
    if SEASON_NUM.search(lower):
        return True
    if SAISON_NUM.search(lower):
        return True
    if SERIES_NUM.search(lower):
        return True
    if S_TOKEN.search(name):
        return True
    if PILOT.search(name):
        return True
    return False


def years_from_folder_name(name: str) -> list[int]:
    out: list[int] = []
    for m in YEAR_IN_PARENS.finditer(name):
        out.append(int(m.group(0)[1:5]))
    return out


def _seasons_phrase(n: int) -> str:
    return "1 season" if n == 1 else f"{n} seasons"


def _episodes_phrase(n: int) -> str:
    return "1 episode" if n == 1 else f"{n} episodes"


def _season_folders_phrase(n: int) -> str:
    return "1 season folder" if n == 1 else f"{n} season folders"


def count_videos_under(season_dir: Path) -> int:
    n = 0
    if not season_dir.is_dir():
        return 0
    for p in season_dir.rglob("*"):
        if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS:
            n += 1
    return n


def parse_season_from_video_filename(filename: str) -> int | None:
    """Best-effort season index from common TV filename patterns."""
    if m := S_E_PATTERN.search(filename):
        return int(m.group(1))
    if m := X_X_PATTERN.search(filename):
        return int(m.group(1))
    if m := NNN_DASH_PATTERN.match(filename):
        return int(m.group(1))
    if EPISODE_NUM_PATTERN.search(filename):
        return 1
    if PART_NUM_PATTERN.search(filename):
        return 1
    if THREE_DIGIT_PREFIX_PATTERN.match(filename):
        return 1
    return None


def list_videos_in_show_root(show_path: Path) -> list[Path]:
    """Video files directly under the show folder (not in subfolders)."""
    return [
        p
        for p in show_path.iterdir()
        if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
    ]


def analyze_flat_show_folder(
    show_path: Path,
) -> tuple[int | None, int | None, str | None, str]:
    """
    Show root contains videos but no season-like subfolders.
    Infer seasons from filenames; episode count = video files at root.
    """
    videos = list_videos_in_show_root(show_path)
    if not videos:
        return (None, None, None, "No season folders matched")

    years: list[int] = []
    for p in videos:
        years.extend(years_from_folder_name(p.name))
    year_str: str | None = str(min(years)) if years else None

    season_ids: set[int] = set()
    for p in videos:
        s = parse_season_from_video_filename(p.name)
        if s is not None:
            season_ids.add(s)

    episodes = len(videos)
    if season_ids:
        seasons = len(season_ids)
        scan_status = f"OK (flat layout: {_seasons_phrase(seasons)}, {_episodes_phrase(episodes)})"
        return (seasons, episodes, year_str, scan_status)

    return (
        None,
        episodes,
        year_str,
        f"Flat folder: {episodes} video file(s); season not inferred from filenames",
    )


def analyze_show_folder(
    show_path: Path,
) -> tuple[int | None, int | None, str | None, str]:
    """
    Returns (seasons, episodes, year, scan_status).
    year is the earliest (YYYY) from season folder names, or from filenames in
    flat layout only.
    """
    season_dirs = [
        c for c in show_path.iterdir() if c.is_dir() and is_season_like_dir(c.name)
    ]
    years: list[int] = []
    for d in season_dirs:
        years.extend(years_from_folder_name(d.name))
    year_str: str | None
    if years:
        year_str = str(min(years))
    else:
        year_str = None

    if not season_dirs:
        return analyze_flat_show_folder(show_path)

    episodes = sum(count_videos_under(d) for d in season_dirs)
    seasons = len(season_dirs)
    if episodes > 0:
        scan_status = f"OK ({_seasons_phrase(seasons)}, {_episodes_phrase(episodes)})"
    else:
        scan_status = f"No video files in season folders ({_season_folders_phrase(seasons)} matched)"
    return (seasons, episodes, year_str, scan_status)


class Command(BaseCommand):
    help = (
        "Import or update Series from a folder tree: each direct subdirectory of "
        "--root is one show. Season subfolders (Season N, Series N, S01, Pilot) or "
        "flat video files at show root (S01E01, 01x01, Episode.N, Part.N, NNN - title) "
        "drive counts. "
        "Use --dry-run to preview."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--root",
            type=str,
            required=True,
            help="Absolute or relative path to the SERIES directory",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print actions without writing to the database",
        )

    def handle(self, *args, **options):
        root = Path(normalize_root_path_arg(options["root"])).expanduser()
        if not root.is_absolute():
            root = (Path.cwd() / root).resolve()
        else:
            root = root.resolve()

        dry_run: bool = options["dry_run"]

        if not root.is_dir():
            self.stdout.write(
                self.style.ERROR(f"Error: root is not a directory: {root}")
            )
            return

        show_dirs = sorted(
            [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")],
            key=lambda p: p.name.lower(),
        )

        if not show_dirs:
            self.stdout.write(self.style.WARNING(f"No show directories under {root}"))
            return

        created_n = 0
        updated_n = 0

        for show_path in show_dirs:
            resolved = str(show_path.resolve())
            title = show_path.name
            seasons, episodes, year, scan_status = analyze_show_folder(show_path)

            defaults = {
                "title": title,
                "seasons": seasons,
                "episodes": episodes,
                "year": year,
                "scan_status": scan_status,
            }

            if dry_run:
                exists = Series.objects.filter(path=resolved).exists()
                action = "Would update" if exists else "Would create"
                self.stdout.write(
                    f"  {action}: {title!r} path={resolved!r} "
                    f"seasons={seasons} episodes={episodes} year={year!r} "
                    f"scan_status={scan_status!r}"
                )
                continue

            _obj, created = Series.objects.update_or_create(
                path=resolved,
                defaults=defaults,
            )
            if created:
                created_n += 1
                self.stdout.write(f"  Created series: {title} (path={resolved})")
            else:
                updated_n += 1
                self.stdout.write(f"  Updated series: {title} (path={resolved})")

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDry run: {len(show_dirs)} show(s) would be processed."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone. Created {created_n}, updated {updated_n} series."
                )
            )
