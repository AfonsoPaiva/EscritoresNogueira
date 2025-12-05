// ==================================
// AUTH.JS - User authentication system with Firebase
// ==================================

// API Configuration
const AUTH_API_URL = 'http://localhost:8080/api';

// Declare global auth variable
window.auth = window.auth || null;

class AuthSystem {
    constructor() {
        this.currentUser = this.loadUser();
        this.notificationQueue = [];
        this.isNotificationShowing = false;
        this.notificationDisplayTime = 2000;
        this.notificationAnimationTime = 2000;
        this.isLoading = false;
        this.firebaseReady = false;
        this.init();
    }

    init() {
        console.log('👤 AuthSystem inicializado');
        this.updateUI();
        this.attachEventListeners();
        this.waitForFirebase();
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
            window.firebaseAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('🔥 Firebase user detected:', user.email);
                    // User is signed in - sync with backend if not already done
                    if (!this.currentUser || this.currentUser.email !== user.email) {
                        try {
                            await this.syncUserWithBackend(user);
                            this.updateUI();
                        } catch (error) {
                            console.error('Error syncing user:', error);
                        }
                    }
                } else {
                    console.log('🔥 No Firebase user');
                    // User is signed out
                    if (this.currentUser) {
                        this.removeUser();
                        this.updateUI();
                    }
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

        loadUser() {
        try {
            const userData = localStorage.getItem('escritores_user');
            if (!userData) return null;
            const parsed = JSON.parse(userData);

            // Only load non-sensitive fields (display name + avatar).
            const user = {
                name: parsed.name || null,
                photoUrl: parsed.photoUrl || null
            };

            // Migrate legacy stored sensitive fields by resaving minimal view.
            if (parsed.email || parsed.uid) {
                localStorage.setItem('escritores_user', JSON.stringify(user));
            }

            return user;
        } catch (e) {
            console.warn('❌ Falha ao ler sessão do localStorage, limpando valor inválido', e);
            localStorage.removeItem('escritores_user');
            return null;
        }
    }


     sanitizeUserForStorage(user) {
        // Persist only minimal public profile fields — DO NOT store tokens, email, uid or other PII.
        return {
            name: user.name || user.displayName || null,
            photoUrl: user.photoUrl || user.photoURL || null
        };
    }


      saveUser(user) {
        const safeUser = this.sanitizeUserForStorage(user);
        // Persist only the minimal non-sensitive view.
        localStorage.setItem('escritores_user', JSON.stringify(safeUser));
        this.currentUser = safeUser;
    }

    removeUser() {
        localStorage.removeItem('escritores_user');
        this.currentUser = null;
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

            // Send token to backend for validation and user creation/update
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

            console.log('✅ User synced with backend:', data);

            // Save only a minimal, non-sensitive user view locally.
            const sessionUser = {
                name: data.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : null),
                photoUrl: data.user?.photoUrl || firebaseUser.photoURL || null
            };

            this.saveUser(sessionUser);
            return data;

        } catch (error) {
            console.error('❌ Error syncing with backend:', error);

            // If backend fails, still save a minimal non-sensitive view of the Firebase profile.
            const sessionUser = {
                name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : null),
                photoUrl: firebaseUser.photoURL || null
            };

            this.saveUser(sessionUser);
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
            // Sign out from Firebase
            if (window.firebaseAuth) {
                await window.firebaseAuth.signOut();
            }
            
            this.removeUser();
            this.updateUI();
            this.closeUserPanel();
            this.showNotification('Sessão terminada', 'info');
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Still remove local user even if Firebase logout fails
            this.removeUser();
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
            
            this.removeUser();
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

            // Email is sensitive; prefer not to read it from persistent storage.
            // If Firebase auth is available and has a current user, show that email; otherwise hide email.
            let emailToShow = '';
            if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.email) {
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
