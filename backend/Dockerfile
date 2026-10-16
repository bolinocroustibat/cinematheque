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

# Run migrations, collect static files, and start the server.
# JSON form is the exec form: no implicit shell. sh -c is still required for &&.
# exec makes Uvicorn PID 1 so it receives signals.
CMD ["sh", "-c", "uv run --no-dev manage.py migrate --noinput && uv run --no-dev manage.py collectstatic --noinput && exec uv run --no-dev uvicorn --host 0.0.0.0 --port 8000 --workers 1 cinematheque.asgi:application"]
