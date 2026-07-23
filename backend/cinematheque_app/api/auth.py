import secrets
from datetime import datetime

from django.conf import settings
from django.utils.dateparse import parse_datetime
from ninja.errors import HttpError
from ninja.security import APIKeyHeader


class ApiWriteKey(APIKeyHeader):
    """Authenticate write endpoints with a shared secret in the X-API-Key header."""

    param_name = "X-API-Key"

    def authenticate(self, request, key: str | None):
        expected = (settings.API_WRITE_KEY or "").strip()
        if expected and key and secrets.compare_digest(key, expected):
            return key
        return None


api_write_key = ApiWriteKey()


def parse_optional_datetime(value: str | datetime | None) -> datetime | None:
    """Parse an optional ISO datetime string, or pass through a datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    parsed = parse_datetime(value)
    if parsed is None:
        raise HttpError(400, f"Invalid datetime: {value!r}")
    return parsed
