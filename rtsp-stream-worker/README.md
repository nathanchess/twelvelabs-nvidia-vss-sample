# RTSP Stream Worker

A Docker-based service that processes RTSP video streams, performs computer vision analysis using YOLO models, and uploads processed video chunks to NVIDIA VSS (Video Storage Service).

## Features

- **RTSP Stream Processing**: Captures and processes live RTSP video streams
- **Computer Vision Analysis**: Uses YOLO models for object detection and safety compliance monitoring
- **Video Chunking**: Automatically splits long videos into manageable chunks
- **NVIDIA VSS Integration**: Uploads processed video chunks to NVIDIA's Video Storage Service
- **RESTful API**: Provides endpoints for stream management and status monitoring
- **GPU Acceleration**: Leverages NVIDIA CUDA for high-performance video processing

## Prerequisites

- Docker with GPU support (NVIDIA Container Toolkit)
- NVIDIA GPU with CUDA support
- Access to NVIDIA VSS service
- FFmpeg installed in the container

## Quick Start

### 1. Build the Docker Image

```bash
# Using the build script
./build.sh

# Or manually
docker build -t rtsp-stream-worker:latest .
```

### 2. Environment Configuration

Create a `.env` file in the rtsp-stream-worker directory:

```bash
# NVIDIA VSS Configuration
NVIDIA_VSS_BASE_URL=http://your-nvidia-vss-container:8080

# Optional: Other environment variables
# Add any additional configuration here
```

### 3. Running the Container

#### Option A: Standalone Container

```bash
# Basic run (requires NVIDIA VSS to be accessible from host)
docker run --gpus all \
  -p 8000:8000 \
  -p 8554:8554 \
  -p 1935:1935 \
  --env-file .env \
  rtsp-stream-worker:latest
```

#### Option B: Connect to Existing Docker Network

If your NVIDIA VSS service is running in a separate Docker container, you need to connect to the same network:

```bash
# Find the network name of your NVIDIA VSS container
docker network ls

# Inspect the NVIDIA VSS container to get network details
docker inspect your-nvidia-vss-container

# Run on the same network
docker run --gpus all \
  --network your-nvidia-vss-network \
  -p 8000:8000 \
  -p 8554:8554 \
  -p 1935:1935 \
  -e NVIDIA_VSS_BASE_URL=http://your-nvidia-vss-container:8080 \
  rtsp-stream-worker:latest
```

#### Option C: Use Docker Compose

```yaml
version: '3.8'
services:
  rtsp-stream-worker:
    build: .
    container_name: rtsp-stream-worker
    ports:
      - "8000:8000"
      - "8554:8554"
      - "1935:1935"
    env_file:
      - .env
    networks:
      - your-nvidia-vss-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: always

networks:
  your-nvidia-vss-network:
    external: true
```

Then run:
```bash
docker-compose up -d
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the service.

### Add Stream
```
POST /add_stream
Content-Type: application/json

{
  "stream_name": "your-stream-name",
  "s3_video_key": "path/to/video.mp4"
}
```

### Get Stream Mappings
```
GET /get_stream_mappings?stream_name=your-stream-name
```

### Get Processing Status
```
POST /get_processing_status
Content-Type: application/json

{
  "stream_name": "your-stream-name"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NVIDIA_VSS_BASE_URL` | URL of the NVIDIA VSS service | Required |
| `PYTHONUNBUFFERED` | Python output buffering | `1` |
| `PYTHONPATH` | Python module path | `/app` |

### Video Processing Settings

The service automatically:
- Chunks videos longer than 60 seconds into 30-second segments
- Uses YOLO models for object detection
- Uploads chunks to NVIDIA VSS for further processing
- Maintains processing status for each stream

## Troubleshooting

### Common Issues

#### 1. Container Cannot Connect to NVIDIA VSS

**Error**: `Cannot connect to host localhost:8080`

**Solution**: Ensure both containers are on the same Docker network:
```bash
# Check networks
docker network ls

# Inspect container networks
docker inspect your-nvidia-vss-container

# Run on the same network
docker run --network your-nvidia-vss-network ...
```

#### 2. GPU Not Available

**Error**: `No GPU devices found`

**Solution**: Ensure NVIDIA Container Toolkit is installed and use `--gpus all`:
```bash
docker run --gpus all ...
```

#### 3. Upload Failures

**Error**: `Upload completed: 0 successful, 1 failed`

**Solution**: Check the detailed logs for specific error messages. Common causes:
- Network connectivity issues
- Invalid NVIDIA VSS URL
- Authentication problems
- File size limits

### Debugging

Enable verbose logging by checking the container logs:
```bash
docker logs rtsp-stream-worker
```

The service provides detailed logging for:
- Video chunking process
- Upload attempts and results
- Error messages with specific details
- Network connectivity issues

## Development

### Building from Source

1. Clone the repository
2. Navigate to the rtsp-stream-worker directory
3. Build the Docker image:
   ```bash
   docker build -t rtsp-stream-worker:latest .
   ```

### Testing

Test the service by sending a request to add a stream:
```bash
curl -X POST http://localhost:8000/add_stream \
  -H "Content-Type: application/json" \
  -d '{"stream_name": "test-stream", "s3_video_key": "test/video.mp4"}'
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   RTSP Stream   │───▶│  RTSP Worker     │───▶│  NVIDIA VSS     │
│                 │    │  (This Service)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Video Chunks    │
                       │  (YOLO Analysis) │
                       └──────────────────┘
```

## License

[Add your license information here]

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review container logs for detailed error messages
3. Ensure all prerequisites are met
4. Verify network connectivity between containers
