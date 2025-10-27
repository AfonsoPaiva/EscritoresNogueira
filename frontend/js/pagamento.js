// ==================================
// PAGAMENTO.JS - Payment processing functionality
// ==================================

let currentStep = 1;
let shippingData = {};
let paymentData = {};
let orderTotal = 0;

// Initialize payment page
function initPagamentoPage() {
    // Check if user is logged in
    const auth = window.auth || new AuthSystem();
    
    // Load cart items
    loadOrderSummary();
    
    // Initialize payment method selection
    initPaymentMethods();
    
    // Initialize form validation
    initFormValidation();
    
    // Pre-fill shipping data if user is logged in
    if (auth.isLoggedIn()) {
        prefillShippingData(auth.getCurrentUser());
    }
    
    // Format card input fields
    initCardFormatting();
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

// Pre-fill shipping data for logged-in users
function prefillShippingData(user) {
    const profileData = getUserProfileData(user.email);
    
    if (profileData) {
        document.getElementById('firstName').value = profileData.firstName || '';
        document.getElementById('lastName').value = profileData.lastName || '';
        document.getElementById('phone').value = profileData.phone || '';
        document.getElementById('address').value = profileData.address || '';
        document.getElementById('city').value = profileData.city || '';
        document.getElementById('postalCode').value = profileData.postalCode || '';
        document.getElementById('country').value = profileData.country || 'PT';
    }
    
    document.getElementById('email').value = user.email;
}

// Get user profile data
function getUserProfileData(email) {
    const profileKey = `user_profile_${email}`;
    const profileData = localStorage.getItem(profileKey);
    return profileData ? JSON.parse(profileData) : null;
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
        country: document.getElementById('country').value,
        notes: document.getElementById('notes').value
    };
}

// Process payment
function processPayment() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Validate payment method
    if (!validatePaymentMethod(selectedMethod)) {
        return;
    }
    
    // Save payment data
    savePaymentData(selectedMethod);
    
    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    btn.disabled = true;
    
    // Simulate payment processing
    setTimeout(() => {
        // Create order
        const order = createOrder();
        
        // Save order to localStorage
        saveOrder(order);
        
        // Clear cart
        const cart = window.cart || new ShoppingCart();
        cart.clearCart();
        
        // Show confirmation
        showConfirmation(order);
        
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Validate payment method
function validatePaymentMethod(method) {
    if (method === 'card') {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const cardName = document.getElementById('cardName').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCvv = document.getElementById('cardCvv').value;
        
        if (!cardNumber || cardNumber.length < 15) {
            alert('Por favor, insira um número de cartão válido');
            return false;
        }
        
        if (!cardName) {
            alert('Por favor, insira o nome no cartão');
            return false;
        }
        
        if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
            alert('Por favor, insira a validade no formato MM/AA');
            return false;
        }
        
        if (!cardCvv || cardCvv.length < 3) {
            alert('Por favor, insira o CVV válido');
            return false;
        }
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
    
    if (method === 'card') {
        const cardNumber = document.getElementById('cardNumber').value;
        paymentData.cardLast4 = cardNumber.slice(-4);
    } else if (method === 'mbway') {
        paymentData.phone = document.getElementById('mbwayPhone').value;
    }
}

// Create order object
function createOrder() {
    const cart = window.cart || new ShoppingCart();
    const orderNumber = generateOrderNumber();
    
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
    const email = shippingData.email;
    const ordersKey = `user_orders_${email}`;
    
    let orders = localStorage.getItem(ordersKey);
    orders = orders ? JSON.parse(orders) : [];
    orders.unshift(order);
    
    localStorage.setItem(ordersKey, JSON.stringify(orders));
}

// Show confirmation
function showConfirmation(order) {
    document.getElementById('orderNumber').textContent = `#${order.orderNumber}`;
    document.getElementById('confirmationEmail').textContent = shippingData.email;
    
    // Update transfer reference if needed
    if (paymentData.method === 'transfer') {
        document.getElementById('transferReference').textContent = `EN-${order.orderNumber.slice(-5)}`;
    }
    
    nextStep(3);
}

// Initialize form validation
function initFormValidation() {
    // Postal code formatting
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
}

// Initialize card formatting
function initCardFormatting() {
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCvvInput = document.getElementById('cardCvv');
    const mbwayPhoneInput = document.getElementById('mbwayPhone');
    
    // Card number formatting
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Card expiry formatting
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // CVV - numbers only
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // MB WAY phone - numbers only
    if (mbwayPhoneInput) {
        mbwayPhoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
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
