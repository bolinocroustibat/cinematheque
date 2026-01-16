FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose the API port
EXPOSE 8000

# Set default port
ENV PORT=8000

# Start the server
CMD ["bun", "run", "server.ts"]
