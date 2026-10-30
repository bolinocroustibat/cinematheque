# Movie Color Palettes

A web application that displays color palettes extracted from movies.
Goes hand in hand with the [movies-palettes](https://github.com/adriencarpentier/movies-palettes-backend) backend script to generate the data.

## Stack

- [Bun](https://bun.sh) 1.0.x or higher
- **Language**: TypeScript
- **Framework**: SvelteKit 2.x with Svelte 5, built as a static site with [@sveltejs/adapter-static](https://svelte.dev/docs/kit/adapter-static)
- **Styling**: TailwindCSS 4
- **Build Tool**: Vite
- **Deployment**: [static-web-server](https://static-web-server.net) Docker image built by GitHub Actions with automatic versioning
- **Code Linting and Formatting**: [Biome](https://biomejs.dev)

## Architecture

The app has no database of its own: movie and palette data come from the Cinematheque Django backend (`../backend`).

The app is a static, client-side rendered page (`ssr = false`) under the `/palettes` base path. It expects the backend on the same origin. On each page load, `src/routes/+page.ts`:

1. fetches `GET /api/movies` from the browser,
2. filters out documentaries,
3. sorts each palette's colors by proximity,
4. passes the result to `+page.svelte`.

## Configuration

Nothing to configure in production: the API URL is always same-origin `/api`.

In dev, the Vite server proxies `/api` to the backend, using the repo-root `.env`:

| Variable   | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `API_URL`  | Proxy target. Defaults to `http://localhost:${API_PORT}`.     |
| `API_PORT` | Backend port used for the default target (default `8000`).    |

## Run locally

Start the backend first (see the repo-root README), then:

```bash
bun install
```

```bash
bun run dev
```

The app is available at `http://localhost:5173/palettes`.

## Build

```bash
bun run build
```

This writes the static site to `build/` (with an `index.html` SPA fallback). Preview it with Vite (which also proxies `/api`):

```bash
bun run preview
```

## Docker

The `Dockerfile` builds the app with Bun, then serves `build/` under `/palettes` with static-web-server on port 3000 (no config file). The container only serves static files: the reverse proxy must route `/api` to the backend on the same domain. In `docker-compose.yaml`, the `frontend-palettes` service is published on `FRONTEND_PALETTES_PORT` (default `3001`).

## Check types, lint, format code

To lint and format the code:
```bash
bunx biome check --write src/
```

For type checking and Svelte-specific validations:
```bash
bun run check
```
This will check for TypeScript errors, unused CSS, accessibility issues, and other Svelte-specific warnings.


## LLM-assisted development for Svelte 5

LLMs are not trained to understand the Svelte 5 syntax.
You can use [this](https://svelte-llm.khromov.se) to provide a better understanding of the Svelte 5 syntax to the LLM.
Cursor supports adding context via URL using the [Paste Links feature](https://docs.cursor.com/context/@-symbols/@-link#paste-links): just paste `@https://svelte-llm.khromov.se/svelte` in the chat or composer input.
