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

// Animation state to prevent multiple animations
let isAnimating = false;

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

// Setup option button listeners with real-time calculation
function initPriceCalculator() {
    // Show default state (50€ service base)
    showDefaultState();
    
    document.querySelectorAll('.calc-option-btn[data-cover]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.calc-option-btn[data-cover]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            priceCalcState.cover = this.dataset.cover;
            calculatePriceRealTime();
        });
    });

    document.querySelectorAll('.calc-option-btn[data-print]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.calc-option-btn[data-print]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            priceCalcState.print = this.dataset.print;
            calculatePriceRealTime();
        });
    });

    // Page count input with debounce
    const pageInput = document.getElementById('pageCount');
    if (pageInput) {
        let debounceTimer;
        pageInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const pages = parseInt(this.value);
                if (pages && !isNaN(pages)) {
                    priceCalcState.pages = pages;
                    calculatePriceRealTime();
                }
            }, 300);
        });
    }

    // Illustrations checkbox
    const illustrationsCheckbox = document.getElementById('hasIllustrations');
    if (illustrationsCheckbox) {
        illustrationsCheckbox.addEventListener('change', function() {
            priceCalcState.hasIllustrations = this.checked;
            calculatePriceRealTime();
        });
    }

    // Quantity input listener
    const qtyInput = document.getElementById('bookQuantity');
    if (qtyInput) {
        let debounceTimer;
        qtyInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 1;
            value = Math.max(1, Math.min(500, value));
            this.value = value;
            priceCalcState.quantity = value;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                calculatePriceRealTime();
            }, 300);
        });
    }
}

// Quantity adjustment with real-time update
function adjustQuantity(delta) {
    const input = document.getElementById('bookQuantity');
    if (!input) return;
    
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(500, value + delta));
    input.value = value;
    priceCalcState.quantity = value;
    
    calculatePriceRealTime();
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

// Show default state (50€ base)
function showDefaultState() {
    const breakdown = document.getElementById('priceBreakdown');
    const emptyState = document.getElementById('priceEmptyState');
    
    if (breakdown) breakdown.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Set default values
    const serviceTotalEl = document.getElementById('serviceTotal');
    const grandTotalEl = document.getElementById('grandTotal');
    
    if (serviceTotalEl) serviceTotalEl.textContent = '50,00€';
    if (grandTotalEl) grandTotalEl.textContent = '50,00€';
}

// Real-time calculation (no validation, just update if possible)
function calculatePriceRealTime() {
    const errorDiv = document.getElementById('calculatorError');
    if (errorDiv) errorDiv.style.display = 'none';

    const pages = priceCalcState.pages;
    const cover = priceCalcState.cover;
    const print = priceCalcState.print;
    const hasIllustrations = priceCalcState.hasIllustrations;
    const quantity = priceCalcState.quantity;

    // Calculate service cost (always available)
    const serviceCost = calculateServiceCost(pages || 0, hasIllustrations);
    
    // Calculate print cost only if all required fields are present
    let printCostPerBook = 0;
    let printCostTotal = 0;
    
    if (pages && cover && print) {
        const pageValidation = validatePageCount(pages, print);
        if (pageValidation.valid) {
            printCostPerBook = calculateKDPPrintingCost(pages, cover, print);
            printCostTotal = printCostPerBook * quantity;
        }
    }
    
    const grandTotal = serviceCost + printCostTotal;

    // Update UI with animation
    updatePriceSummaryAnimated(serviceCost, printCostPerBook, printCostTotal, grandTotal, quantity, pages, hasIllustrations);
}

// Main calculation function (for manual trigger via button)
function calculatePrice() {
// Animated counter function
function animateValue(element, start, end, duration = 800) {
    if (!element || isAnimating) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const animate = () => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = formatEUR(end);
            isAnimating = false;
            return;
        }
        element.textContent = formatEUR(current);
        requestAnimationFrame(animate);
    };
    
    isAnimating = true;
    animate();
}

// Get current numeric value from formatted EUR string
function getNumericValue(formattedString) {
    if (!formattedString) return 0;
    return parseFloat(formattedString.replace(',', '.').replace('€', '')) || 0;
}

function updatePriceSummaryAnimated(serviceCost, printCostPerBook, printCostTotal, grandTotal, quantity, pages, hasIllustrations) {
    // Show breakdown, hide empty state
    const breakdown = document.getElementById('priceBreakdown');
    const emptyState = document.getElementById('priceEmptyState');
    
    if (breakdown) breakdown.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Animate service costs
    const serviceTotalEl = document.getElementById('serviceTotal');
    if (serviceTotalEl && typeof gsap !== 'undefined') {
        const currentValue = getNumericValue(serviceTotalEl.textContent);
        if (currentValue !== serviceCost) {
            gsap.to(serviceTotalEl, {
                duration: 0.5,
                innerHTML: formatEUR(serviceCost),
                ease: 'power2.out',
                snap: { innerHTML: 1 },
                onUpdate: function() {
                    const progress = this.progress();
                    const value = currentValue + (serviceCost - currentValue) * progress;
                    serviceTotalEl.textContent = formatEUR(value);
                }
            });
        }
    } else if (serviceTotalEl) {
        serviceTotalEl.textContent = formatEUR(serviceCost);
    }

    // Show/hide extra service costs with animation
    const illustrationCost = document.getElementById('illustrationCost');
    const pagesCost300 = document.getElementById('pagesCost300');
    const pagesCost400 = document.getElementById('pagesCost400');
    const pagesCost500 = document.getElementById('pagesCost500');
    const pagesCost600 = document.getElementById('pagesCost600');

    const animateItem = (element, shouldShow) => {
        if (!element) return;
        
        if (shouldShow && element.style.display === 'none') {
            element.style.display = 'flex';
            if (typeof gsap !== 'undefined') {
                gsap.from(element, {
                    duration: 0.4,
                    opacity: 0,
                    x: -20,
                    ease: 'back.out(1.7)'
                });
            }
        } else if (!shouldShow && element.style.display !== 'none') {
            if (typeof gsap !== 'undefined') {
                gsap.to(element, {
                    duration: 0.3,
                    opacity: 0,
                    x: -20,
                    ease: 'power2.in',
                    onComplete: () => {
                        element.style.display = 'none';
                        gsap.set(element, { opacity: 1, x: 0 });
                    }
                });
            } else {
                element.style.display = 'none';
            }
        }
    };

    animateItem(illustrationCost, hasIllustrations);
    animateItem(pagesCost300, pages > 300);
    animateItem(pagesCost400, pages > 400);
    animateItem(pagesCost500, pages > 500);
    animateItem(pagesCost600, pages > 600);

    // Update printing costs with animation
    const printCostPerBookEl = document.getElementById('printCostPerBook');
    const quantityDisplayEl = document.getElementById('quantityDisplay');
    const printCostTotalEl = document.getElementById('printCostTotal');

    if (printCostPerBookEl) {
        const currentValue = getNumericValue(printCostPerBookEl.textContent);
        if (currentValue !== printCostPerBook && typeof gsap !== 'undefined') {
            gsap.to(printCostPerBookEl, {
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: function() {
                    const progress = this.progress();
                    const value = currentValue + (printCostPerBook - currentValue) * progress;
                    printCostPerBookEl.textContent = formatEUR(value);
                }
            });
        } else {
            printCostPerBookEl.textContent = formatEUR(printCostPerBook);
        }
    }
    
    if (quantityDisplayEl) quantityDisplayEl.textContent = quantity;
    
    if (printCostTotalEl) {
        const currentValue = getNumericValue(printCostTotalEl.textContent);
        if (currentValue !== printCostTotal && typeof gsap !== 'undefined') {
            gsap.to(printCostTotalEl, {
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: function() {
                    const progress = this.progress();
                    const value = currentValue + (printCostTotal - currentValue) * progress;
                    printCostTotalEl.textContent = formatEUR(value);
                }
            });
        } else {
            printCostTotalEl.textContent = formatEUR(printCostTotal);
        }
    }

    // Animate grand total with special effect
    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) {
        const currentValue = getNumericValue(grandTotalEl.textContent);
        if (currentValue !== grandTotal && typeof gsap !== 'undefined') {
            gsap.to(grandTotalEl, {
                duration: 0.8,
                ease: 'elastic.out(1, 0.5)',
                scale: 1.1,
                onUpdate: function() {
                    const progress = this.progress();
                    const value = currentValue + (grandTotal - currentValue) * progress;
                    grandTotalEl.textContent = formatEUR(value);
                },
                onComplete: function() {
                    gsap.to(grandTotalEl, {
                        duration: 0.3,
                        scale: 1,
                        ease: 'power2.out'
                    });
                }
            });
        } else if (currentValue !== grandTotal) {
            grandTotalEl.textContent = formatEUR(grandTotal);
        }
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
}

// Expose functions globally
window.calculatePrice = calculatePrice;
window.adjustQuantity = adjustQuantity;
