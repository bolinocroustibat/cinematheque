# AGENTS.md

App: movies, series, books, comics. Backend API + two frontends.

## Backend

- **Stack**: Django 6, django-shinobi (fork of Django Ninja, API is the same), PostgreSQL. Python 3.12+, `uv`, Ruff.
- **Paths**: `backend/cinematheque/` (project, urls, settings), `backend/cinematheque_app/` (models, `api/` routers: movies, movies_palettes, movies_recommendations, series, books).
- **Conventions**: Add endpoints in `cinematheque_app/api/`; register in `api/__init__.py`. Migrate after model changes. Use ORJSON (see `cinematheque/urls.py`). Run all Python commands with `uv run` (e.g. `uv run python manage.py migrate`). After creating or editing Python code, lint and format: `uv run ruff check --fix . && uv run ruff format .` (from `backend/`).

## Frontend Cinematheque

- **Stack**: React 18, TypeScript, Vite 6. Bun. Biome.
- **Paths**: `frontend-cinematheque/src/` — `App.tsx`, `api/`, `components/`, `types.ts`, `utils/`. Use `@/` alias.
- **Conventions**: Data from backend (`VITE_API_URL`) or Sheets. Keep `types.ts` in sync with API. After creating or editing frontend code, lint and format: `bunx biome check --write .` (from `frontend-cinematheque/`).

## Frontend Palettes

- **Stack**: SvelteKit 2, Svelte 5, TypeScript, Vite 6, Tailwind 4. Bun. Biome.
- **Paths**: `frontend-palettes/src/` — `routes/`, `lib/types.ts`, `lib/utils.ts`.
- **Conventions**: Data from backend (`API_URL` env var, fetched server-side in `+page.server.ts`). After creating or editing frontend code, lint and format: `bunx biome check --write src/` (from `frontend-palettes/`).
