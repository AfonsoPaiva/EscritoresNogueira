// ==================================
// CONTA.JS - Account page functionality
// ==================================

// API Configuration
const CONTA_API_URL = window.API_BASE || 'http://localhost:8080/api';

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

    // Handle email verification if parameters are present
    await handleEmailVerification();

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

    // If the page was opened with ?editProfile=1, open profile tab and focus form
    handleEditProfileParam();
}

// If URL contains ?editProfile=1, switch to profile tab and focus firstName
function handleEditProfileParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('editProfile') === '1') {
            const profileTab = document.querySelector('[data-tab="profile"]');
            if (profileTab) profileTab.click();
            // focus first name input after a short delay
            setTimeout(() => {
                const firstNameEl = document.getElementById('firstName');
                if (firstNameEl) {
                    firstNameEl.focus();
                    firstNameEl.classList.add('highlight-required');
                }
            }, 200);

            // remove the param from the URL to keep it clean
            const url = new URL(window.location);
            url.searchParams.delete('editProfile');
            window.history.replaceState({}, '', url);
        }
    } catch (e) {
        console.warn('handleEditProfileParam failed', e);
    }
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
                    if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
                    if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
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

// ==================================
// PHONE INPUT COMPONENT
// ==================================

// Initialize phone input component - Optimized version
async function initPhoneInput() {
    const phoneContainer = document.querySelector('.phone-input-container');
    if (!phoneContainer) return;

    // Setup phone input formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            formatPhoneInput(e.target);
        });

        phoneInput.addEventListener('blur', (e) => {
            validatePhoneInput(e.target);
        });
    }
}











// Format phone input as user types
function formatPhoneInput(input) {
    let value = input.value;

    // If already in XXX XXX XXX format, keep it
    if (/^\d{3} \d{3} \d{3}$/.test(value)) {
        return;
    }

    // Remove non-digits
    value = value.replace(/\D/g, '');

    // Portugal formatting: 912 345 678
    if (value.length <= 3) {
        input.value = value;
        return;
    }
    if (value.length <= 6) {
        input.value = `${value.slice(0, 3)} ${value.slice(3)}`;
        return;
    }
    input.value = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 9)}`;
}

// Validate phone input
function validatePhoneInput(input) {
    const value = input.value.replace(/\D/g, '');
    // Portugal: 9 digits
    const isValid = value.length === 9;

    // Update input styling
    input.classList.toggle('invalid', !isValid && input.value.length > 0);
    input.classList.toggle('valid', isValid);

    return isValid;
}



// Get formatted phone number for submission
function getFormattedPhoneNumber() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return '';

    const phoneValue = phoneInput.value.replace(/\D/g, '');
    if (!phoneValue) return '';

    return phoneValue; // Return only digits, no +351
}

// Load user profile data from backend
// Function to update field visibility based on residence type and field values
function updateFieldVisibility() {
    const residenceTypeEl = document.getElementById('residenceType');
    const doorNumberEl = document.getElementById('doorNumber');
    const floorEl = document.getElementById('floor');
    
    const doorNumberField = document.getElementById('doorNumberField');
    const floorField = document.getElementById('floorField');
    
    const residenceType = residenceTypeEl ? residenceTypeEl.value : '';
    const doorNumber = doorNumberEl ? doorNumberEl.value.trim() : '';
    const floor = floorEl ? floorEl.value.trim() : '';
    
    // Show door number field if residence type is selected OR door number has a value
    if (doorNumberField) {
        doorNumberField.style.display = (residenceType !== '' || doorNumber) ? 'block' : 'none';
    }
    
    // Show floor field if residence type is "Apartamento" OR floor has a value
    if (floorField) {
        floorField.style.display = (residenceType === 'Apartamento' || floor) ? 'block' : 'none';
    }
}

// Handler for residence type change
function handleResidenceTypeChange(e) {
    updateFieldVisibility();
}

function setupResidenceTypeListener() {
    const residenceTypeEl = document.getElementById('residenceType');
    const doorNumberEl = document.getElementById('doorNumber');
    const floorEl = document.getElementById('floor');
    
    if (residenceTypeEl) {
        // Remove existing listener to avoid duplicates
        residenceTypeEl.removeEventListener('change', handleResidenceTypeChange);
        residenceTypeEl.addEventListener('change', handleResidenceTypeChange);
    }
    
    // Add listeners to door number and floor fields to show them when user types
    if (doorNumberEl) {
        doorNumberEl.removeEventListener('input', updateFieldVisibility);
        doorNumberEl.addEventListener('input', updateFieldVisibility);
    }
    
    if (floorEl) {
        floorEl.removeEventListener('input', updateFieldVisibility);
        floorEl.addEventListener('input', updateFieldVisibility);
    }
}

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
                avatarContainer.innerHTML = `<img src="${user.photoUrl}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror='this.style.display="none"; this.parentElement.innerHTML="<i class=\"fas fa-user\"></i>";'>`;
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
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const addressEl = document.getElementById('address');
                const postalCodeEl = document.getElementById('postalCode');
                const cityEl = document.getElementById('city');
                const countryEl = document.getElementById('country');
                const memberSinceEl = document.getElementById('memberSince');

                // Set firstName as the full name
                let firstName = profileData.firstName || profileData.name || '';

                if (firstNameEl) firstNameEl.value = firstName;
                if (emailEl) emailEl.value = profileData.email || '';
                if (phoneEl) {
                    const phoneValue = profileData.phone || '';
                    phoneEl.value = phoneValue;

                    // Store phone value to be processed after countries are loaded
                    phoneEl.dataset.originalPhone = phoneValue;
                }
                if (addressEl) addressEl.value = profileData.address || '';
                if (postalCodeEl) postalCodeEl.value = profileData.postalCode || '';
                if (cityEl) cityEl.value = profileData.city || '';
                if (countryEl) countryEl.value = profileData.country || 'Portugal';
                
                // Populate residence type and related fields
                const residenceTypeEl = document.getElementById('residenceType');
                const floorEl = document.getElementById('floor');
                const doorNumberEl = document.getElementById('doorNumber');
                const notesEl = document.getElementById('notes');
                
                if (residenceTypeEl) residenceTypeEl.value = profileData.residenceType || '';
                if (floorEl) floorEl.value = profileData.floor || '';
                if (doorNumberEl) doorNumberEl.value = profileData.doorNumber || '';
                if (notesEl) notesEl.value = profileData.notes || '';
                
                // Trigger change event on residenceType to show/hide floor and door number fields
                if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
                
                // Update field visibility based on loaded values
                updateFieldVisibility();
                
                // Setup residence type listener if not already done
                setupResidenceTypeListener();
                
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

// Handle email verification from URL parameters
async function handleEmailVerification() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (!oobCode || mode !== 'verifyEmail') {
        return; // No verification to handle
    }

    console.log('📧 Processing email verification...');

    try {
        // Apply the verification code using Firebase
        await window.firebaseAuth.applyActionCode(oobCode);
        console.log('✅ Email verified successfully');

        // Update user status on backend
        await updateUserVerificationStatus();

        // Clean URL parameters
        const url = new URL(window.location);
        url.searchParams.delete('mode');
        url.searchParams.delete('oobCode');
        window.history.replaceState({}, '', url);

        // Show success message
        showVerificationSuccess();

    } catch (error) {
        console.error('❌ Email verification failed:', error);
        showVerificationError(error.message);
    }
}

// Update user verification status on backend
async function updateUserVerificationStatus() {
    try {
        const response = await fetch(`${CONTA_API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: {
                'X-Session-Token': window.auth.sessionToken
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update verification status on backend');
        }

        console.log('✅ Backend verification status updated');
    } catch (error) {
        console.error('❌ Failed to update backend verification status:', error);
        // Don't throw - verification succeeded on Firebase side
    }
}

// Show verification success message
function showVerificationSuccess() {
    // Create success alert
    const alert = document.createElement('div');
    alert.className = 'verification-alert success';
    alert.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div class="alert-content">
            <h4>Email Verificado!</h4>
            <p>Seu email foi verificado com sucesso. Sua conta está agora totalmente ativada.</p>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Add to page
    const container = document.querySelector('.account-content.active');
    if (container) {
        container.insertBefore(alert, container.firstChild);
    }

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 10000);
}

// Show verification error message
function showVerificationError(message) {
    // Create error alert
    const alert = document.createElement('div');
    alert.className = 'verification-alert error';
    alert.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div class="alert-content">
            <h4>Erro na Verificação</h4>
            <p>${message || 'Ocorreu um erro ao verificar seu email. Tente novamente ou entre em contato com o suporte.'}</p>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Add to page
    const container = document.querySelector('.account-content.active');
    if (container) {
        container.insertBefore(alert, container.firstChild);
    }
}

// Set default profile values
function setDefaultProfileValues(user) {
    const firstNameEl = document.getElementById('firstName');
    const countryEl = document.getElementById('country');
    const memberSinceEl = document.getElementById('memberSince');

    if (firstNameEl) firstNameEl.value = user.name || '';
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
    // Initialize phone input component
    initPhoneInput();

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleProfileUpdate(e.target);
        });

        // Manual save button (user-triggered)
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    await handleProfileUpdate(form);
                } catch (e) {
                    console.warn('Profile save failed', e);
                }
            });
        }

        // Optional reset button to rollback edits locally
        const resetBtn = document.getElementById('resetProfileBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                // reload profile values from cached server profile
                loadUserProfile();
            });
        }

        // Function to setup residence type field visibility
        // Attach realtime sync listeners: when profile inputs change, broadcast profile:updated
        try {
            const syncFields = ['firstName','phone','address','city','postalCode','country','residenceType','floor','doorNumber','notes'];
            // suppress loop when applying remote updates
            let isApplyingRemoteUpdate = false;
            syncFields.forEach(f => {
                const el = document.getElementById(f);
                if (!el) return;
                el.addEventListener('input', debounce(() => {
                    if (isApplyingRemoteUpdate) return;
                    // build partial profile to share (do not include email)
                    const partial = {};
                    syncFields.forEach(k => { const e = document.getElementById(k); partial[k] = e ? e.value : ''; });
                    try {
                        window.dispatchEvent(new CustomEvent('profile:updated', { detail: partial }));
                    } catch (e) {}
                    // persist for cross-tab
                    try { localStorage.setItem('profile:shipping:update', JSON.stringify({ ts: Date.now(), data: partial })); } catch (e) {}
                }, 200));
            });

            // When we receive shipping updates, we will programmatically set inputs — avoid looping
            window.addEventListener('shipping:filled', (e) => {
                const data = e && e.detail ? e.detail : null;
                if (!data) return;
                try {
                    isApplyingRemoteUpdate = true;
                    ['firstName','phone','address','city','postalCode','residenceType','floor','doorNumber','notes'].forEach(f => {
                        const el = document.getElementById(f);
                        if (el && data[f] !== undefined) el.value = data[f] || '';
                    });
                    // Trigger change on residenceType to show/hide fields
                    const residenceTypeEl = document.getElementById('residenceType');
                    if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
                } finally { setTimeout(() => { isApplyingRemoteUpdate = false; }, 50); }
            });
            // cross-tab: when payment page writes shipping updates, ignore loops handled above
        } catch (e) { console.warn('Could not attach profile input listeners', e); }
    }
}

// Listen for profile updates from other pages and update profile form inputs
window.addEventListener('profile:updated', (e) => {
    const data = e && e.detail ? e.detail : null;
    if (!data) return;
    const fields = ['firstName','email','phone','address','postalCode','city','country','residenceType','floor','doorNumber','notes'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el && data[f] !== undefined) el.value = data[f] || '';
    });
});

// Listen for shipping form fills (instant, local-only sync) to update account inputs
// NOTE: do NOT update the account email from shipping data — email is account-linked.
window.addEventListener('shipping:filled', (e) => {
    const data = e && e.detail ? e.detail : null;
    if (!data) return;
    ['firstName','phone','address','city','postalCode','residenceType','floor','doorNumber','notes'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = data[f] || '';
    });
});

// Cross-tab synchronization: respond to storage events written by the payment page
window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === 'shipping:profile:update' && e.newValue) {
        try {
            const parsed = JSON.parse(e.newValue);
            const data = parsed && parsed.data ? parsed.data : null;
            if (!data) return;
            ['firstName','phone','address','city','postalCode','residenceType','floor','doorNumber','notes'].forEach(f => {
                const el = document.getElementById(f);
                if (el) el.value = data[f] || '';
            });
            // Trigger change on residenceType to show/hide fields
            const residenceTypeEl = document.getElementById('residenceType');
            if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
        } catch (err) { /* ignore parse errors */ }
    }
});

// On page load, apply any persisted shipping update left in localStorage
document.addEventListener('DOMContentLoaded', () => {
    try {
        const key = 'shipping:profile:update';
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            const data = parsed && parsed.data ? parsed.data : null;
            if (data) {
                ['firstName','phone','address','city','postalCode','residenceType','floor','doorNumber','notes'].forEach(f => {
                    const el = document.getElementById(f);
                    if (el) el.value = data[f] || '';
                });
                // Trigger change on residenceType to show/hide fields
                const residenceTypeEl = document.getElementById('residenceType');
                if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
            }
        }
    } catch (e) {
        // don't block page load on errors
        console.warn('Could not apply persisted shipping update', e);
    }
});

// Debounce helper (local to this file)
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Format postal code input (0000-000) on profile page
document.addEventListener('DOMContentLoaded', () => {
    const postal = document.getElementById('postalCode');
    if (postal) {
        postal.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 4) v = v.slice(0,4) + '-' + v.slice(4,7);
            e.target.value = v;
        });
    }
});

// Handle profile update - save to backend
async function handleProfileUpdate(form) {
    if (!window.auth.isLoggedIn()) return;

    const formData = new FormData(form);
    const profileData = {
        firstName: formData.get('firstName'),
        // Email is account-linked and not editable; always use authenticated email
        email: (window.auth && window.auth.getCurrentUser && window.auth.getCurrentUser().email) || formData.get('email'),
        phone: getFormattedPhoneNumber(),
        address: formData.get('address'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        country: formData.get('country'),
        residenceType: formData.get('residenceType'),
        floor: formData.get('floor'),
        doorNumber: formData.get('doorNumber'),
        notes: formData.get('notes')
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
            const newName = profileData.firstName || '';
            if (newName) {
                window.auth.currentUser.name = newName;
                window.auth.updateUI();
            }

            // Email is account-linked; ensure UI shows the authoritative email
            try {
                const authEmail = (window.auth && window.auth.getCurrentUser && window.auth.getCurrentUser().email) || updatedProfile.email;
                if (authEmail) {
                    window.auth.currentUser.email = authEmail;
                    window.auth.updateUI();
                }
            } catch (e) {}

            // Update cached profile used by other pages
            if (typeof userProfileCache !== 'undefined') userProfileCache = updatedProfile;

            window.showNotification('Perfil atualizado com sucesso!', 'success');
            // notify other pages that profile changed
            try { window.dispatchEvent(new CustomEvent('profile:updated', { detail: updatedProfile })); } catch(e){}
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
            
            // support paginated responses ({ orders: [...] }) and direct arrays
            const ordersListData = Array.isArray(orders) ? orders : (orders.orders || []);
            const ordersOverviewEl = document.querySelector('.orders-overview');
            if (ordersListData && ordersListData.length > 0) {
                // show overview when there are orders
                if (ordersOverviewEl) ordersOverviewEl.style.display = 'flex';
                ensureOrderProgressStyles();

                // helper to parse createdAt that can be either an ISO string or an array
                const parseCreatedAt = (createdAt) => {
                    try {
                        if (!createdAt) return new Date();
                        if (Array.isArray(createdAt)) {
                            // [year, month, day, hour, minute, second, nano]
                            const [y, m, d, hh, mm, ss, ns] = createdAt;
                            const ms = ns ? Math.floor(ns / 1e6) : 0;
                            return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms);
                        }
                        return new Date(createdAt);
                    } catch (e) {
                        return new Date();
                    }
                };

                // Render orders as a table (supports multiple orders)
                const statusesOrder = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                function renderProgressForStatus(status) {
                    const s = (status || 'PENDING').toUpperCase();
                    const idx = statusesOrder.findIndex(x => x === s);
                    const activeIndex = idx >= 0 ? idx : 0;
                    const percentRaw = Math.round((activeIndex / (statusesOrder.length - 1)) * 100);
                    const percent = Math.max(0, Math.min(100, percentRaw));
                    const labelsHtml = statusesOrder.map(st => `<div>${getStatusText(st)}</div>`).join('');
                    return `
                        <div class="order-progress-wrap">
                            <div class="progress-line">
                                <div class="progress-fill" style="width:${percent}%;"></div>
                            </div>
                            <div class="order-progress-truck" style="left:${percent}%;">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="progress-labels">${labelsHtml}</div>
                        </div>
                    `;
                }

                // Render larger progress HTML for modal (bigger line and truck)
                function renderProgressForModal(status) {
                    const s = (status || 'PENDING').toUpperCase();
                    const idx = statusesOrder.findIndex(x => x === s);
                    const activeIndex = idx >= 0 ? idx : 0;
                    const percentRaw = Math.round((activeIndex / (statusesOrder.length - 1)) * 100);
                    const percent = Math.max(0, Math.min(100, percentRaw));
                    const labelsHtml = statusesOrder.map(st => `<div>${getStatusText(st)}</div>`).join('');
                    return `
                        <div class="order-progress-wrap modal-progress">
                            <div class="order-progress-truck" data-percent="${percent}" style="left:0%;font-size:22px;">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="progress-line" style="height:18px;">
                                <div class="progress-fill" style="width:${percent}%;height:100%;"></div>
                            </div>
                            <div class="progress-labels" style="font-size:14px;margin-top:12px;">${labelsHtml}</div>
                        </div>
                    `;
                }

                const rows = orders.map(order => {
                    const date = parseCreatedAt(order.createdAt).toLocaleDateString('pt-PT');
                    const status = getStatusText(order.status);
                    const itemsSummary = (order.items || []).map(i => `${i.book?.title || 'Livro'} x${i.quantity}`).join('<br/>');
                    const total = (order.total ?? order.totalAmount ?? 0).toFixed(2) + '€';
                    return `
                        <tr class="order-main-row">
                            <td><a href="#" class="order-link" data-order-number="${order.orderNumber}">${order.orderNumber}</a></td>
                            <td>${date}</td>
                            <td class="order-status status-${String(order.status || '').toLowerCase()}">${status}</td>
                            <td>${itemsSummary}</td>
                            <td style="white-space:nowrap">${total}</td>
                            <td><button class="btn btn-sm view-order" data-order-number="${order.orderNumber}">Ver</button></td>
                        </tr>
                    `;
                }).join('');

                ordersList.innerHTML = `
                    <div class="orders-table-wrap">
                        <table class="orders-table">
                            <thead>
                                <tr>
                                    <th>Pedido</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Itens</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                `;

                // attach handler for view buttons -> open modal with GSAP animation
                setTimeout(() => {
                    const modalRoot = document.getElementById('orderModal');
                    const modalBody = document.getElementById('orderModalBody');
                    const modalClose = () => {
                        try {
                            if (window.gsap) {
                                gsap.to('.order-modal-content', { scale: 0.9, opacity: 0, y: 20, duration: 0.28, ease: 'power3.in', onComplete: () => { modalRoot.classList.add('hidden'); } });
                                gsap.to('.order-modal-overlay', { opacity: 0, duration: 0.2 });
                            } else {
                                modalRoot.classList.add('hidden');
                            }
                        } catch (e) { modalRoot.classList.add('hidden'); }
                    };

                    document.querySelectorAll('.view-order').forEach(btn => btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const num = btn.getAttribute('data-order-number');
                        const order = orders.find(o => String(o.orderNumber) === String(num));
                        if (!order) return;

                        // build modal content (include larger progress at top)
                        const progressHtmlModal = renderProgressForModal(order.status);

                        // invoice link (if present in order object under common keys)
                        const invoiceUrl = order.invoiceUrl || order.invoice || order.invoiceLink || order.invoicePdf || order.invoicePdfUrl || order.receiptUrl || order.faturaUrl;
                        console.log('Invoice URL detected:', invoiceUrl); // debug
                        let invoiceButtonHtml = '';
                        if (invoiceUrl) {
                            invoiceButtonHtml = `<a href="${escapeHtml(invoiceUrl)}" target="_blank" rel="noopener noreferrer" class="btn-sm btn-invoice" aria-label="Ver fatura"><i class="fas fa-file-invoice"></i><span> Ver Fatura</span></a>`;
                        } else {
                            invoiceButtonHtml = `<button class="btn-sm btn-invoice disabled" disabled aria-disabled="true">Sem fatura</button>`;
                        }
                        const itemsHtml = (order.items || []).map(i => `
                            <div class="order-modal-item">
                                <img src="${i.book?.coverImage || '/assets/images/placeholder.jpg'}" alt="${escapeHtml(i.book?.title || 'Livro')}" />
                                <div>
                                    <div style="font-weight:600">${escapeHtml(i.book?.title || 'Livro')}</div>
                                    <div>Quantidade: ${i.quantity}</div>
                                    <div>Preço: ${(i.price * i.quantity).toFixed(2)}€</div>
                                </div>
                            </div>
                        `).join('');

                        // shipping info (best-effort)
                            let shipping = order.shippingAddress || order.shipping || order.address || order.customer || {};
                            // If shipping is a JSON string (saved by backend), parse it
                            if (typeof shipping === 'string') {
                                const s = shipping.trim();
                                if (s.startsWith('{') || s.startsWith('[')) {
                                    try { shipping = JSON.parse(s); } catch (e) { /* leave as string */ }
                                }
                            }
                            const shipLines = [];
                            if (typeof shipping === 'string') {
                                if (shipping.trim()) shipLines.push(escapeHtml(shipping));
                            } else {
                                // use firstName or name
                                const name = shipping.firstName || shipping.name || '';
                                if (name) shipLines.push(escapeHtml(name));
                                if (shipping.address) shipLines.push(escapeHtml(shipping.address));
                                if (shipping.street) shipLines.push(escapeHtml(shipping.street));
                                // city/postal
                                const cityLine = [shipping.postalCode || shipping.postal || shipping.postalCodeFormatted, shipping.city || shipping.town].filter(Boolean).join(' ');
                                if (cityLine) shipLines.push(escapeHtml(cityLine));
                                if (shipping.country) shipLines.push(escapeHtml(shipping.country));
                            }
                            const shippingHtml = shipLines.length ? `<div>${shipLines.join('<br/>')}</div>` : `<div>Sem morada registada</div>`;

                        modalBody.innerHTML = `
                            <div class="order-modal-body">
                                <div style="width:100%;margin-bottom:12px">${progressHtmlModal}</div>
                                <div class="order-modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                                    <h3 style="margin:0">Pedido ${escapeHtml(order.orderNumber)}</h3>
                                    ${invoiceButtonHtml}
                                </div>
                                <div class="order-modal-main">
                                    <div class="order-modal-items">
                                        <div>${itemsHtml}</div>
                                        <div style="padding:10px 0;font-weight:700">Total: ${(order.total ?? order.totalAmount ?? 0).toFixed(2)}€</div>
                                    </div>
                                    <div class="order-shipping">
                                        <h4>Morada de envio</h4>
                                        ${shippingHtml}
                                    </div>
                                </div>
                            </div>
                        `;

                        // show modal
                        modalRoot.classList.remove('hidden');
                        try { document.querySelector('.order-modal-overlay').style.opacity = 0; } catch(e){}
                        if (window.gsap) {
                            gsap.set('.order-modal-content', { scale: 0.9, opacity: 0, y: 20 });
                            gsap.to('.order-modal-overlay', { opacity: 1, duration: 0.25 });
                            gsap.to('.order-modal-content', { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
                            // animate truck from 0% to target percent inside modal
                            try {
                                const truck = modalRoot.querySelector('.order-progress-truck');
                                if (truck) {
                                    const target = truck.getAttribute('data-percent') || '0';
                                    gsap.fromTo(truck, { left: '0%' }, { left: `${target}%`, duration: 0.9, ease: 'power3.out', delay: 0.12 });
                                }
                            } catch (e) { /* noop */ }
                        }

                        // fallback: if GSAP not present, set left after a short timeout so truck appears at correct place
                        if (!window.gsap) {
                            setTimeout(() => {
                                const truck = modalRoot.querySelector('.order-progress-truck');
                                if (truck) {
                                    const target = truck.getAttribute('data-percent') || '0';
                                    truck.style.left = `${target}%`;
                                }
                            }, 200);
                        }

                        // bind close
                        const closeBtn = document.querySelector('.order-modal-close');
                        if (closeBtn) closeBtn.onclick = modalClose;
                        const overlay = document.querySelector('.order-modal-overlay');
                        if (overlay) overlay.onclick = modalClose;
                    }));
                }, 0);
                // Build status counts for chart
                try {
                    const counts = orders.reduce((acc, o) => {
                        const s = (o.status || 'PENDING').toUpperCase();
                        acc[s] = (acc[s] || 0) + 1;
                        return acc;
                    }, {});

                    const labels = [];
                    const data = [];
                    const summaryEl = document.getElementById('ordersSummaryList');
                    if (summaryEl) summaryEl.innerHTML = '';

                    const orderStatusDisplay = {
                        'PENDING': 'Pendente',
                        'PAID': 'Pago',
                        'PROCESSING': 'Em Processamento',
                        'SHIPPED': 'Enviado',
                        'DELIVERED': 'Entregue',
                        'COMPLETED': 'Realizado',
                        'CANCELLED': 'Cancelado',
                        'REFUNDED': 'Reembolsado',
                        'FAILED': 'Falhado'
                    };

                    for (const [k, v] of Object.entries(counts)) {
                        labels.push(orderStatusDisplay[k] || k);
                        data.push(v);
                        if (summaryEl) {
                            const li = document.createElement('li');
                            li.textContent = `${orderStatusDisplay[k] || k}: ${v}`;
                            summaryEl.appendChild(li);
                        }
                    }

                    // summary counts updated above; progress visualization shown in modal only
                } catch (e) {
                    console.warn('Could not render orders chart', e);
                }
            } else {
                // hide overview when there are no orders
                if (ordersOverviewEl) ordersOverviewEl.style.display = 'none';
                ensureEmptyOrdersStyles();
                ordersList.innerHTML = `
                    <div class="empty-orders centered-empty-orders">
                        <i class="fas fa-shopping-bag empty-icon"></i>
                        <p class="empty-text">Ainda não fez nenhuma encomenda.</p>
                        <a href="livros.html" class="btn btn-primary empty-cta">Explorar Livros</a>
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
        'PROCESSING': 'Em Processamento',
        'SHIPPED': 'Enviado',
        'DELIVERED': 'Entregue',
        'COMPLETED': 'Realizado',
        'CANCELLED': 'Cancelado',
        'pending': 'Pendente',
        'paid': 'Pago',
        'processing': 'Em Processamento',
        'shipped': 'Enviado',
        'delivered': 'Entregue',
        'completed': 'Realizado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Ensure CSS for order progress is present (inject once)
function ensureOrderProgressStyles() {
    if (document.getElementById('order-progress-styles')) return;
    const css = `
    .order-progress-wrap { padding: 12px 0; }
    .progress-line { position:relative; height:8px; background:#e6e6e6; border-radius:6px; overflow:hidden; }
    .progress-fill { position:absolute; left:0; top:0; bottom:0; width:0%; background:#0E1B4D; border-radius:6px; transition:width 600ms ease; }
    .progress-labels { display:flex; justify-content:space-between; gap:8px; margin-top:8px; padding:0 12px; font-size:12px; color:#444; }
    .progress-labels div { flex:1; text-align:center; }
    .order-progress-truck { position:absolute; top:50%; transform:translate(-50%,-50%); }
    `;
    const style = document.createElement('style');
    style.id = 'order-progress-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

// Render inline HTML for order progress (status: PAID -> PROCESSING -> SHIPPED -> COMPLETED)
function renderOrderProgressInline(status) {
    const steps = [
        { key: 'PAID', label: 'Pago' },
        { key: 'PROCESSING', label: 'Processando' },
        { key: 'SHIPPED', label: 'Enviado' },
        { key: 'COMPLETED', label: 'Entregue' }
    ];
    const s = (status || 'PENDING').toUpperCase();
    const idx = steps.findIndex(p => p.key === s);
    const activeIndex = idx >= 0 ? idx : 0;

    // compute fill percent based on step index (0..3)
    const percent = Math.round(((activeIndex) / (steps.length - 1)) * 100);

    const stepsHtml = steps.map((p, i) => {
        const cls = i < activeIndex ? 'progress-step completed' : (i === activeIndex ? 'progress-step active' : 'progress-step');
        return `
            <div class="${cls}">
                <span class="dot"></span>
                <div class="progress-step-label">${p.label}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="order-progress">
            <div class="progress-line" aria-hidden="true">
                <div class="progress-fill" style="width:${percent}%;"></div>
            </div>
            <div class="progress-steps">
                ${stepsHtml}
            </div>
        </div>
    `;
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

// Ensure CSS for empty orders block is present (inject once)
function ensureEmptyOrdersStyles() {
    if (document.getElementById('empty-orders-styles')) return;
    const css = `
    .centered-empty-orders { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:36px; border:1px dashed #e6e6e6; border-radius:8px; background:#fafafa; }
    .centered-empty-orders .empty-icon { font-size:48px; color:#FFB100; margin-bottom:12px; }
    .centered-empty-orders .empty-text { margin:0 0 12px; color:#444; font-weight:600; }
    .centered-empty-orders .empty-cta { text-decoration:none; padding:10px 16px; border-radius:6px; display:inline-block; }
    .centered-empty-orders .empty-cta.btn-primary { background:#0E1B4D; color:#fff; }
    @media (max-width:720px) { .orders-overview { flex-direction:column; } .progress-steps { min-width:160px; } }
    `;
    const style = document.createElement('style');
    style.id = 'empty-orders-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

// Small escapeHtml fallback (if not provided globally)
if (typeof escapeHtml !== 'function') {
    function escapeHtml(unsafe) {
        if (!unsafe && unsafe !== 0) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}