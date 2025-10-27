// ==================================
// APOIO.JS - Support page functionality
// ==================================

// Initialize support page
function initApoioPage() {
    initSupportTabs();
    initFAQAccordion();
    handleURLHash();
}

// Initialize support tabs
function initSupportTabs() {
    const tabs = document.querySelectorAll('.support-tab');
    const contents = document.querySelectorAll('.support-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all content sections
            contents.forEach(content => content.classList.remove('active'));

            // Show selected content section
            const targetTab = tab.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');

                // Refresh AOS for new content
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
            }

            // Update URL hash without scrolling
            history.replaceState(null, null, `#${targetTab}`);
        });
    });
}

// Initialize FAQ accordion
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Toggle active class
            item.classList.toggle('active');

            // Close other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });
}

// Handle URL hash on page load
function handleURLHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const targetTab = document.querySelector(`[data-tab="${hash}"]`);
        if (targetTab) {
            targetTab.click();
        }
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', handleURLHash);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('apoio.html')) {
            initApoioPage();
        }
    });
} else {
    if (window.location.pathname.includes('apoio.html')) {
        initApoioPage();
    }
}