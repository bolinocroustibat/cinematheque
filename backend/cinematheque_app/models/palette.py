from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .movie import Movie


class MovieColorPalette(models.Model):
    """
    Color palette model for movies.
    Stores color analysis data including clustering results and calculation parameters.
    """

    id = models.CharField(
        max_length=6,
        primary_key=True,
        help_text="Short unique id (MD5 hex truncated to 6 chars).",
    )
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name="color_palettes",
        null=False,
        blank=False,
        db_column="movie_id",
    )
    active = models.BooleanField(
        default=True,
        help_text="Whether this palette is used for display (e.g. one active per movie).",
    )
    calculation_date = models.DateTimeField(
        default=timezone.now,
        help_text="When the color analysis was run.",
    )
    calculation_duration_seconds = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Duration of calculation in seconds",
    )
    is_black_and_white = models.BooleanField(
        default=False,
        help_text="Whether the analysis detected a predominantly black-and-white movie.",
    )
    colors = models.TextField(
        null=False,
        blank=False,
        help_text='JSON array of hex color strings (e.g. ["#4c4650", ...]).',
    )
    clusters_nb = models.IntegerField(
        null=False,
        blank=False,
        validators=[MinValueValidator(1)],
        help_text="Number of color clusters",
    )
    frame_skip = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Number of frames to skip during analysis",
    )
    resize_width = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Width for resizing frames",
    )
    resize_height = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Height for resizing frames",
    )
    batch_size = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Batch size for processing",
    )
    clustering_method = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Algorithm used for color clustering (e.g. kmeans, cv2).",
    )
    saturation_factor = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Saturation factor applied during analysis (stored as string).",
    )
    saturation_threshold = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Saturation threshold value used during analysis.",
    )
    runtime = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Execution environment for the analysis (e.g. GPU, CPU).",
    )

    class Meta:
        db_table = "movie_color_palettes"
        verbose_name = "Movie Color Palette"
        verbose_name_plural = "Movie Color Palettes"
        ordering = ["-calculation_date"]

    def __str__(self):
        return f"Palette {self.id} for {self.movie.title}"
