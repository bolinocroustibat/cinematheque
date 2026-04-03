# AGENTS.md

App: movies, series, books, comics. Backend API + two frontends.

## Backend

- **Stack**: Django 6, django-shinobi (fork of Django Ninja, API is the same), PostgreSQL. Python 3.12+, `uv`, Ruff.
- **Paths**: `backend/cinematheque/` (project, urls, settings), `backend/cinematheque_app/` (models, `api/` routers: movies, movies_palettes, movies_recommendations, series, books).
- **Conventions**: Add endpoints in `cinematheque_app/api/`; register in `api/__init__.py`. Migrate after model changes. Use ORJSON (see `cinematheque/urls.py`). Run all Python commands with `uv run` (e.g. `uv run python manage.py migrate`). After creating or editing Python code, lint and format: `uv run ruff check --fix . && uv run ruff format .` (from `backend/`).

## Frontend Cinematheque

- **Stack**: SvelteKit 2, Svelte 5, TypeScript, Vite 6, `svelte-adapter-bun`. Bun. Biome.
- **Paths**: `frontend-cinematheque/src/` — `routes/` (`+page.svelte`, `+page.server.ts`, `api/[...path]/+server.ts` proxy), `lib/` (`types.ts`, `api/`, `components/`, `tmdb.ts`, etc.). Static assets in `static/`.
- **Conventions**: Browser calls same-origin `/api/...`, proxied to Django using `API_URL` / `API_PORT` at runtime (`$env/dynamic/private`, same idea as palettes). Initial collection load in `+page.server.ts`. TMDB/OMDB keys: `VITE_TMDB_KEY`, `VITE_OMDB_KEY` at build (`vite` `define` from repo-root `.env`). `ENVIRONMENT` in `import.meta.env.ENVIRONMENT`. Keep `lib/types.ts` in sync with API. After creating or editing frontend code: `bunx biome check --write .` and `bunx svelte-check --tsconfig ./tsconfig.json` (from `frontend-cinematheque/`).

## Frontend Palettes

- **Stack**: SvelteKit 2, Svelte 5, TypeScript, Vite 6, Tailwind 4. Bun. Biome.
- **Paths**: `frontend-palettes/src/` — `routes/`, `lib/types.ts`, `lib/utils.ts`.
- **Conventions**: Same `API_URL` and `ENVIRONMENT` as the rest of the stack (repo-root `.env`, `envDir`); server-side in `+page.server.ts` via `$env/dynamic/private`. After creating or editing frontend code, lint and format: `bunx biome check --write src/` (from `frontend-palettes/`).
