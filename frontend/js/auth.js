// ==================================
// AUTH.JS - User authentication system
// ==================================

// Declare global auth variable
window.auth = window.auth || null;

class AuthSystem {
    constructor() {
        this.currentUser = this.loadUser();
        this.notificationQueue = [];
        this.isNotificationShowing = false;
        this.notificationDisplayTime = 2000; // 1 seconds
        this.notificationAnimationTime = 2000; // 2 seconds for animations
        this.init();
    }

    init() {
        console.log('👤 AuthSystem inicializado');
        this.updateUI();
        this.attachEventListeners();
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

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        console.log('👤 Event listeners de autenticação anexados');
    }

    loadUser() {
        const userData = localStorage.getItem('escritores_user');
        return userData ? JSON.parse(userData) : null;
    }

    saveUser(user) {
        localStorage.setItem('escritores_user', JSON.stringify(user));
        this.currentUser = user;
    }

    removeUser() {
        localStorage.removeItem('escritores_user');
        this.currentUser = null;
    }

    getAllUsers() {
        const usersData = localStorage.getItem('escritores_users');
        return usersData ? JSON.parse(usersData) : [];
    }

    saveAllUsers(users) {
        localStorage.setItem('escritores_users', JSON.stringify(users));
    }

    handleLogin(form) {
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        // Get all registered users
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Remove password from stored session
            const sessionUser = {
                name: user.name,
                email: user.email
            };
            this.saveUser(sessionUser);
            this.updateUI();
            this.showNotification('Login efetuado com sucesso!', 'success');
            form.reset();
        } else {
            this.showNotification('Email ou password incorretos', 'error');
        }
    }

    handleRegister(form) {
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

        // Check if user already exists
        const users = this.getAllUsers();
        const existingUser = users.find(u => u.email === email);

        if (existingUser) {
            this.showNotification('Este email já está registado', 'error');
            return;
        }

        // Create new user
        const newUser = {
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveAllUsers(users);

        // Log in the user
        const sessionUser = {
            name: newUser.name,
            email: newUser.email
        };
        this.saveUser(sessionUser);
        this.updateUI();
        this.showNotification('Conta criada com sucesso!', 'success');
        form.reset();
    }

    handleLogout() {
        this.removeUser();
        this.updateUI();
        this.closeUserPanel();
        this.showNotification('Sessão terminada', 'info');
    }

    updateUI() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        if (this.currentUser) {
            // Show profile, hide forms
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');

            // Update profile info
            if (userName) userName.textContent = this.currentUser.name;
            if (userEmail) userEmail.textContent = this.currentUser.email;
        } else {
            // Show login form, hide others
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (userProfile) userProfile.classList.add('hidden');
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
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
