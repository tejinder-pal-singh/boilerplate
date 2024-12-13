#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to display the menu
show_menu() {
    echo -e "\n${GREEN}Development Tools Menu${NC}"
    echo "1) Start Development Environment"
    echo "2) Stop Development Environment"
    echo "3) Run Tests"
    echo "4) Run Database Migrations"
    echo "5) Generate Migration"
    echo "6) View Logs"
    echo "7) Check Service Status"
    echo "8) Reset Database"
    echo "9) Lint Code"
    echo "10) Format Code"
    echo "11) Update Dependencies"
    echo "12) Build Project"
    echo "q) Quit"
}

# Function to start development environment
start_dev() {
    echo -e "\n${YELLOW}Starting development environment...${NC}"
    docker-compose up -d
    npm run dev
}

# Function to stop development environment
stop_dev() {
    echo -e "\n${YELLOW}Stopping development environment...${NC}"
    docker-compose down
}

# Function to run tests
run_tests() {
    echo -e "\n${YELLOW}Select test type:${NC}"
    echo "1) All Tests"
    echo "2) Unit Tests"
    echo "3) Integration Tests"
    echo "4) E2E Tests"
    read -p "Enter choice: " test_choice

    case $test_choice in
        1) npm test ;;
        2) npm run test:unit ;;
        3) npm run test:integration ;;
        4) npm run test:e2e ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Function to run database migrations
run_migrations() {
    echo -e "\n${YELLOW}Running database migrations...${NC}"
    npm run typeorm migration:run
}

# Function to generate migration
generate_migration() {
    read -p "Enter migration name: " migration_name
    npm run typeorm migration:generate -- -n $migration_name
}

# Function to view logs
view_logs() {
    echo -e "\n${YELLOW}Select service to view logs:${NC}"
    echo "1) All Services"
    echo "2) Frontend"
    echo "3) Backend"
    echo "4) Database"
    read -p "Enter choice: " log_choice

    case $log_choice in
        1) docker-compose logs -f ;;
        2) docker-compose logs -f frontend ;;
        3) docker-compose logs -f backend ;;
        4) docker-compose logs -f postgres ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Function to check service status
check_status() {
    echo -e "\n${YELLOW}Service Status:${NC}"
    docker-compose ps
}

# Function to reset database
reset_database() {
    echo -e "${RED}Warning: This will delete all data in the database.${NC}"
    read -p "Are you sure? (y/N) " confirm
    if [ "$confirm" = "y" ]; then
        echo -e "\n${YELLOW}Resetting database...${NC}"
        npm run typeorm schema:drop
        npm run typeorm migration:run
        npm run seed:run
    fi
}

# Function to lint code
lint_code() {
    echo -e "\n${YELLOW}Linting code...${NC}"
    npm run lint
}

# Function to format code
format_code() {
    echo -e "\n${YELLOW}Formatting code...${NC}"
    npm run format
}

# Function to update dependencies
update_deps() {
    echo -e "\n${YELLOW}Updating dependencies...${NC}"
    npm update
    npm audit fix
}

# Function to build project
build_project() {
    echo -e "\n${YELLOW}Building project...${NC}"
    npm run build
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice: " choice

    case $choice in
        1) start_dev ;;
        2) stop_dev ;;
        3) run_tests ;;
        4) run_migrations ;;
        5) generate_migration ;;
        6) view_logs ;;
        7) check_status ;;
        8) reset_database ;;
        9) lint_code ;;
        10) format_code ;;
        11) update_deps ;;
        12) build_project ;;
        q) break ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
done

echo -e "\n${GREEN}Goodbye!${NC}"
