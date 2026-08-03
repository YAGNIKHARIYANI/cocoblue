import os
import re
import json
import random
import mimetypes
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
VIDEOS_DIR = os.path.join(BASE_DIR, 'videos')
JSON_DATA_PATH = os.path.join(BASE_DIR, 'data', 'videos.json')
MPD_DATA_PATH = os.path.join(PUBLIC_DIR, 'data', 'mpd_links.json')

# Ensure directories exist
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR, exist_ok=True)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in separate threads for simultaneous video streaming."""
    daemon_threads = True

class ReelRequestHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Clean logging
        print(f"[{self.log_date_time_string()}] {args[0]}")

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Range, Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # 1. API: /api/videos - returns 20 HD video feed items shuffled
        if path == '/api/videos':
            self.handle_api_videos()
            return

        # 2. Video Streaming: /videos/stream/<filename>
        if path.startswith('/videos/stream/'):
            filename = urllib.parse.unquote(path[len('/videos/stream/'):])
            self.handle_video_stream(filename)
            return

        # 3. Direct video file access fallback: /videos/<filename>
        if path.startswith('/videos/'):
            filename = urllib.parse.unquote(path[len('/videos/'):])
            self.handle_video_stream(filename)
            return

        # 4. Serve Static Files from /public
        self.handle_static_file(path)

    def handle_api_videos(self):
        standard_videos = []
        mpd_videos = []
        video_files = []
        
        # 1. Load standard videos from data/videos.json
        if os.path.exists(JSON_DATA_PATH):
            try:
                with open(JSON_DATA_PATH, 'r', encoding='utf-8') as f:
                    standard_videos = json.load(f)
                if isinstance(standard_videos, list):
                    random.shuffle(standard_videos)
                    print(f"[API] Loaded and shuffled {len(standard_videos)} standard videos from videos.json")
            except Exception as e:
                print(f"[API Error] Failed to read videos.json: {e}")

        # 2. Load MPD videos from mpd loader/mpd_links.json
        if os.path.exists(MPD_DATA_PATH):
            try:
                with open(MPD_DATA_PATH, 'r', encoding='utf-8') as f:
                    mpd_data = json.load(f)
                videos_dict = mpd_data.get("videos", {})
                for key, item in videos_dict.items():
                    mpd_videos.append({
                        "id": f"mpd_{key}",
                        "reelId": key,
                        "filename": f"{item.get('hash_id', '')}.mpd",
                        "title": f"ગુજરાતી MPD રીલ #{item.get('hash_id', '')}",
                        "streamUrl": item.get("url", ""),
                        "hdLink": item.get("url", ""),
                        "sdLink": item.get("url", ""),
                        "views": str(random.randint(500000, 3000000)),
                        "publishTime": "2026-07-04T00:47:17.000Z",
                        "isMPD": True
                    })
                if mpd_videos:
                    random.shuffle(mpd_videos)
                    print(f"[API] Loaded and shuffled {len(mpd_videos)} MPD videos from mpd_links.json")
            except Exception as e:
                print(f"[API Error] Failed to read mpd_links.json: {e}")

        # 3. Interleave them in the pattern: 1 MPD, 2 Standard
        if mpd_videos and standard_videos:
            mpd_idx = 0
            for i in range(0, len(standard_videos), 2):
                # Add 1 MPD video (wrap around if we run out)
                video_files.append(mpd_videos[mpd_idx % len(mpd_videos)])
                mpd_idx += 1
                
                # Add up to 2 standard videos
                if i < len(standard_videos):
                    video_files.append(standard_videos[i])
                if i + 1 < len(standard_videos):
                    video_files.append(standard_videos[i + 1])
            print(f"[API] Constructed interleaved queue of {len(video_files)} videos (1 MPD, 2 Standard pattern)")
        elif standard_videos:
            video_files = standard_videos
            print(f"[API Fallback] Serving {len(video_files)} standard videos only")
        elif mpd_videos:
            video_files = mpd_videos
            print(f"[API Fallback] Serving {len(video_files)} MPD videos only")

        # Fallback to local ./videos directory if both JSONs are missing or empty
        if not video_files and os.path.exists(VIDEOS_DIR):
            valid_extensions = ('.mp4', '.webm', '.mov', '.m4v', '.mkv', '.avi')
            for file_name in os.listdir(VIDEOS_DIR):
                if file_name.lower().endswith(valid_extensions):
                    full_path = os.path.join(VIDEOS_DIR, file_name)
                    size = os.path.getsize(full_path)
                    clean_title = os.path.splitext(file_name)[0].replace('_', ' ').replace('-', ' ').title()
                    
                    video_files.append({
                        "id": file_name,
                        "filename": file_name,
                        "title": clean_title,
                        "size": size,
                        "streamUrl": f"/videos/stream/{urllib.parse.quote(file_name)}"
                    })
            random.shuffle(video_files)

        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(video_files, ensure_ascii=False).encode('utf-8'))

    def handle_video_stream(self, filename):
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(VIDEOS_DIR, safe_filename)

        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_error(404, "Video file not found")
            return

        file_size = os.path.getsize(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'video/mp4'

        range_header = self.headers.get('Range')

        if range_header:
            match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                end = match.group(2)
                end = int(end) if end else file_size - 1

                if start >= file_size or end >= file_size:
                    self.send_response(416, "Requested Range Not Satisfiable")
                    self.send_header('Content-Range', f'bytes */{file_size}')
                    self.end_headers()
                    return

                chunk_size = (end - start) + 1

                self.send_response(206)
                self.send_cors_headers()
                self.send_header('Content-Type', mime_type)
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                self.send_header('Content-Length', str(chunk_size))
                self.end_headers()

                with open(file_path, 'rb') as f:
                    f.seek(start)
                    bytes_remaining = chunk_size
                    bufsize = 1024 * 64
                    while bytes_remaining > 0:
                        chunk = f.read(min(bufsize, bytes_remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        bytes_remaining -= len(chunk)
                return

        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', mime_type)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(file_size))
        self.end_headers()

        with open(file_path, 'rb') as f:
            bufsize = 1024 * 64
            while True:
                chunk = f.read(bufsize)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def handle_static_file(self, req_path):
        if req_path == '/' or req_path == '':
            req_path = '/index.html'

        clean_path = req_path.lstrip('/')
        safe_path = os.path.normpath(os.path.join(PUBLIC_DIR, clean_path))

        if not safe_path.startswith(PUBLIC_DIR):
            self.send_error(403, "Access denied")
            return

        if not os.path.exists(safe_path) or os.path.isdir(safe_path):
            self.send_error(404, "File not found")
            return

        mime_type, _ = mimetypes.guess_type(safe_path)
        if not mime_type:
            mime_type = 'text/plain'

        file_size = os.path.getsize(safe_path)

        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Length', str(file_size))
        self.end_headers()

        with open(safe_path, 'rb') as f:
            self.wfile.write(f.read())

def run_server():
    server_address = ('', PORT)
    httpd = ThreadedHTTPServer(server_address, ReelRequestHandler)
    print(f"==================================================")
    print(f"  CocoBlue Gujarati Reel Server is Live!")
    print(f"  URL: http://localhost:{PORT}")
    print(f"  20 HD Videos JSON: {JSON_DATA_PATH}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
