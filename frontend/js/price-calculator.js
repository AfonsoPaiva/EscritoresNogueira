// ========================================
// PRICE CALCULATOR JAVASCRIPT
// ========================================

// Calculator state
let priceCalcState = {
    pages: null,
    cover: null,
    print: null,
    hasIllustrations: false,
    quantity: 1
};

// Amazon KDP Printing Cost Calculator (Spain marketplace)
// Based on: https://kdp.amazon.com/en_US/help/topic/G201834330
function calculateKDPPrintingCost(pages, coverType, printType) {
    // Fixed costs and per-page costs (in EUR for Spain)
    let fixedCost = 0;
    let costPerPage = 0;

    // Paperback (Capa Mole)
    if (coverType === 'mole') {
        if (printType === 'pb') {
            // Black & White Paperback
            fixedCost = 0.70;
            costPerPage = 0.012;
        } else {
            // Color Paperback
            fixedCost = 0.85;
            costPerPage = 0.06;
        }
    }
    // Hardcover (Capa Dura)
    else if (coverType === 'dura') {
        if (printType === 'pb') {
            // Black & White Hardcover
            fixedCost = 3.50;
            costPerPage = 0.012;
        } else {
            // Color Hardcover
            fixedCost = 4.25;
            costPerPage = 0.06;
        }
    }

    const totalCost = fixedCost + (pages * costPerPage);
    return totalCost;
}

// Validate page limits
function validatePageCount(pages, printType) {
    const minPages = 24;
    const maxPagesPB = 828;
    const maxPagesColor = 550;

    if (pages < minPages) {
        return { valid: false, message: `O número mínimo de páginas é ${minPages}.` };
    }

    if (printType === 'pb' && pages > maxPagesPB) {
        return { valid: false, message: `Para impressão P&B, o máximo é ${maxPagesPB} páginas.` };
    }

    if (printType === 'cores' && pages > maxPagesColor) {
        return { valid: false, message: `Para impressão a cores, o máximo é ${maxPagesColor} páginas.` };
    }

    return { valid: true };
}

// Calculate service cost based on pages and illustrations
function calculateServiceCost(pages, hasIllustrations) {
    let cost = 50; // Base cost

    if (hasIllustrations) {
        cost += 75;
    }

    // Extra costs based on page count
    if (pages > 300) {
        cost += 20;
    }
    if (pages > 400) {
        cost += 50;
    }
    if (pages > 500) {
        cost += 50;
    }
    if (pages > 600) {
        cost += 50;
    }

    return cost;
}

// Format currency
function formatEUR(amount) {
    return amount.toFixed(2).replace('.', ',') + '€';
}

// Setup option button listeners
function initPriceCalculator() {
    document.querySelectorAll('.calc-option-btn[data-cover]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.calc-option-btn[data-cover]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            priceCalcState.cover = this.dataset.cover;
        });
    });

    document.querySelectorAll('.calc-option-btn[data-print]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.calc-option-btn[data-print]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            priceCalcState.print = this.dataset.print;
        });
    });

    // Quantity input listener
    const qtyInput = document.getElementById('bookQuantity');
    if (qtyInput) {
        qtyInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 1;
            value = Math.max(1, Math.min(500, value));
            this.value = value;
            priceCalcState.quantity = value;
        });
    }
}

// Quantity adjustment
function adjustQuantity(delta) {
    const input = document.getElementById('bookQuantity');
    if (!input) return;
    
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(500, value + delta));
    input.value = value;
    priceCalcState.quantity = value;
}

// Show error
function showPriceError(message) {
    const errorDiv = document.getElementById('calculatorError');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!errorDiv || !errorMessage) return;
    
    errorMessage.textContent = message;
    errorDiv.style.display = 'flex';
    
    // Animate with GSAP if available
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(errorDiv, 
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv) errorDiv.style.display = 'none';
    }, 5000);
}

// Main calculation function
function calculatePrice() {
    const errorDiv = document.getElementById('calculatorError');
    if (errorDiv) errorDiv.style.display = 'none';

    // Get values
    const pageInput = document.getElementById('pageCount');
    const pages = parseInt(pageInput?.value);
    const cover = priceCalcState.cover;
    const print = priceCalcState.print;
    const hasIllustrations = document.getElementById('hasIllustrations')?.checked || false;
    const quantity = parseInt(document.getElementById('bookQuantity')?.value) || 1;

    // Validate
    if (!pages || isNaN(pages)) {
        showPriceError('Por favor, insira o número de páginas do livro.');
        pageInput?.focus();
        return;
    }

    if (!cover) {
        showPriceError('Por favor, selecione o tipo de capa.');
        return;
    }

    if (!print) {
        showPriceError('Por favor, selecione o tipo de impressão.');
        return;
    }

    // Validate page count
    const pageValidation = validatePageCount(pages, print);
    if (!pageValidation.valid) {
        showPriceError(pageValidation.message);
        pageInput?.focus();
        return;
    }

    // Calculate costs
    const serviceCost = calculateServiceCost(pages, hasIllustrations);
    const printCostPerBook = calculateKDPPrintingCost(pages, cover, print);
    const printCostTotal = printCostPerBook * quantity;
    const grandTotal = serviceCost + printCostTotal;

    // Update UI
    updatePriceSummary(serviceCost, printCostPerBook, printCostTotal, grandTotal, quantity, pages, hasIllustrations);
}

function updatePriceSummary(serviceCost, printCostPerBook, printCostTotal, grandTotal, quantity, pages, hasIllustrations) {
    // Show breakdown, hide empty state
    const breakdown = document.getElementById('priceBreakdown');
    const emptyState = document.getElementById('priceEmptyState');
    
    if (breakdown) breakdown.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Update service costs
    const serviceTotalEl = document.getElementById('serviceTotal');
    if (serviceTotalEl) serviceTotalEl.textContent = formatEUR(serviceCost);

    // Show/hide extra service costs
    const illustrationCost = document.getElementById('illustrationCost');
    const pagesCost300 = document.getElementById('pagesCost300');
    const pagesCost400 = document.getElementById('pagesCost400');
    const pagesCost500 = document.getElementById('pagesCost500');
    const pagesCost600 = document.getElementById('pagesCost600');

    if (illustrationCost) illustrationCost.style.display = hasIllustrations ? 'flex' : 'none';
    if (pagesCost300) pagesCost300.style.display = pages > 300 ? 'flex' : 'none';
    if (pagesCost400) pagesCost400.style.display = pages > 400 ? 'flex' : 'none';
    if (pagesCost500) pagesCost500.style.display = pages > 500 ? 'flex' : 'none';
    if (pagesCost600) pagesCost600.style.display = pages > 600 ? 'flex' : 'none';

    // Update printing costs
    const printCostPerBookEl = document.getElementById('printCostPerBook');
    const quantityDisplayEl = document.getElementById('quantityDisplay');
    const printCostTotalEl = document.getElementById('printCostTotal');

    if (printCostPerBookEl) printCostPerBookEl.textContent = formatEUR(printCostPerBook);
    if (quantityDisplayEl) quantityDisplayEl.textContent = quantity;
    if (printCostTotalEl) printCostTotalEl.textContent = formatEUR(printCostTotal);

    // Update grand total
    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) grandTotalEl.textContent = formatEUR(grandTotal);

    // Animate if GSAP available
    if (typeof gsap !== 'undefined' && breakdown) {
        gsap.fromTo(breakdown, 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        
        if (grandTotalEl) {
            gsap.fromTo(grandTotalEl, 
                { scale: 0.9 },
                { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
            );
        }
    }

    // Scroll to summary
    const summary = document.querySelector('.price-summary');
    if (summary) {
        summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('/servicos')) {
            initPriceCalculator();
        }
    });
} else {
    if (window.location.pathname.includes('/servicos')) {
        initPriceCalculator();
    }
}

// Expose functions globally
window.calculatePrice = calculatePrice;
window.adjustQuantity = adjustQuantity;
