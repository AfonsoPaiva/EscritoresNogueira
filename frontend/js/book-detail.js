// ==================================
// BOOK-DETAIL.JS - Book detail page functionality
// ==================================

let currentBook = null;
let quantity = 1;

// Initialize book detail page
function initBookDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = parseInt(urlParams.get('id'));
    
    if (bookId) {
        loadBookDetail(bookId);
    } else {
        window.location.href = 'livros.html';
    }
}

// Load book details
function loadBookDetail(bookId) {
    currentBook = booksData.find(book => book.id === bookId);
    
    if (!currentBook) {
        window.location.href = 'livros.html';
        return;
    }
    
    displayBookDetail();
    loadRelatedBooks();
}

// Display book details
function displayBookDetail() {
    const bookDetail = document.getElementById('bookDetail');
    if (!bookDetail) return;
    
    bookDetail.innerHTML = `
        <div class="book-detail-image" data-aos="fade-right">
            <div class="book-detail-image-wrapper">
                ${currentBook.image ? `<img src="${currentBook.image}" alt="${currentBook.title}">` : '<i class="fas fa-book"></i>'}
            </div>
        </div>
        
        <div class="book-detail-info" data-aos="fade-left">
            <h1>${currentBook.title}</h1>
            <p class="book-detail-author">por ${currentBook.author}</p>
            
            <div class="book-detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Categoria</span>
                    <span class="meta-value">${capitalizeFirst(currentBook.category)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Páginas</span>
                    <span class="meta-value">${currentBook.pages}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Ano</span>
                    <span class="meta-value">${currentBook.year}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Idioma</span>
                    <span class="meta-value">${currentBook.language}</span>
                </div>
            </div>
            
            <div class="book-detail-price">
                ${currentBook.price.toFixed(2)}€
                ${currentBook.oldPrice ? `<span class="book-price-old" style="font-size: 1.5rem; margin-left: 15px;">${currentBook.oldPrice.toFixed(2)}€</span>` : ''}
            </div>
            
            <div class="book-detail-description">
                <h3>Sinopse</h3>
                <p>${currentBook.description}</p>
            </div>
            
            <div class="book-detail-actions">
                <div class="quantity-selector">
                    <button onclick="updateQuantity(-1)"><i class="fas fa-minus"></i></button>
                    <span id="quantityDisplay">1</span>
                    <button onclick="updateQuantity(1)"><i class="fas fa-plus"></i></button>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-large" onclick="addToCart()">
                        <i class="fas fa-shopping-cart"></i>
                        Adicionar ao Carrinho
                    </button>
                    <button class="btn btn-secondary btn-large btn-preview" onclick="openBookPreview()">
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
                        <span>ISBN: ${currentBook.isbn}</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-building"></i>
                        <span>Editora: ${currentBook.publisher}</span>
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
    `;
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

// Load related books
function loadRelatedBooks() {
    const relatedBooksContainer = document.getElementById('relatedBooks');
    if (!relatedBooksContainer || !currentBook) return;
    
    // Get books from the same category, excluding current book
    const relatedBooks = booksData
        .filter(book => book.category === currentBook.category && book.id !== currentBook.id)
        .slice(0, 6);
    
    relatedBooksContainer.innerHTML = relatedBooks.map(book => `
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
    
    // Initialize Swiper with enhanced configuration
    if (typeof Swiper !== 'undefined') {
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
                            AOS.refresh();
                        }
                    }
                }
            });

            // Store swiper instance
            container.swiper = relatedSwiper;
        }, 100);
    }
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
    initReviewForm();
    initStarRating();
    initHelpfulButtons();
}

// Initialize review form submission
function initReviewForm() {
    const reviewForm = document.querySelector('.review-form-element');
    if (!reviewForm) return;

    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rating = document.querySelector('input[name="rating"]:checked');
        const title = document.getElementById('reviewTitle').value.trim();
        const text = document.getElementById('reviewText').value.trim();

        if (!rating || !title || !text) {
            window.showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // Simulate form submission
        window.showNotification('Avaliação enviada com sucesso! Obrigado pela sua opinião.', 'success');

        // Reset form
        reviewForm.reset();
        resetStarRating();
    });
}

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

// Initialize helpful buttons
function initHelpfulButtons() {
    const helpfulButtons = document.querySelectorAll('.helpful-btn');

    helpfulButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentText = button.textContent;
            const isHelpful = currentText.includes('Útil');

            if (isHelpful) {
                button.innerHTML = '<i class="fas fa-thumbs-up"></i> Obrigado!';
                button.classList.add('voted');
            }
        });
    });
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

    // Add event listeners
    overlay.addEventListener('click', closeBookPreview);
    document.getElementById('bookPreviewClose').addEventListener('click', closeBookPreview);
    document.getElementById('prevPage').addEventListener('click', prevPage);
    document.getElementById('nextPage').addEventListener('click', nextPage);

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

    // Update image
    pageImage.src = currentBookPages[currentPageIndex];
    pageImage.alt = `Página ${currentPageIndex + 1} do livro ${currentBook.title}`;

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
        updatePageDisplay();
    }
}

// Navigate to next page
function nextPage() {
    if (currentPageIndex < currentBookPages.length - 1) {
        currentPageIndex++;
        updatePageDisplay();
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

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('livro.html')) {
            initBookDetailPage();
            initReviews();
        }
    });
} else {
    if (window.location.pathname.includes('livro.html')) {
        initBookDetailPage();
        initReviews();
    }
}
