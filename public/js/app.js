/**
 * StreamReels - Gujarati Core Application Logic & Anti-Bypass System
 * કોકોબ્લુ લોકલ વિડિયો ફીડ સ્ટ્રીમિંગ, ઓટો-સ્ક્ર્રોલ, સ્વાઇપ ગેસ્ચર અને ૧ મિનિટ ૨૦ સેકન્ડ યુટ્યુબ એડ એન્જિન.
 */

class ReelApp {
    constructor() {
        this.rawVideoList = [];
        this.shuffledQueue = [];
        this.currentIndex = 0;
        this.isMuted = true;
        this.isPlaying = false;
        this.isTransitioning = false;

        // Ad Mode & Scroll Lock Flags
        this.isAdMode = false;
        this.isScrollLocked = false;
        this.adCompleted = false;

        // Touch Gesture tracking
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 45;

        // Wheel Scroll throttling
        this.lastWheelTime = 0;
        this.wheelThrottleMs = 700;

        this.initDOMElements();
        this.initEventListeners();
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
        this.ytAdContainer = document.getElementById('ytAdContainer');
        this.ytAdIframe = document.getElementById('ytAdIframe');
        this.adLockOverlay = document.getElementById('adLockOverlay');
        this.adLockTitle = document.getElementById('adLockTitle');
        this.adLockMessage = document.getElementById('adLockMessage');
        this.lockCountdownPill = document.getElementById('lockCountdownPill');
        this.lockSecCount = document.getElementById('lockSecCount');

        // Overlay Text Displays
        this.videoSourceTag = document.getElementById('videoSourceTag');
        this.videoTitleDisplay = document.getElementById('videoTitleDisplay');
        this.videoFilenameDisplay = document.getElementById('videoFilenameDisplay');
        this.videoCounterText = document.getElementById('videoCounterText');
        this.unmuteBanner = document.getElementById('unmuteBanner');

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

        // Ad Closes
        this.closeTopAdBtn = document.getElementById('closeTopAdBtn');
        this.topAdBanner = document.getElementById('topAdBanner');
        this.closeBottomAdBtn = document.getElementById('closeBottomAdBtn');
        this.bottomAdBanner = document.getElementById('bottomAdBanner');

        // Settings
        this.autoScrollToggle = document.getElementById('autoScrollToggle');
        this.ambientGlowToggle = document.getElementById('ambientGlowToggle');
    }

    initEventListeners() {
        if (this.unmuteBanner) {
            this.unmuteBanner.addEventListener('click', () => this.unmuteAudio());
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
            this.videoEl.addEventListener('timeupdate', () => this.updateScrubber());
            
            // AUTO-SCROLL EVENT WHEN VIDEO ENDS
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
            if (e.key === 'ArrowDown') {
                this.nextReel();
            } else if (e.key === 'ArrowUp') {
                this.prevReel();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.key === 'm' || e.key === 'M') {
                this.toggleSound();
            }
        });
    }

    async fetchVideos() {
        this.showLoader(true);
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('Failed to load videos from API');
            
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                this.rawVideoList = data;
            } else {
                this.useFallbackVideos();
            }
        } catch (err) {
            console.error('[CocoBlue Gujarati] API ભૂલ:', err);
            this.useFallbackVideos();
        }

        this.shuffleQueue();
        
        // Anti-bypass check: Only load regular video if NO active ad session is in progress
        const isAdActive = window.adRedirectManager && window.adRedirectManager.isAdActive;
        if (!this.isAdMode && !isAdActive) {
            this.loadCurrentReel();
        }
    }

    useFallbackVideos() {
        this.rawVideoList = [
            {
                id: "big_buck_bunny.mp4",
                filename: "big_buck_bunny.mp4",
                title: "બિગ બક બન્ની - ક્લાસિક ગુજરાતી એચડી રીલ",
                streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
            },
            {
                id: "bear_nature_sample.mp4",
                filename: "bear_nature_sample.mp4",
                title: "જંગલી રીંછ કુદરતી દ્રશ્ય - ગુજરાતી સ્પેશિયલ",
                streamUrl: "https://www.w3schools.com/tags/movie.mp4"
            }
        ];
    }

    shuffleQueue() {
        const array = [...this.rawVideoList];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        this.shuffledQueue = array;
        this.currentIndex = 0;
    }

    shuffleAndRestart() {
        this.exitYouTubeAdMode();
        this.shuffleQueue();
        this.loadCurrentReel();
    }

    loadCurrentReel() {
        // Anti-bypass guard: NEVER override an active ad mode!
        if (this.isAdMode || (window.adRedirectManager && window.adRedirectManager.isAdActive)) {
            console.log("[CocoBlue Anti-Bypass] સ્પોન્સર્ડ એડ ચાલુ હોવાથી લોકલ રીલ લોડ નહીં થાય.");
            return;
        }

        if (!this.shuffledQueue || this.shuffledQueue.length === 0) return;

        const currentItem = this.shuffledQueue[this.currentIndex];

        if (this.videoSourceTag) {
            this.videoSourceTag.className = 'live-tag';
            this.videoSourceTag.innerHTML = '<i class="fa-solid fa-circle"></i> ગુજરાતી લોકલ રીલ';
        }
        if (this.videoTitleDisplay) this.videoTitleDisplay.textContent = currentItem.title;
        if (this.videoFilenameDisplay) this.videoFilenameDisplay.textContent = currentItem.filename;
        if (this.videoCounterText) {
            this.videoCounterText.textContent = `${this.currentIndex + 1} / ${this.shuffledQueue.length}`;
        }
        if (this.swipeHintText) {
            this.swipeHintText.textContent = "બીજી રીલ જોવા માટે ઉપર સ્વાઇપ કરો";
        }
        if (this.swipeHintContainer) {
            this.swipeHintContainer.classList.remove('unlocked-glow');
        }

        this.showLoader(true);
        this.videoEl.style.display = 'block';
        this.videoEl.loop = false;
        this.videoEl.src = currentItem.streamUrl;
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

        this.updateAmbientGlow();
    }

    // ENTER GUJARATI YOUTUBE AD MODE (Guaranteed Autoplay & Anti-Bypass)
    enterYouTubeAdMode(ytVideoId, title, totalDurationSec = 80) {
        this.isAdMode = true;
        this.isScrollLocked = true;
        this.adCompleted = false;

        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.style.display = 'none';
        }

        if (this.ytAdIframe) {
            this.ytAdIframe.src = `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=1&enablejsapi=1&controls=1&rel=0&playsinline=1`;
        }
        if (this.ytAdContainer) {
            this.ytAdContainer.classList.add('active');
        }

        if (this.adLockOverlay) {
            this.adLockOverlay.classList.add('active');
        }
        if (this.adLockTitle) {
            this.adLockTitle.textContent = "કોકોબ્લુ સ્પોન્સર્ડ યુટ્યુબ એડ (૧:૨૦)";
        }
        if (this.adLockMessage) {
            this.adLockMessage.textContent = "સ્ક્ર્રોલ અનલોક કરવા માટે કૃપા કરીને ૧ મિનિટ અને ૨૦ સેકન્ડની યુટ્યુબ એડ પૂરી જુઓ!";
        }
        if (this.lockCountdownPill) {
            this.lockCountdownPill.className = "lock-countdown-pill";
            this.lockCountdownPill.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> સ્ક્ર્રોલ અનલોક થશે: <b id="lockSecCount">${this.formatDuration(totalDurationSec)}</b>`;
            this.lockSecCount = document.getElementById('lockSecCount');
        }

        if (this.videoSourceTag) {
            this.videoSourceTag.className = 'live-tag yt-mode';
            this.videoSourceTag.innerHTML = '<i class="fa-brands fa-youtube"></i> યુટ્યુબ એડ (૧:૨૦ મિનિટ)';
        }
        if (this.videoTitleDisplay) {
            this.videoTitleDisplay.textContent = title || "કોકોબ્લુ સ્પોન્સર્ડ યુટ્યુબ એડ";
        }
        if (this.videoFilenameDisplay) {
            this.videoFilenameDisplay.textContent = `યુટ્યુબ આઈડી: ${ytVideoId}`;
        }
        if (this.swipeHintText) {
            this.swipeHintText.textContent = "🔒 સ્ક્ર્રોલ લોક છે (૧:૨૦ મિનિટ એડ જુઓ)";
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

        if (this.lockCountdownPill) {
            this.lockCountdownPill.className = "lock-countdown-pill unlocked";
            this.lockCountdownPill.innerHTML = `<i class="fa-solid fa-circle-check"></i> ૧:૨૦ મિનિટ એડ પૂર્ણ થઈ! સ્ક્ર્રોલ અનલોક!`;
        }
        if (this.adLockMessage) {
            this.adLockMessage.textContent = "એડ જોવા બદલ આભાર! નવી લોકલ રીલ્સ જોવા માટે હવે ઉપર સ્વાઇપ કરો અથવા નીચે સ્ક્ર્રોલ કરો.";
        }
        if (this.swipeHintText) {
            this.swipeHintText.textContent = "✨ એડ પૂરી થઈ - આગામી રીલ્સ માટે ઉપર સ્વાઇપ કરો!";
        }
        if (this.swipeHintContainer) {
            this.swipeHintContainer.classList.add('unlocked-glow');
        }
    }

    exitYouTubeAdMode() {
        if (!this.isAdMode) return;

        this.isAdMode = false;
        this.isScrollLocked = false;
        this.adCompleted = false;

        if (this.ytAdIframe) {
            this.ytAdIframe.src = "";
        }
        if (this.ytAdContainer) {
            this.ytAdContainer.classList.remove('active');
        }
        if (this.adLockOverlay) {
            this.adLockOverlay.classList.remove('active');
        }

        if (window.adRedirectManager) {
            window.adRedirectManager.onUserScrollAfterAdComplete();
        }
    }

    nextReel() {
        if (this.checkScrollLocked()) return;
        if (this.isTransitioning) return;
        this.isTransitioning = true;

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

        setTimeout(() => {
            this.isTransitioning = false;
        }, 300);
    }

    prevReel() {
        if (this.checkScrollLocked()) return;
        if (this.isTransitioning) return;
        this.isTransitioning = true;

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

        setTimeout(() => {
            this.isTransitioning = false;
        }, 300);
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

        if (this.videoEl.paused) {
            this.videoEl.play();
            this.isPlaying = true;
            this.showPulseIcon('play');
        } else {
            this.videoEl.pause();
            this.isPlaying = false;
            this.showPulseIcon('pause');
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
        if (this.unmuteBanner) this.unmuteBanner.style.display = 'none';
        this.updateSoundUI();
    }

    toggleSound() {
        this.isMuted = !this.isMuted;
        if (this.videoEl) this.videoEl.muted = this.isMuted;
        if (!this.isMuted && this.unmuteBanner) {
            this.unmuteBanner.style.display = 'none';
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

    // AUTO-SCROLL WHEN LOCAL VIDEO ENDS
    handleVideoEnded() {
        if (this.isAdMode) return;
        
        console.log("[CocoBlue Gujarati] 🎬 વિડિયો પૂર્ણ થયો -> સ્વચાલિત ઓટો-સ્ક્ર્રોલ પ્લે પ્લે લાઇન (Auto-scroll)");
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
