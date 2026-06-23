// Animations - GSAP (flicker-free, smooth)
(function () {

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** Immediately set an element to its "resting" state so CSS initial opacity:0
     *  is overridden before GSAP starts – prevents the blank flash on page load. */
    function primeElement(el) {
        if (!el || el._gsapPrimed) return;
        el._gsapPrimed = true;
        gsap.set(el, { visibility: 'visible' });
    }

    /** Returns true if the element is (at least partly) inside the viewport. */
    function isInViewport(el) {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
    }

    /** Horizontal bias of an element (used to pick slide direction). */
    function hBias(el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const vw = window.innerWidth;
        if (cx < vw * 0.38) return 'left';
        if (cx > vw * 0.62) return 'right';
        return 'center';
    }

    /** Build from/to props for a standard reveal animation. */
    function buildRevealProps(el, overrideFrom) {
        const bias = hBias(el);
        const from = overrideFrom || {
            opacity: 0,
            x: bias === 'left' ? -40 : bias === 'right' ? 40 : 0,
            y: bias === 'center' ? 40 : 20,
        };
        const to = {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.65,
            ease: 'power3.out',
        };
        return { from, to };
    }

    // ─── Core reveal with ScrollTrigger (once = no reverse flicker) ──────────────

    /**
     * Animate a single element in on scroll.
     * Rules that eliminate flickering:
     *   • `once: true` / `toggleActions: 'play none none none'` → never reverses.
     *   • No `clearProps: 'all'` → GSAP keeps opacity:1 / transform:none inline.
     *   • Guard with `gsap-animated` so duplicates are ignored.
     */
    function revealOnScroll(el, opts = {}) {
        if (!el || el.classList.contains('gsap-animated')) return;
        if (typeof gsap === 'undefined') return;

        el.classList.add('gsap-animated');
        primeElement(el);

        const { from, to } = buildRevealProps(el, opts.from);
        const delay = opts.delay || 0;

        if (isInViewport(el)) {
            // Already visible → play immediately (small stagger delay only)
            gsap.fromTo(el, from, { ...to, delay });
        } else if (typeof ScrollTrigger !== 'undefined') {
            gsap.fromTo(el, from, {
                ...to,
                delay,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    toggleActions: 'play none none none', // never reverses
                },
            });
        } else {
            gsap.fromTo(el, from, { ...to, delay });
        }
    }

    /** Stagger-reveal a list of elements (used for grids / card rows). */
    function revealGroup(elements, baseDelay = 0, fromOverride) {
        const els = Array.from(elements).filter(
            (el) => el && !el.classList.contains('gsap-animated')
        );
        if (!els.length) return;

        els.forEach((el, i) => {
            revealOnScroll(el, {
                delay: baseDelay + i * 0.07,
                from: fromOverride,
            });
        });
    }

    // ─── AOS-compat map ─────────────────────────────────────────────────────────

    function mapAosFrom(name) {
        switch ((name || '').toLowerCase()) {
            case 'fade-up':    return { opacity: 0, y: 30 };
            case 'fade-down':  return { opacity: 0, y: -30 };
            case 'fade-left':  return { opacity: 0, x: -30 };
            case 'fade-right': return { opacity: 0, x: 30 };
            case 'slide-up':   return { opacity: 0, y: 50 };
            case 'slide-down': return { opacity: 0, y: -50 };
            case 'slide-left': return { opacity: 0, x: -50 };
            case 'slide-right':return { opacity: 0, x: 50 };
            default:           return { opacity: 0, y: 30 };
        }
    }

    // ─── initGSAPAnimations (called once on DOMContentLoaded) ───────────────────

    window.initGSAPAnimations = function () {
        return new Promise((resolve) => {
            if (typeof gsap === 'undefined') return resolve(false);

            // Register ScrollTrigger if needed
            if (typeof ScrollTrigger !== 'undefined') {
                try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
            }

            /* ── [1] data-aos elements ───────────────────────────────────── */
            document.querySelectorAll('[data-aos]:not(.gsap-animated)').forEach((el) => {
                const type    = el.getAttribute('data-aos') || 'fade-up';
                const delayMs = parseInt(el.getAttribute('data-aos-delay')) || 0;
                const from    = mapAosFrom(type);

                // Never animate opacity on images (causes blinking)
                if (el.tagName === 'IMG' || el.closest?.('.book-image')) {
                    delete from.opacity;
                }

                el.classList.add('gsap-animated');
                primeElement(el);

                gsap.fromTo(el, from, {
                    opacity: 1, x: 0, y: 0,
                    duration: 0.65,
                    delay: delayMs / 1000,
                    ease: 'power3.out',
                });
            });

            /* ── [2] Auto-animate focused card/item selectors ────────────── */
            // Only target genuinely discrete card-like elements, not containers.
            const CARD_SELECTORS = [
                '.benefit-card',
                '.value-card',
                '.author-card',
                '.timeline-item',
                '.blog-card',
                '.plan-card',
                '.testimonial-card',
                '.faq-item',
                '.process-step',
                '.feature-item',
                '.stat-card',
            ];

            CARD_SELECTORS.forEach((sel) => {
                const els = document.querySelectorAll(`${sel}:not(.gsap-animated)`);
                if (els.length) revealGroup(els);
            });

            /* ── [3] Benefits grid (desktop vs mobile direction) ─────────── */
            document.querySelectorAll('.benefits-grid:not(.gsap-animated)').forEach((grid) => {
                grid.classList.add('gsap-animated');
                const cards = grid.querySelectorAll('.benefit-card:not(.gsap-animated)');
                const isMobile = window.innerWidth < 768;
                cards.forEach((card, i) => {
                    revealOnScroll(card, {
                        delay: i * 0.1,
                        from: isMobile
                            ? { opacity: 0, x: 50, y: 40 }
                            : { opacity: 0, y: 60 },
                    });
                });
            });

            /* ── [4] Section headers ─────────────────────────────────────── */
            document.querySelectorAll('.section-header:not(.gsap-animated)').forEach((el) => {
                revealOnScroll(el, { from: { opacity: 0, y: 25 } });
            });

            /* ── [5] Blog preview sections ───────────────────────────────── */
            document.querySelectorAll('.blog-preview').forEach((section) => {
                const header = section.querySelector('.section-header:not(.gsap-animated)');
                if (header) revealOnScroll(header, { from: { opacity: 0, y: 30 } });

                const grid = section.querySelector('.blog-grid:not(.gsap-animated)');
                if (grid) {
                    grid.classList.add('gsap-animated');
                    revealGroup(Array.from(grid.children));
                }

                const footer = section.querySelector('.section-footer:not(.gsap-animated)');
                if (footer) revealOnScroll(footer, { from: { opacity: 0, y: 30 } });
            });

            /* ── [6] ScrollTrigger refresh ───────────────────────────────── */
            if (typeof ScrollTrigger !== 'undefined') {
                try { ScrollTrigger.refresh(); } catch (_) {}
            }

            resolve(true);
        });
    };

    // ─── runAnimations (called after initApp / DOM is ready) ────────────────────

    window.runAnimations = function () {
        if (typeof gsap === 'undefined') return;

        /* ── Header entrance (once, downward slide) ──────────────────────── */
        try {
            const logo     = document.querySelector('.navbar .logo');
            const navItems = Array.from(document.querySelectorAll('.navbar .nav-menu > li'));
            const actions  = Array.from(document.querySelectorAll('.navbar .nav-actions > *'));
            const seq      = [logo, ...navItems, ...actions].filter(Boolean);

            if (seq.length) {
                // Prime all so they're not invisible before GSAP runs
                seq.forEach(primeElement);
                gsap.fromTo(
                    seq,
                    { y: -20, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 0.55,
                        stagger: 0.06,
                        ease: 'power3.out',
                        onComplete: () => seq.forEach(el => el.classList.add('gsap-animated')),
                    }
                );
            }
        } catch (_) {}

        /* ── Hero entrance ───────────────────────────────────────────────── */
        const heroTitle    = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroButtons  = Array.from(document.querySelectorAll('.hero-content .btn'));
        const heroEls = [heroTitle, heroSubtitle, ...heroButtons]
            .filter(el => el && !el.classList.contains('gsap-animated'));

        if (heroEls.length) {
            heroEls.forEach(primeElement);
            gsap.fromTo(
                heroEls,
                { y: -25, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.75,
                    stagger: 0.15,
                    ease: 'power3.out',
                    onComplete: () => {
                        heroEls.forEach(el => el.classList.add('gsap-animated'));
                        const hc = document.querySelector('.hero-content');
                        if (hc) hc.classList.add('gsap-animated');
                    },
                }
            );
        }

        /* ── Page headers ────────────────────────────────────────────────── */
        document.querySelectorAll('.page-header:not([data-aos]):not(.gsap-animated)').forEach(el => {
            primeElement(el);
            gsap.fromTo(el,
                { y: -25, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.75, ease: 'power3.out',
                    onComplete: () => el.classList.add('gsap-animated'),
                }
            );
        });

        /* ── Sections (scroll-triggered, once) ───────────────────────────── */
        document.querySelectorAll('.section:not([data-aos]):not(.gsap-animated)').forEach((section, i) => {
            revealOnScroll(section, {
                delay: Math.min(i * 0.04, 0.3),
                from: { opacity: 0, y: 45 },
            });
        });

        /* ── create-book-content ─────────────────────────────────────────── */
        document.querySelectorAll('.create-book-content:not(.gsap-animated)').forEach(el => {
            const isMobile = window.innerWidth < 768;
            revealOnScroll(el, {
                from: isMobile ? { opacity: 0, x: -50 } : { opacity: 0, y: 50 },
            });
        });

        /* ── books-catalog ───────────────────────────────────────────────── */
        document.querySelectorAll('.books-catalog:not(.gsap-animated)').forEach(el => {
            revealOnScroll(el, { from: { opacity: 0, y: 50 } });
        });

        /* ── Featured swiper slides ──────────────────────────────────────── */
        document.querySelectorAll('.featured-swiper:not(.gsap-animated)').forEach(container => {
            container.classList.add('gsap-animated');
            const targets = Array.from(
                container.querySelectorAll('.swiper-slide .book-card, .swiper-slide')
            ).filter(el => !el.classList.contains('gsap-animated'));

            if (targets.length) revealGroup(targets, 0, { opacity: 0, y: 40 });
        });

        /* ── Parallax elements ───────────────────────────────────────────── */
        if (typeof ScrollTrigger !== 'undefined') {
            document.querySelectorAll('[data-parallax]').forEach(el => {
                const speed = parseFloat(el.getAttribute('data-parallax')) || 0.5;
                gsap.to(el, {
                    yPercent: -50 * speed,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                });
            });
        }

        /* ── Finalise ────────────────────────────────────────────────────── */
        initMouseEffects();

        if (typeof ScrollTrigger !== 'undefined') {
            try { ScrollTrigger.refresh(); } catch (_) {}
        }

        if (document.body.classList.contains('page-sobre')) {
            initSobrePageAnimations();
        }

        createAdvancedAnimations();
    };

    // ─── Mouse hover micro-effects ───────────────────────────────────────────────

    function initMouseEffects() {
        const targets = document.querySelectorAll(
            '.book-card, .btn, .service-card, .benefit-card, .card'
        );

        targets.forEach(el => {
            if (el._mouseEffectBound) return;
            el._mouseEffectBound = true;

            el.addEventListener('mouseenter', () => {
                gsap.to(el, { scale: 1.03, y: -3, duration: 0.25, ease: 'power2.out' });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(el, { scale: 1, y: 0, duration: 0.25, ease: 'power2.out' });
            });
            el.addEventListener('mousedown', () => {
                gsap.to(el, { scale: 0.97, duration: 0.08, ease: 'power2.out' });
            });
            el.addEventListener('mouseup', () => {
                gsap.to(el, { scale: 1.03, duration: 0.12, ease: 'power2.out' });
            });
        });
    }

    // ─── Advanced (special sections) ────────────────────────────────────────────

    window.createAdvancedAnimations = function () {
        if (typeof ScrollTrigger === 'undefined') return;

        /* Horizontal scroll */
        document.querySelectorAll('.horizontal-scroll').forEach(section => {
            const container = section.querySelector('.horizontal-container');
            if (!container) return;
            gsap.to(container, {
                xPercent: -100 * (container.children.length - 1),
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${container.scrollWidth}`,
                    pin: true, scrub: 1, invalidateOnRefresh: true,
                },
            });
        });

        /* Reveal text (clip-path) */
        document.querySelectorAll('.reveal-text').forEach(el => {
            gsap.fromTo(el,
                { clipPath: 'inset(0 100% 0 0)' },
                {
                    clipPath: 'inset(0 0% 0 0)', ease: 'none',
                    scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 15%', scrub: true },
                }
            );
        });

        /* Letter-by-letter */
        document.querySelectorAll('.animate-letters').forEach(el => {
            const text = el.textContent;
            el.innerHTML = text.split('').map(c => `<span>${c}</span>`).join('');
            gsap.fromTo(el.querySelectorAll('span'),
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0, stagger: 0.05, ease: 'power2.out',
                    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
                }
            );
        });

        /* Plans section */
        const plansSection = document.querySelector('.plans-section-final');
        if (plansSection) {
            const isMobile = window.innerWidth < 768;
            gsap.set('.plan-card-new', isMobile ? { opacity: 0, x: -60 } : { opacity: 0, y: 50 });
            ScrollTrigger.create({
                trigger: plansSection, start: 'top 80%', once: true,
                onEnter: () => {
                    if (isMobile) {
                        gsap.to('.plan-card-new:nth-child(1)', { opacity: 1, x: 0, duration: 0.8, delay: 0.1 });
                        gsap.to('.plan-card-new:nth-child(2)', { opacity: 1, x: 0, duration: 0.8, delay: 0.35 });
                        gsap.to('.plan-card-new:nth-child(3)', { opacity: 1, x: 0, duration: 0.8, delay: 0.6 });
                    } else {
                        gsap.to('.plan-card-new:nth-child(1)', { opacity: 1, y: 0, duration: 0.8, delay: 0.1 });
                        gsap.to('.plan-card-new:nth-child(3)', { opacity: 1, y: 0, duration: 0.8, delay: 0.35 });
                        gsap.to('.plan-card-new:nth-child(2)', { opacity: 1, y: 0, duration: 0.8, delay: 0.6 });
                    }
                },
            });
        }

        /* Process steps */
        const processSteps = document.querySelector('.process-steps-horizontal');
        if (processSteps) {
            gsap.set('.process-step-h', { opacity: 0, x: -50 });
            ScrollTrigger.create({
                trigger: processSteps, start: 'top 80%', once: true,
                onEnter: () => gsap.to('.process-step-h', {
                    opacity: 1, x: 0, duration: 0.8, stagger: 0.25, ease: 'power3.out',
                }),
            });
        }

        /* KDP info cards */
        const kdpSection = document.querySelector('.kdp-info-section');
        if (kdpSection) {
            gsap.set('.kdp-info-card', { opacity: 0, y: 50 });
            ScrollTrigger.create({
                trigger: kdpSection, start: 'top 80%', once: true,
                onEnter: () => gsap.to('.kdp-info-card', {
                    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
                }),
            });
        }

        /* Testimonials */
        const testimonialsSection = document.querySelector('.testimonials-section-new');
        if (testimonialsSection) {
            gsap.set('.testimonial-card-new', { opacity: 0, x: -50 });
            ScrollTrigger.create({
                trigger: testimonialsSection, start: 'top 80%', once: true,
                onEnter: () => gsap.to('.testimonial-card-new', {
                    opacity: 1, x: 0, duration: 0.8, stagger: 0.18, ease: 'power3.out',
                }),
            });
        }
    };

    // ─── Sobre page ──────────────────────────────────────────────────────────────

    function initSobrePageAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        const missionText = document.querySelector('.mission-text:not(.gsap-animated)');
        if (missionText) {
            revealOnScroll(missionText, { from: { opacity: 0, x: -80 } });
        }

        const missionImg = document.querySelector('.mission-image .image-placeholder:not(.gsap-animated)');
        if (missionImg) {
            revealOnScroll(missionImg, { from: { opacity: 0, x: 80 } });
        }

        revealGroup(document.querySelectorAll('.value-card:not(.gsap-animated)'));
        revealGroup(document.querySelectorAll('.author-card:not(.gsap-animated)'));

        document.querySelectorAll('.timeline-item:not(.gsap-animated)').forEach((item, i) => {
            revealOnScroll(item, {
                from: { opacity: 0, x: i % 2 === 0 ? -80 : 80 },
            });
        });
    }

    // ─── Public utility: animate elements on demand ──────────────────────────────

    window.animateElements = function (selector, animationType = 'fade-up') {
        document.querySelectorAll(selector).forEach(el => {
            if (el.classList.contains('gsap-animated')) return;
            revealOnScroll(el, { from: mapAosFrom(animationType) });
        });
    };

    window.createAnimationTimeline = function (elements, opts = {}) {
        if (typeof gsap === 'undefined') return null;
        const { stagger = 0.1, duration = 0.65, ease = 'power2.out',
            from = { opacity: 0, y: 30 } } = opts;
        const tl = gsap.timeline();
        tl.fromTo(elements, from, { opacity: 1, x: 0, y: 0, duration, stagger, ease });
        return tl;
    };

})();
