/**
 * CocoBlue Gujarati Ad & Session Persistence Manager (Dynamic Ad Lock Timing & Firebase Monitor)
 * કોકોબ્લુ ગુજરાતી એડ સેશન મેનેજર - એડ પ્લે કાઉન્ટ અને ફાયરબેઝ મોનિટરિંગ
 */

class AdRedirectManager {
    constructor() {
        this.youtubeAds = [
            { id: "kChKciLOaRM", title: "CocoBlue Sponsored Reel #1 (1:20)", url: "https://youtu.be/kChKciLOaRM?si=mxKwbABXSUXjmMag", duration: 80 },
            { id: "hjdnmgDeR7Q", title: "CocoBlue Sponsored Reel #2 (1:00)", url: "https://youtu.be/hjdnmgDeR7Q?si=GR7N6xCAYt4--0MD", duration: 60 },
            { id: "tII7mfnLUms", title: "CocoBlue Sponsored Reel #3 (0:45)", url: "https://youtu.be/tII7mfnLUms?si=7o9oyQ2KTrbN_6ms", duration: 45 }
        ];

        this.smartLink = "https://www.effectivecpmnetwork.com/yrg8dyq4n?key=05a4b93d5551e28f8e1de83dbf234d2e";

        this.adDurationSeconds = 60;
        this.currentCountdown = 60;
        this.countdownInterval = null;
        this.isAdActive = false;
        this.isPaused = false;

        this.autoAdInterval = null;
        this.timeSinceLastAd = 0;
        this.triggerCount = 0;

        // LocalStorage Key for Session Persistence
        this.storageKey = 'cocoblue_ad_lock_session_v3';

        this.initDOMElements();
        this.initEventListeners();
        this.restoreAdSessionOrStartTracker();
    }

    initDOMElements() {
        this.timerCountEl = document.getElementById('timerCount');
        this.timerProgressCircle = document.getElementById('timerProgressCircle');
        this.timerTitleDisplay = document.getElementById('timerTitleDisplay');
        this.timerSubtextDisplay = document.getElementById('timerSubtextDisplay');
        this.timerPauseBtn = document.getElementById('timerPauseBtn');

        this.loadYtAdHeaderBtn = document.getElementById('loadYtAdHeaderBtn');
        this.bottomAdBtn = document.getElementById('bottomAdBtn');
        this.manualAdTriggerBtn = document.getElementById('manualAdTriggerBtn');
        this.externalRedirectBtn = document.getElementById('externalRedirectBtn');

        this.scrollLockToast = document.getElementById('scrollLockToast');
        this.toastLockSecs = document.getElementById('toastLockSecs');

        this.externalRedirectToast = document.getElementById('externalRedirectToast');
        this.toastCountdownEl = document.getElementById('toastCountdownEl');
        this.cancelRedirectBtn = document.getElementById('cancelRedirectBtn');
    }

    initEventListeners() {
        if (this.timerPauseBtn) {
            this.timerPauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePause();
            });
        }

        if (this.loadYtAdHeaderBtn) {
            this.loadYtAdHeaderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.triggerHybridAd();
            });
        }

        if (this.bottomAdBtn) {
            this.bottomAdBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.triggerHybridAd();
            });
        }

        if (this.manualAdTriggerBtn) {
            this.manualAdTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.triggerInAppYouTubeAd();
            });
        }

        if (this.externalRedirectBtn) {
            this.externalRedirectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.triggerExternalTabRedirect();
            });
        }

        if (this.cancelRedirectBtn) {
            this.cancelRedirectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.cancelExternalRedirect();
            });
        }

        document.querySelectorAll('.load-yt-direct').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const ytId = e.currentTarget.getAttribute('data-id');
                this.triggerInAppYouTubeAd(ytId);
            });
        });
    }

    restoreAdSessionOrStartTracker() {
        const savedSessionData = localStorage.getItem(this.storageKey);
        
        if (savedSessionData) {
            try {
                const session = JSON.parse(savedSessionData);
                if (session && session.isAdActive && session.remainingSeconds > 0) {
                    const elapsedWhileAway = Math.floor((Date.now() - session.timestamp) / 1000);
                    const actualRemaining = Math.max(1, session.remainingSeconds - Math.max(0, elapsedWhileAway));

                    console.log(`[CocoBlue Anti-Bypass] 🔒 Old session found! Remaining time: ${actualRemaining}s`);
                    
                    this.isAdActive = true;
                    this.adDurationSeconds = session.totalDuration || 80;
                    this.currentCountdown = actualRemaining;
                    this.currentAdId = session.adId || this.youtubeAds[0].id;
                    this.currentAdId2 = session.adId2 || this.youtubeAds[1].id;

                    const applyRecovery = () => {
                        if (window.reelApp) {
                            window.reelApp.enterYouTubeAdMode(this.currentAdId, this.currentAdId2, session.adTitle || "CocoBlue Sponsored Ad", this.adDurationSeconds);
                            this.updateHUD(this.currentCountdown, true);
                            this.startAdLockCountdown();
                            this.showScrollLockWarning();
                        } else {
                            setTimeout(applyRecovery, 50);
                        }
                    };

                    applyRecovery();
                    return;
                }
            } catch (err) {
                console.error("[CocoBlue Anti-Bypass] Error reading session:", err);
                localStorage.removeItem(this.storageKey);
            }
        }

        this.startGlobalAdTracker();
    }

    saveAdSession() {
        if (!this.isAdActive) return;
        const sessionData = {
            isAdActive: true,
            remainingSeconds: this.currentCountdown,
            totalDuration: this.adDurationSeconds,
            adId: this.currentAdId || this.youtubeAds[0].id,
            adId2: this.currentAdId2 || this.youtubeAds[1].id,
            adTitle: this.currentAdTitle || "CocoBlue Sponsored Ad",
            timestamp: Date.now()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    }

    clearAdSession() {
        localStorage.removeItem(this.storageKey);
    }

    startGlobalAdTracker() {
        if (this.autoAdInterval) clearInterval(this.autoAdInterval);
        
        this.autoAdInterval = setInterval(() => {
            if (this.isAdActive) return;

            this.timeSinceLastAd++;
            const remainingUntilNext = 80 - this.timeSinceLastAd;

            if (this.timerSubtextDisplay) {
                this.timerSubtextDisplay.textContent = `Next Ad: ${this.formatTimeDigital(Math.max(0, remainingUntilNext))}`;
            }

            if (this.timeSinceLastAd >= 80) {
                this.timeSinceLastAd = 0;
                this.triggerHybridAd();
            }
        }, 1000);
    }

    getRandomYouTubeAd() {
        const randomIndex = Math.floor(Math.random() * this.youtubeAds.length);
        return this.youtubeAds[randomIndex];
    }

    triggerHybridAd() {
        this.triggerCount++;
        if (this.triggerCount % 2 === 0) {
            this.triggerExternalTabRedirect();
        } else {
            this.triggerInAppYouTubeAd();
        }
    }

    // TRIGGER IN-APP YOUTUBE AD (Log Firebase Event: ad_play_started)
    triggerInAppYouTubeAd(customYtId = null) {
        let adObj1, adObj2;
        if (customYtId) {
            adObj1 = this.youtubeAds.find(a => a.id === customYtId) || { id: customYtId, title: "CocoBlue Sponsored Reel", duration: 60 };
            adObj2 = this.youtubeAds.find(a => a.id !== adObj1.id) || this.youtubeAds[0];
        } else {
            const shuffled = [...this.youtubeAds].sort(() => 0.5 - Math.random());
            adObj1 = shuffled[0];
            adObj2 = shuffled[1];
        }

        this.currentAdId = adObj1.id;
        this.currentAdId2 = adObj2.id;
        this.currentAdTitle = adObj1.title;
        this.adDurationSeconds = 60; // Keep countdown at exactly 60s

        console.log(`[CocoBlue Gujarati] In-App YouTube Ads (${adObj1.id} & ${adObj2.id})`);

        this.isAdActive = true;
        this.currentCountdown = this.adDurationSeconds;
        this.saveAdSession();

        // 🔥 FIREBASE LOG: AD PLAY STARTED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('ad_play_started', {
                ad_type: 'in_app_youtube',
                ad_id: adObj1.id,
                ad_title: adObj1.title,
                ad_duration: this.adDurationSeconds
            });
        }

        if (window.reelApp) {
            window.reelApp.enterYouTubeAdMode(adObj1.id, adObj2.id, adObj1.title, this.adDurationSeconds);
        }

        this.updateHUD(this.currentCountdown, true);
        this.startAdLockCountdown();
    }

    // TRIGGER EXTERNAL TAB REDIRECT (Log Firebase Event: external_ad_redirect)
    triggerExternalTabRedirect() {
        console.log(`[CocoBlue] Triggering External Redirect to Smart Link: ${this.smartLink}`);

        if (this.externalRedirectToast) {
            this.externalRedirectToast.classList.add('active');
        }

        let toastCount = 3;
        if (this.toastCountdownEl) {
            this.toastCountdownEl.textContent = toastCount;
        }

        const countdownInterval = setInterval(() => {
            toastCount--;
            if (this.toastCountdownEl) {
                this.toastCountdownEl.textContent = toastCount;
            }
            if (toastCount <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        this.redirectTimeout = setTimeout(() => {
            if (this.externalRedirectToast) {
                this.externalRedirectToast.classList.remove('active');
            }

            // 🔥 FIREBASE LOG: EXTERNAL REDIRECT TRIGGERED
            if (window.logFirebaseEvent) {
                window.logFirebaseEvent('external_ad_redirect', {
                    ad_id: 'smartlink_1',
                    target_url: this.smartLink
                });
            }

            window.open(this.smartLink, '_blank');
            this.timeSinceLastAd = 0;
        }, 3200);
    }

    cancelExternalRedirect() {
        if (this.redirectTimeout) {
            clearTimeout(this.redirectTimeout);
            this.redirectTimeout = null;
        }
        if (this.externalRedirectToast) {
            this.externalRedirectToast.classList.remove('active');
        }

        // 🔥 FIREBASE LOG: REDIRECT CANCELED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('external_ad_redirect_canceled', {});
        }
    }

    startAdLockCountdown() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            if (this.isPaused) return;

            this.currentCountdown--;
            this.saveAdSession();
            this.updateHUD(this.currentCountdown, true);

            if (window.reelApp) {
                window.reelApp.updateAdLockBadge(this.currentCountdown);
            }

            if (this.currentCountdown <= 0) {
                this.finishAdLock();
            }
        }, 1000);
    }

    finishAdLock() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // 🔥 FIREBASE LOG: AD LOCK COMPLETED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('ad_lock_completed', {
                ad_id: this.currentAdId,
                duration_completed_seconds: this.adDurationSeconds
            });
        }

        this.clearAdSession();
        this.updateHUD(0, false);

        if (window.reelApp) {
            window.reelApp.unlockScrollAfterAd();
        }

        if (!this.autoAdInterval) {
            this.startGlobalAdTracker();
        }
    }

    onUserScrollAfterAdComplete() {
        this.isAdActive = false;
        this.timeSinceLastAd = 0;
        this.clearAdSession();
    }

    showScrollLockWarning() {
        if (this.scrollLockToast) {
            if (this.toastLockSecs) {
                this.toastLockSecs.textContent = this.formatTimeDigital(this.currentCountdown);
            }
            this.scrollLockToast.classList.add('active');

            setTimeout(() => {
                this.scrollLockToast.classList.remove('active');
            }, 2500);
        }
    }

    formatTimeDigital(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    formatTimeText(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        if (m > 0) {
            return `${m} min ${s < 10 ? '0' : ''}${s} sec`;
        }
        return `${s} sec`;
    }

    updateHUD(seconds, isLocked) {
        if (this.timerCountEl) {
            this.timerCountEl.textContent = this.formatTimeDigital(seconds);
        }

        if (this.timerProgressCircle) {
            const percentage = (seconds / this.adDurationSeconds) * 100;
            this.timerProgressCircle.setAttribute('stroke-dasharray', `${percentage}, 100`);
        }

        if (this.timerTitleDisplay) {
            if (isLocked) {
                this.timerTitleDisplay.innerHTML = `<i class="fa-solid fa-lock" style="color:#ff0844"></i> ${this.formatTimeDigital(this.adDurationSeconds)} Locked`;
            } else {
                this.timerTitleDisplay.innerHTML = `<i class="fa-solid fa-lock-open" style="color:#00f2fe"></i> Scroll Unlocked`;
            }
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        // 🔥 FIREBASE LOG: TIMER PAUSE TOGGLED
        if (window.logFirebaseEvent) {
            window.logFirebaseEvent('timer_pause_toggled', { is_paused: this.isPaused });
        }

        if (this.timerPauseBtn) {
            this.timerPauseBtn.innerHTML = this.isPaused ? 
                '<i class="fa-solid fa-play"></i>' : 
                '<i class="fa-solid fa-pause"></i>';
        }
    }
}

// Global initialization
window.adRedirectManager = null;
document.addEventListener('DOMContentLoaded', () => {
    window.adRedirectManager = new AdRedirectManager();
});
