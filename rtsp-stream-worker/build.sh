#!/bin/bash

# Build script for RTSP Stream Worker Docker container

echo "Building RTSP Stream Worker Docker image..."

# Build the Docker image
docker build -t rtsp-stream-worker:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "  docker run --gpus all -p 8000:8000 -p 8554:8554 -p 1935:1935 rtsp-stream-worker:latest"
    echo ""
    echo "Or use docker-compose:"
    echo "  docker-compose up -d"
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo "Docker build complete!"