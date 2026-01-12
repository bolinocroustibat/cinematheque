# Build stage
FROM oven/bun:latest as builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application (Vite outputs to dist/)
RUN bun run build

# Production stage - use Bun to serve static files
FROM oven/bun:latest
WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server script
COPY server.js ./

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["bun", "server.js"]
