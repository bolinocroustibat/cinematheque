# Cinémathèque

Manage movies, TV series, books, and comics: a **Django API** (PostgreSQL), a **React** app (main UI), and a **SvelteKit** app (color palettes). See [`AGENTS.md`](AGENTS.md) for stack details and day-to-day commands.

| Part | Path |
|------|------|
| API | `backend/` |
| Main UI (React, Vite, Bun) | `frontend-cinematheque/` |
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

- **Cinematheque:** `http://localhost:3000` (override with `APP_PORT`)
- **Palettes:** `http://localhost:3001` (`MOVIES_PALETTES_PORT`)
- **API:** `http://localhost:8000` (`API_PORT`)

### Docker configuration

```bash
APP_PORT=8080 docker compose up -d
TAG=v1.0.0 docker compose up -d
```

Compose reads the project root `.env`.

**Environment variables (summary):**

- **Backend:** `DJANGO_SECRET_KEY`, Postgres (`POSTGRES_*`), `CORS_*` as in [`.env.example`](.env.example).
- **Poster auto-fill** (films / documentaries on the server): `TMDB_API_KEY` (required for that feature); `OMDB_API_KEY` optional (TMDB fallback).
- **Cinematheque build:** `VITE_TMDB_KEY` and optional `VITE_OMDB_KEY` for client-side search (add item, fix poster, suggestions). Omit if you do not use those flows.
- **Optional:** `LLM_API_KEY` (movie recommendations), `API_URL` (backend URL baked into the Cinematheque build; default `http://localhost:<API_PORT>`).

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
- **Bun** (recommended) or pnpm / npm / yarn for the frontends

### Environment variables

```bash
cp .env.example .env
```

Use the same categories as in the Docker section: backend keys (`TMDB_API_KEY`, `OMDB_API_KEY`, `LLM_API_KEY`, …), plus `VITE_*` for Cinematheque when you need TMDB/OMDb in the browser. `API_URL` / `API_PORT` point the frontends at the API (Vite loads env from the repo root when `docker-compose.yaml` is present).

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
# dev (single worker), from backend/:
uv run uvicorn cinematheque.asgi:application --reload --host 0.0.0.0 --port 8000
```

### Frontend — Cinematheque (React)

```bash
cd frontend-cinematheque
bun install    # or: pnpm install / npm install
bun run dev    # or: pnpm dev / npm run dev
```

Dev server default: **`http://localhost:5173`** (Vite).

**Production build**

```bash
cd frontend-cinematheque
bun run build
# output: frontend-cinematheque/dist/
```

**Preview production build**

```bash
bun run preview
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
- **Frontends:** from each app dir: `bunx biome check --write .` (Palettes: `bunx biome check --write src/`)

### Available scripts (Cinematheque)

- `dev` — Vite dev server  
- `build` — production build  
- `preview` — preview `dist/`

---

## Project structure

- `backend/` — Django project; routers under `cinematheque_app/api/`
- `frontend-cinematheque/` — `src/`, `public/`, `vite.config.ts`, `server.ts` (Bun in production)
- `frontend-palettes/` — SvelteKit routes and `src/lib/`
- `docker-compose.yaml` — Postgres, API, both frontends
