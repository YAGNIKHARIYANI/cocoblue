import json
import re
import os

har_path = "data.har"
output_path = "mpd_links.json"

if not os.path.exists(har_path):
    print(f"Error: {har_path} not found.")
    exit(1)

print(f"Loading {har_path}...")
with open(har_path, 'r', encoding='utf-8', errors='ignore') as f:
    har_data = json.load(f)

# Regex to capture the parts of the URL
# Format: https://video-cdn.tik.porn/videos/(\d+)_([A-Za-z0-9_-]+)/([A-Za-z0-9_-]+)/(\d+)/master\.mpd
pattern = re.compile(r'https://video-cdn\.tik\.porn/videos/(\d+)_([A-Za-z0-9_-]+)/([A-Za-z0-9_-]+)/(\d+)/master\.mpd')

mpd_data = {}

entries = har_data.get('log', {}).get('entries', [])
print(f"Parsing {len(entries)} entries...")

for entry in entries:
    url = entry.get('request', {}).get('url', '')
    match = pattern.search(url)
    if match:
        numeric_id = match.group(1)
        hash_id = match.group(2)
        token = match.group(3)
        timestamp = int(match.group(4))
        
        # Combine folder name as the unique video identifier
        video_key = f"{numeric_id}_{hash_id}"
        
        entry_info = {
            "url": url,
            "numeric_id": numeric_id,
            "hash_id": hash_id,
            "token": token,
            "timestamp": timestamp
        }
        
        # If it already exists, keep the one with the newer timestamp
        if video_key in mpd_data:
            if timestamp > mpd_data[video_key]["timestamp"]:
                mpd_data[video_key] = entry_info
        else:
            mpd_data[video_key] = entry_info

# Sort the items by hash_id/video_key
sorted_keys = sorted(mpd_data.keys())
sorted_mpd_data = {k: mpd_data[k] for k in sorted_keys}

# Also construct a simple list of sorted URLs
sorted_urls = [mpd_data[k]["url"] for k in sorted_keys]

output_data = {
    "info": {
        "total_unique_videos": len(sorted_mpd_data),
        "source": har_path
    },
    "videos": sorted_mpd_data,
    "sorted_urls": sorted_urls
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=4)

print(f"\nSuccess!")
print(f"Extracted {len(sorted_mpd_data)} unique MPD video links.")
print(f"Saved results to: {os.path.abspath(output_path)}")
