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
