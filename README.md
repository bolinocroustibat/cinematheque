# Cinémathèque

A React application to manage your collection of movies, TV series, books, and comics.

## 🐳 Installation with Docker

### Prerequisites
- Docker
- Docker Compose

### Quick Start

1. Launch the application with Docker Compose:
```bash
docker compose up -d
```

2. Access the application:
   - Open your browser at `http://localhost:3000`

### Docker Configuration

You can customize the port and environment variables via the `docker-compose.yaml` file or environment variables:

```bash
# Change the port (default: 3000)
APP_PORT=8080 docker compose up -d

# Specify an image version
TAG=v1.0.0 docker compose up -d
```

**Environment Variables for Docker:**

Create a `.env` file in the project root with your API keys (see [Environment Variables](#environment-variables) section). Docker Compose will automatically load variables from the `.env` file and pass them to the build process.

The required variables are:
- `VITE_TMDB_KEY` - Your TMDB API key
- `VITE_OMDB_KEY` - Your OMDb API key (optional)
- `VITE_SHEETS_API` - Your Google Sheets API URL

### Useful Docker Commands

```bash
# View logs
docker compose logs -f frontend

# Stop the application
docker compose down

# Rebuild the image
docker compose build --no-cache

# Restart
docker compose restart
```

## 💻 Installation without Docker (Local Development)

### Prerequisites
- Node.js 18+ or Bun
- pnpm, npm, yarn, or bun

### Environment Variables

Before running the application, you need to configure your environment variables:

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your API keys:
   - **VITE_TMDB_KEY**: Get your API key from [TMDB Settings](https://www.themoviedb.org/settings/api)
   - **VITE_OMDB_KEY**: Get your API key from [OMDb API](https://www.omdbapi.com/apikey.aspx) (optional, used as fallback for movie posters)
   - **VITE_SHEETS_API**: Your Google Apps Script Web App URL

### Installation

1. Install dependencies:

**With Bun (recommended):**
```bash
bun install
```

**With pnpm:**
```bash
pnpm install
```

**With npm:**
```bash
npm install
```

2. Start the development server:
```bash
# With Bun
bun run dev

# With pnpm
pnpm dev

# With npm
npm run dev
```

3. Open your browser at `http://localhost:5173` (Vite default port)

### Production Build

To build the application for production:

```bash
# With Bun
bun run build

# With pnpm
pnpm build

# With npm
npm run build
```

Files will be generated in the `dist/` folder.

### Preview Production Build

To test the production build locally:

```bash
# With Bun
bun run preview

# With pnpm
pnpm preview

# With npm
npm run preview
```

## 📜 Available Scripts

- `dev` - Start the Vite development server
- `build` - Build the application for production
- `preview` - Preview the production build

## 📁 Project Structure

- `src/` - React source code
  - `components/` - React components
  - `api/` - API calls
  - `utils/` - Utilities
- `public/` - Static files (CSS, manifest, etc.)
- `index.html` - HTML entry point
- `vite.config.js` - Vite configuration
- `Dockerfile` - Docker configuration
- `docker-compose.yaml` - Docker Compose configuration
- `server.js` - Bun server for production
