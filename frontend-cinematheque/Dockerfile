# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build arguments for environment variables
ARG VITE_TMDB_KEY
ARG VITE_OMDB_KEY
ARG ENVIRONMENT

# Set environment variables for build
ENV VITE_TMDB_KEY=${VITE_TMDB_KEY}
ENV VITE_OMDB_KEY=${VITE_OMDB_KEY}
ENV ENVIRONMENT=${ENVIRONMENT}

# Build the application (Vite outputs to dist/)
RUN bun run build

# Production stage
FROM oven/bun:latest
WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/build ./
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["bun", "index.js", "--port", "3000"]
