#!/bin/bash

# Nexusware EC2 Deployment Script
# This script sets up the backend on a fresh Ubuntu EC2 instance.

echo "--- Starting Nexusware Deployment ---"

# 1. Update and install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 2. Get the code (Assuming git is used)
# git clone <your-repo-url> nexusware
# cd nexusware/backend

# 3. Create .env file if it doesn't exist
# You should manually create/upload your .env file with:
# DATABASE_URL=...
# REDIS_URL=...
# API_URL=...

# 4. Build and run the container
echo "Building Docker image..."
sudo docker build -t nexusware-backend .

echo "Stopping old containers..."
sudo docker stop nexusware-backend-inst || true
sudo docker rm nexusware-backend-inst || true

echo "Starting container..."
sudo docker run -d \
  --name nexusware-backend-inst \
  -p 3001:3001 \
  --env-file .env \
  --restart always \
  nexusware-backend

echo "--- Deployment Complete! ---"
echo "Check logs with: sudo docker logs -f nexusware-backend-inst"
