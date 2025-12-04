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

        // Update avatar
        const avatarContainer = document.querySelector('.profile-avatar-large');
        if (avatarContainer) {
            if (user.photoUrl) {
                avatarContainer.innerHTML = `<img src="${user.photoUrl}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarContainer.innerHTML = '<i class="fas fa-user"></i>';
            }
        }

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
async function handlePasswordChange(form) {
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

    try {
        // Note: Firebase requires re-authentication for sensitive operations like password change
        // For simplicity, we'll try to update directly. If it fails with 'requires-recent-login',
        // the auth.updatePassword method will handle the error message.
        // Ideally, we should ask for re-authentication (login again) here.
        
        // Since we don't have the user's current password in plain text to re-authenticate automatically,
        // we rely on the session being recent.
        
        await auth.updatePassword(newPassword);
        form.reset();
        
    } catch (error) {
        // Error is already handled/logged in auth.updatePassword
        auth.showNotification(error.message, 'error');
    }
}

// Initialize settings
function initSettings() {
    // Delete account button
    const deleteBtn = document.getElementById('deleteAccount');
    const modal = document.getElementById('deleteAccountModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');

    if (deleteBtn && modal) {
        deleteBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        confirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            deleteAccount();
        });

        // Close modal if clicking outside content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Delete account
async function deleteAccount() {
    const auth = new AuthSystem();
    const user = auth.getCurrentUser();

    if (!user) return;

    try {
        await auth.deleteAccount();
        
        // Clean up local data
        localStorage.removeItem(`user_profile_${user.email}`);
        localStorage.removeItem(`user_orders_${user.email}`);
        localStorage.removeItem(`user_preferences_${user.email}`);
        
    } catch (error) {
        auth.showNotification(error.message, 'error');
    }
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