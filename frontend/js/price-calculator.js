// ========================================
// PRICE CALCULATOR JAVASCRIPT - SLIDE VERSION
// ========================================

// Calculator state
let calcState = {
    currentSlide: 1,
    totalSlides: 7,
    answers: {
        print: null,
        cover: null,
        bookSize: null,
        pages: null, // valor exibido ao usuário
        rawPages: null, // valor digitado pelo usuário
        illustrations: false,
        quantity: 1
    }
};

// Amazon KDP Printing Cost Calculator (Spain marketplace)
function calculateKDPPrintingCost(pages, coverType, printType, bookSize) {
    const fixedCost = coverType === 'mole' ? 0.85 : 4.30;
    let pageCost = 0;

    if (printType === 'pb') {
        pageCost = pages * 0.012;
    } else {
        pageCost = pages * 0.06;
    }

    // Additional cost for larger sizes
    const largerSizes = ['7x10', '7.44x9.69', '8x10', '8.5x11'];
    if (largerSizes.includes(bookSize)) {
        pageCost *= 1.4;
    }

    return fixedCost + pageCost;
}

// Validate page limits
function validatePageCount(pages, printType, coverType, hasIllustrations) {
    // Minimum 24 pages if has illustrations
    if (hasIllustrations && pages < 24) {
        return { valid: false, message: 'Livros com ilustrações requerem no mínimo 24 páginas' };
    }
    
    if (coverType === 'dura') {
        if (pages < 75) return { valid: false, message: 'Capa dura requer no mínimo 75 páginas' };
        if (pages > 550) return { valid: false, message: 'Capa dura permite no máximo 550 páginas' };
    } else {
        if (printType === 'pb') {
            if (pages < 24) return { valid: false, message: 'Capa mole P&B requer no mínimo 24 páginas' };
            if (pages > 828) return { valid: false, message: 'Capa mole P&B permite no máximo 828 páginas' };
        } else {
            if (pages < 24) return { valid: false, message: 'Capa mole a cores requer no mínimo 24 páginas' };
            if (pages > 550) return { valid: false, message: 'Capa mole a cores permite no máximo 550 páginas' };
        }
    }
    return { valid: true };
}

// Calculate service cost
function calculateServiceCost(pages, hasIllustrations) {
    let cost = 50;

    if (hasIllustrations) {
        cost += 75;
    }

    if (pages > 300) cost += 20;
    if (pages > 400) cost += 50;
    if (pages > 500) cost += 50;
    if (pages > 600) cost += 50;

    return cost;
}

// Format currency
function formatEUR(amount) {
    return amount.toFixed(2).replace('.', ',') + '€';
}

// Show error notification
function showError(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification error-notification';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Animate in
    gsap.fromTo(notification, 
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.3 }
    );
    
    // Remove after 4 seconds
    setTimeout(() => {
        gsap.to(notification, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => notification.remove()
        });
    }, 4000);
}

// Initialize calculator
function initPriceCalculator() {
    if (!document.querySelector('.price-calculator-slides')) return;

    // Load GSAP if needed
    ensureGSAP().then(() => {
        setupSlideNavigation();
        setupOptionButtons();
        setupInputFields();
        updateProgressImmediate(); // Initialize progress immediately
        updateBackButton();
        adjustNavigationPosition(); // Set initial position
    });
}

// Ensure GSAP is loaded
function ensureGSAP() {
    return new Promise((resolve) => {
        if (window.gsap && window.ScrollTrigger) {
            resolve();
        } else {
            // Wait a bit for GSAP to load from main.js
            const checkGSAP = setInterval(() => {
                if (window.gsap && window.ScrollTrigger) {
                    clearInterval(checkGSAP);
                    resolve();
                }
            }, 100);
        }
    });
}

// Setup slide navigation
function setupSlideNavigation() {
    const backBtn = document.getElementById('navBackBtn');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (calcState.currentSlide > 1) {
                goToSlide(calcState.currentSlide - 1);
            }
        });
    }
}

// Setup option buttons
function setupOptionButtons() {
    const optionButtons = document.querySelectorAll('.slide-option-btn');
    
    optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const answer = btn.dataset.answer;
            
            // Update state
            if (field === 'illustrations') {
                calcState.answers.illustrations = answer === 'true';
            } else {
                calcState.answers[field] = answer;
            }
            
            // Visual feedback with smooth animation
            const siblings = btn.parentElement.querySelectorAll('.slide-option-btn');
            
            // Deselect siblings with fade animation
            siblings.forEach(s => {
                if (s !== btn) {
                    s.classList.remove('selected');
                    gsap.to(s, {
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                }
            });
            
            // Select and animate clicked button
            btn.classList.add('selected');
            
            // Quick pulse animation
            gsap.to(btn, {
                scale: 1.05,
                duration: 0.15,
                ease: 'back.out(2)',
                yoyo: true,
                repeat: 1
            });
            
            // Auto-advance after short delay
            setTimeout(() => {
                advanceToNextSlide();
                showBackButton();
            }, 350);
        });
    });
}

// Setup input fields
function setupInputFields() {
    // Book size cards
    const sizeCards = document.querySelectorAll('.book-size-card');
    
    sizeCards.forEach(card => {
        card.addEventListener('click', () => {
            const size = card.dataset.size;
            const hardcoverSupported = card.dataset.hardcover === 'true';
            
            // Check if valid for current cover type
            if (calcState.answers.cover === 'dura' && !hardcoverSupported) {
                showError('Este tamanho não está disponível para capa dura. Por favor, escolha outro tamanho.');
                return;
            }
            
            calcState.answers.bookSize = size;
            
            // Visual feedback with smooth animations
            sizeCards.forEach(c => {
                if (c !== card) {
                    c.classList.remove('selected');
                    gsap.to(c, {
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                }
            });
            
            card.classList.add('selected');
            
            // Quick pulse animation for selected card
            gsap.to(card, {
                scale: 1.05,
                duration: 0.15,
                ease: 'back.out(2)',
                yoyo: true,
                repeat: 1
            });
            
            // Auto-advance after short delay
            setTimeout(() => {
                advanceToNextSlide();
                showBackButton();
            }, 350);
        });
    });
    
    // Pages input - mostrar exatamente o valor do usuário, mas adicionar 4 páginas extras só no cálculo
    const pagesInput = document.getElementById('pageCountSlide');
    const pagesNextBtn = document.getElementById('pagesNextBtn');

    if (pagesInput && pagesNextBtn) {
        pagesInput.addEventListener('input', () => {
            let rawPages = parseInt(pagesInput.value);
            if (rawPages) {
                // Exibe exatamente o valor digitado
                calcState.answers.rawPages = rawPages;
                calcState.answers.pages = rawPages;
            } else {
                calcState.answers.rawPages = null;
                calcState.answers.pages = null;
            }

            // Validação (usa o valor digitado)
            if (rawPages && calcState.answers.cover && calcState.answers.print) {
                const validation = validatePageCount(
                    rawPages,
                    calcState.answers.print,
                    calcState.answers.cover,
                    calcState.answers.illustrations
                );

                const errorMsg = pagesInput.parentElement.querySelector('.calculator-error-msg');

                if (!validation.valid) {
                    pagesNextBtn.disabled = true;
                    if (errorMsg) {
                        errorMsg.textContent = validation.message;
                        errorMsg.classList.add('show');
                    }
                } else {
                    pagesNextBtn.disabled = false;
                    if (errorMsg) {
                        errorMsg.classList.remove('show');
                    }
                }
            } else {
                pagesNextBtn.disabled = !rawPages;
            }
        });

        pagesNextBtn.addEventListener('click', () => {
            if (calcState.answers.pages) {
                advanceToNextSlide();
            }
        });
    }
    
    // Quantity controls
    const qtyInput = document.getElementById('quantitySlide');
    const qtyMinusBtn = document.getElementById('qtyMinusBtn');
    const qtyPlusBtn = document.getElementById('qtyPlusBtn');
    const qtyNextBtn = document.getElementById('quantityNextBtn');
    
    if (qtyInput && qtyMinusBtn && qtyPlusBtn && qtyNextBtn) {
        qtyMinusBtn.addEventListener('click', () => {
            let qty = parseInt(qtyInput.value) || 1;
            if (qty > 1) {
                qty--;
                qtyInput.value = qty;
                calcState.answers.quantity = qty;
            }
        });
        
        qtyPlusBtn.addEventListener('click', () => {
            let qty = parseInt(qtyInput.value) || 1;
            if (qty < 500) {
                qty++;
                qtyInput.value = qty;
                calcState.answers.quantity = qty;
            }
        });
        
        qtyInput.addEventListener('change', () => {
            let qty = parseInt(qtyInput.value) || 1;
            if (qty < 1) qty = 1;
            if (qty > 500) qty = 500;
            qtyInput.value = qty;
            calcState.answers.quantity = qty;
        });
        
        qtyNextBtn.addEventListener('click', () => {
            calculateFinalResults();
            advanceToNextSlide();
        });
    }
}

// Advance to next slide
function advanceToNextSlide() {
    if (calcState.currentSlide < calcState.totalSlides) {
        goToSlide(calcState.currentSlide + 1);
    }
}

// Go to specific slide with GSAP animation
function goToSlide(slideNum) {
    // Get slides using the OLD and NEW slide numbers
    const currentSlide = document.querySelector(`.calculator-slide[data-slide="${calcState.currentSlide}"]`);
    const nextSlide = document.querySelector(`.calculator-slide[data-slide="${slideNum}"]`);
    
    if (!currentSlide || !nextSlide) {
        console.error('Slides não encontrados:', calcState.currentSlide, '->', slideNum);
        return;
    }
    
    const direction = slideNum > calcState.currentSlide ? 1 : -1;
    const previousSlideNum = calcState.currentSlide;
    
    // Update state BEFORE animation
    calcState.currentSlide = slideNum;
    
    // Force immediate update of progress
    updateProgressImmediate();
    updateBackButton();
    
    console.log(`Transição: slide ${previousSlideNum} -> ${slideNum}, progresso: ${slideNum}/${calcState.totalSlides}`);
    
    // Kill any running animations on these slides
    gsap.killTweensOf([currentSlide, nextSlide]);
    
    // STEP 1: Measure next slide height by temporarily displaying it
    gsap.set(nextSlide, {
        display: 'block',
        position: 'absolute',
        visibility: 'hidden',
        x: '0%',
        opacity: 1
    });
    
    // Force browser to calculate layout
    const nextSlideHeight = nextSlide.offsetHeight;
    
    // STEP 2: Adjust wrapper height to match next slide BEFORE animation
    const wrapper = document.querySelector('.calculator-slides-wrapper');
    if (wrapper) {
        gsap.to(wrapper, {
            minHeight: nextSlideHeight + 'px',
            duration: 0.3,
            ease: 'power2.out'
        });
    }
    
    // STEP 3: Wait for height adjustment, then start carousel animation
    setTimeout(() => {
        // Gap between slides (5% = espaço entre slides)
        const slideGap = 5;
        const slideOffset = 100 + slideGap;
        
        // Prepare next slide BEFORE animation (positioned off-screen in correct direction)
        gsap.set(nextSlide, {
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            visibility: 'visible',
            x: slideOffset * direction + '%',
            opacity: 0,
            zIndex: 2
        });
        
        // Current slide setup
        gsap.set(currentSlide, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            x: '0%',
            opacity: 1,
            zIndex: 1
        });
        
        nextSlide.classList.add('active');
        
        // Smooth slide transition - carrossel effect
        const tl = gsap.timeline({
            defaults: {
                ease: 'power2.inOut',
                duration: 1,
                opacity: 1
            }
        });
        
        // Slide both slides simultaneously for carrossel effect
        tl.to(currentSlide, {
            x: -slideOffset * direction + '%',
            opacity: 0
        }, 0)
        .to(nextSlide, {
            x: '0%'
        }, 0)
        .add(() => {
            // Clean up after animation
            currentSlide.classList.remove('active');
            currentSlide.style.display = 'none';
            gsap.set(currentSlide, { clearProps: 'all' });
            
            // Set next slide to relative positioning now that it's in place
            gsap.set(nextSlide, { 
                clearProps: 'position,top,left,zIndex,x,visibility',
                position: 'relative'
            });
        });
    }, 300); // Wait for height animation to complete
}

// Update progress bar with animationa
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentSlideNum = document.getElementById('currentSlideNum');
    const totalSlidesEl = document.getElementById('totalSlides');

    // Atualiza barra e texto de progresso de forma robusta
    if (progressFill) {
        // Calcula progresso: slide 1 = ~14%, slide 7 = 100%
        const progress = (calcState.currentSlide / calcState.totalSlides) * 100;
        // Usa GSAP para animação suave da barra (mais rápida)
        gsap.to(progressFill, {
            width: `${progress}%`,
            duration: 0.3,
            ease: 'power2.out'
        });
    }
    if (currentSlideNum) {
        // Anima o número com fade rápido
        gsap.to(currentSlideNum, {
            opacity: 0,
            duration: 0.1,
            onComplete: () => {
                currentSlideNum.textContent = calcState.currentSlide;
                gsap.to(currentSlideNum, {
                    opacity: 1,
                    duration: 0.1
                });
            }
        });
    }
    if (totalSlidesEl) {
        totalSlidesEl.textContent = calcState.totalSlides;
    }
}

// Update progress immediately without animation (for instant feedback)
function updateProgressImmediate() {
    const progressFill = document.getElementById('progressFill');
    const currentSlideNum = document.getElementById('currentSlideNum');
    const totalSlidesEl = document.getElementById('totalSlides');

    console.log('updateProgressImmediate chamado:', {
        currentSlide: calcState.currentSlide,
        totalSlides: calcState.totalSlides,
        progressFill: !!progressFill,
        currentSlideNum: !!currentSlideNum,
        totalSlidesEl: !!totalSlidesEl
    });

    if (progressFill) {
        const progress = (calcState.currentSlide / calcState.totalSlides) * 100;
        progressFill.style.width = `${progress}%`;
        console.log('Barra de progresso atualizada:', progress + '%');
    }
    
    if (currentSlideNum) {
        currentSlideNum.textContent = calcState.currentSlide;
        console.log('Número do slide atualizado:', calcState.currentSlide);
    }
    
    if (totalSlidesEl) {
        totalSlidesEl.textContent = calcState.totalSlides;
    }
}

// Update back button state
function updateBackButton() {
    const backBtn = document.getElementById('navBackBtn');
    if (backBtn) {
        backBtn.disabled = calcState.currentSlide === 1;
    }
}

// Adjust navigation position dynamically based on current slide height
function adjustNavigationPosition() {
    const wrapper = document.querySelector('.calculator-slides-wrapper');
    const navigation = document.querySelector('.calculator-navigation');
    const activeSlide = document.querySelector('.calculator-slide.active');
    
    if (!wrapper || !navigation || !activeSlide) return;
    
    // Get the actual height of the active slide
    const slideHeight = activeSlide.offsetHeight;
    
    // Set wrapper height to match the current slide
    wrapper.style.minHeight = slideHeight + 'px';
    
    // Position navigation below the slide with some spacing
    // Navigation will naturally flow below due to margin-top
}

// Show back button (kept for compatibility, but no longer hides/shows)
function showBackButton() {
    // Button is always visible now, just update its state
    updateBackButton();
}

// Calculate final results
function calculateFinalResults() {
    const { rawPages, cover, print, bookSize, illustrations, quantity } = calcState.answers;
    // Adiciona 4 páginas extras só para o cálculo
    const pagesForCalc = rawPages ? (Math.ceil(rawPages / 4) * 4 + 4) : 0;

    // Calculate costs
    const serviceCost = calculateServiceCost(rawPages, illustrations);
    const printCostPerBook = calculateKDPPrintingCost(pagesForCalc, cover, print, bookSize);
    const totalPrintCost = printCostPerBook * quantity;
    const grandTotal = serviceCost + totalPrintCost;

    // Update final slide
    document.getElementById('finalTotalPrice').textContent = formatEUR(grandTotal);
    document.getElementById('serviceSubtotal').textContent = formatEUR(serviceCost);
    document.getElementById('printCostPer').textContent = formatEUR(printCostPerBook);
    document.getElementById('printCostTotal').textContent = formatEUR(totalPrintCost);
    document.getElementById('qtyDisplay').textContent = quantity;

    // Service breakdown
    const serviceBreakdown = document.getElementById('serviceBreakdown');
    let breakdownHTML = `
        <div class="breakdown-item">
            <span>Serviço Base</span>
            <span>50,00€</span>
        </div>
    `;

    if (illustrations) {
        breakdownHTML += `
            <div class="breakdown-item">
                <span>Ilustrações</span>
                <span>+75,00€</span>
            </div>
        `;
    }

    if (rawPages > 300) {
        breakdownHTML += `
            <div class="breakdown-item">
                <span>Mais de 300 páginas</span>
                <span>+20,00€</span>
            </div>
        `;
    }
    if (rawPages > 400) {
        breakdownHTML += `
            <div class="breakdown-item">
                <span>Mais de 400 páginas</span>
                <span>+50,00€</span>
            </div>
        `;
    }
    if (rawPages > 500) {
        breakdownHTML += `
            <div class="breakdown-item">
                <span>Mais de 500 páginas</span>
                <span>+50,00€</span>
            </div>
        `;
    }
    if (rawPages > 600) {
        breakdownHTML += `
            <div class="breakdown-item">
                <span>Mais de 600 páginas</span>
                <span>+50,00€</span>
            </div>
        `;
    }

    serviceBreakdown.innerHTML = breakdownHTML;

    // Summary
    document.getElementById('summaryPrint').textContent = print === 'pb' ? 'Preto & Branco' : 'A Cores';
    document.getElementById('summaryCover').textContent = cover === 'mole' ? 'Capa Mole' : 'Capa Dura';
    document.getElementById('summarySize').textContent = bookSize ? bookSize.replace('x', ' × ') + '"' : '';
    document.getElementById('summaryPages').textContent = (rawPages ? rawPages : 0) + ' páginas';
    document.getElementById('summaryIllustrations').textContent = illustrations ? 'Sim' : 'Não';
    
    // Save calculator data to localStorage for form submission
    const calculatorData = {
        printType: print,
        coverType: cover,
        bookSize: bookSize,
        pages: rawPages,
        hasIllustrations: illustrations,
        quantity: quantity,
        calculatedPrice: grandTotal,
        serviceCost: serviceCost,
        printCostPerBook: printCostPerBook,
        totalPrintCost: totalPrintCost,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('calculatorData', JSON.stringify(calculatorData));
    console.log('Dados da calculadora guardados:', calculatorData);
    
    // Animate result slide
    animateResultSlide();
}

// Animate result slide with invoice-style presentation
function animateResultSlide() {
    setTimeout(() => {
        const timeline = gsap.timeline();
        
        // Phase 1: Show header and big price
        timeline
            .from('.result-header', {
                scale: 0,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(1.7)'
            })
            .from('.result-total', {
                scale: 0.8,
                opacity: 0,
                duration: 0.6,
                ease: 'power3.out'
            })
            .from('.total-price', {
                scale: 1.3,
                duration: 0.5,
                ease: 'elastic.out(1, 0.5)'
            }, '-=0.3')
            // Phase 2: Hold for 2 seconds
            .to('.result-total', {
                duration: 2,
                onComplete: () => {
                    // Phase 3: Shrink price and show breakdown
                    gsap.to('.result-total', {
                        scale: 0.85,
                        y: -20,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                    
                    gsap.to('.result-breakdown', {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: 'power3.out',
                        delay: 0.3
                    });
                    
                    // Animate breakdown sections
                    gsap.from('.breakdown-section', {
                        opacity: 0,
                        y: 20,
                        duration: 0.5,
                        stagger: 0.15,
                        delay: 0.5,
                        ease: 'power2.out'
                    });
                    
                    // Animate CTA button
                    gsap.to('.result-cta-btn', {
                        opacity: 1,
                        scale: 1,
                        duration: 0.5,
                        delay: 1.2,
                        ease: 'back.out(1.7)'
                    });
                }
            });
    }, 100);
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('calculatorError');
    const errorMsg = document.getElementById('errorMessage');
    
    if (errorDiv && errorMsg) {
        errorMsg.textContent = message;
        errorDiv.style.display = 'flex';
        
        gsap.fromTo(errorDiv, 
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
    }
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('calculatorError');
    
    if (errorDiv && errorDiv.style.display !== 'none') {
        gsap.to(errorDiv, {
            y: -20,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                errorDiv.style.display = 'none';
            }
        });
    }
}

// Initialize on page load
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
