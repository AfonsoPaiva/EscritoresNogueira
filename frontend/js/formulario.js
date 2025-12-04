// ==================================
// FORMULARIO.JS - Publication form functionality
// ==================================

let currentFormStep = 1;
const totalSteps = 3;

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
                radioGroup.forEach(radio => {
                    radio.closest('.plan-option').classList.add('error');
                });
                showNotification('Por favor, selecione um plano.', 'error');
            }
        } else if (field.type === 'checkbox') {
            if (!field.checked) {
                isValid = false;
                field.classList.add('error');
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
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate final step
        if (!validateFormStep(currentFormStep)) {
            return;
        }
        
        // Collect form data
        const formData = collectFormData();
        
        // Save to localStorage (in a real app, this would send to a server)
        saveFormSubmission(formData);
        
        // Show success message
        showSuccessMessage(formData);
    });
}

// Collect form data
function collectFormData() {
    const form = document.getElementById('publicationForm');
    const formData = new FormData(form);
    
    return {
        plan: formData.get('plan'),
        bookTitle: formData.get('bookTitle'),
        bookGenre: formData.get('bookGenre'),
        wordCount: formData.get('wordCount'),
        manuscriptStatus: formData.get('manuscriptStatus'),
        bookSynopsis: formData.get('bookSynopsis'),
        additionalInfo: formData.get('additionalInfo'),
        authorName: formData.get('authorName'),
        authorEmail: formData.get('authorEmail'),
        authorPhone: formData.get('authorPhone'),
        preferredContact: formData.get('preferredContact'),
        newsletterConsent: formData.get('newsletterConsent') === 'on',
        submittedAt: new Date().toISOString(),
        status: 'pending'
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
    summary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Plano:</span>
            <span class="summary-value">${planNames[data.plan] || data.plan}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Livro:</span>
            <span class="summary-value">${data.bookTitle}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Email:</span>
            <span class="summary-value">${data.authorEmail}</span>
        </div>
    `;
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification('Pedido enviado com sucesso!', 'success');
    }
    
    // Scroll to top
    document.querySelector('.formulario-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('formulario.html')) {
            initFormularioPage();
        }
    });
} else {
    if (window.location.pathname.includes('formulario.html')) {
        initFormularioPage();
    }
}
