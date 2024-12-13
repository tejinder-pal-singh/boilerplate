# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

# Copy frontend package.json
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN pnpm install

# Copy source code
COPY apps/frontend ./apps/frontend
COPY packages ./packages

# Build application
RUN pnpm --filter @app/frontend build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built assets
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/src ./src
COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/next.config.js ./

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
