## Frontend (Next.js) — TwelveLabs × NVIDIA VSS UI

This is the Next.js app that powers the search, analysis, agent chatbot, and reporting UI.

### Environment Variables
Create a `.env.local` in `frontend/` with the following keys:

```bash
# AWS (S3 source videos)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_SOURCE_S3_BUCKET='nvidia-vss-source'

# TwelveLabs
TWELVELABS_API_KEY=""
NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID=""
NEXT_PUBLIC_TWELVELABS_PEGASUS_INDEX_ID=""

# Services
NEXT_PUBLIC_RTSP_STREAM_WORKER_URL="http://localhost:8000/"
NEXT_PUBLIC_VSS_BASE_URL="http://127.0.0.1:8080/"
```

For production, rotate and store secrets securely (e.g., Vercel env, Vault).

### Install & Run
```bash
npm install
npm run dev
```

Open http://localhost:3000 to use the app.

### Features
- Action video with live HLS streams
- Video search and chaptering via NVIDIA VSS
- Agent chatbot for Q&A over videos
- Instant compliance report generator
- Upload and analyze videos

### Assets & Branding
Logos in `public/` are used to indicate the NVIDIA GTC 2025 collaboration.
