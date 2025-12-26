// ==================================
// PAGAMENTO.JS - Payment processing functionality
// ==================================

let currentStep = 1;
let shippingData = {};
let paymentData = {};
let orderTotal = 0;
// in-memory user profile fetched from backend (avoid localStorage)
let userProfileCache = null;

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
        initCardFormatting();
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

    // Initialize form validation
    initFormValidation();

    // Pre-fill shipping data if user is logged in
    if (auth.isLoggedIn()) {
        console.debug('pagamento:initPagamentoPage - auth sessionToken=', auth.sessionToken, 'currentUser=', auth.getCurrentUser());
        await prefillShippingData(auth.getCurrentUser());
    }

    // Card inputs removed — Stripe Checkout will collect card data securely
    // initCardFormatting(); (no-op)

    // If redirected from Stripe Checkout success, confirm the session and show confirmation
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success' && params.get('session_id')) {
            const sessionId = params.get('session_id');
            // remove query params from URL to keep UI clean
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
            handleCheckoutSuccess(sessionId);
        }
    } catch (e) {
        console.warn('Error parsing URL params for checkout success', e);
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
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;
    
    orderTotal = total;
    
    // Update summary
    document.getElementById('summarySubtotal').textContent = `${subtotal.toFixed(2)}€`;
    document.getElementById('summaryShipping').textContent = `${shipping.toFixed(2)}€`;
    document.getElementById('summaryTotal').textContent = `${total.toFixed(2)}€`;
}

// Calculate shipping cost
function calculateShipping(subtotal) {
    // Free shipping over 50€
    if (subtotal >= 50) return 0;
    // Standard shipping 5€
    return 5.00;
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
    const postalCodeInput = document.getElementById('postalCode');
    if (postalCodeInput) {
        postalCodeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) {
                value = value.slice(0, 4) + '-' + value.slice(4, 7);
            }
            e.target.value = value;
        });
    }

    // Basic required field highlighting on blur
    const requiredFields = document.querySelectorAll('#shippingForm [required]');
    requiredFields.forEach(el => {
        el.addEventListener('blur', () => {
            if (!el.checkValidity()) el.classList.add('invalid'); else el.classList.remove('invalid');
        });
    });
}

// Pre-fill shipping data for logged-in users
async function prefillShippingData(user) {
    const auth = window.auth || new AuthSystem();
    let profileData = null;
    console.debug('pagamento:prefillShippingData start - user=', user, 'sessionToken=', auth.sessionToken);

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
            // If we have a user object (from auth) but no session token, try in-memory cache
            profileData = getUserProfileData(user.email) || userProfileCache;
        } else {
            profileData = userProfileCache;
        }
    } catch (e) {
        console.warn('Erro ao obter perfil do backend', e);
        profileData = userProfileCache || (user && user.email ? getUserProfileData(user.email) : null);
    }
    console.debug('pagamento:prefillShippingData - profileData=', profileData);

    if (profileData) {
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const phoneEl = document.getElementById('phone');
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const postalEl = document.getElementById('postalCode');
        const countryEl = document.getElementById('country');
        const emailEl = document.getElementById('email');

        if (firstNameEl) firstNameEl.value = profileData.firstName || '';
        if (lastNameEl) lastNameEl.value = profileData.lastName || '';
        if (phoneEl) phoneEl.value = profileData.phone || '';
        if (addressEl) addressEl.value = profileData.address || '';
        if (cityEl) cityEl.value = profileData.city || '';
        if (postalEl) postalEl.value = profileData.postalCode || '';
        if (countryEl) countryEl.value = profileData.country || 'PT';
        if (emailEl) emailEl.value = profileData.email || (user && user.email ? user.email : '');
        // update in-memory shippingData
        shippingData = {
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || (user && user.email ? user.email : ''),
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || '',
            postalCode: profileData.postalCode || '',
            country: profileData.country || 'PT',
            notes: ''
        };
    } else if (user && user.email) {
        const emailEl = document.getElementById('email');
        if (emailEl) emailEl.value = user.email;
        shippingData.email = user.email;
    }
    console.debug('pagamento:prefillShippingData end - shippingData=', shippingData);
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
        AOS.refresh();
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
        AOS.refresh();
    }
}

// Validate current step
function validateStep(step) {
    if (step === 1) {
        const form = document.getElementById('shippingForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        // Validate postal code format (Portugal)
        const postalCode = document.getElementById('postalCode').value;
        const postalCodePattern = /^\d{4}-\d{3}$/;
        if (!postalCodePattern.test(postalCode)) {
            alert('Por favor, insira um código postal válido (0000-000)');
            return false;
        }

        // If user is logged in, ensure shipping info matches user profile
        const auth = window.auth || new AuthSystem();
        if (auth.isLoggedIn()) {
                const profile = getUserProfileData(auth.getCurrentUser().email);
                if (profile) {
                    const fieldsToCheck = ['firstName', 'lastName', 'phone', 'address', 'postalCode'];
                    for (let f of fieldsToCheck) {
                        const formVal = (document.getElementById(f)?.value || '').toString().trim();
                        const profileVal = (profile[f] || '').toString().trim();
                        if (formVal !== profileVal) {
                            alert('Os dados de envio têm de corresponder aos detalhes do utilizador. Atualize o formulário ou o perfil antes de continuar.');
                            return false;
                        }
                    }
                } else {
                    alert('Não foram encontrados detalhes do utilizador. Atualize o seu perfil antes de continuar.');
                    return false;
                }
            } else {
            // Not logged in: prevent advancing and prompt login panel
            try { auth.toggleUserPanel(); } catch (e) { console.warn(e); }
            if (window.showNotification) window.showNotification('Precisa de iniciar sessão antes de realizar uma compra.', 'warning');
            return false;
        }
    }
    
    return true;
}

// Save shipping data
function saveShippingData() {
    shippingData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        postalCode: document.getElementById('postalCode').value,
        country: (document.getElementById('country') ? document.getElementById('country').value : 'PT'),
        notes: document.getElementById('notes').value
    };
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

    // Always use Stripe Checkout: create a session and redirect

    // Show loading
    const btn = event?.target || document.querySelector('.btn-primary.process-payment');
    const originalText = btn ? btn.innerHTML : null;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        btn.disabled = true;
    }

    // Handle real payment flows
    (async () => {
        try {
            const items = cart.items.map(i => ({ bookId: i.id, quantity: i.quantity }));
            // Create Checkout session on backend (Stripe will handle payment method selection)
            const resp = await fetch('http://localhost:8080/api/payments/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, successUrl: window.location.origin + window.location.pathname + '?checkout=success&session_id={CHECKOUT_SESSION_ID}', cancelUrl: window.location.href })
            });
            const data = await resp.json();
            if (resp.ok && data.url) {
                window.location.href = data.url;
                return;
            } else {
                throw new Error(data.error || 'Erro ao criar sessão de pagamento');
            }
        } catch (err) {
            console.error('Payment error', err);
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
            showConfirmation(order);
        } else {
            console.warn('Failed to confirm session', data);
        }
    } catch (e) {
        console.error('Error confirming checkout session', e);
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
                        <div class="order-email">
                            <p>Enviámos um e-mail de confirmação para <strong id="confirmationEmail">${shippingData.email || ''}</strong></p>
                        </div>
                    </div>
                    <div class="confirmation-actions">
                        <a href="conta.html" class="btn btn-primary">Ver Meus Pedidos</a>
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
    }

    // Update transfer reference if needed
    if (paymentData.method === 'transfer') {
        const refEl = document.getElementById('transferReference');
        if (refEl) refEl.textContent = `EN-${order.orderNumber.slice(-5)}`;
    }

    // Advance to confirmation step
    try { nextStep(3); } catch (e) { // if nextStep fails because progress UI isn't present, scroll to confirmation
        console.warn('nextStep failed showing confirmation, fallback to scroll', e);
        const step3 = document.getElementById('step3');
        if (step3) {
            step3.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('pagamento.html')) {
            initPagamentoPage();
        }
    });
} else {
    if (window.location.pathname.includes('pagamento.html')) {
        initPagamentoPage();
    }
}
