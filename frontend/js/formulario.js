// ==================================
// FORMULARIO.JS - Publication form functionality
// ==================================

let currentFormStep = 1;
const totalSteps = 3;

// Phone input formatting functions
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

function validatePhoneInput(input) {
    const value = input.value.replace(/\D/g, '');
    // Portugal: 9 digits
    const isValid = value.length === 9;

    // Update input styling
    input.classList.toggle('invalid', !isValid && input.value.length > 0);
    input.classList.toggle('valid', isValid);

    return isValid;
}

// Initialize phone input formatting
function initPhoneInput() {
    const phoneInput = document.getElementById('authorPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            formatPhoneInput(e.target);
        });

        phoneInput.addEventListener('blur', (e) => {
            validatePhoneInput(e.target);
        });
    }
}

// Initialize form page
function initFormularioPage() {
    // Get plan from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPlan = urlParams.get('plano');
    
    if (selectedPlan) {
        const planInput = document.querySelector(`input[name="plan"][value="${selectedPlan}"]`);
        if (planInput) {
            planInput.checked = true;
        }
    }
    
    // Initialize form submission
    initFormSubmission();
    
    // Initialize plan selection highlighting
    initPlanSelection();

    // Load pricing from API
    loadPricing();

    // Initialize phone input formatting
    initPhoneInput();

    // Load reCAPTCHA script dynamically if site key provided
    const siteKeyMeta = document.querySelector('meta[name="recaptcha-site-key"]');
    const siteKey = siteKeyMeta ? siteKeyMeta.content : null;
        if (siteKey && !window.grecaptcha) {
            const script = document.createElement('script');
            const rk = encodeURIComponent(siteKey || 'explicit');
            script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=${rk}&hl=pt`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
}

// Ensure reCAPTCHA script is loaded and ready
function ensureRecaptchaLoaded(siteKey) {
    return new Promise((resolve, reject) => {
        if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
            grecaptcha.ready(resolve);
            return;
        }

        // Create script if not present
        const existing = document.querySelector(`script[src*="recaptcha/api.js"]`);
        if (existing) {
            const check = () => {
                if (window.grecaptcha && typeof grecaptcha.execute === 'function') return grecaptcha.ready(resolve);
                setTimeout(check, 50);
            };
            check();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit&hl=pt';
            const rk = encodeURIComponent(siteKey || 'explicit');
            script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=${rk}&hl=pt`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
                grecaptcha.ready(resolve);
            } else {
                // Wait a short while for grecaptcha to become available
                const wait = () => {
                    if (window.grecaptcha && typeof grecaptcha.execute === 'function') return grecaptcha.ready(resolve);
                    setTimeout(wait, 50);
                };
                wait();
            }
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
        document.head.appendChild(script);
    });
}

// Initialize plan selection visual feedback
function initPlanSelection() {
    const planOptions = document.querySelectorAll('.plan-option input[type="radio"]');
    
    planOptions.forEach(radio => {
        radio.addEventListener('change', function() {
            // Remove selected class from all options
            document.querySelectorAll('.plan-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to current option
            if (this.checked) {
                this.closest('.plan-option').classList.add('selected');
            }
        });
        
        // Set initial state if checked
        if (radio.checked) {
            radio.closest('.plan-option').classList.add('selected');
        }
    });
}

// Navigate to next form step
function nextFormStep(step) {
    // Validate current step
    if (!validateFormStep(currentFormStep)) {
        return;
    }
    
    // Hide current step
    document.getElementById(`step${currentFormStep}`).classList.remove('active');
    
    // Show next step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update progress
    updateProgress(step);
    
    // Update current step
    currentFormStep = step;
    
    // Scroll to top of form
    document.querySelector('.formulario-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Navigate to previous form step
function prevFormStep(step) {
    // Hide current step
    document.getElementById(`step${currentFormStep}`).classList.remove('active');
    
    // Show previous step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update progress
    updateProgress(step);
    
    // Update current step
    currentFormStep = step;
    
    // Scroll to top of form
    document.querySelector('.formulario-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update progress indicators
function updateProgress(step) {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');
    
    progressSteps.forEach((progressStep, index) => {
        const stepNum = index + 1;
        
        if (stepNum < step) {
            progressStep.classList.add('completed');
            progressStep.classList.remove('active');
        } else if (stepNum === step) {
            progressStep.classList.add('active');
            progressStep.classList.remove('completed');
        } else {
            progressStep.classList.remove('active', 'completed');
        }
    });
    
    progressLines.forEach((line, index) => {
        if (index < step - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
}

// Validate form step
function validateFormStep(step) {
    const stepElement = document.getElementById(`step${step}`);
    const requiredFields = stepElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        // Remove previous error styling
        field.classList.remove('error');
        
        if (field.type === 'radio') {
            // For radio buttons, check if any in the group is selected
            const radioGroup = stepElement.querySelectorAll(`input[name="${field.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            
            if (!isChecked) {
                isValid = false;
                let errorClass = '.plan-option'; // default for plan
                if (field.name === 'bookType') {
                    errorClass = '.book-type-option';
                    // Show error message for book type
                    const errorMsg = document.getElementById('bookTypeError');
                    if (errorMsg) errorMsg.style.display = 'block';
                }
                radioGroup.forEach(radio => {
                    const option = radio.closest(errorClass);
                    if (option) option.classList.add('error');
                });
                showNotification('Por favor, selecione uma opção.', 'error');
            } else {
                // Clear error if selected
                if (field.name === 'bookType') {
                    const errorMsg = document.getElementById('bookTypeError');
                    if (errorMsg) errorMsg.style.display = 'none';
                }
            }
        } else if (field.type === 'checkbox') {
            if (!field.checked) {
                isValid = false;
                // mark the visible checkbox element (label or checkmark) as error
                const label = field.closest('.checkbox-label');
                if (label) label.classList.add('error');
                showNotification('Por favor, aceite os termos para continuar.', 'error');
            }
        } else if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        }
    });
    
    if (!isValid && !document.querySelector('input[type="radio"].error, input[type="checkbox"].error')) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
    }
    
    return isValid;
}

// Initialize form submission
function initFormSubmission() {
    const form = document.getElementById('publicationForm');
    
    if (!form) return;
    
    // Add event listeners to clear errors on input
    const radioButtons = form.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Clear error class from options
            let errorClass = '.plan-option';
            if (this.name === 'bookType') {
                errorClass = '.book-type-option';
                // Hide error message
                const errorMsg = document.getElementById('bookTypeError');
                if (errorMsg) errorMsg.style.display = 'none';
            }
            const group = form.querySelectorAll(`input[name="${this.name}"]`);
            group.forEach(r => {
                const option = r.closest(errorClass);
                if (option) option.classList.remove('error');
            });
        });
    });

    // Clear checkbox error when user toggles it
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const label = this.closest('.checkbox-label');
            if (label) label.classList.remove('error');
        });
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate final step
        if (!validateFormStep(currentFormStep)) {
            return;
        }

        // Collect form data
        const formData = collectFormData();

        // Optimistic: disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('loading'); }
        // Show loader and hide previous warning
        const loader = document.getElementById('formLoader');
        const apiWarning = document.getElementById('apiWarning');
        if (apiWarning) { apiWarning.style.display = 'none'; apiWarning.classList.add('hidden'); }
        if (loader) { loader.style.display = 'flex'; loader.classList.remove('hidden'); }

        try {
            // Obtain reCAPTCHA token using the same pattern as `main.js`:
            // prefer `window.recaptchaSiteKey` (loaded at app init), fallback to meta tag.
            const siteKeyMeta = document.querySelector('meta[name="recaptcha-site-key"]');
            const configuredKey = window.recaptchaSiteKey || (siteKeyMeta ? siteKeyMeta.content : null);

            if (configuredKey) {
                try {
                    // Use safeRecaptchaExecute to avoid triggering PAT/private-token flows on iOS
                    if (typeof window.safeRecaptchaExecute === 'function') {
                        const token = await window.safeRecaptchaExecute(configuredKey, { action: 'submit_form' });
                        formData.recaptchaToken = token || '';
                    } else {
                        // Wait for grecaptcha to be ready (wrap callback in Promise)
                        await new Promise(resolve => grecaptcha.ready(resolve));
                        const token = await grecaptcha.execute(configuredKey, { action: 'submit_form' });
                        formData.recaptchaToken = token;
                    }
                } catch (rcErr) {
                    console.warn('reCAPTCHA execute failed:', rcErr);
                    formData.recaptchaToken = '';
                }

                // If a siteKey is configured but we failed to obtain a token, abort — v3 required
                if (window.recaptchaSiteKey && !formData.recaptchaToken) {
                    if (window.showNotification) window.showNotification('Erro reCAPTCHA. Tente novamente mais tarde.', 'error');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); }
                    if (loader) { loader.style.display = 'none'; loader.classList.add('hidden'); }
                    return;
                }
            } else {
                // No site key configured — leave token empty (dev/local mode)
                formData.recaptchaToken = '';
            }

            // Determine API base: if frontend served from a dev port different from backend (8080),
            // use localhost:8080 as backend during development. In production the same-origin path ('') will be used.
            const devHosts = ['localhost', '127.0.0.1'];
            const apiBase = window.API_BASE;

            const resp = await fetch(apiBase + '/api/public/form-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!resp.ok) {
                // If backend unreachable or rejects, show warning
                let msg = 'Erro ao submeter o formulário';
                try {
                    const err = await resp.json();
                    msg = err && err.message ? err.message : msg;
                } catch (e) { /* ignore parse errors */ }

                if (apiWarning) { apiWarning.style.display = 'block'; apiWarning.classList.remove('hidden'); }
                throw new Error(msg);
            }

            const saved = await resp.json();

            // Optionally keep a local copy
            saveFormSubmission(Object.assign({}, formData, { id: saved.id, submittedAt: saved.submittedAt }));

            // Show success message
            showSuccessMessage(formData);
        } catch (ex) {
            console.error('Form submission failed', ex);
            if (typeof showNotification === 'function') {
                showNotification('Ocorreu um erro ao enviar o pedido. Tente novamente mais tarde.', 'error');
            } else {
                alert('Ocorreu um erro ao enviar o pedido. Tente novamente mais tarde.');
            }
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); }
            if (loader) { loader.style.display = 'none'; loader.classList.add('hidden'); }
        }
    });
}

// Collect form data
function collectFormData() {
    const form = document.getElementById('publicationForm');
    const formData = new FormData(form);
    
    return {
        name: formData.get('authorName'),
        email: formData.get('authorEmail'),
        phone: formData.get('authorPhone').replace(/\D/g, ''), // Clean phone number
        message: formData.get('message') || '',
        plan: formData.get('plan'),
        bookTitle: formData.get('bookTitle'),
        bookGenre: formData.get('bookGenre'),
        wordCount: formData.get('wordCount'),
        manuscriptStatus: formData.get('manuscriptStatus'),
        bookType: formData.get('bookType'),
        bookSynopsis: formData.get('bookSynopsis'),
        additionalInfo: formData.get('additionalInfo'),
        privacyConsent: formData.get('privacyConsent') ? true : false
    };
}

// Save form submission to localStorage
function saveFormSubmission(data) {
    const submissions = JSON.parse(localStorage.getItem('publicationRequests') || '[]');
    data.id = Date.now();
    submissions.push(data);
    localStorage.setItem('publicationRequests', JSON.stringify(submissions));
}

// Show success message
function showSuccessMessage(data) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show success step
    document.getElementById('stepSuccess').classList.add('active');
    
    // Update progress to complete
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.add('completed');
        step.classList.remove('active');
    });
    document.querySelectorAll('.progress-line').forEach(line => {
        line.classList.add('completed');
    });
    
    // Populate summary
    const planNames = {
        essencial: 'Essencial (€199)',
        profissional: 'Profissional (€399)',
        premium: 'Premium (€699)'
    };
    
    const summary = document.getElementById('successSummary');
    const shownMessage = data.message && data.message.trim() ? data.message : (data.additionalInfo && data.additionalInfo.trim() ? data.additionalInfo : '(não fornecido)');
    summary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Plano:</span>
            <span class="summary-value">${planNames[data.plan] || data.plan}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Livro:</span>
            <span class="summary-value">${data.bookTitle || '(não fornecido)'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Email:</span>
            <span class="summary-value">${data.email || '(não fornecido)'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Mensagem:</span>
            <span class="summary-value">${shownMessage}</span>
        </div>
    `;
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification('Pedido enviado com sucesso!', 'success');
    }
    
    // Scroll to top
    document.querySelector('.formulario-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load service pricing from API
async function loadPricing() {
    try {
        const pricingData = await api.getServicePricing();
        updatePricing(pricingData);
    } catch (error) {
        console.warn('Erro ao carregar preços dos serviços:', error);
    }
}

// Update pricing in the DOM
function updatePricing(pricingData) {
    pricingData.forEach(pricing => {
        const planOption = document.querySelector(`input[name="plan"][value="${pricing.plano}"]`);
        if (planOption) {
            const priceSpan = planOption.closest('.plan-option').querySelector('.plan-option-price');
            if (priceSpan) {
                priceSpan.textContent = `€${pricing.precoAtual}`;
            }
        }
    });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('/formulario')) {
            initFormularioPage();
        }
    });
} else {
    if (window.location.pathname.includes('/formulario')) {
        initFormularioPage();
    }
}
