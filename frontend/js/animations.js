// Animations extracted from main.js
(function(){
    // Map AOS-like animation names to GSAP properties
    const mapAosToProps = (name) => {
        switch ((name || '').toLowerCase()) {
            case 'fade-up': return { from: { opacity: 0, y: 30 }, to: { opacity: 1, y: 0 } };
            case 'fade-down': return { from: { opacity: 0, y: -30 }, to: { opacity: 1, y: 0 } };
            case 'fade-left': return { from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 } };
            case 'fade-right': return { from: { opacity: 0, x: 30 }, to: { opacity: 1, x: 0 } };
            case 'slide-up': return { from: { opacity: 0, y: 50 }, to: { opacity: 1, y: 0 } };
            case 'slide-down': return { from: { opacity: 0, y: -50 }, to: { opacity: 1, y: 0 } };
            case 'slide-left': return { from: { opacity: 0, x: -50 }, to: { opacity: 1, x: 0 } };
            case 'slide-right': return { from: { opacity: 0, x: 50 }, to: { opacity: 1, x: 0 } };
            default: return { from: { opacity: 0, y: 30 }, to: { opacity: 1, y: 0 } };
        }
    };

    // Get element position relative to viewport for dynamic animations
    const getElementPosition = (element) => {
        const rect = element.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return {
            isLeft: centerX < windowWidth * 0.4,
            isRight: centerX > windowWidth * 0.6,
            isTop: centerY < windowHeight * 0.4,
            isBottom: centerY > windowHeight * 0.6,
            isCenter: centerX > windowWidth * 0.4 && centerX < windowWidth * 0.6,
            distanceFromCenter: Math.abs(centerX - windowWidth / 2)
        };
    };

    // Generate dynamic animation based on element position
    const getDynamicAnimation = (element, baseAnimation = 'fade-up') => {
        const position = getElementPosition(element);

        // Base animation properties - simple and clean
        let fromProps = { opacity: 0 };
        let toProps = { opacity: 1, duration: 0.8, ease: 'power3.out' };

        // For images (or elements inside .book-image) do NOT animate opacity
        // to avoid flicker / partial opacity glitches — keep opacity fixed via CSS
        try {
            if (element && (element.tagName === 'IMG' || element.closest && element.closest('.book-image'))) {
                delete fromProps.opacity;
                delete toProps.opacity;
            }
        } catch (e) {
            // ignore
        }

        // Position-based direction - only linear movement
        if (position.isLeft) {
            fromProps.x = -60;
            toProps.x = 0;
        } else if (position.isRight) {
            fromProps.x = 60;
            toProps.x = 0;
        } else {
            fromProps.y = 60;
            toProps.y = 0;
        }

        // Distance-based delay for sequence in grids
        const delay = Math.min(position.distanceFromCenter / 1500, 0.4);

        return { from: fromProps, to: { ...toProps, delay } };
    };

    // Enhanced ScrollTrigger animations with position awareness
    const createScrollTriggerAnimation = (element, animationType = 'dynamic') => {
        if (!element || typeof gsap === 'undefined') return;

        // Skip if already animated
        if (element.classList.contains('gsap-animated')) return;

        let animationProps;

        if (animationType === 'dynamic') {
            animationProps = getDynamicAnimation(element);
        } else {
            animationProps = mapAosToProps(animationType);
        }

        // Check if element is already in viewport
        const rect = element.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

        if (isInViewport) {
            // Animate immediately if in viewport, with a small delay based on position
            const position = getElementPosition(element);
            const delay = Math.min(position.distanceFromCenter / 2000, 0.5); // Smaller delay for viewport elements
            gsap.fromTo(element, animationProps.from, {
                ...animationProps.to,
                delay: delay,
                onComplete: () => {
                    element.classList.add('gsap-animated');
                    setTimeout(() => gsap.set(element, { clearProps: 'all' }), 100);
                }
            });
        } else if (typeof ScrollTrigger !== 'undefined') {
            // Use ScrollTrigger if not in viewport - appear earlier
            gsap.fromTo(element, animationProps.from, {
                ...animationProps.to,
                scrollTrigger: {
                    trigger: element,
                    start: 'top 85%', // Appear when top of element is 85% from top of viewport
                    end: 'bottom 15%',
                    toggleActions: 'play none none reverse',
                    onEnter: () => element.classList.add('gsap-animated'),
                    onLeaveBack: () => element.classList.remove('gsap-animated')
                },
                onComplete: () => {
                    element.classList.add('gsap-animated');
                    // Clear inline styles after animation
                    setTimeout(() => gsap.set(element, { clearProps: 'all' }), 100);
                }
            });
        } else {
            // Fallback without ScrollTrigger
            gsap.fromTo(element, animationProps.from, {
                ...animationProps.to,
                onComplete: () => element.classList.add('gsap-animated')
            });
        }
    };

    // Batch animate elements with stagger based on position
    const animateElementGroup = (elements, groupType = 'stagger') => {
        if (!elements.length) return;

        // Sort elements by their position in viewport for natural flow
        const sortedElements = Array.from(elements).sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return rectA.top - rectB.top || rectA.left - rectB.left;
        });

        if (groupType === 'stagger') {
            // Stagger animation based on position - trigger on scroll for better UX
            sortedElements.forEach((element, index) => {
                const delay = index * 0.06;
                const animationProps = getDynamicAnimation(element);

                // Use ScrollTrigger to animate elements as they enter viewport, with a gentle stagger delay
                gsap.fromTo(element, animationProps.from, {
                    ...animationProps.to,
                    delay: delay,
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 92%',
                        toggleActions: 'play none none none',
                        once: true
                    },
                    onComplete: () => {
                        element.classList.add('gsap-animated');
                        setTimeout(() => gsap.set(element, { clearProps: 'all' }), 150);
                    }
                });
            });
        } else if (groupType === 'wave') {
            // Wave effect - animate in waves
            const waves = Math.ceil(sortedElements.length / 3);
            for (let wave = 0; wave < waves; wave++) {
                const waveElements = sortedElements.slice(wave * 3, (wave + 1) * 3);
                waveElements.forEach((element, index) => {
                    gsap.fromTo(element, { opacity: 0, y: 80 }, {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        delay: wave * 0.2 + index * 0.1,
                        ease: 'power2.out',
                        onComplete: () => {
                            element.classList.add('gsap-animated');
                            setTimeout(() => gsap.set(element, { clearProps: 'all' }), 100);
                        }
                    });
                });
            }
        } else if (groupType === 'scrub') {
            // Scrub animation - tied to scroll progress
            sortedElements.forEach((element, index) => {
                gsap.fromTo(element, { opacity: 0, y: 100 }, {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 85%',
                        end: 'bottom top',
                        scrub: true
                    },
                    onComplete: () => {
                        element.classList.add('gsap-animated');
                    }
                });
            });
        }
    };

    // Expose initGSAPAnimations globally
    window.initGSAPAnimations = function() {
        return new Promise((resolve) => {
            if (typeof gsap === 'undefined') {
                console.warn('GSAP not available for initGSAPAnimations');
                return resolve(false);
            }

            console.log('🎨 Iniciando initGSAPAnimations');

            // Clear any existing inline transforms on benefit-cards to prevent conflicts
            const benefitCards = document.querySelectorAll('.benefit-card');
            benefitCards.forEach(card => {
                gsap.set(card, { clearProps: 'transform' });
            });

            // Handle data-aos elements - immediate animation
            const aosElems = Array.from(document.querySelectorAll('[data-aos]:not(.gsap-animated)'));
            aosElems.forEach(el => {
                const type = el.getAttribute('data-aos') || 'fade-up';
                const delayAttr = parseInt(el.getAttribute('data-aos-delay')) || 0;

                // Use mapped props, but avoid animating opacity for images
                const props = mapAosToProps(type);
                try {
                    if (el && (el.tagName === 'IMG' || el.closest && el.closest('.book-image'))) {
                        delete props.from.opacity;
                        delete props.to.opacity;
                    }
                } catch (e) {}

                gsap.fromTo(el, { ...props.from }, {
                    ...props.to,
                    duration: 0.7,
                    delay: delayAttr / 1000,
                    ease: 'power3.out',
                    onComplete: () => el.classList.add('gsap-animated')
                });
            });
            console.log(`🎨 Animou ${aosElems.length} elementos com data-aos`);

            // Auto-animate common elements without data-aos
            const autoAnimateSelectors = [
                '.book-card:not(.gsap-animated)',
                '.benefit-card:not(.gsap-animated)',
                '.service-card:not(.gsap-animated)',
                '.author-card:not(.gsap-animated)',
                '.value-card:not(.gsap-animated)',
                '.timeline-item:not(.gsap-animated)',
                '.blog-card:not(.gsap-animated)',
                '.plan-card:not(.gsap-animated)',
                '.testimonial-card:not(.gsap-animated)',
                '.faq-item:not(.gsap-animated)',
                '.process-step:not(.gsap-animated)',
                '.feature-item:not(.gsap-animated)',
                '.stat-card:not(.gsap-animated)',
                '.hero-feature:not(.gsap-animated)',
                '.content-block:not(.gsap-animated)',
                '.books-catalog:not(.gsap-animated)',
                '.section:not(.gsap-animated)',
                '.container:not(.gsap-animated)',
                '.book-image:not(.gsap-animated)',
                '.book-info:not(.gsap-animated)',
                '.btn:not(.gsap-animated)',
                '.card:not(.gsap-animated)',
                '.grid:not(.gsap-animated)',
                '.books-grid:not(.gsap-animated)',
                '.swiper-slide:not(.gsap-animated)',
                '.form-group:not(.gsap-animated)',
                '.input:not(.gsap-animated)',
                '.textarea:not(.gsap-animated)',
                '.select:not(.gsap-animated)',
                '.icon:not(.gsap-animated)',
                '.badge:not(.gsap-animated)',
                '.alert:not(.gsap-animated)',
                '.modal:not(.gsap-animated)',
                '.sidebar:not(.gsap-animated)',
                '.dropdown:not(.gsap-animated)',
                '.tab:not(.gsap-animated)',
                '.accordion:not(.gsap-animated)',
                '.progress:not(.gsap-animated)',
                '.chart:not(.gsap-animated)',
                '.table:not(.gsap-animated)',
                '.list-item:not(.gsap-animated)',
                '.nav-item:not(.gsap-animated)',
                '.footer-section:not(.gsap-animated)',
                '.hero-section:not(.gsap-animated)',
                '.cta-section:not(.gsap-animated)',
                '.pricing-table:not(.gsap-animated)',
                '.gallery-item:not(.gsap-animated)',
                '.portfolio-item:not(.gsap-animated)',
                '.team-member:not(.gsap-animated)',
                '.social-links:not(.gsap-animated)',
                '.contact-form:not(.gsap-animated)',
                '.newsletter:not(.gsap-animated)',
                '.search-form:not(.gsap-animated)',
                '.filter:not(.gsap-animated)',
                '.sort:not(.gsap-animated)',
                '.pagination:not(.gsap-animated)',
                '.breadcrumb:not(.gsap-animated)',
                '.tooltip:not(.gsap-animated)',
                '.popover:not(.gsap-animated)',
                '.loading:not(.gsap-animated)',
                '.error:not(.gsap-animated)',
                '.success:not(.gsap-animated)',
                '.warning:not(.gsap-animated)',
                '.info:not(.gsap-animated)'
            ];

            autoAnimateSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    // Randomly choose animation type for variety
                    const groupTypes = ['stagger', 'wave'];
                    const randomType = groupTypes[Math.floor(Math.random() * groupTypes.length)];
                    animateElementGroup(elements, randomType);
                }
            });

            // Special handling for grids
            const grids = document.querySelectorAll('.books-grid:not(.gsap-animated), .blog-grid:not(.gsap-animated), .benefits-grid:not(.gsap-animated)');
            grids.forEach(grid => {
                const cards = Array.from(grid.children).filter(child =>
                    child.classList.contains('book-card') ||
                    child.classList.contains('blog-card') ||
                    child.classList.contains('benefit-card')
                );
                if (cards.length > 0) {
                    animateElementGroup(cards, 'wave');
                    grid.classList.add('gsap-animated');
                }
            });

            if (typeof ScrollTrigger !== 'undefined') {
                try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh() failed', e); }
            }

            resolve(true);
        });
    };

    // Expose runAnimations globally
    window.runAnimations = function() {
        if (typeof gsap === 'undefined') {
            console.warn('⚠️ GSAP não disponível');
            return;
        }

        console.log('🎨 Executando animações GSAP (animations.js)');

        // Header entrance: animate logo, nav links, and action buttons left→right
        try {
            const logo = document.querySelector('.navbar .logo');
            const navItems = Array.from(document.querySelectorAll('.navbar .nav-menu > li'));
            const actions = Array.from(document.querySelectorAll('.navbar .nav-actions > *'));
            const headerSequence = [];
            if (logo) headerSequence.push(logo);
            if (navItems.length) headerSequence.push(...navItems);
            if (actions.length) headerSequence.push(...actions);

            const visibleSequence = headerSequence.filter(Boolean);
            if (visibleSequence.length) {
                gsap.fromTo(visibleSequence,
                    { y: -20, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        stagger: 0.08,
                        ease: 'power3.out',
                        onComplete: () => {
                            visibleSequence.forEach(el => {
                                el.classList.add('gsap-animated');
                                gsap.set(el, { clearProps: 'all' }); // Remove inline styles
                            });
                        }
                    }
                );
            }
        } catch (e) { console.warn('Erro na animação do header:', e); }

        // Hero with enhanced effects
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroButtons = document.querySelectorAll('.hero-content .btn');
        const heroElementsRaw = [heroTitle, heroSubtitle, ...heroButtons].filter(Boolean);
        const heroElements = heroElementsRaw.filter(el => !(el && (el.hasAttribute('data-aos') || el.closest('[data-aos]'))));

        if (heroElements.length > 0) {
            // Simple hero entrance: translate + fade (no scale)
            gsap.fromTo(heroElements,
                {
                    y: -30,
                    opacity: 0
                },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.18,
                    ease: 'power3.out',
                    onComplete: () => {
                        const heroContent = document.querySelector('.hero-content');
                        if (heroContent) heroContent.classList.add('gsap-animated');
                    }
                }
            );
            console.log('✅ Hero animado (GSAP)');
        }

        // Page headers with parallax effect
        const pageHeaders = document.querySelectorAll('.page-header:not([data-aos])');
        pageHeaders.forEach(header => {
            gsap.fromTo(header,
                { y: -30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: 'power3.out',
                    onComplete: () => header.classList.add('gsap-animated')
                }
            );

            // Add parallax effect on scroll - removed for immediate appearance
        });

        // Sections with enhanced animations
        const sections = document.querySelectorAll('.section:not([data-aos]):not(.gsap-animated)');
        if (sections.length > 0) {
            sections.forEach((section, index) => {
                const position = getElementPosition(section);
                let fromProps = { opacity: 0, y: 50 };
                let toProps = {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    delay: index * 0.08,
                    ease: 'power3.out'
                };

                // Add position-based variation
                if (position.isLeft) {
                    fromProps.x = -30;
                    toProps.x = 0;
                } else if (position.isRight) {
                    fromProps.x = 30;
                    toProps.x = 0;
                }

                // Keep animations simple for center sections (no scale)
                if (position.isCenter) {
                    // Slightly larger translate for center sections for emphasis
                    fromProps.y = 60;
                    toProps.y = 0;
                }

                gsap.fromTo(section, fromProps, {
                    ...toProps,
                    onComplete: () => {
                        section.classList.add('gsap-animated');
                        gsap.set(section, { clearProps: 'all' });
                    }
                });
            });
        }

        // Specific animation for books-catalog section
        const booksCatalogSections = document.querySelectorAll('.books-catalog:not(.gsap-animated)');
        booksCatalogSections.forEach(section => {
            gsap.fromTo(section, { opacity: 0, y: 60 }, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                onComplete: () => {
                    section.classList.add('gsap-animated');
                    gsap.set(section, { clearProps: 'all' });
                }
            });
        });

        // Enhanced benefits grid with responsive effects
        try {
            const benefitGrids = document.querySelectorAll('.benefits-grid:not(.gsap-animated)');
            benefitGrids.forEach(grid => {
                if (grid.classList.contains('gsap-animated')) return;
                const cards = Array.from(grid.querySelectorAll('.benefit-card'));
                if (cards.length === 0) { grid.classList.add('gsap-animated'); return; }

                const isMobile = window.innerWidth < 768;
                if (isMobile) {
                    // Mobile: slide from right to center, starting higher
                    cards.forEach((card, index) => {
                        if (card.classList.contains('gsap-animated')) return;
                        gsap.fromTo(card,
                            { opacity: 0, x: 60, y: 80 },
                            {
                                opacity: 1,
                                x: 0,
                                y: 0,
                                duration: 0.6,
                                delay: index * 0.1,
                                ease: 'power2.out',
                                scrollTrigger: {
                                    trigger: card,
                                    start: 'top 85%',
                                    once: true
                                },
                                onComplete: () => {
                                    card.classList.add('gsap-animated');
                                    gsap.set(card, { clearProps: 'all' });
                                }
                            }
                        );
                    });
                } else {
                    // Desktop: stack (sequential appearance), starting higher
                    cards.forEach((card, index) => {
                        if (card.classList.contains('gsap-animated')) return;
                        gsap.fromTo(card,
                            { opacity: 0, y: 80 },
                            {
                                opacity: 1,
                                y: 0,
                                duration: 0.6,
                                delay: index * 0.15,
                                ease: 'power2.out',
                                scrollTrigger: {
                                    trigger: card,
                                    start: 'top 85%',
                                    once: true
                                },
                                onComplete: () => {
                                    card.classList.add('gsap-animated');
                                    gsap.set(card, { clearProps: 'all' });
                                }
                            }
                        );
                    });
                }
                grid.classList.add('gsap-animated');
            });
        } catch (e) { console.warn('Erro ao animar benefits-grid:', e); }

        // Enhanced content sections
        try {
            const createBookEls = document.querySelectorAll('.create-book-content:not(.gsap-animated)');
            createBookEls.forEach(el => {
                if (el.classList.contains('gsap-animated')) return;
                const isMobile = window.innerWidth < 768;
                let fromProps = { opacity: 0 };
                let toProps = {
                    opacity: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    onComplete: () => el.classList.add('gsap-animated')
                };
                if (isMobile) {
                    // Mobile: from left to right
                    fromProps.x = -60;
                    toProps.x = 0;
                } else {
                    // Desktop: swipe up from bottom with ScrollTrigger
                    fromProps.y = 60;
                    toProps.y = 0;
                    toProps.scrollTrigger = {
                        trigger: el,
                        start: 'top 85%',
                        once: true
                    };
                }
                gsap.fromTo(el, fromProps, toProps);
            });

            // Section header for "Porquê Escolher" - just lift and appear
            const sectionHeaders = document.querySelectorAll('.section-header:not(.gsap-animated)');
            sectionHeaders.forEach(header => {
                if (header.classList.contains('gsap-animated')) return;
                gsap.fromTo(header,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: 'power2.out',
                        onComplete: () => header.classList.add('gsap-animated')
                    }
                );
            });

            // Blog sections with enhanced animations
            const blogPreviews = document.querySelectorAll('.blog-preview');
            blogPreviews.forEach(section => {
                const header = section.querySelector('.section-header:not(.gsap-animated)');
                if (header) {
                    gsap.fromTo(header,
                        { opacity: 0, y: 60 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.7,
                            ease: 'power3.out',
                            onComplete: () => header.classList.add('gsap-animated')
                        }
                    );
                }

                const grid = section.querySelector('.blog-grid:not(.gsap-animated)');
                if (grid) {
                    const items = Array.from(grid.children).filter(Boolean);
                    if (items.length > 0) {
                        // Staggered animation with position awareness
                        items.forEach((item, index) => {
                            const position = getElementPosition(item);
                            const delay = index * 0.1;

                            gsap.fromTo(item,
                                {
                                    opacity: 0,
                                    x: position.isLeft ? -40 : position.isRight ? 40 : 0,
                                    y: position.isCenter ? 40 : 0,
                                    scale: 0.9
                                },
                                {
                                    opacity: 1,
                                    x: 0,
                                    y: 0,
                                    scale: 1,
                                    duration: 0.6,
                                    delay: delay,
                                    ease: 'power2.out',
                                    onComplete: () => item.classList.add('gsap-animated')
                                }
                            );
                        });
                        grid.classList.add('gsap-animated');
                    } else {
                        grid.classList.add('gsap-animated');
                    }
                }

                const footer = section.querySelector('.section-footer:not(.gsap-animated)');
                if (footer) {
                    gsap.fromTo(footer,
                        { opacity: 0, y: 60 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.7,
                            ease: 'power3.out',
                            onComplete: () => footer.classList.add('gsap-animated')
                        }
                    );
                }
            });

            // Featured content with dynamic animations
            const featured = document.querySelectorAll('.featured-swiper:not(.gsap-animated)');
            featured.forEach(container => {
                if (container.classList.contains('gsap-animated')) return;
                const cards = Array.from(container.querySelectorAll('.swiper-slide .book-card'));
                const targets = cards.length ? cards : Array.from(container.querySelectorAll('.swiper-slide'));
                if (targets.length === 0) {
                    container.classList.add('gsap-animated');
                    return;
                }

                // Dynamic animation based on container position
                const containerPos = getElementPosition(container);
                targets.forEach((target, index) => {
                    const delay = index * 0.12;
                    let fromProps = { opacity: 0, scale: 0.9 };

                    if (containerPos.isLeft) {
                        fromProps.x = -50;
                    } else if (containerPos.isRight) {
                        fromProps.x = 50;
                    } else {
                        fromProps.y = 50;
                    }

                    gsap.fromTo(target, fromProps, {
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        duration: 0.6,
                        delay: delay,
                        ease: 'back.out(1.3)',
                        onComplete: () => target.classList.add('gsap-animated')
                    });
                });
                container.classList.add('gsap-animated');
            });
        } catch (e) {
            console.warn('Erro ao animar swipe-up sections:', e);
        }

        // Add scroll-based parallax effects to background elements
        if (typeof ScrollTrigger !== 'undefined') {
            const parallaxElements = document.querySelectorAll('[data-parallax]');
            parallaxElements.forEach(element => {
                const speed = parseFloat(element.getAttribute('data-parallax')) || 0.5;
                gsap.to(element, {
                    yPercent: -50 * speed,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 85%',
                        end: 'bottom 15%',
                        scrub: true
                    }
                });
            });

            // Add pin effects for hero sections - removed for immediate appearance

            // Add scrub animations for text elements - removed for immediate appearance

            // Add horizontal scroll effects - removed for immediate appearance

            // Reveal effects for images: avoid animating opacity (causes flicker) — translate only
            const images = document.querySelectorAll('img:not(.gsap-animated)');
            images.forEach(img => {
                gsap.fromTo(img, {
                    y: 20
                }, {
                    y: 0,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: img,
                        start: 'top 92%',
                        end: 'bottom 15%',
                        toggleActions: 'play none none none',
                        once: true
                    },
                    onComplete: () => {
                        img.classList.add('gsap-animated');
                        gsap.set(img, { clearProps: 'all' }); // clear any inline gsap props
                    }
                });
            });
        }

        // Initialize ScrollTrigger for dynamic elements
        if (typeof ScrollTrigger !== 'undefined') {
            try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh() failed', e); }
        }

        // Add mouse-follow effects for interactive elements
        initMouseEffects();

        // Add intersection observer for performance
        initIntersectionObserver();

        // Page-specific animations
        if (document.body.classList.contains('page-sobre')) {
            initSobrePageAnimations();
        }

        // universal reveal removed to keep previous animations smooth

        // Create advanced ScrollTrigger animations
        createAdvancedAnimations();
    };

    // Mouse follow effects (kept minimal and rotation-free)
    function initMouseEffects() {
        const interactiveElements = document.querySelectorAll('.book-card, .btn, .service-card, .benefit-card, .card, .icon, .badge');

        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                if (typeof gsap !== 'undefined') {
                    gsap.to(element, {
                        scale: 1.03,
                        y: -3,
                        duration: 0.28,
                        ease: 'power2.out'
                    });
                }
            });

            element.addEventListener('mouseleave', () => {
                if (typeof gsap !== 'undefined') {
                    gsap.to(element, {
                        scale: 1,
                        y: 0,
                        duration: 0.28,
                        ease: 'power2.out'
                    });
                }
            });

            element.addEventListener('mousedown', () => {
                if (typeof gsap !== 'undefined') {
                    gsap.to(element, {
                        scale: 0.97,
                        duration: 0.08,
                        ease: 'power2.out'
                    });
                }
            });

            element.addEventListener('mouseup', () => {
                if (typeof gsap !== 'undefined') {
                    gsap.to(element, {
                        scale: 1.03,
                        duration: 0.12,
                        ease: 'power2.out'
                    });
                }
            });
        });
    }

    // Intersection Observer for performance optimization
    function initIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '50px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;

                    // Add subtle continuous animations for visible elements
                    if (element.classList.contains('book-card') && !element.hasAttribute('data-continuous')) {
                        element.setAttribute('data-continuous', 'true');

                        // Set appropriate size for book cards
                        gsap.set(element, { maxHeight: '450px', overflow: 'hidden' });

                        // Simple subtle animation - no repeat to avoid height issues
                        gsap.to(element, {
                            y: '+=2',
                            duration: 2,
                            ease: 'power1.inOut',
                            delay: Math.random() * 2
                        });
                    }

                    if (element.classList.contains('btn') && !element.hasAttribute('data-continuous')) {
                        element.setAttribute('data-continuous', 'true');

                        // Simple subtle animation
                        gsap.to(element, {
                            y: '+=2',
                            duration: 2,
                            ease: 'power1.inOut',
                            yoyo: true,
                            repeat: -1,
                            delay: Math.random() * 1
                        });
                    }

                    if (element.classList.contains('service-card') && !element.hasAttribute('data-continuous')) {
                        element.setAttribute('data-continuous', 'true');

                        // Simple subtle animation
                        gsap.to(element, {
                            y: '+=2',
                            duration: 2,
                            ease: 'power1.inOut',
                            yoyo: true,
                            repeat: -1,
                            delay: Math.random() * 2
                        });
                    }

                    if (element.classList.contains('benefit-card') && !element.hasAttribute('data-continuous')) {
                        element.setAttribute('data-continuous', 'true');

                        // Disable continuous animation for benefit-card to prevent position changes
                        // gsap.to(element, {
                        //     y: '+=2',
                        //     duration: 2,
                        //     ease: 'power1.inOut',
                        //     yoyo: true,
                        //     repeat: -1,
                        //     delay: Math.random() * 1.5
                        // });
                    }

                    if (element.classList.contains('icon') && !element.hasAttribute('data-continuous')) {
                        element.setAttribute('data-continuous', 'true');

                        // Simple subtle animation
                        gsap.to(element, {
                            y: '+=2',
                            duration: 2,
                            ease: 'power1.inOut',
                            yoyo: true,
                            repeat: -1,
                            delay: Math.random() * 2
                        });
                    }

                    // Stop observing once animated
                    observer.unobserve(element);
                }
            });
        }, observerOptions);

        // Observe elements that should have continuous animations
        const continuousElements = document.querySelectorAll('.book-card:not([data-continuous]), .btn:not([data-continuous]), .service-card:not([data-continuous]), .benefit-card:not([data-continuous]), .icon:not([data-continuous])');
        continuousElements.forEach(element => {
            observer.observe(element);
        });
    }

    // universal reveal removed — previously caused non-smooth animations

    // Utility function to create custom animation timelines
    window.createAnimationTimeline = function(elements, options = {}) {
        if (typeof gsap === 'undefined') return null;

        const {
            stagger = 0.1,
            duration = 0.6,
            ease = 'power2.out',
            from = { opacity: 0, y: 30 },
            to = { opacity: 1, y: 0 }
        } = options;

        const tl = gsap.timeline();

        tl.fromTo(elements, from, {
            ...to,
            duration,
            stagger,
            ease
        });

        return tl;
    };

    // Function to animate elements on demand
    window.animateElements = function(selector, animationType = 'fade-up') {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;

        elements.forEach(element => {
            if (element.classList.contains('gsap-animated')) return;

            const animationProps = mapAosToProps(animationType);
            gsap.fromTo(element, animationProps.from, {
                ...animationProps.to,
                scrollTrigger: {
                    trigger: element,
                    start: 'top bottom',
                    once: true
                },
                onComplete: () => element.classList.add('gsap-animated')
            });
        });
    };

    // Advanced ScrollTrigger animations
    window.createAdvancedAnimations = function() {
        if (typeof ScrollTrigger === 'undefined') return;

        // Horizontal scroll sections
        const horizontalSections = document.querySelectorAll('.horizontal-scroll');
        horizontalSections.forEach(section => {
            const container = section.querySelector('.horizontal-container');
            if (!container) return;

            gsap.to(container, {
                xPercent: -100 * (container.children.length - 1),
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${container.scrollWidth}`,
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true
                }
            });
        });

        // Reveal animations with clip-path
        const revealElements = document.querySelectorAll('.reveal-text');
        revealElements.forEach(element => {
            gsap.fromTo(element, {
                clipPath: 'inset(0 100% 0 0)'
            }, {
                clipPath: 'inset(0 0% 0 0)',
                ease: 'none',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 85%',
                    end: 'bottom 15%',
                    scrub: true
                }
            });
        });

        // Staggered letter animations
        const letterElements = document.querySelectorAll('.animate-letters');
        letterElements.forEach(element => {
            const text = element.textContent;
            element.innerHTML = text.split('').map(letter => `<span>${letter}</span>`).join('');
            const letters = element.querySelectorAll('span');

            gsap.fromTo(letters, {
                opacity: 0,
                y: 20
            }, {
                opacity: 1,
                y: 0,
                stagger: 0.05,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 85%',
                    once: true
                }
            });
        });

        // Morphing shapes
        const morphElements = document.querySelectorAll('.morph-shape');
        morphElements.forEach(element => {
            gsap.to(element, {
                borderRadius: '50%',
                scale: 1.2,
                ease: 'none',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 80%',
                    end: 'bottom 20%',
                    scrub: true
                }
            });
        });

        // Color transitions
        const colorElements = document.querySelectorAll('.color-transition');
        colorElements.forEach(element => {
            gsap.fromTo(element, {
                backgroundColor: '#ffffff'
            }, {
                backgroundColor: '#f0f0f0',
                ease: 'none',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 90%',
                    end: 'bottom 10%',
                    scrub: true
                }
            });
        });

        // 3D tilt effects on scroll
        const tiltElements = document.querySelectorAll('.tilt-on-scroll');
        tiltElements.forEach(element => {
            gsap.to(element, {
                y: -10,
                ease: 'none',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 80%',
                    end: 'bottom 20%',
                    scrub: true
                }
            });
        });

        // Plans section stacked animation
        const plansSection = document.querySelector('.plans-section-final');
        if (plansSection) {
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
                // Mobile: slide from left to right
                gsap.set(".plan-card-new", { opacity: 0, x: -60 });
                ScrollTrigger.create({
                    trigger: plansSection,
                    start: "top 80%",
                    once: true,
                    onEnter: () => {
                        gsap.to(".plan-card-new:nth-child(1)", { opacity: 1, x: 0, duration: 0.8, delay: 0.2 });
                        gsap.to(".plan-card-new:nth-child(2)", { opacity: 1, x: 0, duration: 0.8, delay: 0.6 });
                        gsap.to(".plan-card-new:nth-child(3)", { opacity: 1, x: 0, duration: 0.8, delay: 1.0 });
                    }
                });
            } else {
                // Desktop: stacked animation
                gsap.set(".plan-card-new", { opacity: 0, y: 50 });
                ScrollTrigger.create({
                    trigger: plansSection,
                    start: "top 80%",
                    once: true,
                    onEnter: () => {
                        gsap.to(".plan-card-new:nth-child(1)", { opacity: 1, y: 0, duration: 0.8, delay: 0.2 });
                        gsap.to(".plan-card-new:nth-child(3)", { opacity: 1, y: 0, duration: 0.8, delay: 0.6 });
                        gsap.to(".plan-card-new:nth-child(2)", { opacity: 1, y: 0, duration: 0.8, delay: 1.0 });
                    }
                });
            }
        }

        // Process steps horizontal animation
        const processSteps = document.querySelector('.process-steps-horizontal');
        if (processSteps) {
            gsap.set(".process-step-h", { opacity: 0, x: -50 });
            ScrollTrigger.create({
                trigger: processSteps,
                start: "top 80%",
                once: true,
                onEnter: () => {
                    gsap.to(".process-step-h", { 
                        opacity: 1, 
                        x: 0, 
                        duration: 0.8, 
                        stagger: 0.3,
                        ease: "power3.out"
                    });
                }
            });
        }

        // KDP info section animation
        const kdpSection = document.querySelector('.kdp-info-section');
        if (kdpSection) {
            gsap.set(".kdp-info-card", { opacity: 0, y: 50 });
            ScrollTrigger.create({
                trigger: kdpSection,
                start: "top 80%",
                once: true,
                onEnter: () => {
                    gsap.to(".kdp-info-card", { 
                        opacity: 1, 
                        y: 0, 
                        duration: 1.0, 
                        ease: "power3.out"
                    });
                }
            });
        }

        // Testimonials section animation
        const testimonialsSection = document.querySelector('.testimonials-section-new');
        if (testimonialsSection) {
            gsap.set(".testimonial-card-new", { opacity: 0, x: -50 });
            ScrollTrigger.create({
                trigger: testimonialsSection,
                start: "top 80%",
                once: true,
                onEnter: () => {
                    gsap.to(".testimonial-card-new", { 
                        opacity: 1, 
                        x: 0, 
                        duration: 0.8, 
                        stagger: 0.2,
                        ease: "power3.out"
                    });
                }
            });
        }
    };

    // Page-specific animations for Sobre page
    function initSobrePageAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded, skipping sobre animations');
            return;
        }

        // Register ScrollTrigger if not already
        if (!gsap.plugins.ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
        }

        // Mission text animation - slide from left
        const missionText = document.querySelector('.mission-text');
        if (missionText && !missionText.classList.contains('gsap-animated')) {
            gsap.fromTo(missionText, 
                { x: -100, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: missionText,
                        start: 'top 80%',
                        end: 'bottom 20%',
                        toggleActions: 'play none none reverse'
                    },
                    onComplete: () => missionText.classList.add('gsap-animated')
                }
            );
        }

        // Mission image animation - slide from right
        const missionImage = document.querySelector('.mission-image .image-placeholder');
        if (missionImage && !missionImage.classList.contains('gsap-animated')) {
            gsap.fromTo(missionImage,
                { x: 100, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: missionImage,
                        start: 'top 80%',
                        end: 'bottom 20%',
                        toggleActions: 'play none none reverse'
                    },
                    onComplete: () => missionImage.classList.add('gsap-animated')
                }
            );
        }

        // Values grid animation - sequential appearance
        const valueCards = document.querySelectorAll('.value-card:not(.gsap-animated)');
        if (valueCards.length > 0) {
            gsap.fromTo(valueCards,
                { y: 50, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: 'power2.out',
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: '.values-section',
                        start: 'top 85%',
                        end: 'bottom 15%',
                        toggleActions: 'play none none reverse'
                    },
                    onComplete: () => {
                        valueCards.forEach(card => card.classList.add('gsap-animated'));
                    }
                }
            );
        }

        // Authors grid animation - sequential appearance
        const authorCards = document.querySelectorAll('.author-card:not(.gsap-animated)');
        if (authorCards.length > 0) {
            gsap.fromTo(authorCards,
                { y: 50, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: 'power2.out',
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: '.authors-section',
                        start: 'top 85%',
                        end: 'bottom 15%',
                        toggleActions: 'play none none reverse'
                    },
                    onComplete: () => {
                        authorCards.forEach(card => card.classList.add('gsap-animated'));
                    }
                }
            );
        }

        // Timeline animation - each item slides in alternately
        const timelineItems = document.querySelectorAll('.timeline-item:not(.gsap-animated)');
        timelineItems.forEach((item, index) => {
            const direction = index % 2 === 0 ? -100 : 100; // alternate left/right
            gsap.fromTo(item,
                { x: direction, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: item,
                        start: 'top 80%',
                        end: 'bottom 20%',
                        toggleActions: 'play none none reverse'
                    },
                    onComplete: () => item.classList.add('gsap-animated')
                }
            );
        });
    }

})();
