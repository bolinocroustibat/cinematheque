from django.utils.html import format_html


def poster_thumbnail(obj, *, height: int = 60):
    """Render a small poster preview from the URLField, or an em dash."""
    if not obj.poster:
        return "—"
    return format_html(
        '<img src="{}" alt="" style="height:{}px;width:auto;border-radius:2px;" />',
        obj.poster,
        height,
    )
