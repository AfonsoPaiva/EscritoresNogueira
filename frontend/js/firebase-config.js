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
        console.log('🔥 Firebase already initialized');
        return;
    }

    // Wait for Klaro to be available and check consent
    if (typeof klaro === 'undefined') {
        // Klaro not loaded yet - retry once Klaro is available
        if (!window._tryInitFirebaseInterval) {
            window._tryInitFirebaseInterval = setInterval(() => {
                if (typeof klaro !== 'undefined') {
                    clearInterval(window._tryInitFirebaseInterval);
                    window._tryInitFirebaseInterval = null;
                    // Only initialize if user already consented to firebase
                    try {
                        if (klaro.getManager && klaro.getManager().consents && klaro.getManager().consents.firebase) {
                            initializeFirebase();
                        }
                    } catch (e) {
                        // ignore and wait for explicit consent via Klaro callback
                    }
                }
            }, 250);
        }
        return;
    }

    // Check Klaro consent for firebase
    try {
        if (!klaro.getManager().consents.firebase) {
            console.log('🔥 Firebase consent not given, skipping initialization');
            return;
        }
    } catch (e) {
        console.log('🔥 Klaro manager not ready, skipping Firebase init');
        return;
    }

    try {
        console.log('🔥 Fetching Firebase configuration from backend...');
        
        const response = await fetch(`${FIREBASE_CONFIG_API_URL}/auth/firebase-config`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Firebase config: ${response.status}`);
        }
        
        const config = await response.json();
        
        // Validate required fields
        if (!config.apiKey || !config.authDomain || !config.projectId) {
            throw new Error('Invalid Firebase configuration received from server');
        }
        
        // Build Firebase config object
        const firebaseConfig = {
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket || '',
            messagingSenderId: config.messagingSenderId || '',
            appId: config.appId || ''
        };
        
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        
        // Initialize Firebase Auth
        window.firebaseAuth = firebase.auth();
        
        // Configure persistence - keep user logged in
        await window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        firebaseInitialized = true;
        console.log('🔥 Firebase initialized successfully');
        
        // Dispatch event to notify other modules that Firebase is ready
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('firebaseError', { detail: error }));
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
