# Cinémathèque

Manage movies, TV series, books, and comics: a **Django API** (PostgreSQL) and a **SvelteKit** app (color palettes). See [`AGENTS.md`](AGENTS.md) for stack details and day-to-day commands.

| Part | Path |
|------|------|
| API | `backend/` |
| Palettes (SvelteKit) | `frontend-palettes/` |

---

## Installation with Docker

### Prerequisites

- Docker
- Docker Compose

### Quick start

```bash
cp .env.example .env   # edit secrets (see Environment variables below)
docker compose up -d
```

Open:

- **Palettes:** `http://localhost:3001` (`MOVIES_PALETTES_PORT`)
- **API:** `http://localhost:8000` (`API_PORT`)

### Docker configuration

```bash
MOVIES_PALETTES_PORT=8080 docker compose up -d
TAG=v1.0.0 docker compose up -d
```

Compose reads the project root `.env`.

**Environment variables (summary):**

- **Backend:** `DJANGO_SECRET_KEY`, Postgres (`POSTGRES_*`), `CORS_*` as in [`.env.example`](.env.example).
- **Poster auto-fill** (films / documentaries on the server): `TMDB_API_KEY` (required for that feature); `OMDB_API_KEY` optional (TMDB fallback).
- **Optional:** `LLM_API_KEY` (movie recommendations), `API_URL` (backend URL for Palettes server-side fetches; default `http://localhost:<API_PORT>`).

### Useful Docker commands

```bash
docker compose logs -f
docker compose down
docker compose build --no-cache
docker compose restart
```

---

## Installation without Docker (local development)

### Prerequisites

- **PostgreSQL** (for Django)
- **Python 3.12+** and [`uv`](https://docs.astral.sh/uv/)
- **Bun** (recommended) or pnpm / npm / yarn for the frontend

### Environment variables

```bash
cp .env.example .env
```

Use the same categories as in the Docker section: backend keys (`TMDB_API_KEY`, `OMDB_API_KEY`, `LLM_API_KEY`, …). `API_URL` / `API_PORT` point the frontend at the API.

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
# dev (single worker), from backend/:
uv run uvicorn cinematheque.asgi:application --reload --host 0.0.0.0 --port 8000
```

### Frontend — Palettes (SvelteKit)

```bash
cd frontend-palettes
bun install
bun run dev
```

Use the same `API_URL` / `ENVIRONMENT` pattern as in `AGENTS.md`.

### Linting and formatting

- **Backend:** from `backend/`: `uv run ruff check --fix . && uv run ruff format .`
- **Frontend:** from `frontend-palettes/`: `bunx biome check --write src/`

---

## Project structure

- `backend/` — Django project; routers under `cinematheque_app/api/`
- `frontend-palettes/` — SvelteKit routes and `src/lib/`
- `docker-compose.yaml` — Postgres, API, Palettes frontend
