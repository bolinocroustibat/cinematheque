# Build stage
FROM oven/bun:slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM oven/bun:slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/build ./

ENV HOST=0.0.0.0 \
    PORT=3000 \
    HOST_HEADER=host \
    PROTOCOL_HEADER=x-forwarded-proto

EXPOSE 3000
CMD ["bun", "index.js"]
