// ==================================
// SMOOTH ANIMATIONS SYSTEM
// Scroll-reveal, Swup page transitions, micro-interactions
// ==================================

(function () {
    'use strict';

    // ── Configuration ──
    const REVEAL_THRESHOLD = 0.12;       // How much element must be visible
    const REVEAL_ROOT_MARGIN = '0px 0px -40px 0px';
    const STAGGER_DELAY = 80;            // ms between sibling reveals

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
            revealAll();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
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

        const els = document.querySelectorAll(REVEAL_SELECTORS.join(','));

        // Group elements by parent for stagger
        const parentGroups = new Map();
        els.forEach(el => {
            if (el.classList.contains(REVEAL_CLASS)) return;

            el.classList.add(REVEAL_READY_CLASS);

            if (!el.dataset.srDirection) {
                el.dataset.srDirection = getDefaultDirection(el);
            }

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

        els.forEach(el => {
            if (el.classList.contains(REVEAL_READY_CLASS)) {
                observer.observe(el);
            }
        });
    }

    function getDefaultDirection(el) {
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

    // Reset scroll reveal state (for Swup page transitions)
    function resetScrollReveal() {
        // Remove sr- classes so elements can be re-revealed on the new page
        document.querySelectorAll('.sr-ready, .sr-revealed').forEach(el => {
            el.classList.remove(REVEAL_READY_CLASS, REVEAL_CLASS);
            delete el.dataset.srDelay;
            delete el.dataset.srDirection;
        });
    }


    // ── 2. SWUP PAGE TRANSITIONS ──

    let swupInstance = null;

    function initSwup() {
        if (typeof Swup === 'undefined') {
            console.warn('Swup not loaded — page transitions disabled');
            return;
        }

        // Collect plugins
        const plugins = [];

        // Overlay theme (slide cover animation)
        if (typeof SwupOverlayTheme !== 'undefined') {
            plugins.push(new SwupOverlayTheme({
                direction: 'to-right'
            }));
        }

        // Head plugin (updates title, meta, stylesheets)
        if (typeof SwupHeadPlugin !== 'undefined') {
            plugins.push(new SwupHeadPlugin({
                persistAssets: true,      // Don't remove existing scripts/styles
                awaitAssets: true         // Wait for new stylesheets to load
            }));
        }

        // Scripts plugin (re-runs inline/page-specific scripts)
        if (typeof SwupScriptsPlugin !== 'undefined') {
            plugins.push(new SwupScriptsPlugin({
                head: false,              // Don't touch head scripts
                body: true,               // Re-evaluate body scripts
                optin: false              // Run all scripts unless [data-swup-ignore]
            }));
        }

        // Scroll plugin (smooth scroll + scroll to top)
        if (typeof SwupScrollPlugin !== 'undefined') {
            plugins.push(new SwupScrollPlugin({
                doScrollingRightAway: false,
                animateScroll: {
                    betweenPages: true,
                    samePageWithHash: true,
                    samePage: true,
                }
            }));
        }

        // Preload plugin (preload on hover for faster nav)
        if (typeof SwupPreloadPlugin !== 'undefined') {
            plugins.push(new SwupPreloadPlugin());
        }

        swupInstance = new Swup({
            containers: ['#swup'],
            animationSelector: '[class*="swup-transition-"]',
            plugins: plugins,
            cache: true,
            // Links that Swup should ignore
            linkSelector: 'a[href^="' + window.location.origin + '"]:not([data-no-swup]):not([target="_blank"]):not([href*="mailto:"]):not([href*="tel:"]):not([href$=".pdf"]):not([href$=".zip"]):not([download]), a[href^="/"]:not([data-no-swup]):not([target="_blank"]):not([href*="mailto:"]):not([href*="tel:"]):not([href$=".pdf"]):not([href$=".zip"]):not([download])'
        });

        // After new content is rendered, re-initialize everything
        swupInstance.hooks.on('content:replace', () => {
            // Reset and re-run scroll reveal for new content
            resetScrollReveal();
            initScrollReveal();

            // Re-initialize micro-interactions for new DOM
            initMicroInteractions();

            // Re-initialize parallax for new elements
            initParallax();

            // Re-initialize smooth scroll for new anchors
            initSmoothScroll();

            // Re-run the app initialization from main.js
            if (typeof initApp === 'function') {
                try { initApp(); } catch (e) { console.warn('initApp error after Swup transition:', e); }
            }

            // Re-run page-specific init
            if (typeof initPage === 'function') {
                try { initPage(); } catch (e) { console.warn('initPage error after Swup transition:', e); }
            }

            // Re-run animations globals
            if (typeof runAnimations === 'function') {
                try { runAnimations(); } catch (e) {}
            }

            // Update active nav link
            if (typeof updateActiveNavLink === 'function') {
                try { updateActiveNavLink(); } catch (e) {}
            }

            // Initialize swipers for new page
            if (typeof initAllSwipers === 'function') {
                setTimeout(() => {
                    try { initAllSwipers(); } catch (e) {}
                }, 150);
            }
        });

        // Expose swup instance globally
        window.swup = swupInstance;
    }


    // ── 3. MICRO-INTERACTIONS ──

    function initMicroInteractions() {
        // Button ripple effect (event delegation — only attach once)
        if (!window._rippleAttached) {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn, .btn-primary, .btn-secondary, .btn-outline, .btn-large, .icon-btn');
                if (!btn) return;
                createRipple(e, btn);
            });
            window._rippleAttached = true;
        }

        // Card tilt effect on hover (subtle)
        initCardTilt();

        // Magnetic effect on icon buttons
        initMagneticButtons();

        // Smooth counter animations for stat numbers
        initCounterAnimations();
    }

    function createRipple(event, element) {
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
            // Avoid attaching multiple listeners
            if (card._tiltAttached) return;
            card._tiltAttached = true;

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
            if (el._magneticAttached) return;
            el._magneticAttached = true;

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
            const eased = 1 - Math.pow(1 - progress, 3);
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
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            if (anchor._smoothScrollAttached) return;
            anchor._smoothScrollAttached = true;

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


    // ── PERSISTENT OBSERVER for dynamically added content ──

    let persistentObserver = null;

    function createPersistentObserver() {
        if (persistentObserver) return persistentObserver;
        if (typeof IntersectionObserver === 'undefined') return null;

        persistentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const delay = parseInt(el.dataset.srDelay, 10) || 0;
                    if (delay > 0) {
                        setTimeout(() => el.classList.add(REVEAL_CLASS), delay);
                    } else {
                        el.classList.add(REVEAL_CLASS);
                    }
                    persistentObserver.unobserve(el);
                }
            });
        }, {
            threshold: REVEAL_THRESHOLD,
            rootMargin: REVEAL_ROOT_MARGIN
        });

        return persistentObserver;
    }

    function observeNewElements(root) {
        const obs = createPersistentObserver();
        if (!obs) return;

        const els = (root || document).querySelectorAll(REVEAL_SELECTORS.join(','));
        els.forEach(el => {
            if (el.classList.contains(REVEAL_CLASS) || el.classList.contains(REVEAL_READY_CLASS)) return;

            el.classList.add(REVEAL_READY_CLASS);
            if (!el.dataset.srDirection) {
                el.dataset.srDirection = getDefaultDirection(el);
            }
            obs.observe(el);
        });
    }

    // Watch for dynamically added content (books, blog posts loaded via API)
    function initMutationWatcher() {
        if (typeof MutationObserver === 'undefined') return;

        const watcher = new MutationObserver((mutations) => {
            let hasNewNodes = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewNodes = true;
                    break;
                }
            }
            if (hasNewNodes) {
                clearTimeout(watcher._timer);
                watcher._timer = setTimeout(() => observeNewElements(), 100);
            }
        });

        watcher.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    // ── INITIALIZATION ──

    function init() {
        // Core systems
        initScrollReveal();
        initMicroInteractions();
        initParallax();
        initSmoothScroll();

        // Watch for dynamically added elements
        initMutationWatcher();

        // Initialize Swup page transitions (after everything else)
        initSwup();
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
            const obs = createPersistentObserver();
            document.querySelectorAll(selector).forEach(el => {
                if (el.classList.contains(REVEAL_CLASS)) return;

                el.classList.add(REVEAL_READY_CLASS);
                if (!el.dataset.srDirection) {
                    el.dataset.srDirection = 'up';
                }
                if (obs) {
                    obs.observe(el);
                } else {
                    el.classList.add(REVEAL_CLASS);
                }
            });
        }
    };

    window.createAnimationTimeline = function () {
        return null;
    };

    window.createAdvancedAnimations = function () {};
})();
