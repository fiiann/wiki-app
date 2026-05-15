# Build stage
FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

# Copy source
COPY package.json bun.lock* ./
COPY src ./src
COPY tsconfig.json vite.config.ts index.html types.ts ./
COPY bunfig.toml ./

# Install and build
RUN bun install --frozen-lockfile
RUN bun run build

# Production stage
FROM oven/bun:1.3.14-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/types.ts ./
COPY --from=builder /app/bunfig.toml ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "await fetch('http://localhost:3001/api/health')" || exit 1

CMD ["bun", "src/server/index.ts"]
