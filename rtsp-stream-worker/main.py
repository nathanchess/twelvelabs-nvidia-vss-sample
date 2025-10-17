import asyncio
import os
import yaml
import signal
import sys
import fastapi
import uvicorn
import uuid
import secrets
import requests
import cv2
import boto3
import numpy as np
import aiohttp

from PIL import Image
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from helpers import read_stream, find_open_port, find_open_rtp_rtcp_ports
from dotenv import load_dotenv

load_dotenv()
config_lock = asyncio.Lock()

# Container Variables
central_server = None
directory_path = os.path.dirname(__file__)
stream_mappings = {}
processing_status = {}  
preset_video_files = {
    "TextileFactory": [
        (os.path.join(directory_path, "preset", "textile1.mp4"), "Sewing-Machine-1"),
        (os.path.join(directory_path, "preset", "textile2.mp4"), "Textile-Machine-1")
    ],
    "ConstructionSite": [
        (os.path.join(directory_path, "preset", "pipes.mp4"), "Pipe-Work-1"),
        (os.path.join(directory_path, "preset", "closeup.mp4"), "Closeup-Work-1"),
        (os.path.join(directory_path, "preset", "dirt.mp4"), "Dirt-Work-1")
    ],
    "MachineryFactory": [
        (os.path.join(directory_path, "preset", "steel.mp4"), "Steel-Machine-1"),
        (os.path.join(directory_path, "preset", "sugar.mp4"), "Sugar-Machine-1"),
        (os.path.join(directory_path, "preset", "sharp.mp4"), "Sharp-Machine-1"),
        (os.path.join(directory_path, "preset", "flamethrower.mp4"), "Flame-Machine-1"),
        (os.path.join(directory_path, "preset", "clothes.mp4"), "Clothes-Machine-1")
    ]
}
temp_video_folder_path = os.path.join(directory_path, 'temp')

# API Setup
s3_client = boto3.client('s3',
    region_name=os.getenv('AWS_REGION', '').strip('"'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID', '').strip('"'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY', '').strip('"')
)

class RemuxServer:

    def __init__(self, config_path: str):

        if not config_path:
            raise ValueError(f"Invalid config path: {config_path}")
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")

        local_mediamtx_path = '/usr/local/bin/mediamtx'

        if not os.path.exists(local_mediamtx_path):
            raise FileNotFoundError(f"MediaMTX executable not found: {local_mediamtx_path}")

        self.MEDIAMTX_PATH = local_mediamtx_path

        self.config_path = config_path
        self.mediamtx_process = None
        self.cloudflared_process = None

        self.hls_public_url = None
        self._shutdown = False

    async def _start_cloudflare_tunnel(self):

        """ Initiate a Cloudflare tunnel into container for reverse SSH tunneling """

        self.cloudflared_process = await asyncio.create_subprocess_exec(
            "cloudflared",
            "tunnel",
            "--url", "http://localhost:8888",
            "--no-autoupdate",
            "--no-tls-verify",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        while self.hls_public_url is None:
            line = await self.cloudflared_process.stderr.readline()
            if not line:
                break
            line_str = line.decode('utf-8').strip()
            print(f"[cloudflared] {line_str}") # Print logs for debugging

            # Use regex to find the temporary cloudflare URL
            if '.trycloudflare.com' in line_str:
                words = line_str.split()
                for word in words:
                    if word.startswith('https://') and word.endswith('.trycloudflare.com'):
                        self.hls_public_url = word
                        print(f'[SERVER] Captured Cloudflare URL: {self.hls_public_url}')
                        break 
        
        if self.hls_public_url is None:
            raise Exception('Failed to capture Cloudflare URL')
        
    async def start(self):

        """ Launches MediaMTX remuxing server """

        print("[SERVER] Starting MediaMTX remuxing server...")

        async with config_lock:

            central_config = {
                'hlsSegmentDuration': '4s',
                'hlsPartDuration': '1s',
                'paths': {},
            }

            with open(self.config_path, 'w') as f:
                yaml.dump(central_config, f)

            self.mediamtx_process = await asyncio.create_subprocess_exec(
                self.MEDIAMTX_PATH,
                self.config_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            asyncio.create_task(read_stream(self.mediamtx_process.stdout, '[MEDIAMTX]'))
            asyncio.create_task(read_stream(self.mediamtx_process.stderr, '[MEDIAMTX]'))

            await asyncio.sleep(2)

            print('[SERVER] Opening Cloudflare tunnel...')

            await self._start_cloudflare_tunnel()

        print("[SERVER] MediaMTX remuxing server started with Cloudflare tunnel: ", self.hls_public_url)

    async def cleanup(self):
        """Clean up subprocesses properly"""
        
        print("[SERVER] Cleaning up processes...")

        self._shutdown = True
        
        if self.cloudflared_process:
            try:
                self.cloudflared_process.terminate()
                await asyncio.wait_for(self.cloudflared_process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.cloudflared_process.kill()
            except Exception as e:
                print(f"[SERVER] Error cleaning up cloudflared: {e}")
        
        if self.mediamtx_process:
            try:
                self.mediamtx_process.terminate()
                await asyncio.wait_for(self.mediamtx_process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.mediamtx_process.kill()
            except Exception as e:
                print(f"[SERVER] Error cleaning up mediamtx: {e}")
        
        print("[SERVER] Cleanup complete")

    def signal_handler(self, signum, frame):
        
        """Handle shutdown signals"""
        
        print(f"\n[SERVER] Received signal {signum}, shutting down...")
        asyncio.create_task(self.cleanup())

    async def add_stream(self, public_rtsp_url: str, stream_name: str):

        """ Given public video URL, add it to the MediaMTX config """

        print(f"[SERVER] Adding stream {stream_name} with public URL {public_rtsp_url}")

        async with config_lock:

            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
                if 'paths' not in config:
                    config['paths'] = {}
            

            config['paths'][stream_name] = {
                'source': public_rtsp_url,
                'rtspTransport': 'tcp',
            }

            with open(self.config_path, 'w') as f:
                yaml.dump(config, f)

            print(f"[SERVER] Added stream {stream_name} with public URL {public_rtsp_url}")

        if sys.platform != 'win32' and self.mediamtx_process:
            try:
                self.mediamtx_process.send_signal(signal.SIGUSR1)
            except Exception as e:
                print(f"[SERVER] Error sending signal to mediamtx: {e}")

        hls_url = f"{self.hls_public_url}/{stream_name}/index.m3u8"
        print(f"[SERVER] HLS URL for stream {stream_name}: {hls_url}")
        return hls_url

class RTSPStreamManager:

    def __init__(self, video_file_path: str, stream_name: str = None):

        self.video_file_path = video_file_path
        self.local_rtsp_port = find_open_port()
        self.local_udp_rtp_port, self.local_udp_rtcp_port = find_open_rtp_rtcp_ports()

        if not stream_name:
            self.serial_number = secrets.token_urlsafe(16)
        else:
            self.serial_number = stream_name
        
        self.config_path = f"mediamtx_cam_{self.serial_number}.yml"

        self.rtsp_url = None
        
        self.mediamtx_process = None
        self.ffmpeg_process = None
        self.tunnel_process = None

        print(f"Initialized RTSP Stream Manager with ports: {self.local_rtsp_port}, {self.local_udp_rtp_port}, and {self.local_udp_rtcp_port} ")

    async def _log_stream(self, stream, prefix):
        """Helper function to read and print stream output."""
        while True:
            chunk = await stream.read(1024)
            if chunk:
                print(f"{prefix} {chunk.decode(errors='ignore').rstrip()}")
            else:
                break

    async def start(self):

        """ Use FFmpeg to convert the video file to an RTSP stream. """

        try:

            mediamtx_url = f'rtsp://127.0.0.1:8554/{self.serial_number}'

            ffmpeg_command = [
                'ffmpeg', '-re', '-fflags', '+genpts', '-stream_loop', '-1', '-i', self.video_file_path,
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2', 
                '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
                '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
                '-f', 'rtsp', '-rtsp_transport', 'tcp', mediamtx_url
            ]
        
            self.ffmpeg_process = await asyncio.create_subprocess_exec(
                *ffmpeg_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                limit=1024 * 1024  # 1 MB buffer limit
            )

            asyncio.create_task(self._log_stream(self.ffmpeg_process.stdout, '[FFMPEG]'))
            #asyncio.create_task(self._log_stream(self.ffmpeg_process.stderr, '[FFMPEG]'))

            await asyncio.sleep(2)

            if self.ffmpeg_process.returncode is not None:
                print(f"FFmpeg process exited prematurely with code: {self.ffmpeg_process.returncode}")
                print("Check the [FFMPEG_ERROR] logs above for the reason.")
                return

            self.rtsp_url = mediamtx_url

            print(f"[FFMPEG] Started RTSP stream with URL: {mediamtx_url}")
        
        except Exception as e:
        
            print(f"[FFMPEG] Error: {e}")

    async def cleanup(self):

        """ Clean up subprocesses """

        if self.ffmpeg_process:
            self.ffmpeg_process.terminate()
            try:
                await asyncio.wait_for(self.ffmpeg_process.wait(), timeout=3.0)
            except asyncio.TimeoutError:
                self.ffmpeg_process.kill()
                await self.ffmpeg_process.wait()
            self.ffmpeg_process = None

class PPE_CV_PIPELINE:

    def __init__(self):

        self.model_path = os.path.join(directory_path, "cv_model_best.pt")

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")

        self.model = YOLO(self.model_path)

    def _draw_boxes(self, frame, results) -> np.ndarray:

        results_list = results[0]

        for box in results_list.boxes:
            x1, y1, x2, y2 = [int(coord) for coord in box.xyxy[0]]
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = self.model.model.names[class_id]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{class_name}: {confidence:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame


    def _analyze_image(self, image_frame: np.ndarray):

        results = self.model.predict(image_frame, conf=0.4, iou=0.45, max_det=1000, device=0)
        frame = self._draw_boxes(image_frame, results)
        return frame

    def analyze_video(self, video_source: str):
        
        if os.path.exists(video_source):
            
            video_source_basename = video_source[:-4]
            video_capture = cv2.VideoCapture(video_source)
            new_video_source = os.path.join(os.path.dirname(video_source), f"{os.path.basename(video_source_basename)}_processed.mp4")

            if not os.path.exists(new_video_source):
                os.makedirs(os.path.dirname(new_video_source), exist_ok=True)

            # Get video properties for VideoWriter
            fps = int(video_capture.get(cv2.CAP_PROP_FPS))
            width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Initialize VideoWriter
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(new_video_source, fourcc, fps, (width, height))

            while True:
                ret, frame = video_capture.read()
                if not ret:
                    break
                results = self.model.predict(frame, conf=0.25, iou=0.45, max_det=1000, device=0)
                processed_frame = self._draw_boxes(frame, results)
                
                # Write frame to output video
                video_writer.write(processed_frame)

            video_capture.release()
            video_writer.release()
            return new_video_source
        else:
            raise FileNotFoundError(f"Video file not found: {video_source}")

async def main():

    global central_server

    media_mtx_config_path = os.path.join(directory_path, 'config.yaml')
    central_server = RemuxServer(config_path=media_mtx_config_path)
    
    # Set up signal handlers for graceful shutdown
    if sys.platform != 'win32':
        signal.signal(signal.SIGINT, central_server.signal_handler)
        signal.signal(signal.SIGTERM, central_server.signal_handler)
    
    try:

        await central_server.start()
        
        while central_server.hls_public_url is None:
            await asyncio.sleep(1)
        
        print(f"[SERVER] Server ready! Cloudflare tunnel: {central_server.hls_public_url}")

        # Keep the server running
        while not central_server._shutdown:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("\n[SERVER] Keyboard interrupt received, shutting down...")
    except Exception as e:
        print(f"[SERVER] Error: {e}")
    finally:
        await central_server.cleanup()

async def load_stream(request: fastapi.Request):
    global central_server

    if central_server is None:
        return fastapi.Response(status_code=503, content="Server not initialized yet")

    data = await request.json()

    stream_name, public_file_url = data.get('stream_name'), data.get('public_file_url')

    if stream_name in stream_mappings:
        return JSONResponse(status_code=200, content=stream_mappings[stream_name])

    if stream_name in preset_video_files:

        file_urls = preset_video_files[stream_name]

        if not stream_name in stream_mappings:
            stream_mappings[stream_name] = []

        for video_file_path, video_name in file_urls:
            print(f"[SERVER] Adding stream {stream_name} with video file path {video_name}")
            local_rtsp = RTSPStreamManager(video_file_path=video_file_path, stream_name=video_name)

            await central_server.add_stream(local_rtsp.rtsp_url, video_name)
            await local_rtsp.start()
            
            stream_mappings[stream_name].append(f'{central_server.hls_public_url}/{video_name}/index.m3u8')
        
        print(f"[SERVER] Stream mappings: {stream_mappings}")

        stream_mappings[stream_name] = jsonable_encoder(stream_mappings[stream_name])

        return JSONResponse(status_code=200, content=stream_mappings[stream_name])

    else: 

        return JSONResponse(status_code=200, content=[])

async def get_stream(request: fastapi.Request):

    global central_server

    if central_server is None:
        return fastapi.Response(status_code=503, content="Server not initialized yet")

    data = await request.json()
    stream_name = data.get('stream_name')

    if stream_name not in stream_mappings:
        return JSONResponse(status_code=200, content=jsonable_encoder([]))
    
    return JSONResponse(status_code=200, content=jsonable_encoder(stream_mappings[stream_name]))

async def _upload_chunk(chunk_file_path: str):
    """Upload a single chunk file to NVIDIA VSS asynchronously"""
    
    try:
        # Check if file exists and get its size
        if not os.path.exists(chunk_file_path):
            print(f"[SERVER] Error: Chunk file does not exist: {chunk_file_path}")
            return None
            
        file_size = os.path.getsize(chunk_file_path)
        print(f"[SERVER] Uploading chunk: {os.path.basename(chunk_file_path)} (size: {file_size} bytes)")
        
        # Get NVIDIA VSS URL
        nvidia_vss_url = os.getenv('NVIDIA_VSS_BASE_URL', '').strip('"')
        if not nvidia_vss_url:
            print(f"[SERVER] Error: NVIDIA_VSS_BASE_URL environment variable not set")
            return None
            
        print(f"[SERVER] Using NVIDIA VSS URL: {nvidia_vss_url}")
        
        # Prepare form data for multipart upload
        data = aiohttp.FormData()
        with open(chunk_file_path, 'rb') as f:
            data.add_field('file', f, filename=os.path.basename(chunk_file_path), content_type='video/mp4')
            data.add_field('purpose', 'vision')
            data.add_field('media_type', 'video')
            
            timeout = aiohttp.ClientTimeout(total=3000)  # 50 minute timeout for large files
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(f"{nvidia_vss_url}/files", data=data) as response:
                    if not response.ok:
                        response_text = await response.text()
                        print(f"[SERVER] Error uploading chunk to NVIDIA VSS: {response.status}")
                        print(f"[SERVER] Response body: {response_text}")
                        return None
                    
                    try:
                        response_data = await response.json()
                        if 'id' not in response_data:
                            print(f"[SERVER] Error: Response missing 'id' field: {response_data}")
                            return None
                            
                        chunk_file_id = response_data['id']
                        print(f"[SERVER] Successfully uploaded chunk to NVIDIA VSS: {chunk_file_id}")
                        return chunk_file_id
                    except Exception as json_error:
                        print(f"[SERVER] Error parsing JSON response: {json_error}")
                        response_text = await response.text()
                        print(f"[SERVER] Raw response: {response_text}")
                        return None
                    
    except Exception as e:
        print(f"[SERVER] Exception during chunk upload: {str(e)}")
        return None

async def add_stream(request: fastapi.Request):

    global central_server
    
    data = await request.json()
    stream_name = data.get('stream_name')
    s3_video_key = data.get('s3_video_key')

    if not stream_name or not s3_video_key:
        return JSONResponse(status_code=400, content=jsonable_encoder({"error": "Missing stream name or S3 video URL"}))

    # Start the processing task in the background
    asyncio.create_task(process_video_background(stream_name, s3_video_key))
    
    # Return immediately to avoid blocking FastAPI
    return JSONResponse(status_code=202, content=jsonable_encoder({
        "message": "Video processing started", 
        "stream_name": stream_name,
        "status": "processing"
    }))

async def process_video_background(stream_name: str, s3_video_key: str):
    """Process video in the background without blocking FastAPI"""
    
    try:
        # Initialize processing status
        processing_status[stream_name] = {
            "status": "downloading",
            "progress": 0,
            "message": "Starting video download...",
            "started_at": asyncio.get_event_loop().time()
        }
        
        print(f"[BACKGROUND] Starting video processing for {stream_name}")
        
        # Fetch S3 video URL
        s3_video_url = s3_client.generate_presigned_url('get_object', Params={'Bucket': os.getenv('AWS_SOURCE_S3_BUCKET', '').strip('"'), 'Key': s3_video_key}, ExpiresIn=3600)
        print(f"[BACKGROUND] S3 video URL: {s3_video_url}")

        # Download the video file asynchronously
        processing_status[stream_name]["status"] = "downloading"
        processing_status[stream_name]["message"] = "Downloading video from S3..."
        video_file_path = await download_video_async(s3_video_url, stream_name)
        print(f"[BACKGROUND] Downloaded video file to {video_file_path}")

        # Process video with CV pipeline in thread pool to avoid blocking
        #processing_status[stream_name]["status"] = "processing"
        #processing_status[stream_name]["message"] = "Running computer vision analysis..."
        #processed_video_file_path = await process_video_cv_async(video_file_path)
        #print(f"[BACKGROUND] Processed video file to {processed_video_file_path}")

        # Chunk the video file
        processing_status[stream_name]["status"] = "chunking"
        processing_status[stream_name]["message"] = "Chunking video into segments..."
        chunk_output_folder = await chunk_video_async(video_file_path, stream_name)
        print(f"[BACKGROUND] Chunked video into {chunk_output_folder}")

        # Upload chunks to NVIDIA VSS
        processing_status[stream_name]["status"] = "uploading"
        processing_status[stream_name]["message"] = "Uploading chunks to NVIDIA VSS..."
        await upload_chunks_async(chunk_output_folder)
        print(f"[BACKGROUND] Uploaded all chunks for {stream_name}")
        
        # Mark as completed
        processing_status[stream_name]["status"] = "completed"
        processing_status[stream_name]["message"] = "Video processing completed successfully"
        processing_status[stream_name]["progress"] = 100
        processing_status[stream_name]["completed_at"] = asyncio.get_event_loop().time()

        # Clean up temporary files
        os.remove(video_file_path)
        #os.remove(processed_video_file_path)
        for chunk_file in os.listdir(chunk_output_folder):
            os.remove(os.path.join(chunk_output_folder, chunk_file))
        os.rmdir(chunk_output_folder)
        
        print(f"[BACKGROUND] Video processing completed successfully for {stream_name}")
        
    except Exception as e:
        processing_status[stream_name]["status"] = "error"
        processing_status[stream_name]["message"] = f"Error: {str(e)}"
        print(f"[BACKGROUND] Error processing video {stream_name}: {e}")

async def download_video_async(s3_video_url: str, stream_name: str) -> str:
    """Download video file asynchronously"""
    
    video_file_path = os.path.join(temp_video_folder_path, f"{stream_name}.mp4")
    
    # Use aiohttp for async HTTP requests
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(s3_video_url) as response:
            response.raise_for_status()
            with open(video_file_path, 'wb') as f:
                async for chunk in response.content.iter_chunked(8192):
                    f.write(chunk)
    
    return video_file_path

async def process_video_cv_async(video_file_path: str) -> str:
    """Process video with CV pipeline in thread pool"""
    
    def run_cv_processing():
        ppe_cv_pipeline = PPE_CV_PIPELINE()
        return ppe_cv_pipeline.analyze_video(video_file_path)
    
    # Run CPU-intensive CV processing in thread pool
    loop = asyncio.get_event_loop()
    processed_video_file_path = await loop.run_in_executor(None, run_cv_processing)
    
    return processed_video_file_path

async def chunk_video_async(processed_video_file_path: str, stream_name: str) -> str:
    """Chunk video file asynchronously"""
    
    # Get video duration
    video_capture = cv2.VideoCapture(processed_video_file_path)
    frame_count = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = video_capture.get(cv2.CAP_PROP_FPS)
    video_duration = frame_count / fps
    video_capture.release()

    if video_duration < 60:
        chunk_duration = video_duration
    else:
        chunk_duration = video_duration / 30

    chunk_output_folder = os.path.join(temp_video_folder_path, f"{stream_name}_chunks")
    os.makedirs(chunk_output_folder, exist_ok=True)

    output_pattern = os.path.join(chunk_output_folder, f"{stream_name}_chunk_%04d.mp4".replace(" ", "_"))

    ffmpeg_chunk_command = [
        'ffmpeg',
        '-i', processed_video_file_path,
        '-c', 'copy',
        '-map', '0',
        '-segment_time', str(chunk_duration),
        '-f', 'segment',
        '-reset_timestamps', '1',
        output_pattern
    ]

    print(f"[BACKGROUND] Chunking video file into {chunk_duration} second chunks...")

    ffmpeg_chunk_process = await asyncio.create_subprocess_exec(
        *ffmpeg_chunk_command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    asyncio.create_task(_log_stream(ffmpeg_chunk_process.stdout, '[FFMPEG_CHUNK]'))
    asyncio.create_task(_log_stream(ffmpeg_chunk_process.stderr, '[FFMPEG_CHUNK_ERROR]'))

    await asyncio.wait_for(ffmpeg_chunk_process.wait(), timeout=3600)
    if ffmpeg_chunk_process.returncode != 0:
        raise Exception(f"Error chunking video file: {ffmpeg_chunk_process.returncode}")

    # Verify that chunk files were actually created
    chunk_files = [f for f in os.listdir(chunk_output_folder) if f.endswith('.mp4')]
    if not chunk_files:
        raise Exception(f"No chunk files were created in {chunk_output_folder}")
    
    print(f"[BACKGROUND] Successfully created {len(chunk_files)} chunk files")
    for chunk_file in chunk_files:
        chunk_path = os.path.join(chunk_output_folder, chunk_file)
        file_size = os.path.getsize(chunk_path)
        print(f"  - {chunk_file}: {file_size} bytes")

    return chunk_output_folder

async def upload_chunks_async(chunk_output_folder: str):
    """Upload all chunks asynchronously"""
    
    # List all chunk files
    chunk_files = [f for f in os.listdir(chunk_output_folder) if f.endswith('.mp4')]
    print(f"[BACKGROUND] Found {len(chunk_files)} chunk files to upload")
    
    if not chunk_files:
        print(f"[BACKGROUND] No chunk files found in {chunk_output_folder}")
        return
    
    upload_tasks = []
    for chunk_file in chunk_files:
        chunk_file_path = os.path.join(chunk_output_folder, chunk_file)
        upload_tasks.append(asyncio.create_task(_upload_chunk(chunk_file_path)))

    # Wait for all uploads to complete
    results = await asyncio.gather(*upload_tasks, return_exceptions=True)
    
    # Log detailed results
    successful_uploads = []
    failed_uploads = []
    
    for i, result in enumerate(results):
        chunk_file = chunk_files[i]
        if result is not None and not isinstance(result, Exception):
            successful_uploads.append((chunk_file, result))
        else:
            error_msg = str(result) if isinstance(result, Exception) else "Unknown error"
            failed_uploads.append((chunk_file, error_msg))
    
    print(f"[BACKGROUND] Upload completed: {len(successful_uploads)} successful, {len(failed_uploads)} failed")
    
    if successful_uploads:
        print(f"[BACKGROUND] Successful uploads:")
        for chunk_file, file_id in successful_uploads:
            print(f"  - {chunk_file} -> {file_id}")
    
    if failed_uploads:
        print(f"[BACKGROUND] Failed uploads:")
        for chunk_file, error in failed_uploads:
            print(f"  - {chunk_file}: {error}")

async def get_processing_status(request: fastapi.Request):
    """Get the processing status of a video"""
    
    data = await request.json()
    stream_name = data.get('stream_name')
    
    if not stream_name:
        return JSONResponse(status_code=400, content=jsonable_encoder({"error": "Missing stream name"}))
    
    if stream_name not in processing_status:
        return JSONResponse(status_code=404, content=jsonable_encoder({"error": "Stream not found"}))
    
    return JSONResponse(status_code=200, content=jsonable_encoder(processing_status[stream_name]))

async def run_server():

    """Run both the MediaMTX server and FastAPI concurrently"""
    
    # Start the MediaMTX server in the background
    server_task = asyncio.create_task(main())
    
    # Wait a bit for the server to initialize
    await asyncio.sleep(5)
    
    # Create FastAPI app

    app = fastapi.FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "rtsp-stream-worker"}
    
    app.post("/load_stream")(load_stream)
    app.post("/get_stream")(get_stream)
    app.post("/add_stream")(add_stream)
    app.post("/get_processing_status")(get_processing_status)

    # Start FastAPI server
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    
    # Run both concurrently
    await asyncio.gather(server_task, server.serve())

async def _log_stream(stream, prefix):
    """Helper function to read and print stream output."""
    while True:
        line = await stream.readline()
        if line:
            print(f"{prefix} {line.decode().strip()}")
        else:
            break

if __name__ == "__main__":  
    asyncio.run(run_server())