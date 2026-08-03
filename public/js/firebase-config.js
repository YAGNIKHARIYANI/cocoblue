/**
 * CocoBlue Firebase Analytics & Monitoring Suite
 * Realtime Event Monitoring for Ads, User Sessions, Video Performance & Errors
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics, logEvent, setUserId, setUserProperties } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getDatabase, ref, set, push, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD21DPX7_EbzytQyHDHgGgCLsRaAR0onPA",
  authDomain: "together-dff08.firebaseapp.com",
  databaseURL: "https://together-dff08-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "together-dff08",
  storageBucket: "together-dff08.appspot.com",
  messagingSenderId: "819156953919",
  appId: "1:819156953919:web:53cb3f04f09cbf6f17018a",
  measurementId: "G-SPMELNGT1J"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
let analytics = null;
try {
    analytics = getAnalytics(app);
} catch(e) {
    console.warn('[CocoBlue Firebase] Analytics not supported in environment:', e);
}

const db = getDatabase(app);

// Persistent Anonymous User ID for User & Session Duration Tracking
let anonymousUserId = localStorage.getItem('cocoblue_user_id');
if (!anonymousUserId) {
    anonymousUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('cocoblue_user_id', anonymousUserId);
}

if (analytics) {
    try {
        setUserId(analytics, anonymousUserId);
        setUserProperties(analytics, { preferred_language: 'gu' });
    } catch(e) {}
}

// Session Duration Tracker
let sessionStartTime = Date.now();
window.addEventListener('beforeunload', () => {
    const timeSpentSec = Math.floor((Date.now() - sessionStartTime) / 1000);
    window.logFirebaseEvent('user_session_end', {
        session_duration_seconds: timeSpentSec,
        user_id: anonymousUserId
    });
});

// Centralized Firebase Event Tracking Engine
window.logFirebaseEvent = (eventName, eventParams = {}) => {
    const fullParams = {
        ...eventParams,
        user_id: anonymousUserId,
        page_location: window.location.href,
        timestamp: new Date().toISOString()
    };

    console.log(`[🔥 Firebase Monitor] Event logged: ${eventName}`, fullParams);

    // 1. Google Analytics Event
    if (analytics) {
        try {
            logEvent(analytics, eventName, fullParams);
        } catch(e) {}
    }

    // 2. Realtime Database Aggregates & Event Logs
    try {
        const eventRef = ref(db, `analytics_logs/${eventName}`);
        push(eventRef, {
            ...fullParams,
            db_timestamp: serverTimestamp()
        });

        const summaryRef = ref(db, `analytics_summary/${eventName}_count`);
        set(summaryRef, increment(1));
    } catch(e) {}
};

// Expose Firebase objects globally
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.firebaseDb = db;

// Log Initial Session Start Event
window.logFirebaseEvent('user_session_start', {
    referrer: document.referrer || 'direct',
    screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
    user_agent: navigator.userAgent
});

console.log("[CocoBlue] 🔥 Firebase Monitoring Suite ('together-dff08') successfully initialized!");
