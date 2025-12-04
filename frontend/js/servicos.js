// ==================================
// SERVICOS.JS - Services page functionality
// ==================================

// Initialize services page
function initServicosPage() {
    initServiceContactForm();
}

// Initialize service contact form
function initServiceContactForm() {
    const form = document.getElementById('serviceContactForm');
    if (!form) return;

    form.addEventListener('submit', handleServiceContact);
}

// Handle service contact form submission
function handleServiceContact(e) {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    // Basic validation
    if (!name || !email || !message) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor, insira um email válido.', 'error');
        return;
    }

    // Simulate form submission (in a real app, this would send to a server)
    showNotification('Mensagem enviada com sucesso! Entraremos em contacto consigo em breve.', 'success');

    // Clear form
    document.getElementById('serviceContactForm').reset();
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('servicos.html')) {
            initServicosPage();
        }
    });
} else {
    if (window.location.pathname.includes('servicos.html')) {
        initServicosPage();
    }
}