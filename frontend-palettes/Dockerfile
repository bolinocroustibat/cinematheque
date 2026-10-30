# Build stage
FROM oven/bun:slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage: static files only, no config file needed
FROM joseluisq/static-web-server:2

COPY --from=builder /app/build /public/palettes

ENV SERVER_PORT=3000
EXPOSE 3000
