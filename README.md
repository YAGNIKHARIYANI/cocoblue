# 🚀 કોકોબ્લુ રીલ્સ (CocoBlue Reels)

**કોકોબ્લુ રીલ્સ (CocoBlue Reels)** એ શોર્ટ ટ્રેન્ડિંગ વર્ટિકલ વિડિયો (TikTok / Instagram Reels / YouTube Shorts સ્ટાઈલ) સ્ટ્રીમિંગ પ્લેટફોર્મ છે. આ પ્રોજેક્ટ ખાસ કરીને **ગુજરાતી ઓડિયન્સ (Gujarati Audience)** માટે બનાવવામાં આવ્યો છે.

---

## ✨ મુખ્ય ફીચર્સ (Key Features)

1. **🎬 ૨૦ HD વિડિયો ફીડ (20 HD Video Links Feed)**:
   - `data/links_formatted.txt` માંથી તમામ ૨૦ HD વિડિયો લિંક્સ `data/videos.json` માં કન્વર્ટ કરીને રેન્ડમ શફલ ઓર્ડરમાં પ્લે થાય છે.

2. **⚡ સમાંતર બેકગ્રાઉન્ડ પ્રીલોડિંગ (Parallel Background Preloader)**:
   - જ્યારે પણ યુઝર કોઈપણ રીલ જોતો હોય, ત્યારે સિસ્ટમ સમાંતર (Parallel) બેકગ્રાઉન્ડમાં **આગામી ૨ વિડિયો** ને પૂર્વે જ પ્રી-બફર કરી લે છે.
   - સ્વાઇપ કરવાથી **ઝીરો લોડિંગ ડિલે (Instant Playback)** સાથે આગામી વિડિયો પ્લે થાય છે.

3. **💾 પાછલા ૨ વિડિયો કેશિંગ (Previous 2 Videos Memory Cache)**:
   - **અગાઉ જોયેલા ૨ વિડિયો** મેમરી કેશમાં સેવ રહે છે, જેથી યુઝર પાછળ સ્વાઇપ કરે તો રી-લોડ થયા વિના સીધા જ કેશમાંથી ચાલુ થાય છે.

4. **🔒 ૧ મિનિટ ૨૦ સેકન્ડ એન્ટી-બાયપાસ એડ લોક (1m 20s Anti-Bypass Scroll Lock)**:
   - સ્પોન્સર્ડ યુટ્યુબ એડ દરમિયાન ૧ મિનિટ અને ૨૦ સેકન્ડ (૮૦ સેકન્ડ) સુધી સ્ક્ર્રોલ નિયંત્રિત રીતે લોક રહે છે.
   - **૦ લૂપહોલ સેશન સંગ્રહ**: યુઝર પેજ રિફ્રેશ (F5) કરશે કે બ્રાઉઝર બંધ કરીને ખોલશે તો પણ ટાઇમર રીસેટ થયા વગર બાકી રહેલા સમયથી જ ચાલુ થશે.

5. **🔄 વિડિયો પૂરો થતાં સ્વચાલિત ઓટો-સ્ક્ર્રોલ (Auto-Scroll)**:
   - લોકલ રીલ્સ પૂર્ણ થતાં જ પ્લેયર આપમેળે આગળની નવી રીલ્સ પર સ્ક્ર્રોલ થઈ જાય છે.

6. **🌐 ૧૦૦% સંપૂર્ણ ગુજરાતી લોકલાઇઝેશન (Full Gujarati UI)**:
   - તમામ UI હેડિંગ્સ, બટનો, ટાઇમર રિંગ, બેજિસ અને નોટિફિકેશન્સ શુદ્ધ ગુજરાતીમાં.

---

## 🛠️ પ્રોજેક્ટ સ્ટ્રક્ચર (Project Structure)

```
c:\cocoblue\
├── server.py                 # Multi-threaded Python HTTP server supporting Range streaming & JSON API
├── convert_links_to_json.py   # Python parser converting links_formatted.txt to data/videos.json
├── data/
│   ├── links_formatted.txt   # Extracted 20 HD Facebook Video links
│   └── videos.json           # Structured JSON payload of 20 HD video feeds
├── videos/                   # Local MP4 video storage folder
└── public/
    ├── index.html            # Main Gujarati layout (Header ad, middle reel card, footer ad & HUD)
    ├── css/
    │   └── style.css         # Glassmorphism dark theme, 38px timer circle & animations
    └── js/
        ├── app.js            # Reel player, parallel preloader [i-2..i+2], swipe gesture & auto-scroll
        └── ad-redirect.js    # 1m 20s ad timer, anti-bypass localStorage session manager
```

---

## 🚀 રન કરવાની રીત (How to Run)

૧. પાયથન વેબ સર્વર શરૂ કરવા માટે:
```bash
python server.py
```

૨. તમારા બ્રાઉઝરમાં ખોલો:
```
http://localhost:8000
```

---

© 2026 CocoBlue Media. All Rights Reserved.
