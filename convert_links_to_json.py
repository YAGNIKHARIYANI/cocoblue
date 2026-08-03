import os
import urllib.parse
import base64
import json
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SD_PATH = os.path.join(BASE_DIR, 'data', 'sd_links.txt')
HD_PATH = os.path.join(BASE_DIR, 'data', 'hd_links.txt')
JSON_PATH = os.path.join(BASE_DIR, 'data', 'videos.json')

def extract_asset_id(url):
    try:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        if "efg" in params:
            efg_val = params["efg"][0]
            # Add padding just in case
            efg_val += "=" * ((4 - len(efg_val) % 4) % 4)
            decoded = base64.b64decode(efg_val).decode('utf-8')
            efg_data = json.loads(decoded)
            return efg_data.get("xpv_asset_id")
    except Exception as e:
        pass
    return None

def parse_links_txt():
    if not os.path.exists(SD_PATH):
        print(f"SD Links file not found: {SD_PATH}")
        return []
    if not os.path.exists(HD_PATH):
        print(f"HD Links file not found: {HD_PATH}")
        return []

    with open(SD_PATH, 'r', encoding='utf-8') as f:
        sd_links = [line.strip() for line in f if line.strip()]

    with open(HD_PATH, 'r', encoding='utf-8') as f:
        hd_links = [line.strip() for line in f if line.strip()]

    videos = []
    count = min(len(sd_links), len(hd_links))
    print(f"Processing {count} matching video links...")

    # Keep randomized views and publish times reproducible but looking authentic
    random.seed(42)

    for i in range(count):
        sd_url = sd_links[i]
        hd_url = hd_links[i]
        
        asset_id = extract_asset_id(sd_url)
        if not asset_id:
            asset_id = extract_asset_id(hd_url)
        if not asset_id:
            asset_id = f"custom_{i+1}"
            
        reel_id = str(asset_id)
        views = random.randint(5, 25) * 100000 # 500,000 to 2,500,000
        
        # Generate some publish dates in July 2026
        day = random.randint(1, 28)
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        publish_time = f"2026-07-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}.000Z"

        videos.append({
            "id": f"reel_{reel_id}",
            "reelId": reel_id,
            "filename": f"gujarati_reel_{reel_id}.mp4",
            "title": f"ગુજરાતી ટ્રેન્ડિંગ રીલ #{i + 1}",
            "streamUrl": hd_url,
            "hdLink": hd_url,
            "sdLink": sd_url,
            "views": str(views),
            "publishTime": publish_time
        })

    json_paths = [
        JSON_PATH,
        os.path.join(BASE_DIR, 'public', 'api', 'videos.json'),
        os.path.join(BASE_DIR, 'public', 'data', 'videos.json')
    ]

    for path in json_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as out_f:
            json.dump(videos, out_f, ensure_ascii=False, indent=2)
        print(f"Successfully converted and saved {len(videos)} links to {path}")
    return videos

if __name__ == "__main__":
    parse_links_txt()

