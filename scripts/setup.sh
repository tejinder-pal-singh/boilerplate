#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Setting up development environment...${NC}"

# Check for required tools
echo -e "${YELLOW}Checking required tools...${NC}"
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..." >&2; npm install -g pnpm; }

# Copy environment files
echo -e "${YELLOW}Setting up environment files...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
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

echo -e "${GREEN}✅ Setup complete! Run 'pnpm dev' to start development servers${NC}"
