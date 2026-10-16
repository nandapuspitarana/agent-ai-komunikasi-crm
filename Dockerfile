# Stage 1: Build dependency cache & compile
FROM node:22-slim AS builder

WORKDIR /app

# Install system utilities needed for debian builds
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy lock files and manifests
COPY package*.json ./
COPY prisma ./prisma

# Configure npm network resilience against transient connection drops & ECONNRESET
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=300000 \
    npm_config_maxsockets=5

# Install all dependencies (including devDependencies) with cache mount
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Rebuild the CS support flow from userjourney/knowledge base/KB - List of Centres.json so the image
# always carries answers (address, hours, phone, email, map link, ...) that match the knowledge base.
RUN node userjourney/build_cs_support.js

# CRM_VERSION stamps the Flutter SDK archive built by `npm run build` (prebuild hook)
ARG CRM_VERSION=""
ENV CRM_VERSION=$CRM_VERSION

# Build metadata baked into the bundle (see next.config.js -> GET /api/version)
ARG APP_COMMIT=""
ARG APP_BUILT_AT=""
ENV APP_COMMIT=$APP_COMMIT
ENV APP_BUILT_AT=$APP_BUILT_AT

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Remove development dependencies to keep image size small
RUN npm prune --production

# Stage 2: Production runner
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8201
ENV NEXT_TELEMETRY_DISABLED=1

# Build metadata reported by GET /api/version (docker build --build-arg APP_COMMIT=$(git rev-parse --short HEAD) ...)
ARG APP_COMMIT=""
ARG APP_BUILT_AT=""
ENV APP_COMMIT=$APP_COMMIT
ENV APP_BUILT_AT=$APP_BUILT_AT

# Install system utilities needed for debian runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create standard non-root user/group
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built outputs and runtime dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Flutter SDK archive + manifest served by /api/pub (built by scripts/build-sdk-package.js)
COPY --from=builder /app/sdk-dist ./sdk-dist

# Chatbot flow + knowledge base, loaded into the database at start by scripts/docker/sync-knowledge.js
COPY --from=builder /app/userjourney/UserJourney-CS-Support.json ./userjourney/UserJourney-CS-Support.json
COPY --from=builder ["/app/userjourney/knowledge base", "./userjourney/knowledge base"]
COPY --from=builder /app/scripts/docker ./scripts/docker
COPY --from=builder /app/scripts/lib ./scripts/lib

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8201

# Run prisma migration/sync, load flow + knowledge base (never blocks startup), then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && { node scripts/docker/sync-knowledge.js || echo '[sync-knowledge] failed, continuing without knowledge sync'; } && npm run start"]
