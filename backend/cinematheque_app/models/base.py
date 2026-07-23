from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class MediaItem(models.Model):
    """
    Abstract base class for movies, series, and books.
    Contains common fields shared across all media types.
    """

    title = models.CharField(max_length=255, null=False, blank=False)
    recommendation_source = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Where this item was recommended from (e.g. friend, review site).",
    )
    poster = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="URL of the poster or cover image.",
    )
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Personal rating from 1 to 5.",
    )
    scan_status = models.CharField(
        max_length=1000,
        null=True,
        blank=True,
        help_text="Result of scanning the path for a video file (e.g. OK, No movie file found, More than 1 video file found: ...).",
    )
    path = models.CharField(
        max_length=500,
        unique=True,
        null=True,
        blank=True,
        help_text=(
            "Library-relative path to the media file or folder "
            "(e.g. MOVIES/Title/file.mkv), without Drive mount prefix."
        ),
    )
    year = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Release or publication year.",
    )
    created_at = models.DateTimeField(
        null=False,
        blank=False,
        default=timezone.now,
        help_text="When the record was added to the database.",
    )
    acquired_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the item was physically added to the collection (bought, downloaded, etc.).",
    )
    consumed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the item was watched or read.",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.year})"
