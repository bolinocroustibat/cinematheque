# Movie Color Palettes

A web application that displays color palettes extracted from movies.
Goes hand in hand with the [movies-palettes](https://github.com/adriencarpentier/movies-palettes-backend) backend script to generate the data.

## Stack

- [Bun](https://bun.sh) 1.0.x or higher
- **Language**: TypeScript
- **Framework**: SvelteKit 2.x with Svelte 5, served by [svelte-adapter-bun](https://github.com/gornostay25/svelte-adapter-bun)
- **Styling**: TailwindCSS 4
- **Build Tool**: Vite
- **Deployment**: Docker image built by GitHub Actions with automatic versioning
- **Code Linting and Formatting**: [Biome](https://biomejs.dev)

## Architecture

The app has no database of its own: movie and palette data come from the Cinematheque Django backend (`../backend`).

The app is server-side rendered under the `/palettes` base path. On each request, `src/routes/+page.server.ts`:

1. fetches `GET ${API_URL}/api/movies` from the Bun server (the browser never calls the backend directly),
2. filters out documentaries,
3. sorts each palette's colors by proximity,
4. passes the result to `+page.svelte` for SSR and hydration.

## Configuration

Environment variables are read at runtime (`$env/dynamic/private`) from the repo-root `.env`:

| Variable      | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `API_URL`     | Backend base URL. Defaults to `http://localhost:${API_PORT}`. Docker Compose sets `http://backend:8000`. |
| `API_PORT`    | Backend port used for the default `API_URL` (default `8000`).                                       |
| `ENVIRONMENT` | Deployment environment name.                                                                        |

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

This produces a standalone Bun server in `build/`. Run it with:

```bash
bun build/index.js
```

or preview the prod build with Vite:

```bash
bun run preview
```

## Docker

The `Dockerfile` builds the app and runs `bun index.js` on port 3000. In `docker-compose.yaml`, the `frontend-palettes` service is published on `FRONTEND_PALETTES_PORT` (default `3001`).

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
