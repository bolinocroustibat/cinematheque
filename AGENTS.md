# AGENTS.md

App: movies, series, books, comics. Backend API + React frontend.

## Backend

- **Stack**: Django 6, django-shinobi (fork of Django Ninja, API is the same), PostgreSQL. Python 3.12+, `uv`, Ruff.
- **Paths**: `backend/cinematheque/` (project, urls, settings), `backend/cinematheque_app/` (models, `api/` routers: movies, series, books, palettes).
- **Conventions**: Add endpoints in `cinematheque_app/api/`; register in `api/__init__.py`. Migrate after model changes. Use ORJSON (see `cinematheque/urls.py`). Run all Python commands with `uv run` (e.g. `uv run python manage.py migrate`). After creating or editing Python code, lint and format: `uv run ruff check --fix . && uv run ruff format .` (from `backend/`).

## Frontend

- **Stack**: React 18, TypeScript, Vite 6. Bun. Biome.
- **Paths**: `frontend/src/` — `App.tsx`, `api/`, `components/`, `types.ts`, `utils/`. Use `@/` alias.
- **Conventions**: Data from backend (`VITE_API_URL`) or Sheets. Keep `types.ts` in sync with API. After creating or editing frontend code, lint and format: `bunx biome check --write .` (from `frontend/`).
