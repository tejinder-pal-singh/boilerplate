#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting E2E tests...${NC}"

# Start the development environment
echo -e "${YELLOW}Starting development environment...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Run backend tests
echo -e "${YELLOW}Running backend E2E tests...${NC}"
pnpm test:e2e:backend
BACKEND_EXIT_CODE=$?

# Run frontend tests
echo -e "${YELLOW}Running frontend E2E tests...${NC}"
pnpm test:e2e:frontend
FRONTEND_EXIT_CODE=$?

# Stop development environment
echo -e "${YELLOW}Stopping development environment...${NC}"
docker-compose down

# Check results
if [ $BACKEND_EXIT_CODE -eq 0 ] && [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo -e "${YELLOW}Backend exit code: ${BACKEND_EXIT_CODE}${NC}"
    echo -e "${YELLOW}Frontend exit code: ${FRONTEND_EXIT_CODE}${NC}"
    exit 1
fi
