from django.core.validators import MinValueValidator
from django.db import models

from .base import MediaItem


class Series(MediaItem):
    """
    Series model inheriting from MediaItem.
    Includes series-specific fields like seasons and episodes.
    """

    seasons = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Number of seasons",
    )
    episodes = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Total number of episodes",
    )
    creator = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Showrunner or creator of the series.",
    )

    class Meta:
        db_table = "series"
        verbose_name = "Series"
        verbose_name_plural = "Series"

    def __str__(self):
        creator_str = f" by {self.creator}" if self.creator else ""
        return f"{self.title} ({self.year}){creator_str}"
