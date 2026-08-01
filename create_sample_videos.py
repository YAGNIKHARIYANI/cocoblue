import os
import urllib.request

VIDEOS_DIR = os.path.join(os.path.dirname(__file__), 'videos')

SAMPLE_VIDEOS = [
    {
        "filename": "big_buck_bunny.mp4",
        "url": "https://www.w3schools.com/html/mov_bbb.mp4",
        "title": "Big Buck Bunny Classic Reel"
    },
    {
        "filename": "bear_nature_sample.mp4",
        "url": "https://www.w3schools.com/tags/movie.mp4",
        "title": "Wild Bear Nature Clip"
    },
    {
        "filename": "city_street_view.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
        "title": "City Street Traffic Stream"
    },
    {
        "filename": "person_bicycle_ride.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
        "title": "Bicycle Ride Outdoor Cam"
    },
    {
        "filename": "classroom_motion.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/classroom.mp4",
        "title": "Classroom Motion Clip"
    }
]

def setup_videos():
    if not os.path.exists(VIDEOS_DIR):
        os.makedirs(VIDEOS_DIR)
        print(f"Created directory: {VIDEOS_DIR}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    for item in SAMPLE_VIDEOS:
        target_path = os.path.join(VIDEOS_DIR, item['filename'])
        if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
            print(f"File already exists: {item['filename']}")
            continue

        print(f"Downloading {item['title']} -> {item['filename']}...")
        try:
            req = urllib.request.Request(item['url'], headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response, open(target_path, 'wb') as out_file:
                out_file.write(response.read())
            print(f"  [OK] Saved {item['filename']} ({os.path.getsize(target_path)} bytes)")
        except Exception as e:
            print(f"  [Warning] Failed to download {item['url']}: {e}")

if __name__ == "__main__":
    setup_videos()
