#!/bin/bash

echo "Building browser-session Docker image..."

# Check if .env file exists in root directory and load VNC_PASSWORD only
if [ -f .env ]; then
    echo "✅ Found .env file in root directory, loading VNC_PASSWORD..."
    # Source the .env file to load VNC_PASSWORD
    export $(grep -v '^#' .env | xargs)
    if [ ! -z "$VNC_PASSWORD" ]; then
        echo "  Loaded: VNC_PASSWORD=$VNC_PASSWORD"
    else
        echo "  Warning: VNC_PASSWORD not found in .env file"
    fi
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