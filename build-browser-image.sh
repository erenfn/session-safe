#!/bin/bash

echo "Building browser-session Docker image..."

# Check if .env file exists in root directory and load VNC_PASSWORD only
if [ -f .env ]; then
    echo "✅ Found .env file in root directory, loading VNC_PASSWORD..."
    # Only export VNC_PASSWORD from .env
    export VNC_PASSWORD=$(grep '^VNC_PASSWORD=' .env | cut -d '=' -f2-)
    echo ""
else
    echo "❌ No .env file found in root directory"
    echo ""
fi

cd backend

# Build the browser-session image
docker build -f browser-session.Dockerfile -t browser-session .

if [ $? -eq 0 ]; then
    echo "✅ browser-session image built successfully!"
    echo "You can now use the 'New Session' button in the frontend."
    echo ""
    echo "Note: VNC_PASSWORD will be passed at runtime from environment variables."
else
    echo "❌ Failed to build browser-session image"
    exit 1
fi 