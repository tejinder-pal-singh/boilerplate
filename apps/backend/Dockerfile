# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/backend ./apps/backend
COPY packages ./packages

# Build application
RUN npm run build -w @app/backend

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Start application
CMD ["npm", "run", "start:prod"]
