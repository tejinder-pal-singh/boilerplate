#!/bin/bash

# Load environment variables
set -a
source ../.env
set +a

# Configuration
BACKUP_DIR="../backups/database"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  echo "Using latest backup by default..."
  BACKUP_FILE="$BACKUP_DIR/latest.sql.gz"
else
  BACKUP_FILE="$1"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Confirm restore
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

# Create temporary directory
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Decompress backup if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing backup..."
  gunzip -c "$BACKUP_FILE" > "$TMP_DIR/backup.sql"
  BACKUP_FILE="$TMP_DIR/backup.sql"
fi

# Drop existing connections
echo "Dropping existing connections..."
psql -h $DB_HOST -U $DB_USER -d postgres << EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF

# Drop and recreate database
echo "Recreating database..."
psql -h $DB_HOST -U $DB_USER -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

# Restore backup
echo "Restoring backup..."
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -c \
  "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Database restored successfully"
else
  echo "Restore failed"
  exit 1
fi

# Run migrations if needed
if [ -f "../node_modules/.bin/typeorm" ]; then
  echo "Running migrations..."
  cd .. && pnpm migrate:latest
fi
