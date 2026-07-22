# python:3.14-slim (alpine is smaller, but longer to build and less compatible)
FROM python:3.14-slim
# Copy latest uv binary from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# PYTHONDONTWRITEBYTECODE=1: no .pyc files (smaller image, faster in containers)
# PYTHONUNBUFFERED=1: logs immediately
# UV_COMPILE_BYTECODE=1: compile deps at install time
# UV_LINK_MODE=copy: copy from cache instead of hardlinking (safer in Docker layers)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1

WORKDIR /app

# Copy source and install dependencies
COPY . .
RUN uv sync --locked --no-install-project

# Document that the container listens on internal port 8000
EXPOSE 8000

# Run migrations, collect static files, and start the server
CMD uv run python manage.py migrate && \
    uv run python manage.py collectstatic --noinput && \
    exec uv run gunicorn cinematheque.asgi:application -w 4 -k uvicorn.workers.UvicornWorker --bind "0.0.0.0:8000"
