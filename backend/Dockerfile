# Use official uv image with Python 3.14 with uv preinstalled
# (alpine is smaller, but longer to build and less compatible)
# https://docs.astral.sh/uv/guides/integration/docker/
FROM ghcr.io/astral-sh/uv:python3.14-trixie-slim

# PYTHONDONTWRITEBYTECODE=1: no .pyc files (smaller image, faster in containers)
# PYTHONUNBUFFERED=1: logs immediately
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_DEV=1

WORKDIR /app
COPY . .
RUN uv sync --locked

EXPOSE 8000

# Run migrations, collect static files, and start the server
CMD uv run python manage.py migrate && \
    uv run python manage.py collectstatic --noinput && \
    exec uv run gunicorn cinematheque.asgi:application -w 4 -k uvicorn.workers.UvicornWorker --bind "0.0.0.0:8000"
