#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Setting up development environment...${NC}"

# Check for required tools and versions
echo -e "${YELLOW}Checking required tools...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d "v" -f 2)
if [ $(echo "$NODE_VERSION 18.0.0" | awk '{print ($1 < $2)}') -eq 1 ]; then
    echo -e "${RED}❌ Node.js version must be >= 18.0.0. Current version: $NODE_VERSION${NC}"
    exit 1
fi

# Check Docker
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed. Aborting.${NC}" >&2; exit 1; }
DOCKER_COMPOSE_VERSION=$(docker compose version --short)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker Compose V2 is required but not installed. Aborting.${NC}"
    exit 1
fi

# Check pnpm
command -v pnpm >/dev/null 2>&1 || {
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
}

# Copy environment files
echo -e "${YELLOW}Setting up environment files...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo -e "${YELLOW}⚠️  Please update the secrets in .env file before proceeding${NC}"
    read -p "Press enter to continue"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Setup git hooks
echo -e "${YELLOW}Setting up git hooks...${NC}"
pnpm prepare

# Build packages
echo -e "${YELLOW}Building packages...${NC}"
pnpm build

# Start development environment
echo -e "${YELLOW}Starting development environment...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
pnpm --filter backend db:migrate

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}🚀 Run 'pnpm dev' to start development servers${NC}"
echo -e "${YELLOW}📝 Check the documentation in docs/ for more information${NC}"
