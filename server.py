import os
import re
import json
import mimetypes
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
VIDEOS_DIR = os.path.join(BASE_DIR, 'videos')

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

        # 1. API: /api/videos - returns video feed list
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
        video_files = []
        valid_extensions = ('.mp4', '.webm', '.mov', '.m4v', '.mkv', '.avi')
        
        if os.path.exists(VIDEOS_DIR):
            for file_name in os.listdir(VIDEOS_DIR):
                if file_name.lower().endswith(valid_extensions):
                    full_path = os.path.join(VIDEOS_DIR, file_name)
                    size = os.path.getsize(full_path)
                    
                    # Format clean title from filename
                    clean_title = os.path.splitext(file_name)[0].replace('_', ' ').replace('-', ' ').title()
                    
                    video_files.append({
                        "id": file_name,
                        "filename": file_name,
                        "title": clean_title,
                        "size": size,
                        "streamUrl": f"/videos/stream/{urllib.parse.quote(file_name)}"
                    })

        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(video_files).encode('utf-8'))

    def handle_video_stream(self, filename):
        # Prevent directory traversal attacks
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
            # Handle Byte-Range requests for streaming
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

        # Full file transfer if no Range specified
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

        # Strip leading slash
        clean_path = req_path.lstrip('/')
        safe_path = os.path.normpath(os.path.join(PUBLIC_DIR, clean_path))

        # Check path security
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
    print(f"  Reel Video Scrolling Server is Live!")
    print(f"  URL: http://localhost:{PORT}")
    print(f"  Streaming directory: {VIDEOS_DIR}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
