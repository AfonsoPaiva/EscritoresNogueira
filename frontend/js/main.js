// ==================================
// MAIN.JS - GSAP Integration
// ==================================

// Initialize on first load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado:', window.location.pathname);

    // Initialize in correct order
    initGSAP();
    initLibraries();
    initApp();
    runAnimations();

    console.log('✅ Aplicação inicializada');
});

// Initialize GSAP
function initGSAP() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        console.log('✅ GSAP registrado');
    }
}

// Initialize libraries
function initLibraries() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
}

// Enhanced Swiper initialization utility
function initSwiper(selector, config) {
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper library not loaded');
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
        console.warn(`No slides found in ${selector}`);
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
                    console.log(`📱 ${selector} Swiper initialized with ${this.slides.length} slides`);
                    container.classList.remove('swiper-loading');
                    if (config.on && config.on.init) config.on.init.call(this);
                },
                slideChange: function() {
                    // Refresh AOS for new visible slides
                    if (typeof AOS !== 'undefined') {
                        AOS.refresh();
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
function runAnimations() {
    if (typeof gsap === 'undefined') {
        console.warn('⚠️ GSAP não disponível');
        return;
    }

    console.log('🎨 Executando animações GSAP');

    // Animate hero elements (de cima para baixo)
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroButtons = document.querySelectorAll('.hero-content .btn');

    const heroElements = [heroTitle, heroSubtitle, ...heroButtons].filter(Boolean);

    if (heroElements.length > 0) {
        gsap.fromTo(heroElements,
            { opacity: 0, y: -30 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power3.out'
                // clearProps: 'all' REMOVIDO - Mantém elementos visíveis após transição
            }
        );
        console.log('✅ Hero animado');
    }

    // Animate page headers (de cima para baixo)
    const pageHeaders = document.querySelectorAll('.page-header');
    if (pageHeaders.length > 0) {
        pageHeaders.forEach(header => {
            gsap.fromTo(header,
                { opacity: 0, y: -30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: header,
                        start: 'top 80%',
                        once: true
                    }
                }
            );
        });
        console.log('✅ Page headers animados');
    }

    // Animate sections
    const sections = document.querySelectorAll('.section');
    
    // Pages that should animate on load (without scroll trigger)
    const pagesWithLoadAnimation = ['page-conta', 'page-apoio', 'page-termos', 'page-privacidade'];
    const useLoadAnimation = pagesWithLoadAnimation.some(pageClass => document.body.classList.contains(pageClass));
    
    if (sections.length > 0) {
        if (useLoadAnimation) {
            // Animate all sections on page load with stagger
            sections.forEach((section, index) => {
                gsap.fromTo(section,
                    { opacity: 0, y: 50 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        delay: index * 0.1,
                        ease: 'power3.out',
                        onComplete: () => {
                            section.classList.add('gsap-animated');
                        }
                    }
                );
            });
            console.log(`✅ ${sections.length} seções animadas no carregamento`);
        } else {
            // Use ScrollTrigger for other pages
            sections.forEach((section) => {
                gsap.set(section, { opacity: 0, y: 30 });

                ScrollTrigger.create({
                    trigger: section,
                    start: 'top 80%',
                    onEnter: () => {
                        gsap.to(section, {
                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            ease: 'power2.out',
                            onComplete: () => {
                                section.classList.add('gsap-animated');
                            }
                        });
                    },
                    once: true
                });
            });
            console.log(`✅ ${sections.length} ScrollTriggers criados`);
        }
    }
}

// Initialize app functionality
function initApp() {
    console.log('⚙️ Inicializando aplicação');
    initMobileMenu();
    initHeaderScroll();
    initSearch();
    initPage();
    updateActiveNavLink();
    initNewsletter();
}

// Mobile menu functionality
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const overlay = document.getElementById('overlay');

    console.log('🍔 Inicializando menu mobile', { hamburger: !!hamburger, navMenu: !!navMenu, overlay: !!overlay });

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            console.log('🍔 Hamburger clicado');
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            closeMobileMenu();
            if (window.cart) window.cart.closeCart();
            if (window.auth) window.auth.closeUserPanel();
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    console.log('🍔 Menu mobile inicializado');
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const overlay = document.getElementById('overlay');

    if (hamburger && hamburger.classList.contains('active')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initHeaderScroll() {
    const header = document.getElementById('header');
    const fixedButtons = document.getElementById('fixedHeaderButtons');
    if (!header) return;

    let lastScrollTop = 0;
    let isHeaderHidden = false;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add scrolled class for background change
        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header based on scroll direction
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down - hide header and show fixed buttons
            if (!isHeaderHidden) {
                gsap.to(header, {
                    y: '-100%',
                    duration: 0.3,
                    ease: 'power2.out'
                });
                if (fixedButtons) {
                    fixedButtons.classList.add('show');
                }
                isHeaderHidden = true;
            }
        } else {
            // Scrolling up - show header and hide fixed buttons
            if (isHeaderHidden) {
                gsap.to(header, {
                    y: '0%',
                    duration: 0.3,
                    ease: 'power2.out'
                });
                if (fixedButtons) {
                    fixedButtons.classList.remove('show');
                }
                isHeaderHidden = false;
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
}

function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            setTimeout(() => searchInput.focus(), 100);
        });
    }

    if (closeSearch) {
        closeSearch.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            const results = booksData.filter(book =>
                book.title.toLowerCase().includes(query) ||
                book.author.toLowerCase().includes(query) ||
                book.category.toLowerCase().includes(query)
            ).slice(0, 5);

            searchResults.innerHTML = results.map(book =>
                `<div class="search-result-item" onclick="window.location.href='livro.html?id=${book.id}'">
                    <h4>${book.title}</h4>
                    <p>${book.author} • ${book.category}</p>
                </div>`
            ).join('') || '<p class="no-results">Nenhum resultado encontrado</p>';
        });
    }
}

function initPage() {
    const path = window.location.pathname;

    if (path.includes('index.html') || path.endsWith('/') || path === '') {
        loadFeaturedBooks();
    } else if (path.includes('livros.html')) {
        // Code from books.js
        loadBooks();
        attachFilters();
        applyURLFilters();
    } else if (path.includes('livro.html')) {
        // Code from book-detail.js
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = parseInt(urlParams.get('id'));
        if (bookId) {
            loadBookDetail(bookId);
        } else {
            window.location.href = 'livros.html';
        }
    } else if (path.includes('blog.html')) {
        // Code from blog.js
        loadBlogPosts();
    } else if (path.includes('artigo.html')) {
        // Code from article.js
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = parseInt(urlParams.get('id'));
        if (articleId) {
            loadArticle(articleId);
        } else {
            window.location.href = 'blog.html';
        }
    }
}

function loadFeaturedBooks() {
    const featuredBooksContainer = document.getElementById('featuredBooks');
    if (!featuredBooksContainer) return;

    const featuredBooks = booksData.slice(0, 8);
    featuredBooksContainer.innerHTML = featuredBooks.map(book => `
        <div class="swiper-slide">
            <div class="book-card" onclick="window.location.href='livro.html?id=${book.id}'">
                <div class="book-image">
                    ${book.image ? `<img src="${book.image}" alt="${book.title}">` : '<i class="fas fa-book"></i>'}
                    ${book.promo ? '<div class="book-badge">Promoção</div>' : ''}
                </div>
                <div class="book-info">
                    <div class="book-category">${book.category}</div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    <div class="book-footer">
                        <div class="book-price">
                            ${book.price.toFixed(2)}€
                            ${book.oldPrice ? `<span class="book-price-old">${book.oldPrice.toFixed(2)}€</span>` : ''}
                        </div>
                        <button class="add-to-cart" onclick="event.stopPropagation(); window.cart && window.cart.addItem(${JSON.stringify(book).replace(/"/g, '&quot;')})">>
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

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

    console.log('✅ Livros em destaque carregados');
}

function updateActiveNavLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') && path.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Newsletter functionality
function initNewsletter() {
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('newsletterEmail');
        const email = emailInput.value.trim();
        
        if (!email) return;
        
        // Save to localStorage
        const subscribers = JSON.parse(localStorage.getItem('newsletterSubscribers') || '[]');
        
        if (subscribers.includes(email)) {
            if (window.showNotification) {
                window.showNotification('Este email já está subscrito!', 'info');
            }
            return;
        }
        
        subscribers.push(email);
        localStorage.setItem('newsletterSubscribers', JSON.stringify(subscribers));
        
        // Show success message
        if (window.showNotification) {
            window.showNotification('Subscrição realizada com sucesso! Obrigado!', 'success');
        }
        
        // Reset form
        emailInput.value = '';
        
        // Add animation feedback
        const btn = newsletterForm.querySelector('.btn');
        btn.innerHTML = '<i class="fas fa-check"></i> Subscrito!';
        btn.style.background = '#2ecc71';
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-envelope"></i> Subscrever';
            btn.style.background = '';
        }, 3000);
    });
}