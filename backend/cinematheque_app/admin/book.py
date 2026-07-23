from django.contrib import admin

from ..models import Book
from .utils import poster_thumbnail


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = (
        "poster_thumb",
        "title",
        "author",
        "year",
        "type",
        "pages",
        "created_at",
    )
    list_display_links = ("poster_thumb", "title")
    list_filter = ("type",)
    search_fields = ("title", "author", "year", "isbn", "publisher")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "poster_preview")
    list_per_page = 25

    fieldsets = (
        (
            None,
            {
                "fields": ("title", "type", "year", "author"),
            },
        ),
        (
            "Cover",
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
            "Publication",
            {
                "fields": ("publisher", "isbn", "pages"),
            },
        ),
        (
            "File & scan",
            {
                "fields": ("path", "scan_status"),
            },
        ),
        (
            "Dates",
            {
                "fields": ("created_at", "acquired_at", "consumed_at"),
            },
        ),
    )

    @admin.display(description="Cover")
    def poster_thumb(self, obj):
        return poster_thumbnail(obj, height=48)

    @admin.display(description="Cover preview")
    def poster_preview(self, obj):
        return poster_thumbnail(obj, height=240)
