import json

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from ..models import MovieColorPalette


@admin.register(MovieColorPalette)
class MovieColorPaletteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "movie_link",
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
                    "colors",
                    "colors_preview",
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

    def movie_link(self, obj):
        from django.urls import reverse

        url = reverse("admin:cinematheque_app_movie_change", args=[obj.movie_id])
        return format_html('<a href="{}">{}</a>', url, obj.movie)

    movie_link.short_description = "Movie"

    def colors_preview(self, obj):
        if not obj.colors:
            return "—"
        try:
            colors = json.loads(obj.colors)
            if not isinstance(colors, list):
                return "—"
            preview = colors[:12]
            spans = "".join(
                format_html(
                    '<span style="display:inline-block;width:24px;height:24px;'
                    'background-color:{};border:1px solid #ccc;margin:1px;" '
                    'title="{}"></span>',
                    c if c.startswith("#") else f"#{c}",
                    c,
                )
                for c in preview
            )
            return format_html(
                '{} <span style="color:#666">({} colors)</span>',
                mark_safe(spans) if spans else "—",
                len(colors),
            )
        except Exception:
            return obj.colors[:100] + "…" if len(obj.colors) > 100 else obj.colors

    colors_preview.short_description = "Colors preview"
