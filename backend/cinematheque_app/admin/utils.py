import json

from django.utils.html import format_html
from django.utils.safestring import mark_safe


def poster_thumbnail(obj, *, height: int = 60):
    """Render a small poster preview from the URLField, or an em dash."""
    if not obj.poster:
        return "—"
    return format_html(
        '<img src="{}" alt="" style="height:{}px;width:auto;border-radius:2px;" />',
        obj.poster,
        height,
    )


def color_to_hex(color) -> str | None:
    """Normalize a palette color to a CSS hex string (#rrggbb).

    Accepts RGB lists/tuples ([56, 51, 62]) or hex strings ("#38333e" / "38333e").
    """
    if isinstance(color, (list, tuple)) and len(color) >= 3:
        r, g, b = (int(color[0]), int(color[1]), int(color[2]))
        return f"#{r:02x}{g:02x}{b:02x}"
    if isinstance(color, str):
        return color if color.startswith("#") else f"#{color}"
    return None


def colors_swatches(obj, *, max_colors: int = 12, size: int = 24):
    """Render color swatches from a palette's JSON colors field."""
    if not obj.colors:
        return "—"
    try:
        colors = json.loads(obj.colors)
        if not isinstance(colors, list) or not colors:
            return "—"
        preview = colors[:max_colors]
        spans = "".join(
            format_html(
                '<span style="display:inline-block;width:{}px;height:{}px;'
                "background-color:{};border:1px solid #ccc;margin:1px;"
                'vertical-align:middle;" title="{}"></span>',
                size,
                size,
                hex_color,
                hex_color,
            )
            for c in preview
            if (hex_color := color_to_hex(c))
        )
        if not spans:
            return "—"
        return format_html(
            '{} <span style="color:#666;font-size:11px;">({})</span>',
            mark_safe(spans),
            len(colors),
        )
    except (json.JSONDecodeError, TypeError, ValueError):
        return "—"
