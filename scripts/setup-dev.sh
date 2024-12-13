#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up development environment...${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18 or later.${NC}"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites are met!${NC}"

# Create environment files if they don't exist
echo -e "\n${YELLOW}Setting up environment files...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}Created .env file${NC}"
fi

if [ ! -f .env.test ]; then
    cp .env.example .env.test
    echo -e "${GREEN}Created .env.test file${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

# Build packages
echo -e "\n${YELLOW}Building packages...${NC}"
npm run build

# Start development environment
echo -e "\n${YELLOW}Starting development environment...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
npm run typeorm migration:run

# Run tests to verify setup
echo -e "\n${YELLOW}Running tests to verify setup...${NC}"
npm test

echo -e "\n${GREEN}Development environment setup complete!${NC}"
echo -e "\nYou can now:"
echo -e "1. Start the development servers with: ${YELLOW}npm run dev${NC}"
echo -e "2. Access the frontend at: ${YELLOW}http://localhost:3000${NC}"
echo -e "3. Access the backend at: ${YELLOW}http://localhost:4000${NC}"
echo -e "4. View API documentation at: ${YELLOW}http://localhost:4000/api${NC}"
echo -e "\nHappy coding! 🚀"
