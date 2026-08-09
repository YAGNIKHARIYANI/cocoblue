/**
 * StreamReels - Gujarati Core Application Logic & Anti-Bypass System
 * કોકોબ્લુ ૨૦ HD/SD ફેસબુક વિડિયો ફીડ, ઓટો-સ્ક્ર્રોલ, સ્વાઇપ ગેસ્ચર અને ફાયરબેઝ ઓલ-ઇવેન્ટ્સ મોનિટરિંગ સ્યુટ.
 */

const FAKE_USERNAMES = [
    'john_doe', 'sam_smith', 'kate_wilson', 'michael_brown', 'emma_davis',
    'david_jones', 'olivia_miller', 'james_wilson', 'sophia_taylor', 'william_thomas',
    'isabella_moore', 'lucas_jackson', 'mia_martin', 'henry_lee', 'amelia_peck',
    'alex_turner', 'chloe_harris', 'jack_white', 'grace_clark', 'daniel_lewis',
    'lily_walker', 'ryan_hall', 'zoe_allen', 'matthew_young', 'harper_king',
    'luke_wright', 'ava_scott', 'owen_green', 'charlotte_adams', 'jack_baker',
    'ella_nelson', 'mason_carter', 'scarlett_mitchell', 'logan_perez', 'hazel_roberts',
    'wyatt_turner', 'stella_phillips', 'carter_evans', 'penelope_campbell', 'nathan_parker'
];

function generateRandomViews() {
    const isMillion = Math.random() > 0.4;
    if (isMillion) {
        const val = (Math.random() * (4.8 - 0.5) + 0.5).toFixed(1);
        return `${val}M`;
    } else {
        const val = Math.floor(Math.random() * (980 - 10) + 10);
        return `${val}K`;
    }
}

class ReelApp {
    constructor() {
        this.rawVideoList = [];
        this.rawStandardList = [];
        this.rawMp4List = [];
        this.shuffledQueue = [];
        this.currentIndex = 0;
        this.isMuted = true;
        this.isPlaying = false;
        this.isTransitioning = false;
        this.userForcedQuality = null;
        this.ageVerified = false;

        // Ad Mode & Scroll Lock Flags
        this.isAdMode = false;
        this.isScrollLocked = false;
        this.adCompleted = false;
        this.videosWatched = 0;
        this.isAdBreakActive = false;

        // Touch Gesture tracking
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 45;

        // Wheel Scroll throttling
        this.lastWheelTime = 0;
        this.wheelThrottleMs = 400;

        // 5-Second Inactivity UI Overlay Auto-Hide Timer
        this.idleTimeout = null;
        this.idleDurationMs = 5000;

        this.initDOMElements();
        this.initEventListeners();
        this.initIdleTimer();
        this.initAutoFullscreenOnFirstInteraction();
        this.initAutoUnmuteOnFirstInteraction();

        // Hidden video element for preloading next video
        this.preloadVideoEl = document.createElement('video');
        this.preloadVideoEl.muted = true;
        this.preloadVideoEl.preload = 'auto';
        this.preloadVideoEl.style.display = 'none';
        document.body.appendChild(this.preloadVideoEl);

        this.fetchVideos();
    }

    initDOMElements() {
        this.videoEl = document.getElementById('reelVideo');
        this.reelCard = document.getElementById('reelCard');
        this.reelViewport = document.getElementById('reelViewport');
        this.videoLoader = document.getElementById('videoLoader');
        this.ambientGlow = document.getElementById('ambientGlow');
        this.centerPlayIndicator = document.getElementById('centerPlayIndicator');

        // Embedded YouTube Ad Elements
        this.ytAdsWrapper = document.getElementById('ytAdsWrapper');
        this.ytAdContainer = document.getElementById('ytAdContainer');
        this.ytAdIframe = document.getElementById('ytAdIframe');
        this.ytAdContainer2 = document.getElementById('ytAdContainer2');
        this.ytAdIframe2 = document.getElementById('ytAdIframe2');
        this.adLockOverlay = document.getElementById('adLockOverlay');
        this.adLockTitle = document.getElementById('adLockTitle');
        this.adLockMessage = document.getElementById('adLockMessage');
        this.lockCountdownPill = document.getElementById('lockCountdownPill');
        this.lockSecCount = document.getElementById('lockSecCount');

        // Overlay Text Displays & Quality Badge
        this.videoSourceTag = document.getElementById('videoSourceTag');
        this.videoTitleDisplay = document.getElementById('videoTitleDisplay');
        this.videoFilenameDisplay = document.getElementById('videoFilenameDisplay');
        this.videoUsernameDisplay = document.getElementById('videoUsernameDisplay');
        this.videoViewsDisplay = document.getElementById('videoViewsDisplay');
        this.videoCounterText = document.getElementById('videoCounterText');
        this.unmuteBanner = document.getElementById('unmuteBanner');
        this.qualityTag = document.querySelector('.resolution-tag');

        // Swipe Hints
        this.swipeHintContainer = document.getElementById('swipeHintContainer');
        this.swipeHintText = document.getElementById('swipeHintText');

        // Controls & Scrubber
        this.scrubberContainer = document.getElementById('scrubberContainer');
        this.scrubberFill = document.getElementById('scrubberFill');
        this.timeDisplay = document.getElementById('timeDisplay');

        // Buttons
        this.soundToggleBtn = document.getElementById('soundToggleBtn');
        this.soundIcon = document.getElementById('soundIcon');
        this.playPauseToggleBtn = document.getElementById('playPauseToggleBtn');
        this.playPauseIcon = document.getElementById('playPauseIcon');
        this.nextVideoBtn = document.getElementById('nextVideoBtn');
        this.prevVideoBtn = document.getElementById('prevVideoBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.shuffleVideosBtn = document.getElementById('shuffleVideosBtn');
        this.proceedAfterAdBtn = document.getElementById('proceedAfterAdBtn');

        // Ad Closes
        this.closeTopAdBtn = document.getElementById('closeTopAdBtn');
        this.topAdBanner = document.getElementById('topAdBanner');
        this.closeBottomAdBtn = document.getElementById('closeBottomAdBtn');
        this.bottomAdBanner = document.getElementById('bottomAdBanner');

        // Settings
        this.autoScrollToggle = document.getElementById('autoScrollToggle');
        this.ambientGlowToggle = document.getElementById('ambientGlowToggle');

        // Age Verification Modal Elements
        this.ageGateOverlay = document.getElementById('ageGateOverlay');
        this.ageGateYesBtn = document.getElementById('ageGateYesBtn');
        this.ageGateNoBtn = document.getElementById('ageGateNoBtn');
    }

    initEventListeners() {
        // Age Verification Modal Button Handlers
        if (this.ageGateYesBtn) {
            this.ageGateYesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ageVerified = true;
                if (this.ageGateOverlay) {
                    this.ageGateOverlay.classList.add('hidden');
                }
                this.loadCurrentReel();
                if (this.unmuteBanner && this.isMuted) {
                    this.unmuteBanner.style.display = 'flex';
                }
            });
        }

        if (this.ageGateNoBtn) {
            this.ageGateNoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = 'https://www.google.com';
            });
        }

        if (this.unmuteBanner) {
            this.unmuteBanner.addEventListener('click', (e) => {
                e.stopPropagation();
                this.unmuteAudio();
            });
        }

        if (this.qualityTag) {
            this.qualityTag.style.cursor = 'pointer';
            this.qualityTag.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleQualityPreference();
            });
        }

        if (this.videoEl) {
            this.videoEl.addEventListener('click', () => {
                if (!this.isAdMode) this.togglePlayPause();
            });
            
            this.videoEl.addEventListener('waiting', () => this.showLoader(true));
            this.videoEl.addEventListener('playing', () => {
                this.showLoader(false);
                this.isPlaying = true;
                this.updatePlayPauseUI();
            });
            this.videoEl.addEventListener('pause', () => {
                this.isPlaying = false;
                this.updatePlayPauseUI();
            });
            this.videoEl.addEventListener('error', (e) => {
                console.error("[Video Element Error]", e);
                
                let errorMsg = "Video failed to load";
                if (this.videoEl.error) {
                    switch (this.videoEl.error.code) {
                        case 1: errorMsg = "Video loading aborted"; break;
                        case 2: errorMsg = "Network connection lost"; break;
                        case 3: errorMsg = "Video format not supported"; break;
                        case 4: errorMsg = "Video source not supported (404 or CORS issue)"; break;
                    }
                }
                
                // 🔥 FIREBASE LOG: VIDEO LOAD ERROR
                if (window.logFirebaseEvent) {
                    window.logFirebaseEvent('video_load_error', {
                        reel_index: this.currentIndex,
                        video_src: this.videoEl.src,
                        error_code: this.videoEl.error ? this.videoEl.error.code : 0,
                        error_msg: errorMsg
                    });
                }

                // Automatically scroll to the next reel
                setTimeout(() => {
                    this.nextReel();
                }, 1000);
            });
            this.videoEl.addEventListener('timeupdate', () => this.updateScrubber());
            this.videoEl.addEventListener('ended', () => this.handleVideoEnded());
        }

        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSound();
            });
        }

        if (this.playPauseToggleBtn) {
            this.playPauseToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePlayPause();
            });
        }

        if (this.nextVideoBtn) {
            this.nextVideoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.nextReel();
            });
        }

        if (this.proceedAfterAdBtn) {
            this.proceedAfterAdBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.nextReel();
            });
        }

        const adBreakContinueBtn = document.getElementById('adBreakContinueBtn');
        if (adBreakContinueBtn) {
            adBreakContinueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const overlay = document.getElementById('adBreakOverlay');
                if (overlay) {
                    overlay.style.display = 'none';
                }
                this.videosWatched = 0;
                this.isScrollLocked = false;
                this.isAdBreakActive = false;
                this.nextReel();
            });
        }

        if (this.prevVideoBtn) {
            this.prevVideoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.prevReel();
            });
        }

        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFullscreen();
            });
        }

        if (this.shuffleVideosBtn) {
            this.shuffleVideosBtn.addEventListener('click', () => this.shuffleAndRestart());
        }

        if (this.scrubberContainer) {
            this.scrubberContainer.addEventListener('click', (e) => {
                if (this.isAdMode) return;
                const rect = this.scrubberContainer.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (this.videoEl && this.videoEl.duration) {
                    this.videoEl.currentTime = pos * this.videoEl.duration;
                }
            });
        }

        if (this.closeTopAdBtn) {
            this.closeTopAdBtn.addEventListener('click', () => {
                if (this.topAdBanner) this.topAdBanner.style.display = 'none';
            });
        }

        if (this.closeBottomAdBtn) {
            this.closeBottomAdBtn.addEventListener('click', () => {
                if (this.bottomAdBanner) this.bottomAdBanner.style.display = 'none';
            });
        }

        if (this.ambientGlowToggle) {
            this.ambientGlowToggle.addEventListener('change', (e) => {
                if (this.ambientGlow) {
                    this.ambientGlow.style.opacity = e.target.checked ? '0.8' : '0';
                }
            });
        }

        if (this.reelViewport) {
            this.reelViewport.addEventListener('touchstart', (e) => {
                this.touchStartY = e.changedTouches[0].screenY;
                this.resetIdleTimer();
            }, { passive: true });

            this.reelViewport.addEventListener('touchend', (e) => {
                this.touchEndY = e.changedTouches[0].screenY;
                this.handleSwipeGesture();
            }, { passive: true });

            this.reelViewport.addEventListener('wheel', (e) => {
                const now = Date.now();
                if (now - this.lastWheelTime > this.wheelThrottleMs) {
                    this.lastWheelTime = now;
                    if (e.deltaY > 0) {
                        this.nextReel();
                    } else if (e.deltaY < 0) {
                        this.prevReel();
                    }
                }
            }, { passive: true });
        }

        document.addEventListener('keydown', (e) => {
            this.resetIdleTimer();
            if (e.key === 'ArrowDown') {
                this.nextReel();
            } else if (e.key === 'ArrowUp') {
                this.prevReel();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.togglePlayPause();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const isFS = !!document.fullscreenElement;
            if (window.logFirebaseEvent) {
                window.logFirebaseEvent('fullscreen_toggled', { is_fullscreen: isFS });
            }
            this.resetIdleTimer();
        });
    }

    initAutoFullscreenOnFirstInteraction() {
        const triggerFullscreen = () => {
            if (!document.fullscreenElement) {
                this.toggleFullscreen();
            }
            window.removeEventListener('click', triggerFullscreen);
            window.removeEventListener('touchstart', triggerFullscreen);
        };
        window.addEventListener('click', triggerFullscreen, { once: true });
        window.addEventListener('touchstart', triggerFullscreen, { once: true });
    }

    initAutoUnmuteOnFirstInteraction() {
        this._triggerUnmuteRef = () => {
            if (this.isMuted) {
                this.unmuteAudio();
            }
        };
        window.addEventListener('click', this._triggerUnmuteRef, { once: true });
        window.addEventListener('touchstart', this._triggerUnmuteRef, { once: true });
    }

    initIdleTimer() {
        const userInteractionHandler = (e) => {
            this.resetIdleTimer();
        };

        ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'click', 'keydown'].forEach(evt => {
            window.addEventListener(evt, userInteractionHandler, { passive: true });
        });
        
        this.resetIdleTimer();
    }

    resetIdleTimer() {
        document.body.classList.remove('user-idle');
        if (this.reelCard) this.reelCard.classList.remove('user-idle');
        if (this.idleTimeout) clearTimeout(this.idleTimeout);

        if (this.isPlaying || this.isAdMode) {
            this.idleTimeout = setTimeout(() => {
                document.body.classList.add('user-idle');
                if (this.reelCard) this.reelCard.classList.add('user-idle');
            }, this.idleDurationMs);
        }
    }

    async fetchVideos() {
        this.showLoader(true);
        
        // Fetch MP4 Videos
        let mp4Data = [];
        const mp4Endpoints = ['/api/videos', '/data/mp4.json', 'data/mp4.json', '/public/data/mp4.json'];
        for (const url of mp4Endpoints) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        mp4Data = data.map(item => {
                            return {
                                ...item,
                                title: item.title ? item.title.replace('ગુજરાતી શોર્ટ રીલ', 'Reel') : `Reel #${item.post_id || ''}`,
                                username: item.username || `@${FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)]}`,
                                views: item.views && (item.views.endsWith('K') || item.views.endsWith('M')) ? item.views : generateRandomViews()
                            };
                        });
                        console.log(`[CocoBlue] ${mp4Data.length} MP4 videos loaded! (source: ${url})`);
                        break;
                    } else {
                        const videosObj = data.videos || {};
                        const keys = Object.keys(videosObj);
                        if (keys.length > 0) {
                            mp4Data = keys.map(key => {
                                const item = videosObj[key];
                                return {
                                    id: `mp4_${key}`,
                                    reelId: key,
                                    filename: `${item.post_id || ''}_${item.media_id || ''}.mp4`,
                                    title: `Reel #${item.post_id || ''}`,
                                    streamUrl: item.url || '',
                                    hdLink: item.url || '',
                                    sdLink: item.url || '',
                                    views: generateRandomViews(),
                                    username: `@${FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)]}`,
                                    publishTime: "2026-07-04T00:47:17.000Z",
                                    isMPD: false
                                };
                            });
                            console.log(`[CocoBlue] ${mp4Data.length} MP4 videos loaded from file! (source: ${url})`);
                            break;
                        }
                    }
                }
            } catch (err) {}
        }

        this.rawStandardList = [];
        this.rawMp4List = mp4Data;

        if (this.rawMp4List.length === 0) {
            console.error('[CocoBlue] MP4 video data fetch failed!');
            if (window.logFirebaseEvent) {
                window.logFirebaseEvent('api_fetch_error', {});
            }
        }

        this.shuffleQueue();
        
        const isAdActive = window.adRedirectManager && window.adRedirectManager.isAdActive;
        if (!this.isAdMode && !isAdActive) {
            this.loadCurrentReel();
        }
    }

    shuffleQueue() {
        if (!this.rawMp4List || this.rawMp4List.length === 0) return;

        // Shuffle MP4 list
        const mp4Shuffled = [...this.rawMp4List];
        for (let i = mp4Shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mp4Shuffled[i], mp4Shuffled[j]] = [mp4Shuffled[j], mp4Shuffled[i]];
        }

        this.shuffledQueue = mp4Shuffled;
        this.currentIndex = 0;
        console.log(`[CocoBlue Client] Queue of size ${this.shuffledQueue.length} generated.`);
    }

    shuffleAndRestart() {
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('reels_shuffled', {});
        }
        this.exitYouTubeAdMode();
        this.shuffleQueue();
        this.loadCurrentReel();
    }

    getAdaptiveVideoUrl(item) {
        if (this.userForcedQuality === 'hd') {
            return { url: item.hdLink || item.streamUrl || item.sdLink, isHD: true };
        }
        if (this.userForcedQuality === 'sd') {
            return { url: item.sdLink || item.streamUrl || item.hdLink, isHD: false };
        }

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            const isHighSpeed = conn.effectiveType === '4g' || (conn.downlink && conn.downlink >= 5);
            if (isHighSpeed && item.hdLink) {
                return { url: item.hdLink, isHD: true };
            }
        }

        return { url: item.sdLink || item.streamUrl || item.hdLink, isHD: false };
    }

    toggleQualityPreference() {
        if (this.userForcedQuality === 'hd') {
            this.userForcedQuality = 'sd';
        } else {
            this.userForcedQuality = 'hd';
        }

        // 🔥 FIREBASE LOG: QUALITY CHANGED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('quality_changed', { quality: this.userForcedQuality });
        }

        this.loadCurrentReel();
    }

    loadCurrentReel() {
        if (!this.ageVerified) return;

        if (this.isAdMode || (window.adRedirectManager && window.adRedirectManager.isAdActive)) {
            return;
        }

        if (!this.shuffledQueue || this.shuffledQueue.length === 0) return;

        document.body.classList.remove('ad-mode-active');

        const currentItem = this.shuffledQueue[this.currentIndex];
        const { url: videoUrl, isHD } = this.getAdaptiveVideoUrl(currentItem);

        if (this.videoSourceTag) {
            this.videoSourceTag.className = 'live-tag';
            this.videoSourceTag.innerHTML = '<i class="fa-solid fa-circle"></i> Reel';
        }
        if (this.qualityTag) {
            this.qualityTag.innerHTML = isHD || currentItem.isMPD ? 'Full HD (1080p)' : 'Standard (360p)';
        }

        if (this.videoTitleDisplay) this.videoTitleDisplay.textContent = currentItem.title || `Reel #${this.currentIndex + 1}`;
        if (this.videoUsernameDisplay) this.videoUsernameDisplay.textContent = currentItem.username || '@anonymous';
        if (this.videoViewsDisplay) this.videoViewsDisplay.textContent = currentItem.views || '10K';
        if (this.videoFilenameDisplay) this.videoFilenameDisplay.textContent = ''; // Removed Video ID / Reel ID display
        if (this.videoCounterText) {
            this.videoCounterText.textContent = `${this.currentIndex + 1} / ${this.shuffledQueue.length}`;
        }
        if (this.swipeHintText) {
            this.swipeHintText.textContent = "Swipe up to watch next reel";
        }

        const loaderText = this.videoLoader ? this.videoLoader.querySelector('span') : null;
        if (currentItem.isMPD) {
            if (loaderText) loaderText.textContent = "Loading...";
        } else {
            if (loaderText) loaderText.textContent = "Loading reel...";
        }

        this.showLoader(true);
        this.videoEl.style.display = 'block';
        this.videoEl.loop = false;

        // Reset/Initialize Player depending on mode
        if (currentItem.isMPD) {
            console.log(`[DASH Player] Initializing for MPD URL: ${videoUrl}`);
            if (window.dashjs) {
                if (!this.dashPlayer) {
                    this.dashPlayer = dashjs.MediaPlayer().create();
                    
                    // Configure robust request settings to handle slow CDNs / timeouts
                    this.dashPlayer.updateSettings({
                        streaming: {
                            requestTimeouts: {
                                MPD: 30000,           // 30s timeout for Manifest
                                MediaSegment: 30000,  // 30s timeout for Media segments
                                InitializationSegment: 30000
                            },
                            retryAttempts: {
                                MPD: 5,               // retry up to 5 times
                                MediaSegment: 5,
                                InitializationSegment: 5
                            },
                            retryIntervals: {
                                MPD: 1000,            // retry after 1s
                                MediaSegment: 1000
                            }
                        }
                    });
                }
                
                // Bind event listeners only once
                if (!this.dashPlayerEventsRegistered) {
                    this.dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e) => {
                        console.error("[DASH Player Error]", e);
                        
                        let errorDetail = "Network Timeout or CORS Block";
                        if (e.error) {
                            if (typeof e.error === 'string') errorDetail = e.error;
                            else if (e.error.message) errorDetail = e.error.message;
                        }
                        
                        if (window.logFirebaseEvent) {
                            window.logFirebaseEvent('mpd_playback_error', {
                                error: errorDetail,
                                url: this.videoEl.src || ''
                            });
                        }

                        // Automatically scroll to the next reel
                        setTimeout(() => {
                            this.nextReel();
                        }, 1000);
                    });
                    this.dashPlayerEventsRegistered = true;
                }

                this.dashPlayer.initialize(this.videoEl, videoUrl, true);
                this.dashPlayer.setMute(this.isMuted);
                this.isPlaying = true;
                this.showLoader(false);
                this.updatePlayPauseUI();
            } else {
                console.error("[DASH Player] dashjs library not loaded!");
                this.videoEl.src = videoUrl;
                this.videoEl.muted = this.isMuted;
                this.videoEl.play().catch(() => {});
            }
        } else {
            if (this.dashPlayer) {
                console.log("[DASH Player] Resetting for standard MP4 video");
                this.dashPlayer.reset();
            }
            this.videoEl.src = videoUrl;
            this.videoEl.muted = this.isMuted;

            const playPromise = this.videoEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPlaying = true;
                    this.showLoader(false);
                    this.updatePlayPauseUI();
                }).catch(err => {
                    this.isMuted = true;
                    this.videoEl.muted = true;
                    this.updateSoundUI();
                    this.videoEl.play().catch(() => {});
                });
            }
        }

        // 🔥 FIREBASE LOG: VIDEO LOAD SUCCESS
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('video_load_success', {
                reel_id: currentItem.reelId || currentItem.id,
                reel_index: this.currentIndex + 1,
                quality: currentItem.isMPD ? 'DASH' : (isHD ? 'HD' : 'SD'),
                title: currentItem.title
            });
        }

        this.updateAmbientGlow();
        this.preloadNextVideo();
    }

    preloadNextVideo() {
        if (!this.shuffledQueue || this.shuffledQueue.length <= 1) return;
        const nextIndex = (this.currentIndex + 1) % this.shuffledQueue.length;
        const nextItem = this.shuffledQueue[nextIndex];
        if (nextItem.isMPD) {
            console.log(`[Preloader] Skipping preloading for MPD video: ${nextItem.title}`);
            return;
        }
        const { url: nextVideoUrl } = this.getAdaptiveVideoUrl(nextItem);
        
        console.log(`[Preloader] Preloading next video: ${nextItem.title}`);
        this.preloadVideoEl.src = nextVideoUrl;
        this.preloadVideoEl.load();
    }

    enterYouTubeAdMode(ytVideoId1, ytVideoId2, title, totalDurationSec = 60) {
        this.isAdMode = true;
        this.isScrollLocked = true;
        this.adCompleted = false;

        document.body.classList.add('ad-mode-active');

        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.style.display = 'none';
        }

        if (this.ytAdsWrapper) {
            this.ytAdsWrapper.style.display = 'flex';
        }

        if (this.ytAdIframe) {
            this.ytAdIframe.src = `https://www.youtube.com/embed/${ytVideoId1}?autoplay=0&mute=0&enablejsapi=1&controls=1&rel=0&playsinline=1`;
        }

        if (this.ytAdIframe2) {
            this.ytAdIframe2.src = `https://www.youtube.com/embed/${ytVideoId2}?autoplay=0&mute=0&enablejsapi=1&controls=1&rel=0&playsinline=1`;
        }

        if (this.adLockOverlay) {
            this.adLockOverlay.style.display = 'flex';
            this.adLockOverlay.classList.add('active');
        }

        this.adLockTitle = document.getElementById('adLockTitle');
        this.adLockMessage = document.getElementById('adLockMessage');
        if (this.adLockTitle) {
            this.adLockTitle.textContent = "CocoBlue Sponsored YouTube Ad";
        }
        if (this.adLockMessage) {
            this.adLockMessage.style.display = 'block';
            this.adLockMessage.textContent = "Play YouTube video to unlock scrolling";
        }

        if (this.videoSourceTag) {
            this.videoSourceTag.className = 'live-tag yt-mode';
            this.videoSourceTag.innerHTML = `<i class="fa-brands fa-youtube"></i> YouTube Ad (${this.formatDuration(totalDurationSec)})`;
        }
        if (this.videoTitleDisplay) {
            this.videoTitleDisplay.textContent = title || "CocoBlue Sponsored YouTube Ad";
        }
        if (this.videoFilenameDisplay) {
            this.videoFilenameDisplay.textContent = `YouTube ID: ${ytVideoId1} & ${ytVideoId2}`;
        }
        if (this.swipeHintText) {
            this.swipeHintText.textContent = `🔒 Ad is playing (${this.formatDuration(totalDurationSec)})`;
        }

        this.showLoader(false);
    }

    formatDuration(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    updateAdLockBadge(secondsRemaining) {
        if (!this.isAdMode || !this.isScrollLocked) return;

        if (this.lockSecCount) {
            this.lockSecCount.textContent = this.formatDuration(secondsRemaining);
        }
    }

    unlockScrollAfterAd() {
        this.isScrollLocked = false;
        this.adCompleted = true;

        if (this.swipeHintText) {
            this.swipeHintText.textContent = "Swipe up to watch next reel";
        }

        if (this.adLockMessage) {
            this.adLockMessage.style.display = 'none'; // Hide instruction text when button is shown
        }

        if (this.proceedAfterAdBtn) {
            this.proceedAfterAdBtn.style.display = 'flex';
        }
    }

    exitYouTubeAdMode() {
        if (!this.isAdMode) return;

        this.isAdMode = false;
        this.isScrollLocked = false;
        this.adCompleted = false;

        document.body.classList.remove('ad-mode-active');

        if (this.ytAdsWrapper) {
            this.ytAdsWrapper.style.display = 'none';
        }

        if (this.ytAdIframe) {
            this.ytAdIframe.src = "";
        }
        if (this.ytAdIframe2) {
            this.ytAdIframe2.src = "";
        }

        if (this.adLockOverlay) {
            this.adLockOverlay.classList.remove('active');
            this.adLockOverlay.style.display = 'none';
        }

        if (this.proceedAfterAdBtn) {
            this.proceedAfterAdBtn.style.display = 'none';
        }

        if (window.adRedirectManager) {
            window.adRedirectManager.onUserScrollAfterAdComplete();
        }
    }

    triggerAdBreak() {
        this.isScrollLocked = true;
        this.isAdBreakActive = true;

        if (this.videoEl) {
            this.videoEl.pause();
            this.isPlaying = false;
            this.updatePlayPauseUI();
        }

        const overlay = document.getElementById('adBreakOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }

        // 🔥 FIREBASE LOG: AD BREAK STARTED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('ad_break_started', { duration: 3 });
        }

        let countdown = 3;
        const timerCountEl = document.getElementById('adBreakTimerCount');
        const countdownTextEl = document.getElementById('adBreakCountdownText');
        const continueBtn = document.getElementById('adBreakContinueBtn');

        if (timerCountEl) timerCountEl.textContent = `${countdown}s`;
        if (countdownTextEl) countdownTextEl.textContent = countdown;
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Locked (${countdown}s)`;
            continueBtn.className = 'ad-break-btn';
        }

        const interval = setInterval(() => {
            countdown--;
            if (timerCountEl) timerCountEl.textContent = `${countdown}s`;
            if (countdownTextEl) countdownTextEl.textContent = countdown;
            if (continueBtn) {
                continueBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Locked (${countdown}s)`;
            }

            if (countdown <= 0) {
                clearInterval(interval);
                if (timerCountEl) timerCountEl.textContent = 'Unlocked';
                if (continueBtn) {
                    continueBtn.disabled = false;
                    continueBtn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Continue Reels`;
                    continueBtn.className = 'ad-break-btn unlocked';
                }
                // 🔥 FIREBASE LOG: AD BREAK UNLOCKED
                if (window.logFirebaseEvent) {
                    window.logFirebaseEvent('ad_break_unlocked', {});
                }
            }
        }, 1000);
    }

    animateTransition(direction, callback) {
        if (!this.reelCard) {
            callback();
            return;
        }

        const slideOutClass = direction === 'next' ? 'slide-out-up' : 'slide-out-down';
        const slideInClass = direction === 'next' ? 'slide-in-up' : 'slide-in-down';

        this.reelCard.classList.add(slideOutClass);

        setTimeout(() => {
            callback();

            this.reelCard.classList.remove(slideOutClass);
            this.reelCard.classList.add(slideInClass);

            // Force reflow
            this.reelCard.offsetHeight;

            this.reelCard.classList.remove(slideInClass);
        }, 250);
    }

    nextReel() {
        if (this.isAdBreakActive) return;
        if (this.checkScrollLocked()) return;

        // Trigger 3s Ad Break every 6 videos
        this.videosWatched = (this.videosWatched || 0) + 1;
        if (this.videosWatched >= 6) {
            this.triggerAdBreak();
            return;
        }

        if (this.isTransitioning) return;
        this.isTransitioning = true;

        if (this.isMuted) {
            this.unmuteAudio();
        }

        // 🔥 FIREBASE LOG: REEL SCROLLED NEXT
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('reel_scrolled', { direction: 'next', new_index: this.currentIndex + 1 });
        }

        this.animateTransition('next', () => {
            if (this.isAdMode) {
                this.exitYouTubeAdMode();
                this.loadCurrentReel();
            } else {
                this.currentIndex++;
                if (this.currentIndex >= this.shuffledQueue.length) {
                    this.shuffleQueue();
                }
                this.loadCurrentReel();
            }
        });

        setTimeout(() => {
            this.isTransitioning = false;
        }, 550);
    }

    prevReel() {
        if (this.checkScrollLocked()) return;
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        if (this.isMuted) {
            this.unmuteAudio();
        }

        // 🔥 FIREBASE LOG: REEL SCROLLED PREV
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('reel_scrolled', { direction: 'prev', new_index: this.currentIndex - 1 });
        }

        this.animateTransition('prev', () => {
            if (this.isAdMode) {
                this.exitYouTubeAdMode();
                this.loadCurrentReel();
            } else {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                } else {
                    this.currentIndex = this.shuffledQueue.length - 1;
                }
                this.loadCurrentReel();
            }
        });

        setTimeout(() => {
            this.isTransitioning = false;
        }, 550);
    }

    checkScrollLocked() {
        if (this.isScrollLocked) {
            if (this.reelCard) {
                this.reelCard.classList.add('shake-locked');
                setTimeout(() => {
                    this.reelCard.classList.remove('shake-locked');
                }, 400);
            }

            if (window.adRedirectManager) {
                window.adRedirectManager.showScrollLockWarning();
            }
            return true;
        }
        return false;
    }

    handleSwipeGesture() {
        const diffY = this.touchEndY - this.touchStartY;
        
        if (diffY < -this.swipeThreshold) {
            this.nextReel();
        } else if (diffY > this.swipeThreshold) {
            this.prevReel();
        }
    }

    togglePlayPause() {
        if (this.isAdMode) return;
        if (!this.videoEl) return;

        if (this.isMuted) {
            this.unmuteAudio();
        }

        if (this.videoEl.paused) {
            this.videoEl.play();
            this.isPlaying = true;
            this.showPulseIcon('play');
        } else {
            this.videoEl.pause();
            this.isPlaying = false;
            this.showPulseIcon('pause');
        }

        // 🔥 FIREBASE LOG: PLAY/PAUSE TOGGLED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('video_play_pause_toggled', { is_playing: this.isPlaying });
        }

        this.updatePlayPauseUI();
    }

    updatePlayPauseUI() {
        if (this.playPauseIcon) {
            if (this.isPlaying) {
                this.playPauseIcon.className = 'fa-solid fa-pause';
            } else {
                this.playPauseIcon.className = 'fa-solid fa-play';
            }
        }
    }

    showPulseIcon(type) {
        if (!this.centerPlayIndicator) return;
        this.centerPlayIndicator.innerHTML = `<i class="fa-solid fa-play"></i>`;
        this.centerPlayIndicator.classList.add('show');
        setTimeout(() => {
            this.centerPlayIndicator.classList.remove('show');
        }, 500);
    }

    unmuteAudio() {
        this.isMuted = false;
        if (this.videoEl) this.videoEl.muted = false;
        if (this.dashPlayer) this.dashPlayer.setMute(false);
        if (this.unmuteBanner) this.unmuteBanner.style.display = 'none';
        this.updateSoundUI();

        if (this._triggerUnmuteRef) {
            window.removeEventListener('click', this._triggerUnmuteRef);
            window.removeEventListener('touchstart', this._triggerUnmuteRef);
            this._triggerUnmuteRef = null;
        }
    }

    toggleSound() {
        this.isMuted = !this.isMuted;
        if (this.videoEl) this.videoEl.muted = this.isMuted;
        if (this.dashPlayer) this.dashPlayer.setMute(this.isMuted);
        if (!this.isMuted && this.unmuteBanner) {
            this.unmuteBanner.style.display = 'none';
        }

        // 🔥 FIREBASE LOG: SOUND TOGGLED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('sound_toggled', { is_muted: this.isMuted });
        }

        this.updateSoundUI();
    }

    updateSoundUI() {
        if (this.soundIcon) {
            if (this.isMuted) {
                this.soundIcon.className = 'fa-solid fa-volume-xmark';
            } else {
                this.soundIcon.className = 'fa-solid fa-volume-high';
            }
        }
    }

    updateScrubber() {
        if (this.isAdMode) return;
        if (!this.videoEl || !this.videoEl.duration) return;

        const current = this.videoEl.currentTime;
        const total = this.videoEl.duration;
        const percent = (current / total) * 100;

        if (this.scrubberFill) {
            this.scrubberFill.style.width = `${percent}%`;
        }

        if (this.timeDisplay) {
            this.timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(total)}`;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    handleVideoEnded() {
        if (this.isAdMode) return;
        
        console.log("[CocoBlue] 🎬 Video ended -> Auto-scrolling");

        // 🔥 FIREBASE LOG: REEL AUTO SCROLLED ON END
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('reel_auto_scrolled', { reel_index: this.currentIndex + 1 });
        }

        this.nextReel();
    }

    showLoader(show) {
        if (this.videoLoader) {
            if (show) {
                this.videoLoader.classList.add('active');
            } else {
                this.videoLoader.classList.remove('active');
            }
        }
    }

    updateAmbientGlow() {
        if (!this.ambientGlow) return;
        const colors = [
            'radial-gradient(circle, rgba(0, 242, 254, 0.3) 0%, rgba(255, 8, 68, 0.2) 50%, transparent 80%)',
            'radial-gradient(circle, rgba(79, 172, 254, 0.3) 0%, rgba(0, 242, 254, 0.2) 50%, transparent 80%)',
            'radial-gradient(circle, rgba(255, 8, 68, 0.3) 0%, rgba(255, 0, 0, 0.3) 50%, transparent 80%)'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        this.ambientGlow.style.background = randomColor;
    }

    toggleFullscreen() {
        if (!this.reelCard) return;

        if (!document.fullscreenElement) {
            if (this.reelCard.requestFullscreen) {
                this.reelCard.requestFullscreen();
            } else if (this.reelCard.webkitRequestFullscreen) {
                this.reelCard.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    window.reelApp = new ReelApp();
});
