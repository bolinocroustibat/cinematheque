from django.contrib import admin
from django.utils.html import format_html

from ..models import MovieColorPalette
from .utils import colors_swatches


@admin.register(MovieColorPalette)
class MovieColorPaletteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "movie_link",
        "colors_preview",
        "active",
        "is_black_and_white",
        "clusters_nb",
        "calculation_date",
        "calculation_duration_seconds",
    )
    list_filter = ("active", "is_black_and_white")
    search_fields = ("id", "movie__title")
    date_hierarchy = "calculation_date"
    readonly_fields = ("id", "calculation_date", "colors_preview")
    list_per_page = 25
    autocomplete_fields = ("movie",)

    fieldsets = (
        (
            None,
            {
                "fields": ("id", "movie", "active"),
            },
        ),
        (
            "Result",
            {
                "fields": (
                    "calculation_date",
                    "calculation_duration_seconds",
                    "is_black_and_white",
                    "colors_preview",
                    "colors",
                ),
            },
        ),
        (
            "Parameters",
            {
                "fields": (
                    "clusters_nb",
                    "frame_skip",
                    "resize_width",
                    "resize_height",
                    "batch_size",
                    "clustering_method",
                    "saturation_factor",
                    "saturation_threshold",
                    "runtime",
                ),
            },
        ),
    )

    @admin.display(description="Movie")
    def movie_link(self, obj):
        from django.urls import reverse

        url = reverse("admin:cinematheque_app_movie_change", args=[obj.movie_id])
        return format_html('<a href="{}">{}</a>', url, obj.movie)

    @admin.display(description="Colors")
    def colors_preview(self, obj):
        return colors_swatches(obj, max_colors=12, size=24)
