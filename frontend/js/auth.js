// ==================================
// AUTH.JS - User authentication system with Firebase
// ==================================

// API Configuration
const AUTH_API_URL = 'http://localhost:8080/api';

// Session token header name
const SESSION_HEADER = 'X-Session-Token';

// Secure storage key (only stores session token, not user data)
const SESSION_TOKEN_KEY = 'escritores_session_token';

// Declare global auth variable
window.auth = window.auth || null;

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
        this.init();
    }

    init() {
        console.log('👤 AuthSystem inicializado');
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
                    console.log('🔥 Firebase user detected:', user.email);
                    initialCheck = false;
                    
                    // Firebase detected a user - check if we have a valid session
                    if (!this.sessionToken) {
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
            // Register with backend (which creates user in Firebase and database)
            const response = await fetch(`${AUTH_API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao registar');
            }

            console.log('✅ Registration successful:', data);

            // Now sign in with Firebase to get the session
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            await this.syncUserWithBackend(userCredential.user);

            this.updateUI();
            this.showNotification('Conta criada com sucesso!', 'success');
            form.reset();
            
            // Close panel after successful registration
            setTimeout(() => this.closeUserPanel(), 1000);

        } catch (error) {
            console.error('❌ Registration error:', error);
            let message = error.message || 'Erro ao criar conta';
            
            if (message.includes('EMAIL_ALREADY_EXISTS') || message.includes('já registado')) {
                message = 'Este email já está registado';
            }
            
            this.showNotification(message, 'error');
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
        try {
            // Get Firebase ID token
            const idToken = await firebaseUser.getIdToken();

            // Send token to backend for validation and session creation
            const response = await fetch(`${AUTH_API_URL}/auth/firebase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao sincronizar com o servidor');
            }

            console.log('✅ Secure session created:', data);

            // Save only the session token - user data is fetched from backend
            if (data.sessionToken) {
                this.saveSessionToken(data.sessionToken);
                
                // Store minimal display info in memory only (not persisted)
                this.currentUser = {
                    name: data.displayName || firebaseUser.displayName || null,
                    email: firebaseUser.email || null,
                    photoUrl: data.photoUrl || firebaseUser.photoURL || null
                };
            }
            
            return data;

        } catch (error) {
            console.error('❌ Error syncing with backend:', error);
            throw error;
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
            await window.firebaseAuth.sendPasswordResetEmail(email);
            this.showNotification('Email de recuperação enviado! Verifique a sua caixa de entrada.', 'success');
            form.reset();
            this.showLoginForm();
        } catch (error) {
            console.error('❌ Password reset error:', error);
            let message = 'Erro ao enviar email de recuperação';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'Não existe conta com este email';
                    break;
                case 'auth/invalid-email':
                    message = 'Email inválido';
                    break;
                default:
                    message = error.message || 'Erro ao enviar email';
            }
            
            this.showNotification(message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogout() {
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
                await window.firebaseAuth.signOut();
            }
            
            this.clearSession();
            this.updateUI();
            this.closeUserPanel();
            this.showNotification('Sessão terminada', 'info');
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Still clear local session even if errors occur
            this.clearSession();
            this.updateUI();
            this.closeUserPanel();
            this.showNotification('Sessão terminada', 'info');
        }
    }

    async updatePassword(newPassword) {
        if (!this.firebaseReady || !window.firebaseAuth) {
            throw new Error('Sistema de autenticação não disponível');
        }

        const user = window.firebaseAuth.currentUser;
        if (!user) {
            throw new Error('Nenhum utilizador autenticado');
        }

        try {
            await user.updatePassword(newPassword);
            this.showNotification('Password atualizada com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao atualizar password:', error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('Por favor, faça login novamente para realizar esta operação');
            }
            throw error;
        }
    }

    async deleteAccount() {
        if (!this.firebaseReady || !window.firebaseAuth) {
            throw new Error('Sistema de autenticação não disponível');
        }

        const user = window.firebaseAuth.currentUser;
        if (!user) {
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

            // 2. Delete from Firebase Auth
            // O backend já tratou de eliminar o utilizador do Firebase Auth via Admin SDK
            // Apenas precisamos de limpar a sessão local
            if (window.firebaseAuth) {
                await window.firebaseAuth.signOut();
            }
            
            this.clearSession();
            this.updateUI();
            this.showNotification('Conta eliminada com sucesso', 'info');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('❌ Erro ao eliminar conta:', error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('Por favor, faça login novamente para realizar esta operação');
            }
            throw error;
        }
    }

    updateUI() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const profileAvatar = document.querySelector('.profile-avatar');

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

            // Update avatar with photo if available
            if (profileAvatar && this.currentUser.photoUrl) {
                profileAvatar.innerHTML = `<img src="${this.currentUser.photoUrl}" alt="${this.currentUser.name || ''}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
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

        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
    }

    showForgotPasswordForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotPasswordForm) forgotPasswordForm.classList.remove('hidden');
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
    if (window.auth) {
        window.auth.showNotification(message, type);
    } else {
        console.error('❌ Sistema de notificação não disponível');
    }
};
