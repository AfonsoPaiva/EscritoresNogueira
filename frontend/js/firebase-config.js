// ==================================
// FIREBASE-CONFIG.JS - Firebase initialization
// ==================================

// API URL - use runtime config or fallback to localhost
const FIREBASE_CONFIG_API_URL = window.API_BASE || 'http://localhost:8080/api';

// Firebase instance placeholder
let firebaseInitialized = false;

/**
 * Fetch Firebase configuration from backend and initialize Firebase
 */
async function initializeFirebase() {
    if (firebaseInitialized) {
        return;
    }

    // Wait for Klaro to be available and check consent
    if (typeof klaro === 'undefined') {
        if (!window._tryInitFirebaseInterval) {
            window._tryInitFirebaseInterval = setInterval(() => {
                if (typeof klaro !== 'undefined') {
                    clearInterval(window._tryInitFirebaseInterval);
                    window._tryInitFirebaseInterval = null;
                    try {
                        if (klaro.getManager && klaro.getManager().consents && klaro.getManager().consents.firebase) {
                            initializeFirebase();
                        }
                    } catch (e) {}
                }
            }, 250);
        }
        return;
    }

    // Check Klaro consent for firebase
    try {
        if (klaro.getManager && klaro.getManager().consents && !klaro.getManager().consents.firebase) {
            return;
        }
    } catch (e) {
        return;
    }

    try {
        const response = await fetch(`${FIREBASE_CONFIG_API_URL}/auth/firebase-config`).catch(() => null);
        
        if (!response || !response.ok) {
            return;
        }
        
        const config = await response.json();
        
        if (!config.apiKey || !config.authDomain || !config.projectId) {
            return;
        }
        
        const firebaseConfig = {
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket || '',
            messagingSenderId: config.messagingSenderId || '',
            appId: config.appId || ''
        };
        
        firebase.initializeApp(firebaseConfig);
        window.firebaseAuth = firebase.auth();
        await window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        firebaseInitialized = true;
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
    } catch (error) {
        // Backend is offline/disabled; fail silently in static mode
    }
}

// Initialize Firebase when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

// Export for use in other modules
window.initializeFirebase = initializeFirebase;
