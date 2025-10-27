// ==================================
// CONTA.JS - Account page functionality
// ==================================

// Initialize account page
function initContaPage() {
    // Check if user is logged in
    const auth = new AuthSystem();
    if (!auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    initAccountTabs();
    loadUserProfile();
    loadUserOrders();
    initProfileForm();
    initPasswordForm();
    initSettings();
}

// Initialize account tabs
function initAccountTabs() {
    const tabs = document.querySelectorAll('.account-tab');
    const contents = document.querySelectorAll('.account-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all content sections
            contents.forEach(content => content.classList.remove('active'));

            // Show selected content section
            const targetTab = tab.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');

                // Refresh AOS for new content
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
            }

            // Update URL hash without scrolling
            history.replaceState(null, null, `#${targetTab}`);
        });
    });
}

// Handle URL hash on page load
function handleURLHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const targetTab = document.querySelector(`[data-tab="${hash}"]`);
        if (targetTab) {
            targetTab.click();
        }
    }
}

// Load user profile data
function loadUserProfile() {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (user) {
        // Update profile display
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;

        // Load additional profile data from localStorage
        const profileData = getUserProfileData(user.email);
        if (profileData) {
            document.getElementById('firstName').value = profileData.firstName || '';
            document.getElementById('lastName').value = profileData.lastName || '';
            document.getElementById('email').value = profileData.email || user.email;
            document.getElementById('phone').value = profileData.phone || '';
            document.getElementById('address').value = profileData.address || '';
            document.getElementById('postalCode').value = profileData.postalCode || '';
            document.getElementById('city').value = profileData.city || '';
            document.getElementById('country').value = profileData.country || 'Portugal';

            // Set member since date
            const memberSince = profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('pt-PT') : 'N/A';
            document.getElementById('memberSince').textContent = memberSince;
        } else {
            // Set basic info if no extended profile exists
            const nameParts = user.name.split(' ');
            document.getElementById('firstName').value = nameParts[0] || '';
            document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
            document.getElementById('email').value = user.email;
            document.getElementById('country').value = 'Portugal';
            document.getElementById('memberSince').textContent = new Date().toLocaleDateString('pt-PT');
        }
    }
}

// Get extended user profile data
function getUserProfileData(email) {
    const profileKey = `user_profile_${email}`;
    const profileData = localStorage.getItem(profileKey);
    return profileData ? JSON.parse(profileData) : null;
}

// Save user profile data
function saveUserProfileData(email, data) {
    const profileKey = `user_profile_${email}`;
    localStorage.setItem(profileKey, JSON.stringify(data));
}

// Initialize profile form
function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleProfileUpdate(e.target);
        });
    }
}

// Handle profile update
function handleProfileUpdate(form) {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    const formData = new FormData(form);
    const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        country: formData.get('country'),
        updatedAt: new Date().toISOString()
    };

    // Save profile data
    saveUserProfileData(user.email, profileData);

    // Update user name if changed
    const newName = `${profileData.firstName} ${profileData.lastName}`.trim();
    if (newName !== user.name) {
        user.name = newName;
        auth.saveUser(user);
        auth.updateUI();
    }

    // Show success message
    auth.showNotification('Perfil atualizado com sucesso!', 'success');
}

// Load user orders
function loadUserOrders() {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    const orders = getUserOrders(user.email);
    const ordersList = document.getElementById('ordersList');

    if (orders && orders.length > 0) {
        // Display orders
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Pedido #${order.id}</h4>
                        <p class="order-date">${new Date(order.date).toLocaleDateString('pt-PT')}</p>
                    </div>
                    <div class="order-status status-${order.status}">
                        ${getStatusText(order.status)}
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.image}" alt="${item.title}" class="order-item-image">
                            <div class="order-item-details">
                                <h5>${item.title}</h5>
                                <p>Quantidade: ${item.quantity}</p>
                                <p>Preço: ${(item.price * item.quantity).toFixed(2)}€</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <strong>Total: ${order.total.toFixed(2)}€</strong>
                </div>
            </div>
        `).join('');
    } else {
        // No orders message is already in HTML
    }
}

// Get user orders from localStorage
function getUserOrders(email) {
    const ordersKey = `user_orders_${email}`;
    const ordersData = localStorage.getItem(ordersKey);
    return ordersData ? JSON.parse(ordersData) : [];
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendente',
        'processing': 'Em Processamento',
        'shipped': 'Enviado',
        'delivered': 'Entregue',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Initialize password form
function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePasswordChange(e.target);
        });
    }
}

// Handle password change
function handlePasswordChange(form) {
    const currentPassword = form.querySelector('#currentPassword').value;
    const newPassword = form.querySelector('#newPassword').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;

    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    // Validate new password
    if (newPassword.length < 6) {
        auth.showNotification('A nova password deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        auth.showNotification('As passwords não coincidem', 'error');
        return;
    }

    // Get all users to find and update the current user
    const users = auth.getAllUsers();
    const userIndex = users.findIndex(u => u.email === user.email);

    if (userIndex !== -1) {
        // Verify current password
        if (users[userIndex].password !== currentPassword) {
            auth.showNotification('Password atual incorreta', 'error');
            return;
        }

        // Update password
        users[userIndex].password = newPassword;
        auth.saveAllUsers(users);

        // Clear form
        form.reset();

        // Show success message
        auth.showNotification('Password alterada com sucesso!', 'success');
    }
}

// Initialize settings
function initSettings() {
    // Deactivate account button
    const deactivateBtn = document.getElementById('deactivateAccount');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja desativar temporariamente sua conta?')) {
                deactivateAccount();
            }
        });
    }

    // Delete account button
    const deleteBtn = document.getElementById('deleteAccount');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('⚠️ ATENÇÃO: Esta ação é PERMANENTE e IRREVERSÍVEL!\n\nAo eliminar sua conta:\n- Todos os seus dados serão apagados\n- Perderá acesso ao histórico de pedidos\n- Suas preferências serão removidas\n\nDeseja realmente continuar?')) {
                deleteAccount();
            }
        });
    }
}

// Deactivate account
function deactivateAccount() {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    // Mark account as deactivated
    const profileData = getUserProfileData(user.email);
    profileData.accountStatus = 'deactivated';
    profileData.deactivatedAt = new Date().toISOString();
    saveUserProfileData(user.email, profileData);

    auth.showNotification('Conta desativada temporariamente', 'info');
    
    // Logout user
    setTimeout(() => {
        auth.handleLogout();
        window.location.href = 'index.html';
    }, 1500);
}

// Delete account
function deleteAccount() {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    // Remove user from users list
    const users = auth.getAllUsers();
    const updatedUsers = users.filter(u => u.email !== user.email);
    auth.saveAllUsers(updatedUsers);

    // Remove user profile data
    localStorage.removeItem(`user_profile_${user.email}`);
    localStorage.removeItem(`user_orders_${user.email}`);
    localStorage.removeItem(`user_preferences_${user.email}`);

    // Logout user
    auth.handleLogout();

    // Redirect to home
    window.location.href = 'index.html';
}

// Handle browser back/forward buttons
window.addEventListener('popstate', handleURLHash);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('conta.html')) {
            initContaPage();
        }
    });
} else {
    if (window.location.pathname.includes('conta.html')) {
        initContaPage();
    }
}