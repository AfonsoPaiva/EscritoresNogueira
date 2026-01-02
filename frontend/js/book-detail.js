// ==================================
// BOOK-DETAIL.JS - Book detail page functionality
// ==================================

// IMMEDIATE LOG - This runs as soon as the script loads
console.log('📜 ====== BOOK-DETAIL.JS LOADED ======');
console.log('📜 Current URL:', window.location.href);
console.log('📜 Pathname:', window.location.pathname);
console.log('📜 Search:', window.location.search);

let currentBook = null;
let allBooksCache = []; // Cache for related books
let quantity = 1;

// Initialize book detail page
async function initBookDetailPage() {
    console.log('🚀 ====== BOOK DETAIL PAGE INIT ======');
    console.log('🔗 Full URL:', window.location.href);
    console.log('🔗 Search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const bookIdParam = urlParams.get('id');
    let bookSlug = urlParams.get('slug');

    // Se não houver slug nos parâmetros, tenta extrair do caminho da URL (/livro/slug)
    if (!bookSlug && !bookIdParam) {
        const pathParts = window.location.pathname.split('/');
        const livroIndex = pathParts.indexOf('livro');
        if (livroIndex !== -1 && pathParts[livroIndex + 1]) {
            bookSlug = pathParts[livroIndex + 1];
        }
    }
    
    // Parse ID only if it exists and is a valid number
    const bookId = bookIdParam ? parseInt(bookIdParam) : null;
    
    console.log('📚 Parsed params - id:', bookIdParam, '(parsed:', bookId, ') slug:', bookSlug);
    
    if (bookSlug || (bookId && !isNaN(bookId))) {
        console.log('✅ Valid params found, loading book...');
        await loadBookDetail(bookId, bookSlug);
    } else {
        console.log('❌ No valid book ID or slug found in URL');
       // Show error instead of redirecting for debugging (safe: use textContent)
const bookDetail = document.getElementById('bookDetail');
if (bookDetail) {
    // Clear existing content
    bookDetail.innerHTML = '';

    const container = document.createElement('div');
    container.style.gridColumn = '1/-1';
    container.style.textAlign = 'center';
    container.style.padding = '60px 20px';

    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-triangle';
    icon.style.fontSize = '4rem';
    icon.style.color = 'var(--border-color)';
    icon.style.marginBottom = '20px';
    container.appendChild(icon);

    const titleP = document.createElement('p');
    titleP.style.color = 'var(--text-gray)';
    titleP.style.fontSize = '1.2rem';
    titleP.textContent = 'Parâmetros inválidos na URL';
    container.appendChild(titleP);

    const infoP = document.createElement('p');
    infoP.style.color = 'var(--text-gray)';
    infoP.style.fontSize = '0.9rem';
    infoP.style.marginTop = '10px';
    // Use textContent to prevent any HTML parsing of the URL
    infoP.textContent = `URL: ${window.location.href}`;
    container.appendChild(infoP);

    const link = document.createElement('a');
    link.href = '/livros';
    link.className = 'btn btn-primary';
    link.style.marginTop = '20px';
    link.textContent = 'Ver Todos os Livros';
    container.appendChild(link);

    bookDetail.appendChild(container);
}
    }
}

// Load book details from API
async function loadBookDetail(bookId, bookSlug) {
    const bookDetail = document.getElementById('bookDetail');
    
    console.log('🔍 Loading book - ID:', bookId, 'Slug:', bookSlug);
    
    // Show loading state
    if (bookDetail) {
        bookDetail.innerHTML = `
            <div class="book-detail-loading" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                <p style="margin-top: 20px; color: var(--text-gray);">A carregar livro...</p>
            </div>
        `;
    }
    
    try {
        // Try to fetch by slug first (cleaner URLs), then by ID
        if (bookSlug) {
            console.log('📚 Fetching book by slug:', bookSlug);
            const bookFromApi = await api.getBookBySlug(bookSlug);
            console.log('📖 API Response:', bookFromApi);
            currentBook = transformBook(bookFromApi);
        } else if (bookId && !isNaN(bookId)) {
            console.log('📚 Fetching book by ID:', bookId);
            const bookFromApi = await api.getBookById(bookId);
            console.log('📖 API Response:', bookFromApi);
            currentBook = transformBook(bookFromApi);
        }
        
        if (!currentBook) {
            throw new Error('Book not found');
        }
        
        console.log('✅ Book loaded:', currentBook.title);
        displayBookDetail();
        await loadRelatedBooks();
        
    } catch (error) {
        console.error('❌ Error loading book:', error);
        
        // Fallback to static data if API fails
        if (typeof booksData !== 'undefined') {
            console.log('⚠️ Falling back to static data');
            
            // Try to find by slug first, then by ID
            if (bookSlug) {
                currentBook = booksData.find(book => book.slug === bookSlug);
            }
            if (!currentBook && bookId && !isNaN(bookId)) {
                currentBook = booksData.find(book => book.id === bookId);
            }
            
            allBooksCache = [...booksData];
            
            if (currentBook) {
                console.log('✅ Book found in static data:', currentBook.title);
                displayBookDetail();
                loadRelatedBooks();
                return;
            }
        }
        
        /* Safe error display — use DOM methods and textContent to avoid XSS */
if (bookDetail) {
    // Clear existing content
    bookDetail.innerHTML = '';

    const container = document.createElement('div');
    container.style.gridColumn = '1/-1';
    container.style.textAlign = 'center';
    container.style.padding = '60px 20px';

    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-triangle';
    icon.style.fontSize = '4rem';
    icon.style.color = 'var(--border-color)';
    icon.style.marginBottom = '20px';
    container.appendChild(icon);

    const titleP = document.createElement('p');
    titleP.style.color = 'var(--text-gray)';
    titleP.style.fontSize = '1.2rem';
    titleP.textContent = 'Livro não encontrado';
    container.appendChild(titleP);

    const infoP = document.createElement('p');
    infoP.style.color = 'var(--text-gray)';
    infoP.style.fontSize = '0.9rem';
    infoP.style.marginTop = '10px';
    const slugText = bookSlug || 'N/A';
    const idText = (bookId && !isNaN(bookId)) ? String(bookId) : 'N/A';
    infoP.textContent = `Slug: ${slugText} | ID: ${idText}`; // textContent prevents HTML parsing
    container.appendChild(infoP);

    const link = document.createElement('a');
    link.href = '/livros';
    link.className = 'btn btn-primary';
    link.style.marginTop = '20px';
    link.textContent = 'Ver Todos os Livros';
    container.appendChild(link);

    bookDetail.appendChild(container);
}
    }
}

// Display book details
function displayBookDetail() {
    const bookDetail = document.getElementById('bookDetail');
    if (!bookDetail) return;
    
    // Handle both API format and static data format
    const imageUrl = currentBook.image || currentBook.coverImage || currentBook.coverUrl || null;
    const categoryName = typeof currentBook.category === 'object' 
        ? (currentBook.category?.name || 'Geral') 
        : (currentBook.category || 'Geral');
    // FIXED: Only show promo/oldPrice if promo field is explicitly true
    const isPromo = currentBook.promo === true;
    const oldPrice = isPromo ? (currentBook.oldPrice || currentBook.originalPrice || null) : null;
    const year = currentBook.year || currentBook.publishYear || 'N/D';
    const pages = currentBook.pages || 'N/D';
    const isbn = currentBook.isbn || 'N/D';
    const publisher = currentBook.publisher || 'N/D';
    const language = currentBook.language || 'Português';
    const description = currentBook.description || 'Descrição não disponível.';
    
    bookDetail.innerHTML = DOMPurify.sanitize(`
        <div class="book-detail-image" data-aos="fade-right">
            <div class="book-detail-image-wrapper">
                ${imageUrl ? `<img src="${imageUrl}" alt="${currentBook.title}" class="book-detail-main-image" width="420" height="560" loading="lazy">` : '<i class="fas fa-book"></i>'}
                ${isPromo ? '<div class="book-badge promo-badge">Promoção</div>' : ''}
            </div>
        </div>
        
        <div class="book-detail-info" data-aos="fade-left">
            <h1>${currentBook.title}</h1>
            <p class="book-detail-author">por ${currentBook.author}</p>
            
            <div class="book-detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Categoria</span>
                    <span class="meta-value">${capitalizeFirst(categoryName)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Páginas</span>
                    <span class="meta-value">${pages}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Ano</span>
                    <span class="meta-value">${year}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Idioma</span>
                    <span class="meta-value">${language}</span>
                </div>
            </div>
            
            <div class="book-detail-price">
                ${parseFloat(currentBook.price).toFixed(2)}€
                ${oldPrice ? `<span class="book-price-old" style="font-size: 1.5rem; margin-left: 15px;">${parseFloat(oldPrice).toFixed(2)}€</span>` : ''}
            </div>
            
            <div class="book-detail-description">
                <h3>Sinopse</h3>
                <p>${description}</p>
            </div>
            
            <div class="book-detail-actions">
                <div class="quantity-selector">
                    <button class="quantity-decrease"><i class="fas fa-minus"></i></button>
                    <span id="quantityDisplay">1</span>
                    <button class="quantity-increase"><i class="fas fa-plus"></i></button>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-large btn-add-to-cart">
                        <i class="fas fa-shopping-cart"></i>
                        Adicionar ao Carrinho
                    </button>
                    <button class="btn btn-secondary btn-large btn-preview">
                        <i class="fas fa-book-open"></i>
                        Ler Amostra
                    </button>
                </div>
            </div>
            
            <div class="book-detail-features">
                <h3>Informações Adicionais</h3>
                <div class="feature-list">
                    <div class="feature-item">
                        <i class="fas fa-barcode"></i>
                        <span>ISBN: ${isbn}</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-building"></i>
                        <span>Editora: ${publisher}</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-truck"></i>
                        <span>Envio grátis para encomendas superiores a 20€</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-undo"></i>
                        <span>Devolução grátis até 30 dias</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-shield-alt"></i>
                        <span>Pagamento seguro</span>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    // Attach event listeners after setting innerHTML
    attachBookDetailEvents();
}

// Attach event listeners to book detail buttons
function attachBookDetailEvents() {
    // Quantity buttons
    const decreaseBtn = document.querySelector('.quantity-decrease');
    const increaseBtn = document.querySelector('.quantity-increase');
    if (decreaseBtn) decreaseBtn.addEventListener('click', () => updateQuantity(-1));
    if (increaseBtn) increaseBtn.addEventListener('click', () => updateQuantity(1));
    
    // Add to cart button
    const addToCartBtn = document.querySelector('.btn-add-to-cart');
    if (addToCartBtn) addToCartBtn.addEventListener('click', addToCart);
    
    // Preview button
    const previewBtn = document.querySelector('.book-detail-actions .btn-preview');
    if (previewBtn) previewBtn.addEventListener('click', openBookPreview);
}

// Preload an image and return a promise that resolves when loaded (or rejects)
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error('No URL'));
        const img = new Image();
        img.src = url;
        img.onload = () => {
            // Try to decode the image so it's ready to paint — improves swap smoothness
            if (img.decode) {
                img.decode().then(() => resolve(img)).catch(() => resolve(img));
            } else {
                resolve(img);
            }
        };
        img.onerror = (e) => reject(e);
    });
}

// Update quantity
function updateQuantity(change) {
    quantity = Math.max(1, quantity + change);
    const quantityDisplay = document.getElementById('quantityDisplay');
    if (quantityDisplay) {
        quantityDisplay.textContent = quantity;
    }
}

// Add to cart
function addToCart() {
    if (currentBook && window.cart) {
        window.cart.addItem(currentBook, quantity);
        quantity = 1;
        const quantityDisplay = document.getElementById('quantityDisplay');
        if (quantityDisplay) {
            quantityDisplay.textContent = '1';
        }
    }
}

// Expose functions globally for onclick handlers in HTML
window.updateQuantity = updateQuantity;
window.addToCart = addToCart;

// Load related books
async function loadRelatedBooks() {
    const relatedBooksContainer = document.getElementById('relatedBooks');
    if (!relatedBooksContainer || !currentBook) return;
    
    // Show skeleton slides while fetching to reserve layout space
    relatedBooksContainer.innerHTML = '';
    const parentSwiper = document.querySelector('.related-swiper');
    if (parentSwiper) {
        parentSwiper.classList.add('skeleton');
        const wrapper = parentSwiper.querySelector('.swiper-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <div class="swiper-slide"><div class="related-skeleton"></div></div>
                <div class="swiper-slide"><div class="related-skeleton"></div></div>
                <div class="swiper-slide"><div class="related-skeleton"></div></div>
            `;
        }
    }

    try {
        // Fetch all books if not cached
        if (allBooksCache.length === 0) {
            const booksFromApi = await api.getBooks();
            allBooksCache = transformBooks(booksFromApi);
        }
        
        // Get books from the same category, excluding current book
        const relatedBooks = allBooksCache
            .filter(book => 
                (book.category === currentBook.category || book.categorySlug === currentBook.categorySlug) && 
                book.id !== currentBook.id
            )
            .slice(0, 6);
        
        if (relatedBooks.length === 0) {
            // If no books in same category, show random books
            const otherBooks = allBooksCache
                .filter(book => book.id !== currentBook.id)
                .slice(0, 6);
            
            displayRelatedBooks(otherBooks, relatedBooksContainer);
        } else {
            displayRelatedBooks(relatedBooks, relatedBooksContainer);
        }
    } catch (error) {
        console.error('Error loading related books:', error);
        // Fallback to static data
        if (typeof booksData !== 'undefined') {
            const relatedBooks = booksData
                .filter(book => book.category === currentBook.category && book.id !== currentBook.id)
                .slice(0, 6);
            displayRelatedBooks(relatedBooks, relatedBooksContainer);
        }
    }
    // Remove skeleton class from parent swiper if present (displayRelatedBooks will init swiper)
    const parentSwiper2 = document.querySelector('.related-swiper');
    if (parentSwiper2) parentSwiper2.classList.remove('skeleton');
}

// Display related books in swiper
function displayRelatedBooks(books, container) {
    container.innerHTML = DOMPurify.sanitize(books.map(book => {
        // Handle both API format (category as object) and static data format (category as string)
        const categoryName = typeof book.category === 'object' ? (book.category?.name || 'Geral') : (book.category || 'Geral');
        // Handle image field (API uses coverImage/coverUrl, static uses image)
        const imageUrl = book.image || book.coverImage || book.coverUrl || null;
        // FIXED: Only show promo badge if promo field is explicitly true
        const isPromo = book.promo === true;
        // FIXED: Only show oldPrice if promo is true AND oldPrice exists
        const oldPrice = isPromo ? (book.oldPrice || book.originalPrice || null) : null;
        const bookUrl = book.slug ? `/livro/${book.slug}` : `/livro/${book.id}`;
        
        return `
        <div class="swiper-slide">
            <div class="book-card" data-href="${bookUrl}" data-book-id="${book.id}">
                <div class="book-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${book.title}" width="280" height="350" loading="lazy">` : '<i class="fas fa-book"></i>'}
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
                        <button class="add-to-cart-btn" data-book='${JSON.stringify(book).replace(/'/g, "&#39;")}'>
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `}).join(''));
    
    // Attach click events
    attachRelatedBookEvents(container);
    
    // Initialize Swiper
    initRelatedSwiper();
}

// Attach click events to related book cards
function attachRelatedBookEvents(container) {
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

// Initialize related books swiper
function initRelatedSwiper() {
    if (typeof Swiper === 'undefined') return;
    
    setTimeout(() => {
            // Destroy existing swiper if it exists
            const container = document.querySelector('.related-swiper');
            const existingSwiper = container?.swiper;
            if (existingSwiper) {
                existingSwiper.destroy(true, true);
            }

            // Check if container has slides
            const wrapper = container?.querySelector('.swiper-wrapper');
            if (!wrapper || wrapper.children.length === 0) {
                console.warn('No related books slides found');
                return;
            }

            // Add loading class
            container.classList.add('swiper-loading');

            const relatedSwiper = new Swiper('.related-swiper', {
                slidesPerView: 1,
                spaceBetween: 30,
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
                    delay: 4000,
                    disableOnInteraction: true,
                    pauseOnMouseEnter: true,
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
                },
                on: {
                    init: function() {
                        console.log(`📚 Related books Swiper initialized with ${this.slides.length} slides`);
                        container.classList.remove('swiper-loading');
                    },
                    slideChange: function() {
                        // Refresh AOS for new visible slides
                        if (typeof AOS !== 'undefined') {
                            if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
                            if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
                        }
                    }
                }
            });

            // Store swiper instance
            container.swiper = relatedSwiper;
        }, 100);
    }


// Utility function
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================================
// REVIEWS FUNCTIONALITY
// ==================================

// Initialize reviews functionality
function initReviews() {
    console.log('🔄 initReviews called, currentBook:', currentBook);
    initReviewForm();
    initStarRating();
    // Load comments using commentsModule
    if (currentBook && currentBook.id) {
        console.log('✅ Initializing commentsModule with book ID:', currentBook.id);
        commentsModule.init(currentBook.id);
    } else {
        console.log('⚠️ No currentBook, initializing commentsModule with empty state');
        // Still render the "no comments" state
        commentsModule.comments = [];
        commentsModule.render();
    }
}

// Initialize review form submission
function initReviewForm() {
    const reviewForm = document.querySelector('.review-form-element');
    if (!reviewForm) return;

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rating = document.querySelector('input[name="rating"]:checked');
        const title = document.getElementById('reviewTitle').value.trim();
        const text = document.getElementById('reviewText').value.trim();

        if (!rating || !title || !text) {
            window.showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // Get form values
        const nameInput = reviewForm.querySelector('#authorName');
        const authorName = nameInput.value.trim();

        // Validate name
        if (!authorName) {
            window.showNotification('Por favor, preencha seu nome.', 'error');
            return;
        }

        // Validate book ID exists
        if (!currentBook || !currentBook.id) {
            console.error('❌ No currentBook.id available');
            window.showNotification('Erro: Livro não identificado. Recarregue a página.', 'error');
            return;
        }

        console.log('📝 Submitting comment:');
        console.log('   - currentBook:', currentBook);
        console.log('   - currentBook.id:', currentBook?.id);
        console.log('   - authorName:', authorName);
        console.log('   - rating:', rating.value);
        console.log('   - title:', title);
        console.log('   - content:', text);

        // Disable submit button
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            // Get reCAPTCHA token (use safe wrapper to avoid iOS private-token/PAT flows)
            let recaptchaToken = null;
            if (window.recaptchaSiteKey) {
                try {
                    if (typeof window.safeRecaptchaExecute === 'function') {
                        recaptchaToken = await window.safeRecaptchaExecute(window.recaptchaSiteKey, { action: 'comment' });
                    } else if (window.grecaptcha && typeof grecaptcha.execute === 'function') {
                        await new Promise(resolve => grecaptcha.ready(resolve));
                        recaptchaToken = await grecaptcha.execute(window.recaptchaSiteKey, { action: 'comment' });
                    }
                } catch (error) {
                    console.warn('reCAPTCHA execution failed:', error);
                    recaptchaToken = null;
                }
                // If still no token, allow test token only on localhost for dev; otherwise abort (v3 required)
                if (!recaptchaToken) {
                    const isLocal = ['127.0.0.1','localhost'].includes(window.location.hostname);
                    if (isLocal) {
                        console.warn('Using test-token for local development');
                        recaptchaToken = 'test-token';
                    } else {
                        if (window.showNotification) window.showNotification('Verificação reCAPTCHA obrigatória. Tente novamente mais tarde.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                        return;
                    }
                }
            } else {
                // Fallback for development/testing
                console.warn('reCAPTCHA not available, using test token');
                recaptchaToken = 'test-token';
            }

            const response = await api.submitBookComment(currentBook.id, {
                authorName: authorName,
                rating: parseInt(rating.value),
                title: title,
                content: text,
                recaptchaToken: recaptchaToken
            });

            if (response.success) {
                window.showNotification('Avaliação enviada com sucesso! Aguardando aprovação.', 'success');
                reviewForm.reset();
                resetStarRating();
                // Reload comments using commentsModule (only if we have a valid book ID)
                if (currentBook && currentBook.id && commentsModule.currentBookId) {
                    await commentsModule.loadComments();
                    commentsModule.render();
                }
            } else {
                window.showNotification(response.message || 'Erro ao enviar avaliação.', 'error');
            }
        } catch (error) {
            console.error('Erro ao submeter comentário:', error);
            window.showNotification('Erro ao enviar avaliação. Tente novamente.', 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

// Comments are now loaded and managed by commentsModule (see comments.js)
// All comment rendering, rating calculation, and "no comments" handling is done there

// Initialize star rating input
function initStarRating() {
    const stars = document.querySelectorAll('.star-rating-input input[type="radio"]');
    const labels = document.querySelectorAll('.star-rating-input label');

    labels.forEach((label, index) => {
        label.addEventListener('click', () => {
            // Remove active class from all labels
            labels.forEach(l => l.classList.remove('active'));
            // Add active class to clicked and previous labels
            for (let i = 0; i <= index; i++) {
                labels[i].classList.add('active');
            }
        });
    });
}

// Reset star rating
function resetStarRating() {
    const labels = document.querySelectorAll('.star-rating-input label');
    labels.forEach(label => label.classList.remove('active'));
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==================================
// BOOK PREVIEW MODAL FUNCTIONALITY
// ==================================

let currentPageIndex = 0;
let currentBookPages = [];

// Open book preview modal
function openBookPreview() {
    if (!currentBook || !currentBook.samplePages || currentBook.samplePages.length === 0) {
        window.showNotification('Prévia não disponível para este livro.', 'warning');
        return;
    }

    const modal = document.getElementById('bookPreviewModal');
    const overlay = document.getElementById('bookPreviewOverlay');
    const title = document.getElementById('previewBookTitle');
    const author = document.getElementById('previewBookAuthor');
    const pageImage = document.getElementById('currentPageImage');
    const currentPageNumber = document.getElementById('currentPageNumber');
    const totalPages = document.getElementById('totalPages');

    // Set book info
    title.textContent = currentBook.title;
    author.textContent = `por ${currentBook.author}`;

    // Set up pages
    currentBookPages = currentBook.samplePages;
    currentPageIndex = 0;

    // Update page display
    updatePageDisplay();

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Add event listeners (use once for close handlers to avoid duplicate listeners)
    overlay.addEventListener('click', closeBookPreview, { once: true });
    const closeBtn = document.getElementById('bookPreviewClose');
    if (closeBtn) closeBtn.addEventListener('click', closeBookPreview, { once: true });
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);

    // Close on Escape key
    document.addEventListener('keydown', handlePreviewKeydown);
}

// Update page display
function updatePageDisplay() {
    const pageImage = document.getElementById('currentPageImage');
    const currentPageNumber = document.getElementById('currentPageNumber');
    const totalPages = document.getElementById('totalPages');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    // Update image asynchronously: preload to avoid blocking main thread and reduce INP/CLS
    const newSrc = currentBookPages[currentPageIndex];
    pageImage.alt = `Página ${currentPageIndex + 1} do livro ${currentBook.title}`;
    // Clear src immediately only if different to avoid unnecessary reloads
    if (pageImage.src !== newSrc) {
        // set a lightweight placeholder (transparent) to keep dimensions while loading
        // then preload and swap once ready
        preloadImage(newSrc).then(() => {
            pageImage.src = newSrc;
        }).catch((err) => {
            console.warn('Preview page image failed to load', err);
            // leave previous src or set a fallback
        });
    }

    // Update page numbers
    currentPageNumber.textContent = currentPageIndex + 1;
    totalPages.textContent = currentBookPages.length;

    // Update navigation buttons
    prevBtn.disabled = currentPageIndex === 0;
    nextBtn.disabled = currentPageIndex === currentBookPages.length - 1;

    prevBtn.style.opacity = currentPageIndex === 0 ? '0.5' : '1';
    nextBtn.style.opacity = currentPageIndex === currentBookPages.length - 1 ? '0.5' : '1';
}

// Navigate to previous page
function prevPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        // Schedule UI update so click handler stays short (improves INP)
        requestAnimationFrame(updatePageDisplay);
    }
}

// Navigate to next page
function nextPage() {
    if (currentPageIndex < currentBookPages.length - 1) {
        currentPageIndex++;
        // Schedule UI update so click handler stays short (improves INP)
        requestAnimationFrame(updatePageDisplay);
        // Preload following page to make subsequent navigation instant
        const nextIndex = Math.min(currentPageIndex + 1, currentBookPages.length - 1);
        if (currentBookPages[nextIndex]) {
            const _ = new Image();
            _.src = currentBookPages[nextIndex];
        }
    }
}

// Close book preview modal
function closeBookPreview() {
    const modal = document.getElementById('bookPreviewModal');

    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Reset page index
    currentPageIndex = 0;
    currentBookPages = [];

    // Remove event listeners
    document.removeEventListener('keydown', handlePreviewKeydown);
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.removeEventListener('click', prevPage);
    if (nextBtn) nextBtn.removeEventListener('click', nextPage);
}

// Expose functions globally for onclick handlers
window.openBookPreview = openBookPreview;
window.closeBookPreview = closeBookPreview;

// Handle keyboard events for preview modal
function handlePreviewKeydown(e) {
    if (e.key === 'Escape') {
        closeBookPreview();
    } else if (e.key === 'ArrowLeft') {
        prevPage();
    } else if (e.key === 'ArrowRight') {
        nextPage();
    }
}

// Helper function to check if we're on the book detail page
function isOnBookDetailPage() {
    const pathname = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();
    
    console.log('🔎 Checking page - pathname:', pathname, 'href:', href);
    
    // Check if pathname contains '/livro' but NOT '/livros'
    const hasLivro = pathname.includes('/livro') || href.includes('/livro');
    const hasLivros = pathname.includes('/livros') || href.includes('/livros');
    
    const result = hasLivro && !hasLivros;
    console.log('🔎 Has livro:', hasLivro, 'Has livros:', hasLivros, 'Result:', result);
    
    return result;
}

// IMMEDIATE INITIALIZATION CHECK
(function() {
    console.log('⚡ Immediate self-executing function running...');
    
    const isBookPage = isOnBookDetailPage();
    
    if (!isBookPage) {
        console.log('⚠️ Not on book detail page, skipping initialization');
        return;
    }
    
    console.log('✅ On book detail page, setting up initialization...');
    
    // Function to initialize the page - MUST be async to await book loading before reviews
    async function doInit() {
        console.log('🎬 doInit() called - Starting page initialization');
        await initBookDetailPage(); // Wait for book to load first!
        console.log('📖 Book loaded, now initializing reviews...');
        initReviews(); // Now currentBook should be populated
    }
    
    // Initialize based on document state
    if (document.readyState === 'loading') {
        console.log('📄 Document still loading, adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        console.log('📄 Document already loaded, initializing immediately');
        doInit();
    }
})();
