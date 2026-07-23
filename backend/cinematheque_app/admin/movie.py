from django.contrib import admin

from ..models import Movie, MovieColorPalette
from .utils import poster_thumbnail


class MovieColorPaletteInline(admin.TabularInline):
    model = MovieColorPalette
    extra = 0
    show_change_link = True
    fields = ("id", "active", "calculation_date", "clusters_nb", "is_black_and_white")
    readonly_fields = ("id", "calculation_date")
    ordering = ("-calculation_date",)
    verbose_name = "Color palette"
    verbose_name_plural = "Color palettes"


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = (
        "poster_thumb",
        "title",
        "director",
        "year",
        "type",
        "scan_status_short",
        "created_at",
    )
    list_display_links = ("poster_thumb", "title")
    list_filter = ("type",)
    search_fields = ("title", "director", "year")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "poster_preview")
    list_per_page = 25

    fieldsets = (
        (
            None,
            {
                "fields": ("title", "type", "year", "director"),
            },
        ),
        (
            "Poster",
            {
                "fields": (
                    "poster",
                    "poster_preview",
                    "rating",
                    "recommendation_source",
                ),
            },
        ),
        (
            "File & scan",
            {
                "fields": ("path", "scan_status"),
                "description": "Path to the media file and result of the file scan.",
            },
        ),
        (
            "Technical",
            {
                "fields": ("length", "frames"),
            },
        ),
        (
            "Dates",
            {
                "fields": ("created_at", "acquired_at", "consumed_at"),
            },
        ),
    )

    @admin.display(description="Poster")
    def poster_thumb(self, obj):
        return poster_thumbnail(obj, height=48)

    @admin.display(description="Poster preview")
    def poster_preview(self, obj):
        return poster_thumbnail(obj, height=240)

    def scan_status_short(self, obj):
        if not obj.scan_status:
            return "—"
        return (
            obj.scan_status[:50] + "…" if len(obj.scan_status) > 50 else obj.scan_status
        )

    scan_status_short.short_description = "Scan status"

    inlines = (MovieColorPaletteInline,)
