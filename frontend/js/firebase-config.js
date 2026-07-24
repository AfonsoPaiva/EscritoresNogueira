// ==================================
// FIREBASE-CONFIG.JS - Static Mode Placeholder
// ==================================

let firebaseInitialized = true;

async function initializeFirebase() {
    if (window._tryInitFirebaseInterval) {
        clearInterval(window._tryInitFirebaseInterval);
        window._tryInitFirebaseInterval = null;
    }
    // Backend is decommissioned; no-op in static mode
    return;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

window.initializeFirebase = initializeFirebase;
