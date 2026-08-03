import json
import os

data_path = 'DATA.txt'
scrapped_dir = 'SCRAPPED'
link_dir = 'LINK'

import shutil

for d in [scrapped_dir, link_dir]:
    if os.path.exists(d):
        shutil.rmtree(d)
    os.makedirs(d, exist_ok=True)


with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

extracted_items = []
hd_urls_only = []
sd_urls_only = []

for idx, item in enumerate(data, 1):
    playback = item.get('playback_video', {}) or {}
    legacy = playback.get('videoDeliveryLegacyFields', {}) or {}
    hd_url = legacy.get('browser_native_hd_url')
    sd_url = legacy.get('browser_native_sd_url')
    
    reel_url = item.get('topLevelReelUrl') or item.get('facebookUrl') or item.get('inputUrl')
    
    reel_id = item.get('tracking', {}).get('video_id')
    if not reel_id and item.get('attachments'):
        reel_id = item['attachments'][0].get('media', {}).get('id')
        
    play_count = item.get('playCountRounded')
    publish_time = item.get('time')
    
    entry = {
        'index': idx,
        'reel_id': reel_id,
        'reel_url': reel_url,
        'play_count': play_count,
        'publish_time': publish_time,
        'hd_url': hd_url,
        'sd_url': sd_url
    }
    extracted_items.append(entry)
    
    if hd_url:
        hd_urls_only.append(hd_url)
    if sd_url:
        sd_urls_only.append(sd_url)

# Helper to write all formats to target directories
def write_output_group(items, file_suffix, desc_name):
    hd_urls = [item['hd_url'] for item in items if item['hd_url']]
    sd_urls = [item['sd_url'] for item in items if item['sd_url']]
    
    # User requested only SD links for the main links file
    links_txt_content = '\n'.join(sd_urls) + '\n' if sd_urls else ''
    hd_links_content = '\n'.join(hd_urls) + '\n' if hd_urls else ''
    sd_links_content = '\n'.join(sd_urls) + '\n' if sd_urls else ''
    
    formatted_lines = []
    formatted_lines.append('=' * 80)
    formatted_lines.append(f'                 EXTRACTED FACEBOOK VIDEO DOWNLOAD LINKS ({desc_name})')
    formatted_lines.append('=' * 80)
    formatted_lines.append(f'Total Items Extracted : {len(items)}')
    formatted_lines.append(f'Total HD URLs Found   : {len(hd_urls)}')
    formatted_lines.append(f'Total SD URLs Found   : {len(sd_urls)}')
    formatted_lines.append('-' * 80)
    formatted_lines.append('')
    
    for rank, item in enumerate(items, 1):
        idx_str = f"[{rank:02d}] (Orig Index: {item['index']:02d})"
        formatted_lines.append(f"{idx_str} REEL ID: {item['reel_id']}")
        formatted_lines.append(f"     Reel Page URL : {item['reel_url']}")
        if item['play_count'] is not None:
            formatted_lines.append(f"     Views / Plays : {item['play_count']}")
        if item['publish_time']:
            formatted_lines.append(f"     Publish Time  : {item['publish_time']}")
        formatted_lines.append(f"     HD Video Link : {item['hd_url']}")
        formatted_lines.append(f"     SD Video Link : {item['sd_url']}")
        formatted_lines.append('-' * 80)
        
    formatted_txt_content = '\n'.join(formatted_lines) + '\n'
    
    # JSON output matches exactly the three requested fields:
    # browser_native_sd_url, browser_native_hd_url, and id (deleting the index 1 to 150 and other extra metadata)
    json_items = []
    for item in items:
        json_items.append({
            "browser_native_sd_url": item['sd_url'] or "",
            "browser_native_hd_url": item['hd_url'] or "",
            "id": item['reel_id']
        })
    json_content = json.dumps(json_items, indent=2)
    
    for target_dir in [scrapped_dir, link_dir]:
        # Form names based on file_suffix (e.g. "", "_by_views", "_by_date", "_original")
        with open(os.path.join(target_dir, f'LINKS{file_suffix}.txt'), 'w', encoding='utf-8') as f:
            f.write(links_txt_content)
        with open(os.path.join(target_dir, f'hd_links{file_suffix}.txt'), 'w', encoding='utf-8') as f:
            f.write(hd_links_content)
        with open(os.path.join(target_dir, f'sd_links{file_suffix}.txt'), 'w', encoding='utf-8') as f:
            f.write(sd_links_content)
        with open(os.path.join(target_dir, f'links_formatted{file_suffix}.txt'), 'w', encoding='utf-8') as f:
            f.write(formatted_txt_content)
        with open(os.path.join(target_dir, f'links{file_suffix}.json'), 'w', encoding='utf-8') as f:
            f.write(json_content)

# 1. Sort by views (Play Count) descending (for ties, newest first)
sorted_by_views = sorted(
    extracted_items,
    key=lambda x: (
        x['play_count'] if x['play_count'] is not None else -1,
        x['publish_time'] or ""
    ),
    reverse=True
)

# 2. Sort by date (Publish Time) descending (for ties, most views first)
sorted_by_date = sorted(
    extracted_items,
    key=lambda x: (
        x['publish_time'] or "",
        x['play_count'] if x['play_count'] is not None else -1
    ),
    reverse=True
)

# Write all outputs
# A. Default filenames (sorted by views descending)
write_output_group(sorted_by_views, "", "SORTED BY VIEWS DESCENDING")

# B. Explicitly named sorted by views descending
write_output_group(sorted_by_views, "_by_views", "SORTED BY VIEWS DESCENDING")

# C. Sorted by publish date descending
write_output_group(sorted_by_date, "_by_date", "SORTED BY PUBLISH DATE DESCENDING")

# D. Original order
write_output_group(extracted_items, "_original", "ORIGINAL ORDER")

print(f"Successfully processed {len(extracted_items)} items!")
print(f"Generated 4 sets of files (default/by_views, by_views, by_date, original) in '{scrapped_dir}' and '{link_dir}' directories.")
