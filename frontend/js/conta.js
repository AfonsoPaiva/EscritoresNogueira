// ==================================
// CONTA.JS - Account page functionality
// ==================================

// API Configuration
const CONTA_API_URL = 'http://localhost:8080/api';

// Initialize account page
async function initContaPage() {
    // Wait for auth system to be ready
    if (!window.auth) {
        console.error('❌ Auth system not available');
        window.location.href = 'index.html';
        return;
    }

    // Wait for session to be loaded from backend
    await window.auth.waitForSession();

    // Check if user is logged in using global auth instance
    if (!window.auth.isLoggedIn()) {
        console.log('❌ User not logged in, redirecting...');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ User authenticated, loading account page...');

    initAccountTabs();
    
    // Load data in parallel but don't let failures block the page
    await Promise.allSettled([
        loadUserProfile(),
        loadUserOrders(),
        loadUserStats()
    ]);
    
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

// Load user profile data from backend
async function loadUserProfile() {
    const user = window.auth.getCurrentUser();

    if (user) {
        // Update profile display with basic info from session
        const profileNameEl = document.getElementById('profileName');
        const profileEmailEl = document.getElementById('profileEmail');
        
        if (profileNameEl) profileNameEl.textContent = user.name || 'Utilizador';
        
        // Update avatar
        const avatarContainer = document.querySelector('.profile-avatar-large');
        if (avatarContainer) {
            if (user.photoUrl) {
                avatarContainer.innerHTML = `<img src="${user.photoUrl}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarContainer.innerHTML = '<i class="fas fa-user"></i>';
            }
        }

        // Load extended profile from backend
        try {
            const response = await fetch(`${CONTA_API_URL}/user/profile`, {
                method: 'GET',
                headers: {
                    'X-Session-Token': window.auth.sessionToken
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                
                // Update email display
                if (profileEmailEl) profileEmailEl.textContent = profileData.email || '';
                
                // Fill form fields
                const firstNameEl = document.getElementById('firstName');
                const lastNameEl = document.getElementById('lastName');
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const addressEl = document.getElementById('address');
                const postalCodeEl = document.getElementById('postalCode');
                const cityEl = document.getElementById('city');
                const countryEl = document.getElementById('country');
                const memberSinceEl = document.getElementById('memberSince');

                // Parse name from display name if firstName/lastName not set
                let firstName = profileData.firstName || '';
                let lastName = profileData.lastName || '';
                
                if (!firstName && profileData.name) {
                    const nameParts = profileData.name.trim().split(/\s+/);
                    firstName = nameParts[0] || '';
                    lastName = nameParts.slice(1).join(' ') || '';
                }

                if (firstNameEl) firstNameEl.value = firstName;
                if (lastNameEl) lastNameEl.value = lastName;
                if (emailEl) emailEl.value = profileData.email || '';
                if (phoneEl) phoneEl.value = profileData.phone || '';
                if (addressEl) addressEl.value = profileData.address || '';
                if (postalCodeEl) postalCodeEl.value = profileData.postalCode || '';
                if (cityEl) cityEl.value = profileData.city || '';
                if (countryEl) countryEl.value = profileData.country || 'Portugal';
                
                // Set member since date - handle different date formats
                if (memberSinceEl) {
                    let memberSince = 'N/A';
                    if (profileData.createdAt) {
                        try {
                            const date = new Date(profileData.createdAt);
                            if (!isNaN(date.getTime())) {
                                memberSince = date.toLocaleDateString('pt-PT');
                            }
                        } catch (e) {
                            console.warn('Could not parse createdAt date:', profileData.createdAt);
                        }
                    }
                    memberSinceEl.textContent = memberSince;
                }
            } else {
                console.log('📝 No profile data found, using defaults');
                setDefaultProfileValues(user);
            }
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            setDefaultProfileValues(user);
        }
    }
}

// Set default profile values
function setDefaultProfileValues(user) {
    const nameParts = (user.name || '').split(' ');
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const countryEl = document.getElementById('country');
    const memberSinceEl = document.getElementById('memberSince');

    if (firstNameEl) firstNameEl.value = nameParts[0] || '';
    if (lastNameEl) lastNameEl.value = nameParts.slice(1).join(' ') || '';
    if (countryEl) countryEl.value = 'Portugal';
    if (memberSinceEl) memberSinceEl.textContent = new Date().toLocaleDateString('pt-PT');
}

// Load user statistics (cart items, purchases, etc.)
async function loadUserStats() {
    try {
        const response = await fetch(`${CONTA_API_URL}/user/stats`, {
            method: 'GET',
            headers: {
                'X-Session-Token': window.auth.sessionToken
            }
        });

        if (response.ok) {
            const stats = await response.json();
            
            // Update stats display if elements exist
            const cartCountEl = document.getElementById('statsCartCount');
            const purchasesEl = document.getElementById('statsPurchases');
            const totalSpentEl = document.getElementById('statsTotalSpent');

            if (cartCountEl) cartCountEl.textContent = stats.cartItemsCount || 0;
            if (purchasesEl) purchasesEl.textContent = stats.totalPurchases || 0;
            if (totalSpentEl) totalSpentEl.textContent = `${(stats.totalSpent || 0).toFixed(2)}€`;
        }
    } catch (error) {
        console.error('❌ Error loading user stats:', error);
    }
}

// Initialize profile form
function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleProfileUpdate(e.target);
        });
    }
}

// Handle profile update - save to backend
async function handleProfileUpdate(form) {
    if (!window.auth.isLoggedIn()) return;

    const formData = new FormData(form);
    const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        country: formData.get('country')
    };

    try {
        const response = await fetch(`${CONTA_API_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': window.auth.sessionToken
            },
            body: JSON.stringify(profileData)
        });

        if (response.ok) {
            const updatedProfile = await response.json();
            
            // Update local user name if changed
            const newName = `${profileData.firstName} ${profileData.lastName}`.trim();
            if (newName) {
                window.auth.currentUser.name = newName;
                window.auth.updateUI();
            }

            window.showNotification('Perfil atualizado com sucesso!', 'success');
        } else {
            const error = await response.json();
            window.showNotification(error.message || 'Erro ao atualizar perfil', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        window.showNotification('Erro ao atualizar perfil', 'error');
    }
}

// Load user orders from backend
async function loadUserOrders() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    try {
        const response = await fetch(`${CONTA_API_URL}/user/orders`, {
            method: 'GET',
            headers: {
                'X-Session-Token': window.auth.sessionToken
            }
        });

        if (response.ok) {
            const orders = await response.json();
            
            if (orders && orders.length > 0) {
                ordersList.innerHTML = orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <div class="order-info">
                                <h4>Pedido #${order.orderNumber}</h4>
                                <p class="order-date">${new Date(order.createdAt).toLocaleDateString('pt-PT')}</p>
                            </div>
                            <div class="order-status status-${order.status.toLowerCase()}">
                                ${getStatusText(order.status)}
                            </div>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <img src="${item.book?.coverImage || '/assets/images/placeholder.jpg'}" alt="${item.book?.title}" class="order-item-image">
                                    <div class="order-item-details">
                                        <h5>${item.book?.title || 'Livro'}</h5>
                                        <p>Quantidade: ${item.quantity}</p>
                                        <p>Preço: ${(item.price * item.quantity).toFixed(2)}€</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-total">
                            <strong>Total: ${order.totalAmount.toFixed(2)}€</strong>
                        </div>
                    </div>
                `).join('');
            } else {
                ordersList.innerHTML = `
                    <div class="empty-orders">
                        <i class="fas fa-shopping-bag"></i>
                        <p>Ainda não fez nenhuma encomenda.</p>
                        <a href="livros.html" class="btn btn-primary">Explorar Livros</a>
                    </div>
                `;
            }
        } else {
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Ainda não fez nenhuma encomenda.</p>
                    <a href="livros.html" class="btn btn-primary">Explorar Livros</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        ordersList.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar encomendas.</p>
            </div>
        `;
    }
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Pendente',
        'PAID': 'Pago',
        'SHIPPED': 'Enviado',
        'DELIVERED': 'Entregue',
        'CANCELLED': 'Cancelado',
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

    if (!window.auth.isLoggedIn()) return;

    // Validate new password
    if (newPassword.length < 6) {
        window.showNotification('A nova password deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        window.showNotification('As passwords não coincidem', 'error');
        return;
    }

    try {
        await window.auth.updatePassword(newPassword);
        form.reset();
        window.showNotification('Password atualizada com sucesso!', 'success');
    } catch (error) {
        window.showNotification(error.message, 'error');
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
    if (!window.auth.isLoggedIn()) return;

    try {
        await window.auth.deleteAccount();
    } catch (error) {
        window.showNotification(error.message, 'error');
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