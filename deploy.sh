#!/bin/bash

# Deployment Script for Invoice Processing System
# Usage: ./deploy.sh [staging|production]

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Error: Environment not specified"
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
fi

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "Error: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

echo "======================================"
echo "Deploying to $ENVIRONMENT environment"
echo "======================================"

# Pull latest code from git
echo "1. Pulling latest code from repository..."
git pull origin main

# Install dependencies
echo "2. Installing dependencies..."
npm ci --production

# Copy environment file
echo "3. Setting up environment configuration..."
cp .env.$ENVIRONMENT .env

# Run database migrations
echo "4. Running database migrations..."
npm run migrate

# Build frontend assets (if needed)
echo "5. Building frontend assets..."
# Add any build steps here if you have a build process

# Restart PM2 process
echo "6. Restarting application..."
if [ "$ENVIRONMENT" == "production" ]; then
    pm2 restart invoice-processing-production --update-env
else
    pm2 restart invoice-processing-staging --update-env
fi

# Check application status
echo "7. Checking application status..."
pm2 status

echo "======================================"
echo "Deployment to $ENVIRONMENT completed!"
echo "======================================"

# Show recent logs
echo ""
echo "Recent logs:"
if [ "$ENVIRONMENT" == "production" ]; then
    pm2 logs invoice-processing-production --lines 20 --nostream
else
    pm2 logs invoice-processing-staging --lines 20 --nostream
fi
