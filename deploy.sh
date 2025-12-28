#!/bin/bash

# Deployment script for VPS
# This script can be run manually or via GitHub Actions

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main || git pull origin master

# Ensure .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please create it before deploying."
    exit 1
fi

# Rebuild and restart containers
echo "🏗️  Building and restarting containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# Check container status
echo "📊 Checking container status..."
docker-compose ps

echo "✅ Deployment completed successfully!"
echo "🔗 Backend: http://localhost:3001"
echo "🔗 Frontend: http://localhost"

