# Stage 1: Build dependency cache & compile
FROM node:20-alpine AS builder

WORKDIR /app

# Install system utilities needed for alpine builds
RUN apk add --no-cache libc6-compat openssl

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
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8201
ENV NEXT_TELEMETRY_DISABLED=1

# Install system utilities needed for alpine runtime
RUN apk add --no-cache libc6-compat openssl

# Create standard non-root user/group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

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
