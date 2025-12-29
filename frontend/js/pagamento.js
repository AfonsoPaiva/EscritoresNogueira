// ==================================
// PAGAMENTO.JS - Payment processing functionality
// ==================================

let currentStep = 1;
let shippingData = {};
let paymentData = {};
let orderTotal = 0;
// in-memory user profile fetched from backend (avoid localStorage)
let userProfileCache = null;
// Prevent feedback loops when applying remote updates
let isApplyingRemoteUpdate = false;

// Initialize payment page
async function initPagamentoPage() {
    // Check if user is logged in
    const auth = window.auth || new AuthSystem();

    // Load cart items
    loadOrderSummary();

    // If cart is empty, keep the user on the page (summary shows empty)
    const cart = window.cart || new ShoppingCart();
    if (!cart.items || cart.items.length === 0) {
        // Disable payment proceed buttons if any
        document.querySelectorAll('.btn-primary[onclick*="nextStep"]').forEach(b => b.setAttribute('disabled', 'true'));
        // initialize other UI pieces but do not force sign-in
        initPaymentMethods();
        initFormValidation();
        // initCardFormatting(); // Removed as no card inputs exist
        return;
    }

    // Wait for session to be loaded so we know if the user is logged in
    if (auth.waitForSession) {
        try { await auth.waitForSession(); } catch (e) { console.warn('Erro ao aguardar sessão', e); }
    }

    // If user is not logged in, open the user panel and show a warning
    if (!auth.isLoggedIn()) {
        // open user panel to prompt login/register
        try {
            auth.toggleUserPanel();
        } catch (e) {
            console.warn('toggleUserPanel falhou', e);
        }
        // show a clear notification
        if (window.showNotification) window.showNotification('Precisa de iniciar sessão antes de realizar uma compra.', 'warning');
    }

    // Initialize payment method selection
    initPaymentMethods();
            // If profile contains address fields, prefill shipping form so the
            // user doesn't have to re-type them. Only fill form inputs that
            // are currently empty so user edits are preserved.
    initFormValidation();

    if (auth.isLoggedIn()) {
        console.debug('pagamento:initPagamentoPage - auth sessionToken=', auth.sessionToken, 'currentUser=', auth.getCurrentUser());
        await loadProfileAndDisplayShipping(auth.getCurrentUser());
    }

    // If redirected from Stripe Checkout success, confirm the session and show confirmation
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success' && params.get('session_id')) {
            const sessionId = params.get('session_id');
            // populate shippingData with address fields from profile if available
            const profileData = userProfileCache || {};
            shippingData.address = profileData.address || shippingData.address || '';
            shippingData.city = profileData.city || shippingData.city || '';
            shippingData.postalCode = profileData.postalCode || shippingData.postalCode || '';
            shippingData.country = profileData.country || shippingData.country || 'Portugal';
            // remove query params from URL to keep UI clean
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
            handleCheckoutSuccess(sessionId);
            // Note: profile updates from shipping are manual now. No automatic profile updates.
        }
    } catch (e) {
        console.warn('Error parsing URL params for checkout success', e);
    }

    // Attach realtime sync listeners: when shipping inputs change, dispatch shipping:filled
    try {
        const syncFields = ['firstName','phone','address','city','postalCode','country','residenceType','floor','doorNumber','notes'];
        syncFields.forEach(f => {
            const el = document.getElementById(f);
            if (!el) return;
            const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, debounce(() => {
                if (isApplyingRemoteUpdate) return;
                try { saveShippingData(); } catch (e) { console.warn('saveShippingData failed on ' + eventType, e); }
            }, 200));
        });
    } catch (e) { console.warn('Could not attach shipping input listeners', e); }

    // Listen for profile updates from account page and apply to shipping form
    window.addEventListener('profile:updated', (e) => {
        const data = e && e.detail ? e.detail : null;
        if (!data) return;
        try {
            isApplyingRemoteUpdate = true;
            ['firstName','phone','address','city','postalCode','country','residenceType','floor','doorNumber','notes'].forEach(f => {
                const el = document.getElementById(f);
                if (el && data[f] !== undefined) el.value = data[f] || '';
            });
            // Trigger change on residenceType to show/hide fields
            const residenceTypeEl = document.getElementById('residenceType');
            if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
            // update in-memory and persist via saveShippingData
            try { saveShippingData(); } catch(e){}
        } finally {
            // schedule unset to allow any triggered input events to be ignored
            setTimeout(() => { isApplyingRemoteUpdate = false; }, 50);
        }
    });

    // Cross-tab: apply profile updates written by account page
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        if (e.key === 'profile:shipping:update' && e.newValue) {
            try {
                const parsed = JSON.parse(e.newValue);
                const data = parsed && parsed.data ? parsed.data : null;
                if (!data) return;
                isApplyingRemoteUpdate = true;
                ['firstName','phone','address','city','postalCode','country','residenceType','floor','doorNumber','notes'].forEach(f => {
                    const el = document.getElementById(f);
                    if (el && data[f] !== undefined) el.value = data[f] || '';
                });
                // Trigger change on residenceType to show/hide fields
                const residenceTypeEl = document.getElementById('residenceType');
                if (residenceTypeEl) residenceTypeEl.dispatchEvent(new Event('change'));
                try { saveShippingData(); } catch(e){}
            } catch (err) { console.warn('Could not apply profile:shipping:update', err); }
            setTimeout(() => { isApplyingRemoteUpdate = false; }, 50);
        }
    });

    // Add event listener for next step button
    const nextStepBtn = document.getElementById('nextStepBtn');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', () => {
            nextStep(2);
        });
    }

    // Add event listener for prev step button
    const prevStepBtn = document.getElementById('prevStepBtn');
    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', () => {
            prevStep(1);
        });
    }

    // Add event listener for process payment button
    const processPaymentBtn = document.getElementById('processPaymentBtn');
    if (processPaymentBtn) {
        processPaymentBtn.addEventListener('click', processPayment);
    }
}

// Load order summary
function loadOrderSummary() {
    const cart = window.cart || new ShoppingCart();
    const items = cart.items;
    const summaryItems = document.getElementById('summaryItems');
    
    if (!summaryItems) return;
    
    if (items.length === 0) {
        summaryItems.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
        document.querySelector('.btn-primary[onclick*="nextStep"]')?.setAttribute('disabled', 'true');
        return;
    }
    
    // Display items
    summaryItems.innerHTML = items.map(item => `
        <div class="summary-item">
            <div class="item-image">
                ${item.image ? `<img src="${item.image}" alt="${item.title}">` : '<i class="fas fa-book"></i>'}
            </div>
            <div class="item-details">
                <h4>${item.title}</h4>
                <p>Qtd: ${item.quantity}</p>
            </div>
            <div class="item-price">
                ${(item.price * item.quantity).toFixed(2)}€
            </div>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = cart.getTotal();
    const shipping = 0; // Removed shipping
    const total = subtotal + shipping;
    
    orderTotal = total;
    
    // Update summary
    document.getElementById('summarySubtotal').textContent = `${subtotal.toFixed(2)}€`;
    document.getElementById('summaryTotal').textContent = `${total.toFixed(2)}€`;
}

// Initialize payment method selection
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    const paymentForms = document.querySelectorAll('.payment-form');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Remove active class from all methods
            paymentMethods.forEach(m => m.classList.remove('active'));
            method.classList.add('active');
            
            // Check the radio button
            const radio = method.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            
            // Show corresponding form
            const methodType = method.dataset.method;
            paymentForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${methodType}PaymentForm` || form.id === `${methodType}PaymentInfo`) {
                    form.classList.add('active');
                }
            });
        });
    });
}

// Initialize basic form validation and formatting (postal code, etc.)
function initFormValidation() {
    // Form validation is no longer needed since there's no shipping form on the payment page
    // Shipping data comes directly from the user profile
    return;
}

// Load profile and display shipping address for review
async function loadProfileAndDisplayShipping(user) {
    const auth = window.auth || new AuthSystem();
    let profileData = null;
    console.debug('pagamento:loadProfileAndDisplayShipping start - user=', user, 'sessionToken=', auth.sessionToken);

    try {
        const token = auth.sessionToken || null;
        if (token) {
            const resp = await fetch('http://localhost:8080/api/user/profile', {
                method: 'GET',
                headers: { 'X-Session-Token': token }
            });
            if (resp.ok) {
                profileData = await resp.json();
                userProfileCache = profileData;
            } else {
                profileData = userProfileCache;
            }
        } else if (user && user.email) {
            profileData = getUserProfileData(user.email) || userProfileCache;
        } else {
            profileData = userProfileCache;
        }
    } catch (e) {
        console.warn('Erro ao obter perfil do backend', e);
        profileData = userProfileCache || (user && user.email ? getUserProfileData(user.email) : null);
    }
    console.debug('pagamento:loadProfileAndDisplayShipping - profileData=', profileData);

    // Prefer explicit display element, but fall back gracefully if missing
    let displayEl = document.getElementById('shippingAddressDisplay');
    if (!displayEl) {
        // Try confirmation section element
        displayEl = document.getElementById('orderShippingAddress') || document.querySelector('.shipping-review .address-details') || null;
    }
    if (!displayEl) {
        console.warn('shippingAddressDisplay element not found; skipping display update');
        return;
    }
    if (profileData) {
        // Set shippingData to profile data
        shippingData = {
            firstName: profileData.firstName || '',
            email: profileData.email || (user && user.email ? user.email : ''),
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || '',
            postalCode: profileData.postalCode || '',
            country: profileData.country || 'Portugal',
            residenceType: profileData.residenceType || '',
            floor: profileData.floor || '',
            doorNumber: profileData.doorNumber || '',
            notes: profileData.notes || ''
        };

        // Display the address
        let addressHtml = '';
        if (profileData.firstName) {
            addressHtml += `<p><strong>${profileData.firstName}</strong></p>`;
        }
        if (profileData.address) {
            addressHtml += `<p>${profileData.address}</p>`;
        }
        if (profileData.residenceType === 'Apartamento' && profileData.floor) {
            addressHtml += `<p>Andar: ${profileData.floor}</p>`;
        }
        if (profileData.doorNumber) {
            addressHtml += `<p>Número da Porta: ${profileData.doorNumber}</p>`;
        }
        if (profileData.city || profileData.postalCode) {
            addressHtml += `<p>${profileData.city || ''} ${profileData.postalCode || ''}</p>`;
        }
        addressHtml += `<p>Portugal</p>`;
        if (profileData.phone) {
            addressHtml += `<p>Telefone: ${profileData.phone}</p>`;
        }
        if (profileData.email) {
            addressHtml += `<p>E-mail: ${profileData.email}</p>`;
        }

        displayEl.innerHTML = addressHtml || '<p>Morada não definida. Clique em "Alterar Morada de Envio" para adicionar.</p>';
    } else {
        displayEl.innerHTML = '<p>Carregando morada...</p>';
        shippingData = {};
    }
    console.debug('pagamento:loadProfileAndDisplayShipping end - shippingData=', shippingData);
}

// Debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Update shipping form inputs when profile changes elsewhere
window.addEventListener('profile:updated', (e) => {
    const p = e && e.detail ? e.detail : null;
    if (!p) return;
    const map = {
        firstName: 'firstName',
        email: 'email',
        phone: 'phone',
        address: 'address',
        city: 'city',
        postalCode: 'postalCode',
        country: 'country'
    };
    Object.keys(map).forEach(k => {
        const el = document.getElementById(map[k]);
        if (el && p[k] !== undefined && (el.value === '' || el.value !== String(p[k]))) {
            el.value = p[k] || '';
        }
    });
    // update in-memory shippingData
    shippingData = Object.assign({}, shippingData, p);
});

// Auto-save profile changes from checkout to backend and sync - REMOVED: No longer needed without shipping form
function attachShippingAutoSync() {
    // This function is no longer needed since there's no shipping form on the payment page
    // Profile updates should be done on the account page only
    return;
}

// Ensure auto-sync is attached after DOM load if on pagamento page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { attachShippingAutoSync(); });
} else {
    attachShippingAutoSync();
}

// Get user profile data
function getUserProfileData(email) {
    // Return in-memory cached profile only — do not read from localStorage
    return userProfileCache;
}

// Navigate to next step
function nextStep(step) {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Save data from current step
    if (currentStep === 1) {
        saveShippingData();
    }
    
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    // Update progress
    document.querySelectorAll('.progress-step')[currentStep - 1].classList.remove('active');
    document.querySelectorAll('.progress-step')[currentStep - 1].classList.add('completed');
    
    // Show next step
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelectorAll('.progress-step')[currentStep - 1].classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Refresh AOS
    if (typeof AOS !== 'undefined') {
        if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
        if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
    }
}

// Navigate to previous step
function prevStep(step) {
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    // Update progress
    document.querySelectorAll('.progress-step')[currentStep - 1].classList.remove('active');
    
    // Show previous step
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Refresh AOS
    if (typeof AOS !== 'undefined') {
        if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
        if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
    }
}

// Validate current step
function validateStep(step) {
    if (step === 1) {
        // Check if user is logged in
        const auth = window.auth || new AuthSystem();
        if (!auth.isLoggedIn()) {
            try { auth.toggleUserPanel(); } catch (e) { console.warn(e); }
            if (window.showNotification) window.showNotification('Precisa de iniciar sessão antes de realizar uma compra.', 'warning');
            return false;
        }

        // Require the user to have basic personal profile fields filled (name/email/phone).
        // The profile is used for both personal info and shipping address.
        const profile = (typeof userProfileCache !== 'undefined' && userProfileCache) ? userProfileCache : null;
        const requiredProfileFields = ['firstName', 'email'];
        let missingProfile = [];
        if (!profile) {
            missingProfile = requiredProfileFields.slice();
        } else {
            for (const f of requiredProfileFields) {
                if (!profile[f] || profile[f].toString().trim() === '') missingProfile.push(f);
            }
        }
        if (missingProfile.length > 0) {
            showProfileRequiredModal(missingProfile);
            return false;
        }

        // Check if shipping address is available from profile and validate all required fields
        const requiredShippingFields = ['firstName', 'phone', 'address', 'city', 'postalCode'];
        let missingShippingFields = [];

        if (!shippingData) {
            missingShippingFields = requiredShippingFields.slice();
        } else {
            for (const field of requiredShippingFields) {
                if (!shippingData[field] || shippingData[field].toString().trim() === '') {
                    missingShippingFields.push(field);
                }
            }

            // Additional validation for residence type specific fields
            if (shippingData.residenceType === 'Apartamento') {
                if (!shippingData.floor || shippingData.floor.toString().trim() === '') {
                    missingShippingFields.push('floor');
                }
                if (!shippingData.doorNumber || shippingData.doorNumber.toString().trim() === '') {
                    missingShippingFields.push('doorNumber');
                }
            }
        }

        if (missingShippingFields.length > 0) {
            const fieldNames = {
                'firstName': 'Nome',
                'phone': 'Telefone',
                'address': 'Morada',
                'city': 'Cidade',
                'postalCode': 'Código Postal',
                'floor': 'Andar',
                'doorNumber': 'Número da Porta'
            };
            const missingNames = missingShippingFields.map(field => fieldNames[field] || field);
            if (window.showNotification) {
                window.showNotification(`Morada de envio incompleta. Faltam: ${missingNames.join(', ')}. Atualize seu perfil.`, 'warning');
            }
            return false;
        }

        // Validate postal code format (Portugal)
        const postalCodePattern = /^\d{4}-\d{3}$/;
        if (!postalCodePattern.test(shippingData.postalCode)) {
            if (window.showNotification) window.showNotification('Código postal inválido. Deve estar no formato 0000-000.', 'warning');
            return false;
        }

        // Validate phone number (Portugal - 9 digits)
        const cleanPhone = shippingData.phone.replace(/\D/g, '');
        if (cleanPhone.length !== 9) {
            if (window.showNotification) window.showNotification('Número de telefone inválido. Deve ter 9 dígitos.', 'warning');
            return false;
        }
    }
    
    return true;
}

// Show modal prompting user to complete their profile; navigates to conta.html?editProfile=1
function showProfileRequiredModal(missingFields) {
    // If a modal already exists, don't recreate
    if (document.getElementById('profileRequiredModal')) return;

    const modal = document.createElement('div');
    modal.id = 'profileRequiredModal';
    modal.style.position = 'fixed';
    modal.style.left = 0;
    modal.style.top = 0;
    modal.style.right = 0;
    modal.style.bottom = 0;
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '20px';
    box.style.borderRadius = '8px';
    box.style.maxWidth = '420px';
    box.style.width = '100%';
    box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';

    const title = document.createElement('h3');
    title.textContent = 'Atualize o seu perfil';
    title.style.marginTop = '0';

    const p = document.createElement('p');
    p.style.marginBottom = '16px';
    p.textContent = 'Antes de finalizar a compra, complete as suas informações pessoais no perfil (nome, e-mail).';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.justifyContent = 'flex-end';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Cancelar';
    btnCancel.onclick = () => { modal.remove(); };

    const btnUpdate = document.createElement('button');
    btnUpdate.className = 'btn btn-primary';
    btnUpdate.textContent = 'Atualizar Perfil';
    btnUpdate.onclick = () => {
        // Navigate to account page with editProfile flag so the UI opens profile tab
        window.location.href = window.location.origin + '/frontend/conta.html#orders';
    };

    actions.appendChild(btnCancel);
    actions.appendChild(btnUpdate);

    box.appendChild(title);
    box.appendChild(p);
    box.appendChild(actions);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

// Save shipping data - now handled by loadProfileAndDisplayShipping
function saveShippingData() {
    // Shipping data is now loaded from profile and doesn't need to be saved from form inputs
    // The shippingData object is already populated by loadProfileAndDisplayShipping()
    return;
}

// Show loading overlay
function showLoader(message = 'Processando pedido...') {
    // Remove existing loader if any
    hideLoader();
    
    const loaderHtml = `
        <div id="paymentLoader" class="payment-loader-overlay">
            <div class="payment-loader-content">
                <div class="payment-loader-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="payment-loader-message">${message}</div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loaderHtml);
    
    // Add CSS if not already present
    if (!document.getElementById('payment-loader-styles')) {
        const style = document.createElement('style');
        style.id = 'payment-loader-styles';
        style.textContent = `
            .payment-loader-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }
            .payment-loader-content {
                background: white;
                padding: 2rem;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            .payment-loader-spinner {
                font-size: 3rem;
                color: #0E1B4D;
                margin-bottom: 1rem;
            }
            .payment-loader-message {
                font-size: 1.1rem;
                color: #333;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
}

// Hide loading overlay
function hideLoader() {
    const loader = document.getElementById('paymentLoader');
    if (loader) {
        loader.remove();
    }
}

// Process payment
function processPayment() {
    const auth = window.auth || new AuthSystem();
    const cart = window.cart || new ShoppingCart();

    // Must have items in cart
    if (!cart.items || cart.items.length === 0) {
        if (window.showNotification) window.showNotification('O seu carrinho está vazio.', 'warning');
        return;
    }

    // Ensure session is loaded
    if (auth.waitForSession) {
        auth.waitForSession().catch(() => {});
    }

    // Force login if not authenticated
    if (!auth.isLoggedIn()) {
        try { auth.toggleUserPanel(); } catch (e) { console.warn(e); }
        if (window.showNotification) window.showNotification('Precisa de iniciar sessão antes de efetuar o pagamento.', 'warning');
        return;
    }

    // Show loading immediately
    showLoader('Processando o seu pedido...');

    // Always use Stripe Checkout: create a session and redirect

    // Show loading on button too
    const btn = event?.target || document.querySelector('.btn-primary.process-payment');
    const originalText = btn ? btn.innerHTML : null;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        btn.disabled = true;
    }

    // Handle real payment flows
    (async () => {
            try {
                // Ensure shipping form values are captured before creating session
                try { saveShippingData(); } catch (e) { console.warn('saveShippingData failed in processPayment', e); }

                // Profile updates are manual; do not auto-update profile here.

            const items = cart.items.map(i => ({ bookId: i.id, quantity: i.quantity }));
            // Create Checkout session on backend (Stripe will handle payment method selection)
            const payload = {
                items,
                shipping: shippingData || {},
                customerEmail: shippingData?.email || (window.auth?.getCurrentUser?.()?.email) || null,
                successUrl: window.location.origin + window.location.pathname + '?checkout=success&session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.href
            };
            try {
                console.log('create-checkout-session payload (object):', payload);
                console.log('create-checkout-session payload (json):', JSON.stringify(payload));
            } catch (e) { console.warn('Could not stringify payload', e); }

            const resp = await fetch('http://localhost:8080/api/payments/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (resp.ok && data.url) {
                // Hide loader before redirecting to Stripe
                hideLoader();
                window.location.href = data.url;
                return;
            } else {
                throw new Error(data.error || 'Erro ao criar sessão de pagamento');
            }
        } catch (err) {
            console.error('Payment error', err);
            hideLoader();
            alert('Erro ao processar pagamento: ' + (err.message || err));
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    })();
}

// Handle Stripe Checkout success redirect: confirm session and show confirmation
async function handleCheckoutSuccess(sessionId) {
    if (!sessionId) return;
    console.log('handleCheckoutSuccess called with sessionId:', sessionId);
    console.log('Current shippingData:', shippingData);
    
    // Show loader while confirming the session
    showLoader('Finalizando pedido...');
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (window.auth && window.auth.sessionToken) headers['X-Session-Token'] = window.auth.sessionToken;
        const resp = await fetch('http://localhost:8080/api/payments/confirm-session', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ sessionId, shipping: shippingData, customerEmail: shippingData.email })
        });
        const data = await resp.json();
        if (resp.ok) {
            // create a minimal order object to reuse showConfirmation
            const order = createOrder();
            if (data.orderNumber) order.orderNumber = data.orderNumber;
            // set customer email if provided
            if (data.customerEmail) shippingData.email = data.customerEmail;
            // clear cart and show confirmation
            const cart = window.cart || new ShoppingCart();
            cart.clearCart();
            hideLoader();
            showConfirmation(order);
        } else {
            console.warn('Failed to confirm session', data);
            hideLoader();
        }
    } catch (e) {
        console.error('Error confirming checkout session', e);
        hideLoader();
    }
}

// Validate payment method
function validatePaymentMethod(method) {
    if (method === 'card') {
        // Card details are collected by Stripe Checkout — no client-side PAN/CVV validation here
        return true;
    } else if (method === 'mbway') {
        const phone = document.getElementById('mbwayPhone').value;
        if (!phone || phone.length !== 9) {
            alert('Por favor, insira um número de telefone válido (9 dígitos)');
            return false;
        }
    }
    
    return true;
}

// Save payment data
function savePaymentData(method) {
    paymentData = {
        method: method,
        timestamp: new Date().toISOString()
    };
    if (method === 'mbway') {
        paymentData.phone = document.getElementById('mbwayPhone').value;
    }
}

// Create order object
function createOrder() {
    const cart = window.cart || new ShoppingCart();
    const orderNumber = generateOrderNumber();
    // Ensure we have the latest shipping form values
    try { saveShippingData(); } catch (e) { console.warn('saveShippingData failed', e); }
    
    return {
        orderNumber: orderNumber,
        date: new Date().toISOString(),
        status: 'pending',
        customer: shippingData,
        items: cart.items.map(item => ({
            id: item.id,
            title: item.title,
            author: item.author,
            price: item.price,
            quantity: item.quantity,
            image: item.image
        })),
        payment: paymentData,
        subtotal: cart.getTotal(),
        shipping: calculateShipping(cart.getTotal()),
        total: orderTotal
    };
}

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EN${timestamp}${random}`;
}

// Save order to localStorage
function saveOrder(order) {
    // Do not persist orders in localStorage to avoid storing personal data client-side.
    // Consider persisting server-side if necessary.
}

// Show confirmation
function showConfirmation(order) {
    console.log('showConfirmation called with order:', order);
    // If confirmation elements are not present (page might not include the markup), create the confirmation block
    if (!document.getElementById('orderNumber') || !document.getElementById('confirmationEmail')) {
        const confirmationHtml = `
            <div class="checkout-step active" id="step3">
                <div class="confirmation-message aos-init aos-animate" data-aos="zoom-in">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2>Pedido Confirmado!</h2>
                    <p>Obrigado pela sua compra. O seu pedido foi recebido com sucesso.</p>
                    <div class="order-details">
                        <div class="order-number">
                            <strong>Número do Pedido:</strong>
                            <span id="orderNumber">#${order.orderNumber}</span>
                        </div>
                        <div class="order-shipping">
                            <h4>Morada de envio</h4>
                            <div>${formatShippingAddress(shippingData)}</div>
                        </div>
                        <div class="order-email">
                            <p>Enviámos um e-mail de confirmação para <strong id="confirmationEmail">${shippingData.email || ''}</strong></p>
                        </div>
                    </div>
                    <div class="confirmation-actions">
                        <a href="conta.html" class="btn btn-primary">Ver os Meus Pedidos</a>
                        <a href="livros.html" class="btn btn-secondary">Continuar Comprando</a>
                    </div>
                </div>
            </div>
        `;
        // append to the main container or body as a fallback
        const mainEl = document.querySelector('main') || document.body;
        mainEl.insertAdjacentHTML('beforeend', confirmationHtml);
    } else {
        document.getElementById('orderNumber').textContent = `#${order.orderNumber}`;
        document.getElementById('confirmationEmail').textContent = shippingData.email || '';
        // Add shipping address if there's a container for it
        const shippingContainer = document.getElementById('orderShippingAddress');
        if (shippingContainer) {
            shippingContainer.innerHTML = formatShippingAddress(shippingData);
        }
    }

    // Update transfer reference if needed
    if (paymentData.method === 'transfer') {
        const refEl = document.getElementById('transferReference');
        if (refEl) refEl.textContent = `EN-${order.orderNumber.slice(-5)}`;
    }

    // Advance to confirmation step
    // Directly activate step3 without using nextStep to avoid validation issues
    document.querySelectorAll('.checkout-step').forEach(step => step.classList.remove('active'));
    const step3 = document.getElementById('step3');
    if (step3) {
        step3.classList.add('active');
        step3.scrollIntoView({ behavior: 'smooth' });
    }
    currentStep = 3; // Update current step
    // Update progress if available
    try {
        document.querySelectorAll('.progress-step').forEach((ps, index) => {
            ps.classList.remove('active');
            if (index < 2) ps.classList.add('completed');
        });
        document.querySelectorAll('.progress-step')[2]?.classList.add('active');
    } catch (e) {
        console.warn('Could not update progress for confirmation', e);
    }
}

// Format shipping address for display
function formatShippingAddress(shipping) {
    if (!shipping) return 'Morada não disponível';

    let address = '';
    if (shipping.firstName) {
        address += `${shipping.firstName}<br>`;
    }
    if (shipping.address) {
        address += `${shipping.address}<br>`;
    }
    if (shipping.residenceType) {
        address += `Tipo: ${shipping.residenceType}<br>`;
    }
    if (shipping.residenceType === 'Apartamento' && shipping.floor) {
        address += `Andar: ${shipping.floor}<br>`;
    }
    if (shipping.doorNumber) {
        address += `Número da Porta: ${shipping.doorNumber}<br>`;
    }
    if (shipping.city || shipping.postalCode) {
        address += `${shipping.city || ''} ${shipping.postalCode || ''}<br>`;
    }
    address += 'Portugal';
    if (shipping.phone) {
        address += `<br>Telefone: ${shipping.phone}`;
    }
    if (shipping.notes) {
        address += `<br><br>Observações: ${shipping.notes}`;
    }

    return address || 'Morada não disponível';
}

// Only initialize payment logic on the payment page (or when a checkout form is present)
function isPagamentoPage() {
    try {
        if (document && document.body && document.body.classList) {
            if (document.body.classList.contains('page-pagamento')) return true;
        }
        // Also allow initialization if we have a checkout-form or an element with id 'step1'
        if (document.getElementById('shippingAddressDisplay') || document.querySelector('.checkout-form') || document.getElementById('processPaymentBtn')) return true;
        // Default: not payment page
        return false;
    } catch (e) { return false; }
}

function onDomReadyForPagamento() {
    // Remove stray shipping display elements on non-pagamento pages
    try {
        const el = document.getElementById('shippingAddressDisplay');
        if (el && !isPagamentoPage()) {
            el.remove();
            console.info('Removed stray #shippingAddressDisplay from non-pagamento page');
        }
    } catch (e) {}

    if (isPagamentoPage()) initPagamentoPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReadyForPagamento);
} else {
    onDomReadyForPagamento();
}
