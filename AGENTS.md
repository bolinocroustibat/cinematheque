# AGENTS.md

App: movies, series, books, comics. Backend API + Palettes frontend.

## Backend

- **Stack**: Django 6, django-shinobi (fork of Django Ninja, API is the same), PostgreSQL. Python 3.12+, `uv`, Ruff.
- **Paths**: `backend/cinematheque/` (project, urls, settings), `backend/cinematheque_app/` (models, `api/` routers: movies, movies_palettes, movies_recommendations, series, books).
- **Conventions**: Add endpoints in `cinematheque_app/api/`; register in `api/__init__.py`. Migrate after model changes. Use ORJSON (see `cinematheque/urls.py`). Run all Python commands with `uv run` (e.g. `uv run python manage.py migrate`). After creating or editing Python code, lint and format: `uv run ruff check --fix . && uv run ruff format .` (from `backend/`).

## Frontend Palettes

- **Stack**: SvelteKit 3, Svelte 5, TypeScript 6, Vite 8, Tailwind 4. Bun. Biome.
- **Paths**: `frontend-palettes/src/` — `routes/`, `lib/types.ts`, `lib/utils.ts`.
- **Conventions**: Kit config lives in `vite.config.ts` (`sveltekit({...})`, no `svelte.config.js`); import from `src/lib` via `#lib/*.js` (no `$lib`). Repo-root `.env` (`envDir`), only for the dev proxy (`API_URL` / `API_PORT`); static build (`@sveltejs/adapter-static`, served by static-web-server); data is fetched client-side in `routes/+page.ts` (`ssr = false`) from same-origin `/api` (proxied by Vite in dev, by the reverse proxy in prod). After creating or editing frontend code, lint and format: `bunx biome check --write src/` (from `frontend-palettes/`).
