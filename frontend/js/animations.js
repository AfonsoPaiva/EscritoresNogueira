// ==================================
// SMOOTH ANIMATIONS SYSTEM
// Scroll-reveal, page transitions, micro-interactions
// ==================================

(function () {
    'use strict';

    // ── Configuration ──
    const REVEAL_THRESHOLD = 0.12;       // How much element must be visible
    const REVEAL_ROOT_MARGIN = '0px 0px -40px 0px';
    const STAGGER_DELAY = 80;            // ms between sibling reveals
    const TRANSITION_DURATION = 400;     // ms for page transitions

    // ── 1. SCROLL REVEAL via IntersectionObserver ──

    const REVEAL_SELECTORS = [
        '.section',
        '.hero-content',
        '.page-header',
        '.benefit-card',
        '.blog-card',
        '.book-card',
        '.value-card',
        '.author-card',
        '.timeline-item',
        '.section-header',
        '.footer-section',
        '.about-card',
        '.service-card',
        '.faq-item',
        '.contact-card',
        '.price-card',
        '.team-member',
        '.testimonial-card',
        '.feature-card',
        '.stat-item',
        '.create-book-content',
        '.newsletter-content',
        '.support-section',
        '.support-card',
    ];

    // CSS classes for reveal animations
    const REVEAL_CLASS = 'sr-revealed';
    const REVEAL_READY_CLASS = 'sr-ready';

    function initScrollReveal() {
        if (typeof IntersectionObserver === 'undefined') {
            // Fallback: show everything immediately
            revealAll();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    // Apply stagger delay for sibling elements
                    const delay = el.dataset.srDelay || 0;
                    if (delay > 0) {
                        setTimeout(() => el.classList.add(REVEAL_CLASS), delay);
                    } else {
                        el.classList.add(REVEAL_CLASS);
                    }
                    observer.unobserve(el);
                }
            });
        }, {
            threshold: REVEAL_THRESHOLD,
            rootMargin: REVEAL_ROOT_MARGIN
        });

        // Query all revealable elements
        const els = document.querySelectorAll(REVEAL_SELECTORS.join(','));

        // Group elements by parent for stagger
        const parentGroups = new Map();
        els.forEach(el => {
            // Don't re-process already revealed elements
            if (el.classList.contains(REVEAL_CLASS)) return;

            // Mark as ready (sets initial hidden state via CSS)
            el.classList.add(REVEAL_READY_CLASS);

            // Determine animation direction
            if (!el.dataset.srDirection) {
                el.dataset.srDirection = getDefaultDirection(el);
            }

            // Group siblings for stagger
            const parent = el.parentElement;
            if (parent) {
                if (!parentGroups.has(parent)) {
                    parentGroups.set(parent, []);
                }
                parentGroups.get(parent).push(el);
            }
        });

        // Apply stagger delays to grouped siblings
        parentGroups.forEach((children) => {
            if (children.length > 1) {
                children.forEach((child, i) => {
                    child.dataset.srDelay = i * STAGGER_DELAY;
                });
            }
        });

        // Observe all elements
        els.forEach(el => {
            if (el.classList.contains(REVEAL_READY_CLASS)) {
                observer.observe(el);
            }
        });
    }

    function getDefaultDirection(el) {
        // Assign subtle animation direction based on element type
        if (el.classList.contains('hero-content')) return 'up';
        if (el.classList.contains('benefit-card') ||
            el.classList.contains('blog-card') ||
            el.classList.contains('book-card') ||
            el.classList.contains('value-card') ||
            el.classList.contains('service-card') ||
            el.classList.contains('feature-card') ||
            el.classList.contains('support-card')) return 'up';
        if (el.classList.contains('timeline-item')) return 'left';
        if (el.classList.contains('section-header')) return 'up';
        if (el.classList.contains('footer-section')) return 'up';
        return 'up';
    }

    // Fallback: instantly reveal everything
    function revealAll() {
        if (typeof document === 'undefined') return;
        const els = document.querySelectorAll(
            '[data-aos], .gsap-animated, .sr-ready, ' +
            REVEAL_SELECTORS.join(',')
        );
        els.forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.transform = 'none';
            el.classList.remove(REVEAL_READY_CLASS);
            el.classList.add(REVEAL_CLASS);
        });
    }


    // ── 2. PAGE TRANSITION SYSTEM ──

    function initPageTransitions() {
        // Intercept internal navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Skip external links, hash links, new-tab links, javascript: links
            if (href.startsWith('http') ||
                href.startsWith('//') ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                href.startsWith('javascript:') ||
                link.target === '_blank' ||
                link.hasAttribute('download') ||
                e.ctrlKey || e.metaKey || e.shiftKey) {
                return;
            }

            // This is an internal navigation — apply transition
            e.preventDefault();

            navigateWithTransition(href);
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            animatePageIn();
        });
    }

    function navigateWithTransition(href) {
        // Use View Transitions API if available (Chrome 111+)
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                window.location.href = href;
            });
            return;
        }

        // CSS fallback transition
        const main = document.querySelector('main') || document.querySelector('.site-container');
        if (!main) {
            window.location.href = href;
            return;
        }

        // Animate out
        main.classList.add('page-leaving');
        document.body.classList.add('page-transitioning');

        setTimeout(() => {
            window.location.href = href;
        }, TRANSITION_DURATION);
    }

    function animatePageIn() {
        const main = document.querySelector('main') || document.querySelector('.site-container');
        if (!main) return;

        main.classList.add('page-entering');
        document.body.classList.remove('page-transitioning');

        // Remove the class after animation completes
        main.addEventListener('animationend', () => {
            main.classList.remove('page-entering');
        }, { once: true });

        // Safety fallback to remove class
        setTimeout(() => {
            main.classList.remove('page-entering');
        }, TRANSITION_DURATION + 100);
    }


    // ── 3. MICRO-INTERACTIONS ──

    function initMicroInteractions() {
        // Button ripple effect
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .btn-primary, .btn-secondary, .btn-outline, .btn-large, .icon-btn');
            if (!btn) return;
            createRipple(e, btn);
        });

        // Card tilt effect on hover (subtle)
        initCardTilt();

        // Magnetic effect on icon buttons
        initMagneticButtons();

        // Smooth counter animations for stat numbers
        initCounterAnimations();
    }

    function createRipple(event, element) {
        // Don't add ripple to elements that shouldn't have it
        if (element.classList.contains('no-ripple')) return;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';

        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        ripple.addEventListener('animationend', () => ripple.remove());
    }

    function initCardTilt() {
        const cards = document.querySelectorAll('.benefit-card, .blog-card, .support-card');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / centerY * -3;
                const rotateY = (x - centerX) / centerX * 3;

                card.style.transform =
                    `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    function initMagneticButtons() {
        const magneticEls = document.querySelectorAll('.icon-btn');

        magneticEls.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    function initCounterAnimations() {
        const counters = document.querySelectorAll('[data-counter]');
        if (counters.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(el => observer.observe(el));
    }

    function animateCounter(el) {
        const target = parseInt(el.dataset.counter, 10);
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(target * eased);
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }


    // ── 4. PARALLAX EFFECTS ──

    function initParallax() {
        const parallaxEls = document.querySelectorAll('[data-parallax]');
        if (parallaxEls.length === 0) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.pageYOffset;

                    parallaxEls.forEach(el => {
                        const speed = parseFloat(el.dataset.parallax) || 0.3;
                        const rect = el.getBoundingClientRect();
                        const offset = (rect.top + scrollY) * speed;
                        el.style.transform = `translateY(${scrollY * speed - offset}px)`;
                    });

                    ticking = false;
                });
                ticking = true;
            }
        });
    }


    // ── 5. SMOOTH SCROLL ENHANCEMENTS ──

    function initSmoothScroll() {
        // Enhance anchor links with smooth offset
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#' || href.length <= 1) return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerHeight = document.getElementById('header')?.offsetHeight || 80;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }


    // ── INITIALIZATION ──

    function init() {
        // Page entrance animation
        animatePageIn();

        // Core systems
        initScrollReveal();
        initPageTransitions();
        initMicroInteractions();
        initParallax();
        initSmoothScroll();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── GLOBAL API (backward compatibility) ──

    window.initGSAPAnimations = function () {
        initScrollReveal();
        return Promise.resolve(true);
    };

    window.runAnimations = function () {
        initScrollReveal();
    };

    window.animateElements = function (selector) {
        if (selector && typeof document !== 'undefined') {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add(REVEAL_READY_CLASS);
                el.classList.add(REVEAL_CLASS);
            });
        }
    };

    window.createAnimationTimeline = function () {
        return null;
    };

    window.createAdvancedAnimations = function () {};
})();
