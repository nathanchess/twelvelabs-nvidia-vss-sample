## RTSP Stream Worker — MediaMTX, FastAPI, Chunking to NVIDIA VSS

This service simulates/hosts RTSP streams, annotates video with the PPE model, chunks the output, and uploads the chunks to NVIDIA VSS for indexing.

### Environment (.env)
Create a `.env` file in this folder with:

```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_SOURCE_S3_BUCKET=nvidia-vss-source
TWELVELABS_API_KEY=
NVIDIA_VSS_BASE_URL=http://localhost:8080/
```

### Run with Docker
```bash
docker compose up --build
```
The API will be on http://localhost:8000 and the MediaMTX HLS will be exposed via Cloudflare (temporary URL printed in logs).

### Local Dependencies (optional local deployment)
- Cloudflare Tunnel: `cloudflared` must be available in the container/runtime
- MediaMTX binary is expected at `/usr/local/bin/mediamtx` inside the container

If running locally (non‑Docker), install:
```bash
# Cloudflare tunnel
brew install cloudflare/cloudflare/cloudflared   # macOS
choco install cloudflared                        # Windows

# MediaMTX
curl -L https://github.com/bluenviron/mediamtx/releases/latest/download/mediamtx_amd64.tar.gz | tar xz
sudo mv mediamtx /usr/local/bin/
```

### API Endpoints
All endpoints are JSON POST unless noted.

- GET `/health` — service health
- POST `/load_stream`
  - body: `{ "stream_name": string }` (also supports preset groups)
  - returns: list of HLS URLs for the named stream(s)
- POST `/get_stream`
  - body: `{ "stream_name": string }`
  - returns: list of HLS URLs for an existing stream
- POST `/add_stream`
  - body: `{ "stream_name": string, "s3_video_key": string }`
  - action: downloads from S3, runs PPE analysis, chunks, uploads to NVIDIA VSS
  - returns: 202 accepted with processing status
- POST `/get_processing_status`
  - body: `{ "stream_name": string }`
  - returns: detailed processing status/progress

### How It Works
1) Starts a central MediaMTX instance and captures a Cloudflare tunnel URL
2) Streams are added from local files (presets) or S3; FFmpeg pushes RTSP
3) PPE detector annotates frames and writes a processed MP4
4) Processed MP4 is chunked and each chunk is uploaded to NVIDIA VSS `/files`

### Notes
- Inference weights are provided as `cv_model_best.pt`
- Configuration file is managed dynamically at runtime (`config.yaml`)


