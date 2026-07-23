from .book import BookAdmin
from .movie import MovieAdmin, MovieColorPaletteInline
from .palette import MovieColorPaletteAdmin
from .series import SeriesAdmin

__all__ = [
    "BookAdmin",
    "MovieAdmin",
    "MovieColorPaletteAdmin",
    "MovieColorPaletteInline",
    "SeriesAdmin",
]
