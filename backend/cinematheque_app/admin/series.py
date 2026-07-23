from django.contrib import admin

from ..models import Series
from .utils import poster_thumbnail


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = (
        "poster_thumb",
        "title",
        "creator",
        "year",
        "seasons",
        "episodes",
        "created_at",
    )
    list_display_links = ("poster_thumb", "title")
    list_filter = ()
    search_fields = ("title", "creator", "year")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "poster_preview")
    list_per_page = 25

    fieldsets = (
        (
            None,
            {
                "fields": ("title", "year", "creator"),
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
            },
        ),
        (
            "Episodes",
            {
                "fields": ("seasons", "episodes"),
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
