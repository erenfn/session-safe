#!/bin/bash

echo "Building browser-session Docker image..."

cd backend

# Build the browser-session image
docker build -f browser-session.Dockerfile -t browser-session .

if [ $? -eq 0 ]; then
    echo "✅ browser-session image built successfully!"
    echo "You can now use the 'New Session' button in the frontend."
    echo ""
    echo "Note: To pass environment variables at runtime, use:"
    echo "docker run --env-file .env browser-session"
    echo "or"
    echo "docker run -e COOKIE_ENCRYPTION_KEY=your_key -e PYTHON_SCRIPT_SECRET=your_secret browser-session"
else
    echo "❌ Failed to build browser-session image"
    exit 1
fi 