# ==========================================================
# Stage 1: Build & Compile TypeScript
# ==========================================================
FROM node:22-bookworm AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 (native module)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig.json ./
RUN npm ci

# Copy src and tests (referenced in tsconfig.json include)
COPY src/ ./src/
COPY tests/ ./tests/
RUN npm run build

# Prune devDependencies to keep production clean
RUN npm prune --production

# ==========================================================
# Stage 2: Production Runtime with Playwright Chromium
# ==========================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2087
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy node_modules and built code from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Install curl and let playwright install its exact OS dependencies & chromium browser
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Create directories for persistent storage & evidence
RUN mkdir -p /app/data /app/reports/screenshots

# Expose Web Dashboard & SSE Streaming Port
EXPOSE 2087

# Volumes for persistent history & screenshot artifacts
VOLUME ["/app/data", "/app/reports"]

# Healthcheck to verify dashboard availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:2087/api/status || exit 1

CMD ["node", "dist/src/server.js"]
