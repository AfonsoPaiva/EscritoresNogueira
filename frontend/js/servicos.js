// ==================================
// SERVICOS.JS - Services page functionality
// ==================================

// Initialize services page
function initServicosPage() {
    initServiceContactForm();
    loadServicePricing();
}

// Load service pricing from API
async function loadServicePricing() {
    try {
        const apiBase = window.API_BASE || 'http://localhost:8080/api';
        const response = await fetch(`${apiBase}/public/servicos-precos`);
        if (!response.ok) {
            console.warn('Não foi possível carregar preços dinâmicos, usando valores padrão');
            return;
        }

        const pricingData = await response.json();
        updateServicePricing(pricingData);
    } catch (error) {
        console.warn('Erro ao carregar preços dos serviços:', error);
    }
}

// Update service pricing in the DOM
function updateServicePricing(pricingData) {
    console.log('Updating pricing:', pricingData);
    pricingData.forEach(pricing => {
        console.log('Processing plan:', pricing.plano, 'emPromocao:', pricing.emPromocao);
        // Find the plan card - try multiple selectors
        let planCard = document.querySelector(`[data-plano="${pricing.plano}"]`);
        if (!planCard) {
            // Fallback: try to find by content
            const planTitles = document.querySelectorAll('h3');
            for (const title of planTitles) {
                if (title.textContent.toLowerCase().includes(getPlanTitle(pricing.plano).toLowerCase())) {
                    planCard = title.closest('.plan-card, .plan-card-new, .pricing-card, .service-card');
                    break;
                }
            }
        }

        if (planCard) {
            console.log('Found plan card for:', pricing.plano);
            // Handle promotions first
            if (pricing.emPromocao && pricing.precoAntigo && pricing.descontoPercentagem) {
                console.log('Creating promotion for:', pricing.plano);
                // Remove existing promotion elements to avoid duplicates
                const existingOldPrice = planCard.querySelector('.old-price');
                const existingDiscountBadge = planCard.querySelector('.discount-badge');
                const existingPromoDesc = planCard.querySelector('.promotion-description');

                if (existingOldPrice) existingOldPrice.remove();
                if (existingDiscountBadge) existingDiscountBadge.remove();
                if (existingPromoDesc) existingPromoDesc.remove();

                // Create promotion container if it doesn't exist
                let promoContainer = planCard.querySelector('.promotion-container');
                if (!promoContainer) {
                    promoContainer = document.createElement('div');
                    promoContainer.className = 'promotion-container';
                    // Insert at the top of the card
                    if (planCard.firstChild) {
                        planCard.insertBefore(promoContainer, planCard.firstChild);
                    } else {
                        planCard.appendChild(promoContainer);
                    }
                }

                // Add discount badge
                const discountBadge = document.createElement('div');
                discountBadge.className = 'discount-badge';
                discountBadge.textContent = `${pricing.descontoPercentagem}% desconto`;
                promoContainer.appendChild(discountBadge);
                console.log('Added discount badge');

                // Add promotion description if available (as a side box)
                if (pricing.descricaoPromocao && pricing.descricaoPromocao.trim()) {
                    const promoDesc = document.createElement('div');
                    promoDesc.className = 'promotion-description';
                    promoDesc.textContent = pricing.descricaoPromocao;
                    // Insert after the plan header
                    const planHeader = planCard.querySelector('.plan-header-new');
                    if (planHeader) {
                        planHeader.appendChild(promoDesc);
                    }
                    console.log('Added promotion description');
                }
            } else {
                // Remove promotion elements if not in promotion
                const promoContainer = planCard.querySelector('.promotion-container');
                if (promoContainer) {
                    promoContainer.remove();
                }
                const promoDesc = planCard.querySelector('.promotion-description');
                if (promoDesc) {
                    promoDesc.remove();
                }
            }

            // Find price elements
            let amountSpan = planCard.querySelector('.amount');
            let currencySpan = planCard.querySelector('.currency');
            let planPriceDiv = planCard.querySelector('.plan-price, .plan-price-new, .price-container');

            // If no specific elements found, try to find any element containing prices
            if (!amountSpan) {
                const priceElements = planCard.querySelectorAll('*');
                for (const el of priceElements) {
                    if (el.textContent && el.textContent.includes('€')) {
                        amountSpan = el;
                        break;
                    }
                }
            }

            // Update current price
            if (amountSpan) {
                amountSpan.textContent = pricing.precoAtual;
            }

            // Always use the new price structure for consistency
            if (planPriceDiv) {
                planPriceDiv.innerHTML = '';

                // Create container for the price
                const priceContainer = document.createElement('div');
                priceContainer.className = 'plan-price-new';

                // Check if in promotion
                if (pricing.emPromocao && pricing.precoAntigo && pricing.descontoPercentagem) {
                    // Add new price (highlighted and larger)
                    const newPriceContainer = document.createElement('div');
                    newPriceContainer.className = 'price-new';
                    newPriceContainer.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAtual}</span>`;
                    priceContainer.appendChild(newPriceContainer);

                    // Add old price (crossed out)
                    const oldPriceContainer = document.createElement('div');
                    oldPriceContainer.className = 'price-old';
                    oldPriceContainer.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAntigo}</span>`;
                    priceContainer.appendChild(oldPriceContainer);
                } else {
                    // Add current price (highlighted)
                    const currentPriceContainer = document.createElement('div');
                    currentPriceContainer.className = 'price-new';
                    currentPriceContainer.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAtual}</span>`;
                    priceContainer.appendChild(currentPriceContainer);
                }

                planPriceDiv.appendChild(priceContainer);
            } else if (amountSpan) {
                // Fallback: modify the existing amount span
                const priceContainer = amountSpan.parentElement;
                if (priceContainer) {
                    // Create new price structure
                    const newPriceStructure = document.createElement('div');
                    newPriceStructure.className = 'plan-price-new';

                    if (pricing.emPromocao && pricing.precoAntigo && pricing.descontoPercentagem) {
                        // Add old price
                        const oldPriceSpan = document.createElement('div');
                        oldPriceSpan.className = 'price-old';
                        oldPriceSpan.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAntigo}</span>`;
                        newPriceStructure.appendChild(oldPriceSpan);

                        // Add new price
                        const newPriceSpan = document.createElement('div');
                        newPriceSpan.className = 'price-new';
                        newPriceSpan.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAtual}</span>`;
                        newPriceStructure.appendChild(newPriceSpan);
                    } else {
                        // Add current price
                        const currentPriceSpan = document.createElement('div');
                        currentPriceSpan.className = 'price-new';
                        currentPriceSpan.innerHTML = `<span class="currency">€</span><span class="amount">${pricing.precoAtual}</span>`;
                        newPriceStructure.appendChild(currentPriceSpan);
                    }

                    // Replace existing price with new structure
                    priceContainer.innerHTML = '';
                    priceContainer.appendChild(newPriceStructure);
                }
            }
        } else {
            console.log('Plan card not found for:', pricing.plano);
        }
    });
}

// Helper function to get plan title from plano code
function getPlanTitle(plano) {
    switch (plano) {
        case 'essencial': return 'Essencial';
        case 'profissional': return 'Profissional';
        case 'premium': return 'Premium';
        default: return plano;
    }
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
        if (window.location.pathname.includes('/servicos')) {
            initServicosPage();
        }
    });
} else {
    if (window.location.pathname.includes('/servicos')) {
        initServicosPage();
    }
}