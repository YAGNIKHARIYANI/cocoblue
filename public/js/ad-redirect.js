/**
 * CocoBlue Gujarati Ad & Session Persistence Manager (Bulletproof Anti-Bypass)
 * કોકોબ્લુ ગુજરાતી એડ સેશન મેનેજર - ૧૦૦% બુલેટપ્રૂફ (પેજ રિફ્રેશ કરવાથી ટાઇમર રીસેટ થશે નહીં!)
 */

class AdRedirectManager {
    constructor() {
        this.youtubeAds = [
            { id: "kChKciLOaRM", title: "કોકોબ્લુ સ્પોન્સર્ડ રીલ #૧", url: "https://youtu.be/kChKciLOaRM?si=mxKwbABXSUXjmMag" },
            { id: "hjdnmgDeR7Q", title: "કોકોબ્લુ સ્પોન્સર્ડ રીલ #૨", url: "https://youtu.be/hjdnmgDeR7Q?si=GR7N6xCAYt4--0MD" },
            { id: "tII7mfnLUms", title: "કોકોબ્લુ સ્પોન્સર્ડ રીલ #૩", url: "https://youtu.be/tII7mfnLUms?si=7o9oyQ2KTrbN_6ms" }
        ];

        this.adDurationSeconds = 80; // ૧ મિનિટ ૨૦ સેકન્ડ = ૮૦ સેકન્ડ
        this.currentCountdown = 80;
        this.countdownInterval = null;
        this.isAdActive = false;
        this.isPaused = false;

        this.autoAdInterval = null;
        this.timeSinceLastAd = 0;
        this.triggerCount = 0;

        // LocalStorage Key for Session Persistence
        this.storageKey = 'cocoblue_ad_lock_session_v2';

        this.initDOMElements();
        this.initEventListeners();
        
        // Immediately restore active ad session before any API call overrides it
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

    // BULLETPROOF RECOVERY ON REFRESH (F5)
    restoreAdSessionOrStartTracker() {
        const savedSessionData = localStorage.getItem(this.storageKey);
        
        if (savedSessionData) {
            try {
                const session = JSON.parse(savedSessionData);
                if (session && session.isAdActive && session.remainingSeconds > 0) {
                    const elapsedWhileAway = Math.floor((Date.now() - session.timestamp) / 1000);
                    // Deduct elapsed time or keep remaining seconds
                    const actualRemaining = Math.max(1, session.remainingSeconds - Math.max(0, elapsedWhileAway));

                    console.log(`[CocoBlue Anti-Bypass] 🔒 પેજ રિફ્રેશ થયું! જૂનો બાકી સમય: ${actualRemaining} સેકન્ડ (રીસેટ નહીં થાય)`);
                    
                    this.isAdActive = true;
                    this.currentCountdown = actualRemaining;
                    this.currentAdId = session.adId || this.youtubeAds[0].id;

                    // Execute recovery immediately and retry until app is ready
                    const applyRecovery = () => {
                        if (window.reelApp) {
                            window.reelApp.enterYouTubeAdMode(this.currentAdId, "કોકોબ્લુ સ્પોન્સર્ડ એડ (સેશન બાકી સમય)", this.adDurationSeconds);
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
                console.error("[CocoBlue Anti-Bypass] સેશન રીડ કરવામાં ભૂલ:", err);
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
            adId: this.currentAdId || this.youtubeAds[0].id,
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
            const remainingUntilNext = this.adDurationSeconds - this.timeSinceLastAd;

            if (this.timerSubtextDisplay) {
                this.timerSubtextDisplay.textContent = `નવી એડ: ${this.formatTimeDigital(Math.max(0, remainingUntilNext))}`;
            }

            if (this.timeSinceLastAd >= this.adDurationSeconds) {
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

    triggerInAppYouTubeAd(customYtId = null) {
        let adObj;
        if (customYtId) {
            adObj = this.youtubeAds.find(a => a.id === customYtId) || { id: customYtId, title: "કોકોબ્લુ સ્પોન્સર્ડ રીલ" };
        } else {
            adObj = this.getRandomYouTubeAd();
        }

        this.currentAdId = adObj.id;
        console.log(`[CocoBlue Gujarati] In-App 1m 20s Ad પ્લે થઈ રહ્યું છે: ${adObj.id}`);

        this.isAdActive = true;
        this.currentCountdown = this.adDurationSeconds;
        this.saveAdSession();

        if (window.reelApp) {
            window.reelApp.enterYouTubeAdMode(adObj.id, adObj.title, this.adDurationSeconds);
        }

        this.updateHUD(this.currentCountdown, true);
        this.startAdLockCountdown();
    }

    triggerExternalTabRedirect() {
        const adObj = this.getRandomYouTubeAd();
        console.log(`[CocoBlue Gujarati] Triggering External Redirect: ${adObj.url}`);

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
            window.open(adObj.url, '_blank');
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
    }

    startAdLockCountdown() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            if (this.isPaused) return;

            this.currentCountdown--;
            this.saveAdSession(); // Persist count continuously
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

        // CLEAR STORAGE ONLY WHEN COUNTDOWN IS 100% COMPLETE (0 SECONDS)
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
            return `${m} મિનિટ ${s < 10 ? '0' : ''}${s} સેકન્ડ`;
        }
        return `${s} સેકન્ડ`;
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
                this.timerTitleDisplay.innerHTML = `<i class="fa-solid fa-lock" style="color:#ff0844"></i> ૧:૨૦ મિનિટ લોક`;
            } else {
                this.timerTitleDisplay.innerHTML = `<i class="fa-solid fa-lock-open" style="color:#00f2fe"></i> સ્ક્ર્રોલ અનલોક`;
            }
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
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
