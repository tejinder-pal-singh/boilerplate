#!/bin/bash

# Load environment variables
set -a
source ../.env
set +a

# Configuration
BACKUP_DIR="../backups/database"
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).sql"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating database backup..."
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -f "$BACKUP_DIR/$BACKUP_NAME"

if [ $? -eq 0 ]; then
  echo "Backup created successfully: $BACKUP_NAME"
  
  # Compress backup
  echo "Compressing backup..."
  gzip "$BACKUP_DIR/$BACKUP_NAME"
  
  # Clean up old backups
  echo "Cleaning up old backups..."
  find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  # Create symlink to latest backup
  ln -sf "$BACKUP_DIR/$BACKUP_NAME.gz" "$BACKUP_DIR/latest.sql.gz"
  
  echo "Backup process completed successfully"
else
  echo "Backup failed"
  exit 1
fi

# Optional: Upload to cloud storage
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.gz" "s3://$S3_BUCKET/database-backups/"
fi
