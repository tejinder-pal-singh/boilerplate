# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install nest CLI
RUN npm install -g @nestjs/cli

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

# Copy backend package.json
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN pnpm install

# Copy source code
COPY apps/backend ./apps/backend
COPY packages ./packages

# Build application
WORKDIR /app/apps/backend
RUN pnpm exec nest build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/backend/package*.json ./

# Copy built assets
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Start application
CMD ["pnpm", "run", "start:prod"]
