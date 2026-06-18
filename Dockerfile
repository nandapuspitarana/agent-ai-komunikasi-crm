# Stage 1: Build dependency cache & compile
FROM node:20-slim AS builder

WORKDIR /app

# Install system utilities needed for debian builds
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy lock files and manifests
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove development dependencies to keep image size small
RUN npm prune --production

# Stage 2: Production runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8201
ENV NEXT_TELEMETRY_DISABLED=1

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

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8201

# Run prisma migration/sync before starting the server
CMD ["sh", "-c", "npx prisma db push && npm run start"]
