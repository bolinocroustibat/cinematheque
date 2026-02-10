from django.core.validators import MinValueValidator
from django.db import models

from .base import MediaItem


class Movie(MediaItem):
    """
    Movie model inheriting from MediaItem.
    Includes movie-specific fields: director, length (duration), and frames.
    """

    MOVIE_TYPE_CHOICES = [
        ("movie", "Movie"),
        ("documentary", "Documentary"),
    ]
    type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=MOVIE_TYPE_CHOICES,
        help_text="Kind of film: movie or documentary.",
    )
    director = models.CharField(max_length=255, null=True, blank=True)
    length = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Duration in minutes",
    )
    frames = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Total number of frames",
    )

    class Meta:
        db_table = "movies"
        verbose_name = "Movie"
        verbose_name_plural = "Movies"

    def __str__(self):
        director_str = f" by {self.director}" if self.director else ""
        return f"{self.title} ({self.year}){director_str}"
