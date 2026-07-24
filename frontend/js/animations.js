// GSAP animations disabled per user request to prevent flickering and layout jumping.
(function () {
    function revealAll() {
        if (typeof document === 'undefined') return;
        const els = document.querySelectorAll('[data-aos], .gsap-animated, .benefit-card, .value-card, .author-card, .timeline-item, .blog-card, .section, .hero-content, .page-header, .book-card, .swiper-slide');
        els.forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.transform = 'none';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', revealAll);
    } else {
        revealAll();
    }

    window.initGSAPAnimations = function () {
        revealAll();
        return Promise.resolve(true);
    };

    window.runAnimations = function () {
        revealAll();
    };

    window.animateElements = function (selector) {
        if (selector && typeof document !== 'undefined') {
            document.querySelectorAll(selector).forEach(el => {
                el.style.opacity = '1';
                el.style.visibility = 'visible';
                el.style.transform = 'none';
            });
        }
    };

    window.createAnimationTimeline = function () {
        return null;
    };

    window.createAdvancedAnimations = function () {};
})();
