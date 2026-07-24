// ==================================
// MAIN.JS - GSAP Integration
// ==================================

// reCAPTCHA configuration
window.recaptchaSiteKey = null;
// Flag set when Google reCAPTCHA calls onload
window.recaptchaReady = false;

// Called by the reCAPTCHA script when ready (via ?onload=onRecaptchaLoad)
window.onRecaptchaLoad = function() {
    try {
        console.log('recaptcha: onRecaptchaLoad called');
        window.recaptchaReady = true;
    } catch (e) { console.warn('onRecaptchaLoad handler error', e); }
};

// Initialize on first load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize in correct order and wait for async library loads
    (async function start() {
        try {
            await Promise.all([ensureGSAP(), ensureSwiper()]);
            await initGSAPAnimations();
        } catch (e) {
            console.warn('Library load warning:', e);
        }

        loadRecaptchaConfig();
        initApp();

        // Run animations after app init and after libraries are ready
        if (typeof runAnimations === 'function') {
            runAnimations();
        }
        if (typeof ScrollTrigger !== 'undefined') {
            try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); }
        }

        // Initialize swipers for the initial page load
        setTimeout(() => {
            if (typeof initAllSwipers === 'function') {
                initAllSwipers();
            }
        }, 100);
    })();
});

// Initialize GSAP
function initGSAP() {
    return false;
}

function ensureGSAP() {
    return Promise.resolve(false);
}

// Ensure Swiper library is available (load from CDN if missing)
function ensureSwiper() {
    return new Promise((resolve, reject) => {
        if (typeof Swiper !== 'undefined') return resolve(true);

        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = (e) => reject(new Error('Failed to load Swiper'));
        document.head.appendChild(s);
    });
}

// Delegating wrapper for animations (moved to js/animations.js)
function initGSAPAnimations() {
    // Avoid calling itself if this global refers to this function
    if (typeof window.initGSAPAnimations === 'function' && window.initGSAPAnimations !== initGSAPAnimations) {
        try {
            return window.initGSAPAnimations();
        } catch (e) {
            console.warn('window.initGSAPAnimations threw', e);
            return Promise.resolve(false);
        }
    }
    return Promise.resolve(false);
}

// Load reCAPTCHA configuration
async function loadRecaptchaConfig() {
    try {
        const apiBase = window.API_BASE || 'http://localhost:8080/api';
        const response = await fetch(`${apiBase}/auth/recaptcha-config`);
        if (response.ok) {
            const config = await response.json();
            window.recaptchaSiteKey = config.siteKey;
            loadRecaptchaScript();
        }
    } catch (error) {
        // Backend disabled; ignore reCAPTCHA config fetch error
    }
}

// Load reCAPTCHA script
function loadRecaptchaScript() {
    if (!window.recaptchaSiteKey || window.recaptchaSiteKey === 'test-site' || document.querySelector('script[src*="recaptcha"]')) {
        return;
    }

    // Prepare a protective grecaptcha stub to intercept early render/execute calls
    if (!window.__grecaptcha_stub_installed) {
        window.__grecaptcha_stub_installed = true;
        (function(){
            const q = [];
            function stubReady(cb){ q.push({type:'ready', cb}); }
            function stubRender(container, opts){ q.push({type:'render', args:[container, opts]}); return null; }
            function stubExecute(...args){ q.push({type:'execute', args}); return Promise.resolve(null); }
            window.grecaptcha = window.grecaptcha || { render: stubRender, execute: stubExecute, ready: stubReady };
            // Expose a flush method to replace stub with real grecaptcha later
            window.__grecaptcha_stub_queue = q;
        })();
    }

    // Load reCAPTCHA with the site key so grecaptcha.execute(siteKey) is valid (v3)
    const script = document.createElement('script');
    const rk = window.recaptchaSiteKey ? encodeURIComponent(window.recaptchaSiteKey) : 'explicit';
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=${rk}&hl=pt`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        console.log('🔒 reCAPTCHA script loaded');
        // Do NOT auto-render an invisible v2 widget here. Modules that need a v2 challenge
        // should render and execute it explicitly (auth.js handles that when backend requests a challenge).
        // Start instrumentation to help debug recaptcha flows (wrapping grecaptcha and network)
        (function instrumentRecaptcha() {
            const start = Date.now();
            let attempts = 0;
            const maxAttempts = 50;
            const interval = setInterval(() => {
                attempts++;
                    if (window.grecaptcha) {
                    clearInterval(interval);
                    try {
                        // If a stub queue exists, flush queued calls, but intercept any render of invisible widgets
                        const q = window.__grecaptcha_stub_queue || [];
                        const real = window.grecaptcha;

                        // Wrap real methods to add debug logging
                        const origRender = real.render.bind(real);
                        const origExecute = real.execute.bind(real);
                        const origReady = real.ready.bind(real);

                        real.render = function(container, opts) {
                                                try {
                                                    console.warn('recaptcha.debug: real grecaptcha.render called', { container, opts });
                                                    // Log headers for debugging
                                                    console.warn('recaptcha.debug: headers before render', {
                                                        referer: document.referrer,
                                                        origin: window.location.origin,
                                                        ua: navigator.userAgent,
                                                        href: window.location.href
                                                    });
                                                } catch(e){}
                                                return origRender(container, opts);
                                            };

                        real.execute = function(...args) {
                            console.warn('recaptcha.debug: real grecaptcha.execute called', { args });
                            return origExecute(...args);
                        };

                        real.ready = function(cb) {
                            console.log('recaptcha.debug: real grecaptcha.ready registered');
                            return origReady(cb);
                        };

                        // Flush queued stub calls
                        while (q.length) {
                            const item = q.shift();
                            try {
                                if (item.type === 'render') {
                                    real.render(item.args[0], item.args[1]);
                                } else if (item.type === 'execute') {
                                    real.execute(...item.args);
                                } else if (item.type === 'ready') {
                                    real.ready(item.cb);
                                }
                            } catch(e) {
                                console.warn('recaptcha.debug: error flushing queued item', e);
                            }
                        }

                        // Replace the stub queue reference
                        window.__grecaptcha_stub_queue = [];

                        // Expose debug flag
                        window.__recaptcha_debug = true;
                    } catch (e) {
                        console.error('recaptcha.debug: instrumentation failed', e);
                    }

                    // Wrap fetch to detect recaptcha network calls
                    if (window.fetch && !window.__recaptcha_fetch_wrapped) {
                        const origFetch = window.fetch;
                        window.fetch = function(resource, init) {
                            try {
                                const url = (typeof resource === 'string') ? resource : (resource && resource.url);
                                if (url && url.includes('recaptcha')) {
                                    console.warn('recaptcha.net: fetch ->', url, init && init.method, { time: new Date().toISOString(), ua: navigator.userAgent, href: window.location.href });
                                }
                            } catch (e) {}
                            return origFetch.apply(this, arguments).then(resp => {
                                try {
                                    const url = (typeof resource === 'string') ? resource : (resource && resource.url);
                                    if (url && url.includes('recaptcha')) {
                                        console.warn('recaptcha.net: fetch response', { url, status: resp.status, time: new Date().toISOString() });
                                    }
                                } catch (e) {}
                                return resp;
                            });
                        };
                        window.__recaptcha_fetch_wrapped = true;
                    }

                    // Wrap XHR send to detect recaptcha requests (older internal libs)
                    if (window.XMLHttpRequest && !window.__recaptcha_xhr_wrapped) {
                        const XHR = window.XMLHttpRequest;
                        const origOpen = XHR.prototype.open;
                        const origSend = XHR.prototype.send;
                        XHR.prototype.open = function(method, url) {
                            this.__recaptcha_url = url;
                            this.__recaptcha_method = method;
                            return origOpen.apply(this, arguments);
                        };
                        XHR.prototype.send = function(body) {
                            try {
                                if (this.__recaptcha_url && this.__recaptcha_url.includes('recaptcha')) {
                                    console.warn('recaptcha.net: XHR send ->', this.__recaptcha_method, this.__recaptcha_url, { time: new Date().toISOString(), ua: navigator.userAgent, href: window.location.href });
                                    this.addEventListener('loadend', function() {
                                        try { console.warn('recaptcha.net: XHR response', { url: this.__recaptcha_url, status: this.status, time: new Date().toISOString() }); } catch(e){}
                                    });
                                }
                            } catch (e) {}
                            return origSend.apply(this, arguments);
                        };
                        window.__recaptcha_xhr_wrapped = true;
                    }
                }
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.warn('recaptcha.debug: grecaptcha not found after polling attempts', { attempts, elapsedMs: Date.now() - start });
                }
            }, 200);
        })();
    };
    document.head.appendChild(script);
}

// Detect iOS devices (iPhone / iPad / iPod / iPadOS) and provide a safe execute wrapper
function isIOSDevice() {
    try {
        const ua = navigator.userAgent || '';
        if (/iP(hone|od|ad)/i.test(ua)) return true;
        // iPadOS 13+ reports MacIntel
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    } catch (e) {}
    return false;
}

// Use this wrapper everywhere to avoid triggering Private-Token / PAT flows on iOS Safari
window.safeRecaptchaExecute = async function(siteKey, opts) {
    if (!siteKey) return null;
    if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
        try {
            await new Promise(resolve => grecaptcha.ready(resolve));
            return await grecaptcha.execute(siteKey, opts || {});
        } catch (e) {
            console.warn('recaptcha.debug: safeRecaptchaExecute failed', e);
            return null;
        }
    }
    // grecaptcha not available
    return null;
};
// Expose helper globally for other modules
try { window.isIOSDevice = isIOSDevice; } catch (e) {}

// Render a visible v2 reCAPTCHA (compact) and return a Promise resolving to the token
// Note: v2 interactive fallback removed — use v3 execute() exclusively

// Enhanced Swiper initialization utility
function initSwiper(selector, config) {
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper library not loaded - attempting to load...');
        // Try to load Swiper dynamically
        ensureSwiper().then(() => {
            initSwiper(selector, config);
        }).catch(err => {
            console.error('Failed to load Swiper:', err);
        });
        return null;
    }

    // Destroy existing swiper if it exists
    const existingSwiper = document.querySelector(selector)?.swiper;
    if (existingSwiper) {
        existingSwiper.destroy(true, true);
    }

    // Check if container has slides
    const container = document.querySelector(selector);
    if (!container) {
        console.warn(`Swiper container ${selector} not found`);
        return null;
    }

    const wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper || wrapper.children.length === 0) {
        return null;
    }

    // Add loading class
    container.classList.add('swiper-loading');

    // Create swiper with delay to ensure DOM is ready
    setTimeout(() => {
        const swiper = new Swiper(selector, {
            ...config,
            on: {
                ...config.on,
                init: function() {
                    container.classList.remove('swiper-loading');
                    if (config.on && config.on.init) config.on.init.call(this);
                },
                slideChange: function() {
                    // Refresh AOS for new visible slides
                    if (typeof AOS !== 'undefined') {
                        if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
                        if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
                    }
                    if (config.on && config.on.slideChange) config.on.slideChange.call(this);
                }
            }
        });

        // Store swiper instance on container for later access
        container.swiper = swiper;
        return swiper;
    }, 100);
}

// Run GSAP animations


// Initialize app functionality
function initApp() {
    initMobileMenu();
    initHeaderScroll();
    initSearch();
    initPage();
    updateActiveNavLink();
    initNewsletter();
    
    // Remove loading class after initialization
    document.body.classList.remove('loading');
}

// Mobile menu functionality
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && hamburger.classList.contains('active')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initHeaderScroll() {
    const header = document.getElementById('header');
    const fixedButtons = document.getElementById('fixedHeaderButtons');
    if (!header) return;

    let lastScrollTop = 0;
    let isHeaderHidden = false;

    // Function to check if we should show fixed buttons based on screen size
    const shouldShowFixedButtons = () => {
        const width = window.innerWidth || document.documentElement.clientWidth;
        // Show fixed buttons on mobile/tablet, hide on desktop
        return width <= 768;
    };

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add scrolled class for background change
        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header based on scroll direction, but only on mobile
        if (shouldShowFixedButtons()) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down - hide header and show fixed buttons
                if (!isHeaderHidden) {
                    header.style.transform = 'translateY(-100%)';
                    if (fixedButtons) {
                        fixedButtons.classList.add('show');
                    }
                    isHeaderHidden = true;
                }
            } else {
                // Scrolling up - show header and hide fixed buttons
                if (isHeaderHidden) {
                    header.style.transform = 'translateY(0)';
                    if (fixedButtons) {
                        fixedButtons.classList.remove('show');
                    }
                    isHeaderHidden = false;
                }
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // Handle window resize to adjust behavior
    window.addEventListener('resize', () => {
        if (!shouldShowFixedButtons() && fixedButtons) {
            fixedButtons.classList.remove('show');
            if (isHeaderHidden) {
                header.style.transform = 'translateY(0)';
                isHeaderHidden = false;
            }
        }
    });
}

function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    let booksData = [];
    let blogPosts = [];

    // Load data securely
    const loadSearchData = async () => {
        try {
            if (booksData.length === 0) {
                booksData = await api.getBooks();
            }
            if (blogPosts.length === 0) {
                blogPosts = await api.getBlogPosts();
            }
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    };

    const searchContainer = searchOverlay ? searchOverlay.querySelector('.search-container') : null;
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            if (searchOverlay) {
                searchOverlay.style.display = 'block';
                searchOverlay.style.transform = 'none';
                searchOverlay.classList.add('active');
            }

            setTimeout(() => searchInput && searchInput.focus(), 120);
            await loadSearchData();
        });
    }

    if (closeSearch) {
        closeSearch.addEventListener('click', () => {
            if (searchOverlay) {
                searchOverlay.classList.remove('active');
                searchOverlay.style.display = 'none';
            }
        });
    }
                searchOverlay.classList.remove('active');
                setTimeout(() => searchOverlay.style.display = 'none', 550);
            }

            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.innerHTML = '';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            const bookResults = booksData.filter(book =>
                (book.title && book.title.toLowerCase().includes(query)) ||
                (book.author && book.author.toLowerCase().includes(query)) ||
                (book.category && book.category.toLowerCase().includes(query))
            ).slice(0, 3).map(book => ({
                type: 'book',
                title: book.title,
                subtitle: `${book.author} • ${book.category}`,
                url: book.slug ? `/livro/${book.slug}` : `/livro/${book.id}`,
                image: book.image
            }));

            const postResults = blogPosts.filter(post =>
                (post.title && post.title.toLowerCase().includes(query)) ||
                (post.excerpt && post.excerpt.toLowerCase().includes(query)) ||
                (post.category && post.category.toLowerCase().includes(query))
            ).slice(0, 3).map(post => ({
                type: 'post',
                title: post.title,
                subtitle: post.excerpt ? post.excerpt.substring(0, 100) + '...' : post.category,
                url: post.slug ? `/artigo/${post.slug}` : `/artigo/${post.id}`,
                image: post.image
            }));

            const allResults = [...bookResults, ...postResults];

            if (allResults.length === 0) {
                searchResults.innerHTML = '<p class="no-results">Nenhum resultado encontrado</p>';
                return;
            }

            const resultsHTML = allResults.map(result =>
                `<a href="${result.url}" class="search-result-item">
                    <div class="search-result-image">
                        ${result.image ? `<img src="${result.image}" alt="${result.title}" loading="lazy">` : '<i class="fas fa-book"></i>'}
                    </div>
                    <div class="search-result-content">
                        <h4>${result.title}</h4>
                        <p>${result.subtitle}</p>
                        <span class="search-result-type">${result.type === 'book' ? 'Livro' : 'Artigo'}</span>
                    </div>
                </a>`
            ).join('');
            
            // Use DOMPurify if available, otherwise use innerHTML directly (data is from our own API)
            searchResults.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(resultsHTML) : resultsHTML;
        });
    }
}

function initPage() {
    const path = window.location.pathname;

    if (document.getElementById('featuredBooks')) {
        loadFeaturedBooks().catch(() => {});
    }
    if (document.getElementById('latestBlogPosts')) {
        loadLatestBlogPosts().catch(() => {});
    }

    if (path.includes('livros.html') || path.endsWith('/livros')) {
        loadBooks();
        attachFilters();
        applyURLFilters();
    } else if (path.includes('blog.html') || path.endsWith('/blog')) {
        loadBlogPosts();
    } else if (path.includes('artigo.html') || path.includes('/artigo')) {
        try {
            if (typeof initArticlePage === 'function') {
                initArticlePage();
            }
        } catch (e) {}
    }
}

async function loadFeaturedBooks() {
    const featuredBooksContainer = document.getElementById('featuredBooks');
    if (!featuredBooksContainer) return;

    // Show loading skeleton
    featuredBooksContainer.innerHTML = Array(4).fill('').map(() => `
        <div class="swiper-slide">
            <div class="book-card skeleton">
                <div class="book-image skeleton-image"></div>
                <div class="book-info">
                    <div class="skeleton-text" style="width: 60%; height: 14px; margin-bottom: 10px;"></div>
                    <div class="skeleton-text" style="width: 80%; height: 20px; margin-bottom: 8px;"></div>
                    <div class="skeleton-text" style="width: 50%; height: 14px;"></div>
                </div>
            </div>
        </div>
    `).join('');

    try {
        let booksFromApi;
        if (window.pageCache && window.pageCache['featured']) {
            booksFromApi = window.pageCache['featured'];
            delete window.pageCache['featured'];
        } else {
            booksFromApi = await api.getBooks();
        }

        // Filter featured books, or take first 8 if none are featured
        let featuredBooks = (booksFromApi || []).filter(b => b.featured).slice(0, 8);
        if (featuredBooks.length === 0) {
            featuredBooks = (booksFromApi || []).slice(0, 8);
        }
        if (featuredBooks.length === 0) {
            featuredBooksContainer.innerHTML = `
                <div class="swiper-slide" style="width: 100%;">
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-gray);">
                        <i class="fas fa-book" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Nenhum livro disponível no momento.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        displayFeaturedBooks(featuredBooks, featuredBooksContainer);
        
    } catch (error) {
        featuredBooksContainer.innerHTML = `
            <div class="swiper-slide" style="width: 100%; display: flex; justify-content: center; align-items: center;">
                <div style="text-align: center; padding: 40px 20px; color: var(--text-gray);">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Erro ao carregar livros.</p>
                    <button onclick="loadFeaturedBooks()" class="btn btn-secondary" style="margin-top: 15px;">Tentar Novamente</button>
                </div>
            </div>
        `;
    }
}

function displayFeaturedBooks(books, container) {
    const bookUrl = (book) => book.slug ? `/livro/${book.slug}` : `/livro/${book.id}`;
    
    const booksHTML = books.map(book => {
        const categoryName = typeof book.category === 'object' ? (book.category?.name || 'Geral') : (book.category || 'Geral');
        const imageUrl = book.image || book.coverImage || book.cover_image || book.coverUrl || null;
        const isPromo = book.promo === true;
        const oldPrice = isPromo ? (book.oldPrice || book.originalPrice || null) : null;
        const buyUrl = book.buyUrl || (book.isbn ? `https://www.amazon.com/dp/${book.isbn.replace(/[^a-zA-Z0-9]/g, '')}` : '#');
        
        return `
        <div class="swiper-slide">
            <div class="book-card" data-href="${bookUrl(book)}" data-book-id="${book.id}">
                <div class="book-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${book.title}" width="280" height="350" loading="lazy" decoding="async">` : '<i class="fas fa-book"></i>'}
                    ${isPromo ? '<div class="book-badge">Promoção</div>' : ''}
                </div>
                <div class="book-info">
                    <div class="book-category">${categoryName}</div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    <div class="book-footer">
                        <div class="book-price">
                            ${parseFloat(book.price).toFixed(2)}€
                            ${oldPrice ? `<span class="book-price-old">${parseFloat(oldPrice).toFixed(2)}€</span>` : ''}
                        </div>
                        <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary buy-btn" onclick="event.stopPropagation();">
                            Comprar
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Use DOMPurify if available, otherwise use innerHTML directly (data is from our own API)
    container.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(booksHTML) : booksHTML;

    // Attach click events using event delegation
    attachFeaturedBookEvents(container);

    if (typeof Swiper !== 'undefined') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            initSwiper('.featured-swiper', {
                slidesPerView: 1,
                spaceBetween: 20,
                loop: false,
                grabCursor: true,
                watchSlidesProgress: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                    dynamicBullets: true
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: true,
                    pauseOnMouseEnter: true,
                },
                breakpoints: {
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    768: { slidesPerView: 3, spaceBetween: 30 },
                    1024: { slidesPerView: 4, spaceBetween: 30 }
                }
            });
        }, 100);
    }

    // Animate newly added book cards (already-animated elements are skipped via guard)
    try {
        if (typeof animateElements === 'function') {
            animateElements('.book-card:not(.gsap-animated)', 'fade-up');
            animateElements('.swiper-slide:not(.gsap-animated)', 'fade-up');
        }
        if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (_) {} }
    } catch (e) {
        console.warn('Erro ao animar livros em destaque', e);
    }
}

// Load latest blog posts for homepage
async function loadLatestBlogPosts() {
    const latestPostsContainer = document.getElementById('latestPosts');
    if (!latestPostsContainer) return;

    // Show loading skeleton
    latestPostsContainer.innerHTML = Array(3).fill('').map(() => `
        <div class="blog-card skeleton">
            <div class="blog-image skeleton-image"></div>
            <div class="blog-content">
                <div class="skeleton-text" style="width: 70%; height: 14px; margin-bottom: 10px;"></div>
                <div class="skeleton-text" style="width: 100%; height: 20px; margin-bottom: 8px;"></div>
                <div class="skeleton-text" style="width: 90%; height: 14px;"></div>
            </div>
        </div>
    `).join('');

    try {
        // Fetch blog posts from API
        const posts = await api.getBlogPosts();
        
        if (!posts || posts.length === 0) {
            latestPostsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-gray);">
                    <i class="fas fa-newspaper" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Nenhum artigo disponível no momento.</p>
                </div>
            `;
            return;
        }

        // Get the 3 most recent posts
        const latestPosts = posts.slice(0, 3);
        displayLatestBlogPosts(latestPosts, latestPostsContainer);
        
    } catch (error) {
        console.error('❌ Erro ao carregar artigos:', error);
        latestPostsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-gray);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Erro ao carregar artigos. Verifique a sua conexão à internet.</p>
                <button onclick="loadLatestBlogPosts()" class="btn btn-secondary" style="margin-top: 15px;">Tentar Novamente</button>
            </div>
        `;
    }
}

function displayLatestBlogPosts(posts, container) {
    const postsHTML = posts.map(post => {
        const articleUrl = post.slug ? `/artigo/${post.slug}` : `/artigo/${post.id}`;
        return `
        <div class="blog-card" onclick="window.location.href='${articleUrl}'">
            <div class="blog-image">
                ${post.image ? `<img src="${post.image}" alt="${post.title}" loading="lazy">` : '<i class="fas fa-newspaper"></i>'}
            </div>
            <div class="blog-content">
                <div class="blog-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(post.date)}</span>
                    <span><i class="far fa-clock"></i> ${post.readTime}</span>
                </div>
                <h3 class="blog-title">${post.title}</h3>
                <p class="blog-excerpt">${post.excerpt}</p>
                <a href="${articleUrl}" class="read-more">
                    Ler mais <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
        `;
    }).join('');
    
    container.innerHTML = postsHTML;
    
    // Animate newly injected blog cards only (guard prevents re-animating existing elements)
    try {
        if (typeof animateElements === 'function') {
            animateElements('.blog-card:not(.gsap-animated)', 'fade-up');
        }
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    } catch (e) {
        console.warn('Erro ao animar posts do blog', e);
    }
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-PT', options);
}

// Attach click events to featured book cards
function attachFeaturedBookEvents(container) {
    if (!container) return;
    
    container.addEventListener('click', function(e) {
        // Check if clicked on add-to-cart button
        const cartBtn = e.target.closest('.add-to-cart-btn');
        if (cartBtn) {
            e.preventDefault();
            e.stopPropagation();
            try {
                const bookData = JSON.parse(cartBtn.dataset.book.replace(/&#39;/g, "'"));
                if (window.cart) {
                    window.cart.addItem(bookData);
                }
            } catch (err) {
                console.error('Error adding to cart:', err);
            }
            return;
        }
        
        // Check if clicked on book card
        const bookCard = e.target.closest('.book-card');
        if (bookCard && bookCard.dataset.href) {
            e.preventDefault();
            window.location.href = bookCard.dataset.href;
        }
    });
}

function updateActiveNavLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href) {
            const cleanHref = href.replace('.html', '');
            // Check for exact match, clean match, or root
            if (path === href || path === cleanHref || (cleanHref === '/' && (path === '/' || path === '')) || (href !== '/' && path.startsWith(cleanHref))) {
                link.classList.add('active');
            }
        }
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        // Skip if href is just "#" or empty
        if (href === '#' || !href || href.length <= 1) return;
        
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Newsletter functionality
function initNewsletter() {
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('newsletterName');
        const emailInput = document.getElementById('newsletterEmail');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput.value.trim();
        
        if (!email) {
            if (window.showNotification) {
                window.showNotification('Por favor, insira um email válido.', 'error');
            }
            return;
        }
        
        // Show loading
        const btn = newsletterForm.querySelector('.btn-newsletter');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A inscrever...';
        btn.disabled = true;
        
        try {
            // Try to obtain a reCAPTCHA token (prefer v3). If not available, proceed without it.
            let recaptchaToken = null;
            if (window.recaptchaSiteKey === 'test-site') {
                recaptchaToken = 'test-token';
            } else if (window.recaptchaSiteKey && typeof grecaptcha !== 'undefined') {
                try {
                    // Prefer v3-style execution: grecaptcha.execute(siteKey, {action})
                        if (typeof window.safeRecaptchaExecute === 'function') {
                            recaptchaToken = await window.safeRecaptchaExecute(window.recaptchaSiteKey, { action: 'newsletter' });
                        } else if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.execute === 'function') {
                            await new Promise(resolve => grecaptcha.ready(resolve));
                            try {
                                recaptchaToken = await grecaptcha.execute(window.recaptchaSiteKey, { action: 'newsletter' });
                            } catch (execErr) {
                                console.warn('reCAPTCHA newsletter execute failed', execErr);
                                recaptchaToken = null;
                            }
                        }
                } catch (rcErr) {
                    console.warn('reCAPTCHA flow failed:', rcErr);
                    recaptchaToken = null;
                }
            }

            // If siteKey is configured but we failed to obtain a token, only abort if grecaptcha is actually available
            // (if grecaptcha failed to load due to ad blockers, allow submission without token)
            if (window.recaptchaSiteKey && !recaptchaToken) {
                if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
                    // grecaptcha is available but token generation failed - this is an error
                    console.error('reCAPTCHA v3 token not obtained; aborting newsletter subscribe (v3 required)');
                    this.showNotification && this.showNotification('Erro reCAPTCHA. Tente novamente mais tarde.', 'error');
                    return;
                } else {
                    // grecaptcha not available (likely blocked) - proceed without token
                    console.warn('reCAPTCHA not available (possibly blocked), proceeding without token');
                }
            }

            const response = await fetch(`${window.API_BASE}/auth/subscribe-newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, recaptchaToken })
            });
            
            const data = await response.json();
            if (response.ok) {
                const msg = data?.message || 'Inscrito na newsletter com sucesso! Verifique o seu email.';
                const already = data?.alreadySubscribed === true;
                if (window.showNotification) {
                    window.showNotification(msg, already ? 'info' : 'success');
                }
                // Reset form only when newly subscribed
                if (!already) {
                    if (nameInput) nameInput.value = '';
                    emailInput.value = '';
                }
            } else {
                const errorMsg = data?.message || 'Erro ao inscrever na newsletter.';
                if (window.showNotification) {
                    window.showNotification(errorMsg, 'error');
                }
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            if (window.showNotification) {
                window.showNotification('Erro ao conectar. Tente novamente.', 'error');
            }
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// Wrapper function to initialize all swipers on the current page (for Barba transitions)
function initAllSwipers() {
    // Featured swiper (index.html)
    if (document.querySelector('.featured-swiper')) {
        initSwiper('.featured-swiper', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: false,
            grabCursor: true,
            watchSlidesProgress: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                640: {
                    slidesPerView: 2,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 30,
                },
            }
        });
    }

    // Related books swiper (book-detail pages)
    if (document.querySelector('.related-swiper')) {
        initSwiper('.related-swiper', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: false,
            grabCursor: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                640: {
                    slidesPerView: 2,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 30,
                },
            }
        });
    }
}