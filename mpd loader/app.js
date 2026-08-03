// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const videoElement = document.getElementById("videoPlayer");
    const mpdUrlInput = document.getElementById("mpdUrlInput");
    const loadBtn = document.getElementById("loadBtn");
    const toggleAdvancedBtn = document.getElementById("toggleAdvancedBtn");
    const advancedPanel = document.getElementById("advancedPanel");
    const chkAutoPlay = document.getElementById("chkAutoPlay");
    const chkLowLatency = document.getElementById("chkLowLatency");
    const customHeadersInput = document.getElementById("customHeaders");
    const loaderOverlay = document.getElementById("loaderOverlay");
    
    // Status Elements
    const playerStatus = document.getElementById("player-status");
    const statusText = playerStatus.querySelector(".status-text");
    const streamTitle = document.getElementById("streamTitle");
    const streamUrlText = document.getElementById("streamUrlText");
    
    // Presets
    const presets = document.querySelectorAll(".preset-card");
    
    // Selectors
    const videoTrackSelect = document.getElementById("videoTrackSelect");
    const audioTrackSelect = document.getElementById("audioTrackSelect");
    const textTrackSelect = document.getElementById("textTrackSelect");
    
    // Metrics Elements
    const valResolution = document.getElementById("val-resolution");
    const valVideoBitrate = document.getElementById("val-video-bitrate");
    const valAudioBitrate = document.getElementById("val-audio-bitrate");
    const valBuffer = document.getElementById("val-buffer");
    const valBufferBar = document.getElementById("val-buffer-bar");
    const valLatency = document.getElementById("val-latency");
    const valDroppedFrames = document.getElementById("val-dropped-frames");

    // Initialize Dash.js MediaPlayer
    const player = dashjs.MediaPlayer().create();
    
    // Default config: auto-play by default
    player.initialize(videoElement, null, chkAutoPlay.checked);

    // Initial setup on launch
    const defaultPreset = document.querySelector(".preset-card.active");
    if (defaultPreset) {
        const defaultUrl = defaultPreset.getAttribute("data-url");
        mpdUrlInput.value = defaultUrl;
        loadStream(defaultUrl, "Big Buck Bunny");
    }

    // Toggle Advanced Config Panel
    toggleAdvancedBtn.addEventListener("click", () => {
        const isHidden = advancedPanel.style.display === "none";
        advancedPanel.style.display = isHidden ? "flex" : "none";
        toggleAdvancedBtn.querySelector("span").textContent = isHidden ? "▲" : "▼";
    });

    // Preset Selection Click Handler
    presets.forEach(card => {
        card.addEventListener("click", () => {
            presets.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            const url = card.getAttribute("data-url");
            const name = card.getAttribute("data-name");
            mpdUrlInput.value = url;
            loadStream(url, name);
        });
    });

    // Load Stream Click Handler
    loadBtn.addEventListener("click", () => {
        const url = mpdUrlInput.value.trim();
        if (!url) {
            alert("Please enter a valid MPD URL.");
            return;
        }
        
        // Find if this URL matches any preset to show name, otherwise it's a Custom Stream
        let streamName = "Custom Stream";
        presets.forEach(card => {
            if (card.getAttribute("data-url") === url) {
                card.classList.add("active");
                streamName = card.getAttribute("data-name");
            } else {
                card.classList.remove("active");
            }
        });

        loadStream(url, streamName);
    });

    // Helper functions for Loader and Status UI
    function showLoader(show) {
        if (show) {
            loaderOverlay.classList.add("active");
        } else {
            loaderOverlay.classList.remove("active");
        }
    }

    function updateStatus(statusClass, text) {
        playerStatus.className = `status-badge ${statusClass}`;
        statusText.textContent = text;
    }

    // Main Stream Loader function
    function loadStream(url, name) {
        showLoader(true);
        updateStatus("loading", "Loading Manifest...");
        
        // Reset selections
        videoTrackSelect.innerHTML = '<option value="-1">Auto (Adaptive)</option>';
        videoTrackSelect.disabled = true;
        audioTrackSelect.innerHTML = '<option value="-1">Default</option>';
        audioTrackSelect.disabled = true;
        textTrackSelect.innerHTML = '<option value="-1">Off</option>';
        textTrackSelect.disabled = true;
        
        // Reset metrics
        valResolution.textContent = "-";
        valVideoBitrate.textContent = "-";
        valAudioBitrate.textContent = "-";
        valBuffer.textContent = "-";
        valBufferBar.style.width = "0%";
        valLatency.textContent = "-";
        valDroppedFrames.textContent = "0";

        // Setup Headers if provided in JSON
        try {
            const headersVal = customHeadersInput.value.trim();
            if (headersVal) {
                const headers = JSON.parse(headersVal);
                player.setXHRWithCredentialsForType("MPD", true);
                player.extend("RequestModifier", function () {
                    return {
                        modifyRequestHeader: function (xhr) {
                            for (const [key, value] of Object.entries(headers)) {
                                xhr.setRequestHeader(key, value);
                            }
                            return xhr;
                        }
                    };
                }, true);
            } else {
                // Clear request modifiers
                player.extend("RequestModifier", function () {
                    return {
                        modifyRequestHeader: function (xhr) {
                            return xhr;
                        }
                    };
                }, true);
            }
        } catch (e) {
            console.error("CORS/Header JSON Parse Error:", e);
            alert("Error parsing Custom Headers JSON: " + e.message);
            showLoader(false);
            updateStatus("error", "Header Config Error");
            return;
        }

        // Apply low latency settings
        const lowLatency = chkLowLatency.checked;
        player.updateSettings({
            streaming: {
                lowLatencyEnabled: lowLatency,
                liveDelay: lowLatency ? 2 : 10,
                liveCatchUpMinDrift: 0.05,
                liveCatchUpPlaybackRate: 0.5
            }
        });

        // Set autoplay setting
        player.setAutoPlay(chkAutoPlay.checked);

        // Load stream source
        try {
            player.attachSource(url);
            streamTitle.textContent = name;
            streamUrlText.textContent = url;
            console.log(`Loading DASH stream: ${name} [${url}]`);
        } catch (e) {
            console.error("DASH loading crash:", e);
            showLoader(false);
            updateStatus("error", "Initialization Error");
            alert("Initialization failed: " + e.message);
        }
    }

    // --- DASH.js Event Listeners ---

    // Manifest Loaded -> setup tracks
    player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
        showLoader(false);
        updateStatus("ready", "Ready to Play");
    });

    // Stream Initialized
    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        populateSelectors();
    });

    // Playback Started
    player.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => {
        updateStatus("playing", "Playing");
        showLoader(false);
    });

    // Playback Paused
    player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
        updateStatus("paused", "Paused");
    });

    // Playback Stalled / Buffering
    player.on(dashjs.MediaPlayer.events.PLAYBACK_WAITING, () => {
        updateStatus("stalled", "Buffering...");
    });

    // Error Handling
    player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
        showLoader(false);
        updateStatus("error", "Playback Error");
        console.error("DASH.js Player Error:", e);
        
        let errorMsg = "An error occurred during playback.";
        if (e.error) {
            if (e.error.message) {
                errorMsg = e.error.message;
            } else if (typeof e.error === 'string') {
                errorMsg = e.error;
            }
        }
        
        // Show indicator on the banner
        streamUrlText.innerHTML = `<span style="color: var(--status-error)">Error: ${errorMsg}. This is often caused by CORS issues.</span>`;
    });

    // --- Track Selection Populators ---

    function populateSelectors() {
        // 1. Populate Video Bitrate/Qualities
        const videoBitrates = player.getBitrateInfoListFor("video");
        videoTrackSelect.innerHTML = '<option value="-1">Auto (Adaptive)</option>';
        if (videoBitrates && videoBitrates.length > 0) {
            videoBitrates.forEach((info, index) => {
                const label = `${info.height}p (${(info.bitrate / 1000000).toFixed(2)} Mbps)`;
                const option = document.createElement("option");
                option.value = index;
                option.textContent = label;
                videoTrackSelect.appendChild(option);
            });
            videoTrackSelect.disabled = false;
        }

        // 2. Populate Audio Languages
        const audioTracks = player.getTracksFor("audio");
        audioTrackSelect.innerHTML = "";
        if (audioTracks && audioTracks.length > 0) {
            audioTracks.forEach((track) => {
                const label = `${track.lang || 'Unknown'} (${track.roles && track.roles.length > 0 ? track.roles.join(', ') : 'standard'})`;
                const option = document.createElement("option");
                option.value = track.index;
                option.textContent = label;
                if (player.getCurrentTrackFor("audio") && player.getCurrentTrackFor("audio").index === track.index) {
                    option.selected = true;
                }
                audioTrackSelect.appendChild(option);
            });
            audioTrackSelect.disabled = audioTracks.length <= 1;
        }

        // 3. Populate Text/Subtitles
        const textTracks = player.getTracksFor("text");
        textTrackSelect.innerHTML = '<option value="-1">Off</option>';
        if (textTracks && textTracks.length > 0) {
            textTracks.forEach((track) => {
                const label = `${track.lang || 'Unknown'} (${track.roles && track.roles.length > 0 ? track.roles.join(', ') : 'subtitles'})`;
                const option = document.createElement("option");
                option.value = track.index;
                option.textContent = label;
                const currentTextTrack = player.getCurrentTrackFor("text");
                if (currentTextTrack && currentTextTrack.index === track.index) {
                    option.selected = true;
                }
                textTrackSelect.appendChild(option);
            });
            textTrackSelect.disabled = false;
        }
    }

    // --- Selectors Event Listeners ---

    // Video Track Selection Change
    videoTrackSelect.addEventListener("change", (e) => {
        const val = parseInt(e.target.value);
        if (val === -1) {
            player.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: {
                            video: true
                        }
                    }
                }
            });
            console.log("Enabled Auto (Adaptive) video bitrate selection");
        } else {
            player.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: {
                            video: false
                        }
                    }
                }
            });
            player.setQualityFor("video", val);
            console.log(`Set fixed video quality index: ${val}`);
        }
    });

    // Audio Language Change
    audioTrackSelect.addEventListener("change", (e) => {
        const val = parseInt(e.target.value);
        const tracks = player.getTracksFor("audio");
        const selected = tracks.find(t => t.index === val);
        if (selected) {
            player.setCurrentTrack(selected);
            console.log(`Switched audio track to: ${selected.lang}`);
        }
    });

    // Subtitle Track Change
    textTrackSelect.addEventListener("change", (e) => {
        const val = parseInt(e.target.value);
        if (val === -1) {
            // Turn off subtitles in dash.js by disabling subtitles
            player.setTextTrack(-1);
            console.log("Turned off subtitles");
        } else {
            const tracks = player.getTracksFor("text");
            const selected = tracks.find(t => t.index === val);
            if (selected) {
                player.setCurrentTrack(selected);
                console.log(`Switched subtitle track to: ${selected.lang}`);
            }
        }
    });

    // --- Metrics & Diagnostics Poller ---

    setInterval(() => {
        if (!player.getActiveStreamInfo()) {
            return;
        }

        // 1. Resolution and Bitrate
        const activeStream = player.getActiveStreamInfo();
        const videoIndex = player.getQualityFor("video");
        const videoBitrates = player.getBitrateInfoListFor("video");
        
        if (videoBitrates && videoBitrates.length > 0 && videoIndex >= 0 && videoIndex < videoBitrates.length) {
            const activeVideo = videoBitrates[videoIndex];
            valResolution.textContent = `${activeVideo.width} x ${activeVideo.height}`;
            valVideoBitrate.textContent = `${(activeVideo.bitrate / 1000000).toFixed(2)} Mbps`;
        } else {
            valResolution.textContent = "-";
            valVideoBitrate.textContent = "-";
        }

        const audioIndex = player.getQualityFor("audio");
        const audioBitrates = player.getBitrateInfoListFor("audio");
        if (audioBitrates && audioBitrates.length > 0 && audioIndex >= 0 && audioIndex < audioBitrates.length) {
            const activeAudio = audioBitrates[audioIndex];
            valAudioBitrate.textContent = `${(activeAudio.bitrate / 1000).toFixed(0)} kbps`;
        } else {
            valAudioBitrate.textContent = "-";
        }

        // 2. Buffer Length
        const bufferLength = player.getBufferLength("video");
        valBuffer.textContent = `${bufferLength.toFixed(1)} s`;
        
        // Progress bar scaling: max 30s buffer mapping to 100% width
        const barWidth = Math.min((bufferLength / 30) * 100, 100);
        valBufferBar.style.width = `${barWidth}%`;
        
        // Change color based on buffer health
        if (bufferLength < 4) {
            valBufferBar.style.background = "var(--status-error)";
        } else if (bufferLength < 10) {
            valBufferBar.style.background = "var(--status-warning)";
        } else {
            valBufferBar.style.background = "var(--grad-primary)";
        }

        // 3. Latency
        const latency = player.getCurrentLiveLatency();
        if (latency !== undefined && !isNaN(latency)) {
            valLatency.textContent = `${latency.toFixed(2)} s`;
        } else {
            valLatency.textContent = "N/A (VOD)";
        }

        // 4. Dropped Frames
        if (videoElement.getVideoPlaybackQuality) {
            const quality = videoElement.getVideoPlaybackQuality();
            valDroppedFrames.textContent = quality.droppedVideoFrames || 0;
        } else if (videoElement.webkitDroppedFrameCount) {
            valDroppedFrames.textContent = videoElement.webkitDroppedFrameCount;
        }
    }, 1000);
});
