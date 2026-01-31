// ==================================
// AUTH.JS - User authentication system with Firebase
// ==================================

// API Configuration
const AUTH_API_URL = window.API_BASE || 'http://localhost:8080/api';

// Session token header name
const SESSION_HEADER = 'X-Session-Token';

// Secure storage key (only stores session token, not user data)
const SESSION_TOKEN_KEY = 'escritores_session_token';

// reCAPTCHA configuration
let recaptchaSiteKey = null;

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionToken = this.loadSessionToken();
        this.notificationQueue = [];
        this.isNotificationShowing = false;
        this.notificationDisplayTime = 2000;
        this.notificationAnimationTime = 2000;
        this.isLoading = false;
        this.firebaseReady = false;
        this.sessionLoaded = false;
        this.sessionLoadPromise = null;
        this.pendingPassword = null;
        this.syncing = false;
        this.init();
    }

    init() {
        console.log('👤 AuthSystem inicializado');
        // Load reCAPTCHA config
        this.loadRecaptchaConfig();
        // Load session from backend if token exists
        this.sessionLoadPromise = this.loadSessionFromBackend();
        this.attachEventListeners();
        this.waitForFirebase();
        
        // Clean up any legacy localStorage data
        localStorage.removeItem('escritores_user');
    }

    /**
     * Wait for session to be loaded from backend
     * Use this in pages that need to check auth state
     */
    async waitForSession() {
        if (this.sessionLoaded) {
            return;
        }
        if (this.sessionLoadPromise) {
            await this.sessionLoadPromise;
        }
    }

    /**
     * Load reCAPTCHA configuration from backend
     */
    async loadRecaptchaConfig() {
        try {
            const response = await fetch(`${AUTH_API_URL}/auth/recaptcha-config`);
            if (response.ok) {
                const config = await response.json();
                window.recaptchaSiteKey = config.siteKey;
                console.log('🔒 reCAPTCHA config loaded');
                this.loadRecaptchaScript();
            } else {
                console.warn('Failed to load reCAPTCHA config');
            }
        } catch (error) {
            console.error('Error loading reCAPTCHA config:', error);
        }
    }

    /**
     * Load reCAPTCHA script dynamically
     */
    loadRecaptchaScript() {
        if (!window.recaptchaSiteKey || document.querySelector('script[src*="recaptcha"]')) {
            return;
        }

        const script = document.createElement('script');
        // Use site key in render parameter so grecaptcha.execute(siteKey) works for v3
        const rk = window.recaptchaSiteKey ? encodeURIComponent(window.recaptchaSiteKey) : 'explicit';
        script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=${rk}&hl=pt`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
            console.log('🔒 reCAPTCHA script loaded');
        };
    }

    waitForFirebase() {
        // Check if Firebase is already ready
        if (window.firebaseAuth) {
            this.firebaseReady = true;
            this.setupFirebaseAuthListener();
            return;
        }

        // Wait for Firebase to be ready
        window.addEventListener('firebaseReady', () => {
            console.log('👤 Firebase ready event received');
            this.firebaseReady = true;
            this.setupFirebaseAuthListener();
        });

        // Handle Firebase initialization errors
        window.addEventListener('firebaseError', (event) => {
            console.error('👤 Firebase initialization failed:', event.detail);
            this.showNotification('Erro ao inicializar autenticação. Tente recarregar a página.', 'error');
        });
    }

    setupFirebaseAuthListener() {
        // Listen for Firebase auth state changes
        if (window.firebaseAuth) {
            let initialCheck = true;
            
            window.firebaseAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('🔥 Firebase user detected:', user.email, 'verified:', user.emailVerified);
                    initialCheck = false;
                    
                    // Only sync with backend if email is verified
                    if (user.emailVerified && !this.sessionToken && !this.syncing) {
                        try {
                            await this.syncUserWithBackend(user);
                        } catch (error) {
                            console.error('Error syncing user:', error);
                        }
                    }
                    // Always update UI when Firebase detects user (to show email)
                    this.updateUI();
                } else {
                    console.log('🔥 No Firebase user');
                    
                    // On initial load, Firebase might fire null before restoring persisted user
                    // Only clear session if this is not the initial check AND we don't have a valid backend session
                    if (initialCheck && this.sessionToken && this.currentUser) {
                        console.log('🔥 Skipping session clear on initial Firebase check - have valid backend session');
                        initialCheck = false;
                        return;
                    }
                    
                    initialCheck = false;
                    
                    // User is signed out - clear session
                    if (this.sessionToken) {
                        this.clearSession();
                    }
                    this.updateUI();
                }
            });
        } else {
            console.warn('👤 Firebase Auth not available');
        }
    }

    attachEventListeners() {
        // User button
        const userBtn = document.getElementById('userBtn');
        const closeUser = document.getElementById('closeUser');

        console.log('👤 Anexando event listeners', { 
            userBtn: !!userBtn, 
            closeUser: !!closeUser 
        });

        if (userBtn) {
            userBtn.addEventListener('click', () => {
                console.log('👤 User button clicado');
                this.toggleUserPanel();
            });
            console.log('✅ Event listener adicionado ao userBtn');
        } else {
            console.error('❌ userBtn não encontrado!');
        }

        // Fixed user button
        const fixedUserBtn = document.getElementById('fixedUserBtn');
        if (fixedUserBtn) {
            fixedUserBtn.addEventListener('click', () => this.toggleUserPanel());
            console.log('✅ Event listener adicionado ao fixedUserBtn');
        }

        if (closeUser) {
            closeUser.addEventListener('click', () => this.closeUserPanel());
        }

        // Form toggles
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e.target);
            });
        }

        // Register form
        const registerForm = document.getElementById('registerFormElement');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e.target);
            });
        }

        // Verify Email form
        const verifyEmailForm = document.getElementById('verifyEmailFormElement');
        const resendVerificationBtn = document.getElementById('resendVerificationBtn');
        const backToRegister = document.getElementById('backToRegister');

        if (verifyEmailForm) {
            verifyEmailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerifyEmail(e.target);
            });
        }

        if (resendVerificationBtn) {
            resendVerificationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('verifyEmailInput');
                const email = emailInput ? emailInput.value : null;
                if (!email) {
                    this.showNotification('Por favor insira o email para reenviar o código', 'error');
                    return;
                }
                this.handleResendVerification(email);
            });
        }

        if (backToRegister) {
            backToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        // Forgot Password form
        const forgotPasswordForm = document.getElementById('forgotPasswordFormElement');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordReset(e.target);
            });
        }

        // Show Forgot Password
        const showForgotPassword = document.getElementById('showForgotPassword');
        if (showForgotPassword) {
            showForgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordForm();
            });
        }

        // Back to Login from Forgot Password
        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Google Sign In buttons
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }

        const googleSignUpBtn = document.getElementById('googleSignUpBtn');
        if (googleSignUpBtn) {
            googleSignUpBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }

        console.log('👤 Event listeners de autenticação anexados');
    }

    setLoading(loading) {
        this.isLoading = loading;
        const submitBtns = document.querySelectorAll('.auth-form button[type="submit"], .btn-google');
        submitBtns.forEach(btn => {
            btn.disabled = loading;
            if (loading) {
                btn.dataset.originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde...';
            } else if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });
    }

    // ========================================
    // SECURE SESSION TOKEN MANAGEMENT
    // Only the session token is stored locally
    // All user data is fetched from the backend
    // ========================================

    loadSessionToken() {
        try {
            // Use localStorage to persist session across hard refreshes
            // The session token is opaque and validated server-side
            return localStorage.getItem(SESSION_TOKEN_KEY) || null;
        } catch (e) {
            console.warn('❌ Failed to load session token:', e);
            return null;
        }
    }

    saveSessionToken(token) {
        try {
            // Use localStorage to persist session across hard refreshes
            // Session expiry is managed server-side (24 hours)
            localStorage.setItem(SESSION_TOKEN_KEY, token);
            this.sessionToken = token;
        } catch (e) {
            console.warn('❌ Failed to save session token:', e);
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(SESSION_TOKEN_KEY); // Clean up if any
            localStorage.removeItem('escritores_user'); // Clean up legacy
        } catch (e) {
            console.warn('❌ Failed to clear session:', e);
        }
        this.sessionToken = null;
        this.currentUser = null;
    }

    async loadSessionFromBackend() {
        if (!this.sessionToken) {
            this.sessionLoaded = true;
            this.updateUI();
            return;
        }

        try {
            const response = await fetch(`${AUTH_API_URL}/session/me`, {
                method: 'GET',
                headers: {
                    [SESSION_HEADER]: this.sessionToken
                }
            });

            const data = await response.json();

            if (data.valid) {
                this.currentUser = {
                    name: data.displayName,
                    email: data.email,
                    photoUrl: data.photoUrl
                };
                console.log('✅ Session loaded from backend');
            } else {
                console.log('🔒 Session invalid or expired');
                this.clearSession();
            }
        } catch (error) {
            console.error('❌ Error loading session from backend:', error);
            // Don't clear session on network error - might be temporary
        }

        this.sessionLoaded = true;
        this.updateUI();
    }

    // Legacy method - now just returns current user from memory
    loadUser() {
        return this.currentUser;
    }

    // Legacy method - no longer stores in localStorage
    saveUser(user) {
        this.currentUser = {
            name: user.name || user.displayName || null,
            photoUrl: user.photoUrl || user.photoURL || null
        };
    }

    removeUser() {
        this.clearSession();
    }

    async handleLogin(form) {
    if (this.isLoading) return;

    // Check if Firebase is ready
    if (!this.firebaseReady || !window.firebaseAuth) {
        this.showNotification('Aguarde, a autenticação está a carregar...', 'warning');
        return;
    }

    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (!email || !password) {
        this.showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    this.setLoading(true);

    try {
        // Sign in with Firebase
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('🔥 Firebase login successful:', user.email);

        // Get Firebase ID token and authenticate with backend
        await this.syncUserWithBackend(user);

        this.updateUI();
        this.showNotification('Login efetuado com sucesso!', 'success');
        form.reset();

        // Close panel after successful login
        setTimeout(() => this.closeUserPanel(), 1000);

    } catch (error) {
        console.error('❌ Login error:', error);
        let message = 'Erro ao fazer login';

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Utilizador não encontrado';
                break;
            case 'auth/wrong-password':
                message = 'Password incorreta';
                break;
            case 'auth/invalid-email':
                message = 'Email inválido';
                break;
            case 'auth/user-disabled':
                message = 'Conta desativada';
                break;
            case 'auth/too-many-requests':
                message = 'Muitas tentativas. Tente mais tarde';
                break;
            case 'auth/invalid-credential':
                message = 'Email ou password incorretos';
                break;
            default:
                message = error.message || 'Erro ao fazer login';
        }

        this.showNotification(message, 'error');
    } finally {
        this.setLoading(false);
    }
}

    async handleRegister(form) {
        if (this.isLoading) return;

        const name = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        // Validation
        if (!name || !email || !password) {
            this.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('A password deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        this.setLoading(true);

        try {
            // Basic client-side suspicious interaction heuristic
            const submitBtn = form.querySelector('button[type="submit"]');
            const watcher = new (class InteractionWatcher {
                constructor(target) {
                    this.moveCount = 0;
                    this.start = Date.now();
                    this.target = target;
                    this._onMove = () => { this.moveCount++; };
                    if (target) {
                        target.addEventListener('mousemove', this._onMove);
                        target.addEventListener('touchstart', this._onMove);
                    }
                }
                isSuspicious() {
                    const timeSinceLoad = (Date.now() - this.start) / 1000; // seconds
                    // Suspicious if very fast click with near-zero mouse movement
                    return timeSinceLoad < 1.2 && this.moveCount < 2;
                }
                destroy() {
                    if (this.target) {
                        this.target.removeEventListener('mousemove', this._onMove);
                        this.target.removeEventListener('touchstart', this._onMove);
                    }
                }
            })(submitBtn);

            const suspiciousInteraction = watcher.isSuspicious();

            // Create Firebase user first (client-side) so we never send plaintext password to backend
            if (!this.firebaseReady || !window.firebaseAuth) {
                this.showNotification('A autenticação Firebase não está pronta. Aguarde e tente novamente.', 'error');
                this.setLoading(false);
                return;
            }

            let createdUser = null;
            try {
                const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
                createdUser = userCredential.user;
                // NOTE: do NOT send verification from client; backend will generate a Firebase verification link
                // and send it via Mailgun. This keeps control of email templates and deliverability on the server.
            } catch (e) {
                // If creation fails, report error and stop
                console.error('❌ Firebase create user failed:', e);
                let message = 'Erro ao criar conta (Firebase)';
                if (e.code === 'auth/email-already-in-use') {
                    message = 'Este email já está registado. Tente fazer login ou use a conta Google associada.';
                } else if (e.code === 'auth/weak-password') {
                    message = 'Password muito fraca. Use pelo menos 6 caracteres.';
                } else if (e.code === 'auth/invalid-email') {
                    message = 'Email inválido.';
                } else {
                    message = e.message || message;
                }
                this.showNotification(message, 'error');
                this.setLoading(false);
                return;
            }

            // 1) Run reCAPTCHA v3 silent token (if available)
            let v3Token = null;
            if (window.recaptchaSiteKey) {
                try {
                    if (typeof window.safeRecaptchaExecute === 'function') {
                        v3Token = await window.safeRecaptchaExecute(window.recaptchaSiteKey, { action: 'register' });
                    } else if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
                        await new Promise(resolve => grecaptcha.ready(resolve));
                        v3Token = await grecaptcha.execute(window.recaptchaSiteKey, { action: 'register' });
                    }
                } catch (err) {
                    console.warn('reCAPTCHA v3 execute failed, will attempt invisible challenge if required', err);
                    v3Token = null;
                }
            }

            // For development on localhost, use test token if reCAPTCHA failed
            if (!v3Token && window.location.hostname === '127.0.0.1') {
                v3Token = 'test-token';
                console.debug('Using test reCAPTCHA token for localhost development');
            }

            // Obtain ID token from created Firebase user
            let idToken = null;
            try {
                idToken = await createdUser.getIdToken();
            } catch (e) {
                console.error('❌ Could not get ID token from Firebase user:', e);
                // Attempt to clean up created Firebase user to avoid orphan accounts
                try { await createdUser.delete(); } catch (delErr) { console.warn('Failed to delete orphan Firebase user:', delErr); }
                this.showNotification('Erro ao validar conta. Tente novamente.', 'error');
                this.setLoading(false);
                return;
            }

            // 2) Initial registration attempt with v3 token and suspicious flag, send idToken (no password)
            console.debug('auth: initial register POST', { url: `${AUTH_API_URL}/auth/register`, recaptchaToken: v3Token, suspiciousInteraction });
            const initialResp = await fetch(`${AUTH_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, idToken, recaptchaToken: v3Token, suspiciousInteraction })
            });
            const initialJson = await initialResp.json();

            if (initialResp.ok && !initialJson.challengeRequired) {
                // success path
                console.log('✅ Registration successful:', initialJson);
                
                // Always check Firebase email verification status
                if (!createdUser.emailVerified) {
                    // User must verify email before being enabled. Show verification modal
                    this.showVerificationModal(email);
                    this.showNotification('Conta criada. Verifique o seu email para ativar a conta.', 'success');
                } else {
                    // Email is verified, try to sync immediately
                    try {
                        await this.syncUserWithBackend(createdUser);
                        this.showNotification('Conta criada com sucesso! Sessão iniciada.', 'success');
                    } catch (e) {
                        console.warn('Conta criada, mas falha ao criar sessão segura:', e);
                        this.showNotification('Conta criada. Faça login para continuar.', 'success');
                        this.showLoginForm();
                    }
                }
                form.reset();
                watcher.destroy();
                return;
            }

            // 3) If backend requests a challenge, render invisible widget and execute
            if (initialJson && initialJson.challengeRequired) {
                // Ensure container exists
                let container = document.getElementById('invisible-recaptcha-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'invisible-recaptcha-container';
                    document.body.appendChild(container);
                }

                // Always use compact widget on small screens or on iOS devices to avoid overlay/PAT issues
                const viewportWidth = (window.innerWidth || document.documentElement.clientWidth);
                const isIOSUA = (typeof navigator !== 'undefined') && (/iP(hone|od|ad)/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
                const isSmallScreen = viewportWidth <= 600 || (typeof window.isIOSDevice === 'function' && window.isIOSDevice()) || isIOSUA;

                // render widget and execute (only auto-execute when not small screen)
                console.warn('recaptcha.debug: preparing to render challenge', {
                    siteKey: window.recaptchaSiteKey,
                    isSmallScreen,
                    host: window.location.hostname,
                    href: window.location.href,
                    ua: navigator.userAgent,
                    time: new Date().toISOString()
                });

                // For challenges requested by backend, always use reCAPTCHA v3 execute
                try {
                    const token = await window.safeRecaptchaExecute(window.recaptchaSiteKey, { action: 'challenge' });
                    if (!token) {
                        this.showNotification('Verificação reCAPTCHA não concluída. Tente novamente.', 'error');
                        watcher.destroy();
                        return;
                    }

                    console.debug('auth: retry register POST (v3 challenge)', { url: `${AUTH_API_URL}/auth/register`, challengeToken: token });
                    const retryResp = await fetch(`${AUTH_API_URL}/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, idToken, recaptchaToken: token, challenge: true })
                    });
                    const retryJson = await retryResp.json();
                    if (!retryResp.ok) {
                        throw new Error(retryJson.message || 'Erro ao registar');
                    }

                    console.log('✅ Registration successful (after v3 challenge):', retryJson);
                    if (!createdUser.emailVerified) {
                        this.showVerificationModal(email);
                        this.showNotification('Conta criada. Foi enviado um código para o seu email.', 'success');
                    } else {
                        try {
                            await this.syncUserWithBackend(createdUser);
                            this.showNotification('Conta criada com sucesso! Sessão iniciada.', 'success');
                        } catch (e) {
                            console.warn('Conta criada, mas falha ao criar sessão segura:', e);
                            this.showNotification('Conta criada. Faça login para continuar.', 'success');
                            this.showLoginForm();
                        }
                    }
                    form.reset();
                    watcher.destroy();
                    return;
                } catch (err) {
                    console.error('❌ Registration retry error after v3 challenge:', err);
                    this.showNotification(err.message || 'Erro ao criar conta', 'error');
                    watcher.destroy();
                    return;
                }
            }

            // If we reach here, show error from initial attempt
            throw new Error(initialJson.message || 'Erro ao registar');

        } catch (error) {
            console.error('❌ Registration error:', error);
            // If we created a Firebase user but registration failed server-side, try to remove the orphan account
            try {
                if (typeof createdUser !== 'undefined' && createdUser && createdUser.delete) {
                    await createdUser.delete();
                    console.debug('Orphan Firebase user deleted after failed registration');
                }
            } catch (delErr) {
                console.warn('Failed to delete orphan Firebase user:', delErr);
            }
            let message = error.message || 'Erro ao criar conta';
            
            if (message.includes('EMAIL_ALREADY_EXISTS') || message.includes('já registado')) {
                message = 'Este email já está registado';
            }
            
            this.showNotification(message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    showVerifyForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const verifyEmailForm = document.getElementById('verifyEmailForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
        if (verifyEmailForm) verifyEmailForm.classList.remove('hidden');
    }

    showVerificationModal(email) {
        // Create modal if not exists
        let modal = document.getElementById('verificationModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'verificationModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <style>
                    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: transparent; }
                    .modal-content { background-color: #FFFFFF; color: #1a1a1a; margin: 15% auto; padding: 30px; border: 2px solid #FFB100; width: 90%; max-width: 500px; border-radius: 12px; box-shadow: 0 8px 32px rgba(14, 27, 77, 0.3); font-family: 'Questrial', sans-serif; }
                    .modal-content h2 { color: #0E1B4D; font-family: 'EB Garamond', serif; margin-bottom: 20px; font-size: 1.8em; }
                    .modal-content p { margin-bottom: 15px; line-height: 1.6; }
                    .modal-content strong { color: #0E1B4D; }
                    .close { color: #1a1a1a; float: right; font-size: 28px; font-weight: bold; cursor: pointer; transition: color 0.3s; }
                    .close:hover { color: #FFB100; }
                    #resendBtn { background-color: #FFB100; color: #0E1B4D; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background-color 0.3s; margin-top: 20px; }
                    #resendBtn:disabled { background-color: #666666; cursor: not-allowed; }
                    #resendBtn:hover:not(:disabled) { background-color: #e6a000; }
                    #countdown { font-weight: bold; color: #0E1B4D; }
                </style>
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                    <h2>Verificação de Email</h2>
                    <p>Enviamos um email de verificação para <strong>${email}</strong>.</p>
                    <p>Verifique a sua caixa de entrada e clique no link para ativar a conta.</p>
                    <p id="resendMessage">Pode reenviar o email em <span id="countdown">15:00</span> minutos.</p>
                    <button id="resendBtn" disabled onclick="window.auth.handleResendVerification('${email}')">Reenviar Email</button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('strong').textContent = email;
        }

        modal.style.display = 'block';

        // GSAP animation
        if (window.gsap) {
            gsap.from(modal.querySelector('.modal-content'), {
                opacity: 0,
                y: -50,
                scale: 0.9,
                duration: 0.6,
                ease: "back.out(1.7)"
            });
        }

        // Start countdown
        this.startResendCountdown();
    }

    startResendCountdown() {
        const countdownEl = document.getElementById('countdown');
        const resendBtn = document.getElementById('resendBtn');
        let timeLeft = 15 * 60; // 15 minutes in seconds

        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(timer);
                countdownEl.textContent = '0:00';
                resendBtn.disabled = false;
                document.getElementById('resendMessage').textContent = 'Pode reenviar o email agora.';
            }
        }, 1000);
    }

    async handleVerifyEmail(form) {
        if (this.isLoading) return;

        const email = document.getElementById('verifyEmailInput').value;
        const code = document.getElementById('verifyCodeInput').value;

        if (!email || !code) {
            this.showNotification('Por favor preencha email e código', 'error');
            return;
        }

        this.setLoading(true);

        try {
            // Call backend to verify
            const response = await fetch(`${AUTH_API_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao verificar email');
            }

            this.showNotification('Email verificado com sucesso! A iniciar sessão...', 'success');

            // Now sync Firebase client user with backend to create secure session
            try {
                const firebaseUser = window.firebaseAuth.currentUser;
                if (firebaseUser) {
                    // Force refresh token so backend sees updated email_verified claim
                    await this.syncUserWithBackend(firebaseUser);
                } else {
                    this.showNotification('Verificação concluída. Faça login com o seu email e password.', 'info');
                }
            } catch (e) {
                console.warn('Não foi possível sincronizar conta automaticamente, peça para o utilizador iniciar sessão.', e);
                this.showNotification('Verificação concluída. Faça login com o seu email e password.', 'info');
            }

            // Show login form (user can sign in) and close panel
            this.showLoginForm();
            setTimeout(() => this.closeUserPanel(), 1000);

        } catch (error) {
            console.error('❌ Verify error:', error);
            this.showNotification(error.message || 'Erro ao verificar código', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleResendVerification(email) {
        if (this.isLoading) return;
        this.setLoading(true);
        try {
            const response = await fetch(`${AUTH_API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // Backend returns a generic success message to avoid user enumeration.
            // Treat any response as success from the user's perspective.
            try { await response.json(); } catch (e) { /* ignore non-json */ }
            this.showNotification('Se a conta existir, enviámos um email de verificação', 'success');
        } catch (error) {
            console.error('❌ Resend error:', error);
            // Show generic message even on client/network errors to avoid leaking account status
            this.showNotification('Se a conta existir, enviámos um email de verificação', 'success');
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleSignIn() {
        if (this.isLoading) return;

        // Check if Firebase is ready
        if (!this.firebaseReady || !window.firebaseAuth) {
            this.showNotification('Aguarde, a autenticação está a carregar...', 'warning');
            return;
        }

        this.setLoading(true);

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await window.firebaseAuth.signInWithPopup(provider);
            const user = result.user;

            console.log('🔥 Google sign-in successful:', user.email);

            // Sync with backend
            await this.syncUserWithBackend(user);

            this.updateUI();
            this.showNotification('Login com Google efetuado com sucesso!', 'success');
            
            // Close panel after successful login
            setTimeout(() => this.closeUserPanel(), 1000);

        } catch (error) {
            console.error('❌ Google sign-in error:', error);
            let message = 'Erro ao fazer login com Google';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'Login cancelado';
                    break;
                case 'auth/popup-blocked':
                    message = 'Popup bloqueado. Permita popups para este site';
                    break;
                case 'auth/account-exists-with-different-credential':
                    message = 'Já existe uma conta com este email';
                    break;
                default:
                    message = error.message || 'Erro ao fazer login com Google';
            }
            
            this.showNotification(message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

   async syncUserWithBackend(firebaseUser) {
    if (this.syncing) {
        console.log('🔄 Sync already in progress, skipping');
        return;
    }
    this.syncing = true;
    try {
        // Force refresh token to avoid stale/partial tokens during popup flows
        const idToken = await firebaseUser.getIdToken(true);
        console.debug('🔐 Sending ID token to backend (length):', idToken ? idToken.length : 0);

        const trySend = async () => {
            const resp = await fetch(`${AUTH_API_URL}/auth/firebase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
            let data;
            try { data = await resp.json(); } catch (e) { data = { message: 'no-json-response' }; }
            if (!resp.ok) {
                console.error('Backend /auth/firebase error', resp.status, data);
                throw new Error(data.message || `Server returned ${resp.status}`);
            }
            return data;
        };

        // First attempt
        try {
            const data = await trySend();
            console.log('✅ Secure session created:', data);
            if (data.sessionToken) {
                this.saveSessionToken(data.sessionToken);
                this.currentUser = {
                    name: data.displayName || firebaseUser.displayName || null,
                    email: firebaseUser.email || null,
                    photoUrl: data.photoUrl || firebaseUser.photoURL || null
                };
            }
            return data;
        } catch (firstErr) {
            // Retry once after a short delay (covers transient race conditions)
            console.warn('First /auth/firebase attempt failed, retrying...', firstErr);
            await new Promise(r => setTimeout(r, 500));
            const data = await trySend();
            console.log('✅ Secure session created (retry):', data);
            if (data.sessionToken) {
                this.saveSessionToken(data.sessionToken);
                this.currentUser = {
                    name: data.displayName || firebaseUser.displayName || null,
                    email: firebaseUser.email || null,
                    photoUrl: data.photoUrl || firebaseUser.photoURL || null
                };
            }
            return data;
        }

    } catch (error) {
        console.error('❌ Error syncing with backend:', error);
        throw error;
    } finally {
        this.syncing = false;
    }
}


   async handlePasswordReset(form) {
    if (this.isLoading) return;
    const email = form.querySelector('input[type="email"]').value;
    if (!email) {
        this.showNotification('Por favor, insira o seu email', 'error');
        return;
    }
    this.setLoading(true);
    try {
        const response = await fetch(`${AUTH_API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        // Regardless of backend result, show a generic success message to avoid user enumeration.
        try { await response.text(); } catch (e) { /* ignore */ }
        this.showNotification('Se a conta existir, enviámos um email para repor a password. Verifique a sua caixa de entrada.', 'success');
        form.reset();
        this.showLoginForm();
    } catch (error) {
        console.error('❌ Password reset error (client):', error);
        // Still show the generic success message so attackers can't enumerate
        this.showNotification('Se a conta existir, enviámos um email para repor a password. Verifique a sua caixa de entrada.', 'success');
    } finally {
        this.setLoading(false);
    }
}

    async handleLogout() {
        if (this.isLoading) return;

        this.setLoading(true);
        try {
            // Invalidate session on backend first
            if (this.sessionToken) {
                try {
                    await fetch(`${AUTH_API_URL}/session/logout`, {
                        method: 'POST',
                        headers: {
                            [SESSION_HEADER]: this.sessionToken
                        }
                    });
                } catch (e) {
                    console.warn('⚠️ Failed to invalidate backend session:', e);
                }
            }

            // Sign out from Firebase
            if (window.firebaseAuth) {
                try {
                    await window.firebaseAuth.signOut();
                } catch (e) {
                    console.warn('⚠️ Failed to sign out from Firebase:', e);
                }
            }

            this.clearSession();
            this.updateUI();
            this.showNotification('Sessão terminada', 'info');

        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showNotification('Erro ao terminar sessão', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleDeleteAccount() {
        if (this.isLoading) return;
        this.setLoading(true);

        const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
        if (!user) {
            this.setLoading(false);
            throw new Error('Nenhum utilizador autenticado');
        }

        try {
            // 1. Delete data from Backend (PostgreSQL)
            const idToken = await user.getIdToken();
            const response = await fetch(`${AUTH_API_URL}/auth/user`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao eliminar dados do servidor');
            }

            // 2. Delete from Firebase Auth (backend should handle it via Admin SDK)
            // Just clear local session
            if (window.firebaseAuth) {
                try {
                    await window.firebaseAuth.signOut();
                } catch (e) {
                    console.warn('Could not sign out after account deletion:', e);
                }
            }

            this.clearSession();
            this.updateUI();
            this.showNotification('Conta eliminada com sucesso', 'info');
            window.location.href = '/';

        } catch (error) {
            console.error('❌ Erro ao eliminar conta:', error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('Por favor, faça login novamente para realizar esta operação');
            }
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    // Backwards-compatible alias for older callers
    async deleteAccount() {
        return this.handleDeleteAccount();
    }

    updateUI() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        // Some pages use id="userProfile", others use id="userInfo"
        const userProfile = document.getElementById('userProfile') || document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        // Avatar class may differ between pages
        const profileAvatar = document.querySelector('.profile-avatar') || document.querySelector('.user-avatar');

        if (this.currentUser) {
            // Show profile, hide forms
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');

            // Update profile info
            if (userName) userName.textContent = this.currentUser.name || '';

            // Get email from currentUser (loaded from backend session) or Firebase
            let emailToShow = this.currentUser.email || '';
            if (!emailToShow && window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.email) {
                emailToShow = window.firebaseAuth.currentUser.email;
            }
            if (userEmail) {
                if (emailToShow) {
                    userEmail.textContent = emailToShow;
                    userEmail.classList.remove('hidden');
                } else {
                    userEmail.textContent = '';
                    userEmail.classList.add('hidden');
                }
            }

            // Ensure avatar container uses the standard profile-avatar styles
            if (profileAvatar && !profileAvatar.classList.contains('profile-avatar') && !profileAvatar.classList.contains('profile-avatar-large')) {
                profileAvatar.classList.add('profile-avatar');
            }

            // Update avatar with photo if available
            if (profileAvatar && this.currentUser.photoUrl) {
                profileAvatar.innerHTML = `<img src="${this.currentUser.photoUrl}" alt="${this.currentUser.name || ''}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block;" onerror='this.style.display="none"; this.parentElement.innerHTML="<i class=\"fas fa-user\"></i>";'>`;
            } else if (profileAvatar) {
                profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        } else {
            // Show login form, hide others
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
            if (userProfile) userProfile.classList.add('hidden');

            // Reset avatar
            if (profileAvatar) {
                profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const verifyEmailForm = document.getElementById('verifyEmailForm');

        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
        if (verifyEmailForm) verifyEmailForm.classList.add('hidden');
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const verifyEmailForm = document.getElementById('verifyEmailForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
        if (verifyEmailForm) verifyEmailForm.classList.add('hidden');
    }

    showForgotPasswordForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const verifyEmailForm = document.getElementById('verifyEmailForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.remove('hidden');
        if (verifyEmailForm) verifyEmailForm.classList.add('hidden');
    }

    toggleUserPanel() {
        const userSidebar = document.getElementById('userSidebar');
        const overlay = document.getElementById('overlay');

        console.log('👤 toggleUserPanel chamado', { 
            userSidebar: !!userSidebar, 
            overlay: !!overlay,
            userActive: userSidebar?.classList.contains('active')
        });

        if (userSidebar && overlay) {
            userSidebar.classList.toggle('active');
            overlay.classList.toggle('active');

            // If opening the panel and user is not logged in, show login form
            const opened = userSidebar.classList.contains('active');
            if (opened && typeof this.isLoggedIn === 'function' && !this.isLoggedIn()) {
                try {
                    this.showLoginForm();
                    const emailInput = document.querySelector('#loginFormElement input[type="email"]');
                    if (emailInput) setTimeout(() => emailInput.focus(), 150);
                } catch (e) {
                    // ignore if methods not available
                    console.warn('Erro ao tentar mostrar o formulário de login', e);
                }
            }

            console.log('👤 Classes toggleadas', {
                userActive: userSidebar.classList.contains('active'),
                overlayActive: overlay.classList.contains('active')
            });

            // Close cart if open
            const cartSidebar = document.getElementById('cartSidebar');
            if (cartSidebar) {
                cartSidebar.classList.remove('active');
            }
        } else {
            console.error('❌ Elementos não encontrados!', { userSidebar, overlay });
        }
    }

    closeUserPanel() {
        const userSidebar = document.getElementById('userSidebar');
        const overlay = document.getElementById('overlay');

        if (userSidebar && overlay) {
            userSidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        console.log('📢 Mostrando notificação:', { message, type });
        // Add notification to queue
        this.notificationQueue.push({ message, type, id: Date.now() });

        // Process queue if not already showing a notification
        if (!this.isNotificationShowing) {
            this.processNotificationQueue();
        }

    }
    
    
    
    processNotificationQueue() {
        if (this.notificationQueue.length === 0) {
            this.isNotificationShowing = false;
            return;
        }

        console.log('📢 Processando fila de notificações:', this.notificationQueue.length, 'pendente(s)');
        this.isNotificationShowing = true;
        const { message, type, id } = this.notificationQueue.shift();

        // Remove any existing notifications first
        this.clearExistingNotifications();

        // Create notification element with unique ID
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${id}`;
        
        // Determine icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'exclamation-circle';
        else if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        console.log('📢 Notificação criada e adicionada ao DOM:', notification.id);

        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
            console.log('📢 Classe "show" adicionada à notificação');
        }, 50);

        // Remove after display time and process next notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
                // Small delay before processing next notification
                setTimeout(() => {
                    this.processNotificationQueue();
                }, 200);
            }, this.notificationAnimationTime);
        }, this.notificationDisplayTime);
    }

    clearExistingNotifications() {
        // Remove any existing notification elements
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        });
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize auth system
if (!window.auth) {
    window.auth = new AuthSystem();
    console.log('✅ window.auth criado e disponível');
} else {
    console.log('⚠️ window.auth já existe');
}

// Global notification function for all modules to use
window.showNotification = function(message, type = 'info') {
    // Process Firebase action links (oobCode) for verifyEmail and resetPassword
(async function processFirebaseActionLink() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (!oobCode) return;

    // Wait for Firebase to be ready
    if (!window.firebaseAuth) {
        window.addEventListener('firebaseReady', () => setTimeout(processFirebaseActionLink, 50));
        return;
    }

    try {
        if (mode === 'verifyEmail') {
            await window.firebaseAuth.applyActionCode(oobCode);
            window.showNotification('Email verificado com sucesso!', 'success');
            // After verification, redirect to account or login page so user can continue
            setTimeout(() => window.location.href = '/conta', 1200);
        } else if (mode === 'resetPassword') {
            const email = await window.firebaseAuth.verifyPasswordResetCode(oobCode);
            // Show a simple prompt for new password - you can replace with a proper form
            const newPassword = prompt('Insira a nova password para ' + email);
            if (newPassword && newPassword.length >= 6) {
                await window.firebaseAuth.confirmPasswordReset(oobCode, newPassword);
                window.showNotification('Password alterada com sucesso!', 'success');
                setTimeout(() => window.location.href = '/conta', 1200);
            } else {
                window.showNotification('Password inválida ou operação cancelada', 'error');
            }
        }
    } catch (err) {
        console.error('Erro ao processar action link:', err);
        window.showNotification(err.message || 'Erro ao processar link de verificação', 'error');
    }
})();
    if (window.auth) {
        window.auth.showNotification(message, type);
    } else {
        console.error('❌ Sistema de notificação não disponível');
    }
};
