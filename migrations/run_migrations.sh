#!/bin/bash
# Database Migration Script for Error Tracking
# This script runs the error tracking database migrations

set -e

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Shapers Error Tracking Database Migration ===${NC}"
echo ""
echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Build connection string
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! $PSQL_CMD -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}Error: Could not connect to database.${NC}"
    echo "Please check your database configuration and ensure PostgreSQL is running."
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"
MIGRATION_DIR="$(dirname "$0")"

for migration in "$MIGRATION_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo -e "${YELLOW}Applying migration: $(basename "$migration")${NC}"
        if $PSQL_CMD -f "$migration"; then
            echo -e "${GREEN}✓ Migration applied successfully${NC}"
        else
            echo -e "${RED}✗ Migration failed${NC}"
            exit 1
        fi
        echo ""
    fi
done

echo -e "${GREEN}=== All migrations completed successfully ===${NC}"
echo ""
echo "You can now use the error tracking system!"
echo ""
echo "Example usage:"
echo "  - View errors: SELECT * FROM error_summary;"
echo "  - View recent errors: SELECT * FROM recent_errors;"
echo "  - Get statistics: SELECT * FROM error_statistics;"
