// ==================================
// BOOKS.JS - Books catalog page functionality
// ==================================

let allBooks = []; // All books from API
let currentBooks = [];
let currentView = 'grid';
let isLoading = false;

// Initialize books page
async function initBooksPage() {
    await loadBooks();
    attachFilters();
    applyURLFilters();
}

// Load books from API
async function loadBooks() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    // Show loading skeleton
    isLoading = true;
    showLoadingSkeleton(booksGrid);
    
    try {
        // Fetch books from API only - no fallback to static data
        const booksFromApi = await api.getBooks();
        allBooks = transformBooks(booksFromApi);
        currentBooks = [...allBooks];
        
        displayBooks(currentBooks);
    } catch (error) {
        console.error('Error loading books:', error);
        // Show error message - NO fallback to static data
        booksGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                <p style="color: var(--text-gray); font-size: 1.2rem;">Erro ao carregar livros. Verifique  a sua conexão à internet</p>
                <button onclick="loadBooks()" class="btn btn-primary" style="margin-top: 20px;">Tentar Novamente</button>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// Show loading skeleton
function showLoadingSkeleton(container) {
    const skeletonCards = Array(8).fill('').map(() => `
        <div class="book-card skeleton">
            <div class="book-image skeleton-image"></div>
            <div class="book-info">
                <div class="skeleton-text" style="width: 60%; height: 14px; margin-bottom: 10px;"></div>
                <div class="skeleton-text" style="width: 80%; height: 20px; margin-bottom: 8px;"></div>
                <div class="skeleton-text" style="width: 50%; height: 14px; margin-bottom: 15px;"></div>
                <div class="skeleton-text" style="width: 40%; height: 18px;"></div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = skeletonCards;
}

// Display books
function displayBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-book" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                <p style="color: var(--text-gray); font-size: 1.2rem;">Nenhum livro encontrado</p>
            </div>
        `;
        return;
    }
    
    booksGrid.innerHTML = books.map(book => {
        // Handle both API format (category as object) and static data format (category as string)
        const categoryName = typeof book.category === 'object' ? (book.category?.name || 'Geral') : (book.category || 'Geral');
        // Handle image field (API uses coverImage/coverUrl, static uses image)
        const imageUrl = book.image || book.coverImage || book.coverUrl || null;
        // FIXED: Only show promo badge if promo field is explicitly true
        const isPromo = book.promo === true;
        // FIXED: Only show oldPrice if promo is true AND oldPrice exists
        const oldPrice = isPromo ? (book.oldPrice || book.originalPrice || null) : null;
        const bookUrl = book.slug ? `livro.html?slug=${book.slug}` : `livro.html?id=${book.id}`;
        
        return `
        <div class="book-card" data-href="${bookUrl}" data-book-id="${book.id}" data-aos="fade-up">
            <div class="book-image">
                ${imageUrl ? `<img src="${imageUrl}" alt="${book.title}">` : '<i class="fas fa-book"></i>'}
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
    `}).join('');
    
    // Attach click events to book cards
    attachBookCardEvents(booksGrid);
    
    // Reinitialize AOS for new elements
    AOS.refresh();
}

// Attach click events to book cards using event delegation
function attachBookCardEvents(container) {
    if (!container) return;
    
    // Remove any existing listeners by cloning
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    // Add click listener to container (event delegation)
    newContainer.addEventListener('click', function(e) {
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

// Attach filter event listeners
function attachFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const viewBtns = document.querySelectorAll('.view-btn');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filterBooks(e.target.value);
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            sortBooks(e.target.value);
        });
    }
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            toggleView(view);
        });
    });
}

// Filter books by category
function filterBooks(category) {
    if (category === '' || category === 'all') {
        currentBooks = [...allBooks];
    } else {
        currentBooks = allBooks.filter(book => 
            book.category?.toLowerCase() === category.toLowerCase() ||
            book.categorySlug === category
        );
    }
    
    // Apply current sort
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortBooks(sortFilter.value);
    } else {
        displayBooks(currentBooks);
    }
}

// Sort books
function sortBooks(sortBy) {
    let sorted = [...currentBooks];
    
    switch(sortBy) {
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'price':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        default:
            sorted = [...currentBooks];
    }
    
    displayBooks(sorted);
}

// Toggle view (grid/list)
function toggleView(view) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    currentView = view;
    
    if (view === 'list') {
        booksGrid.classList.add('list-view');
    } else {
        booksGrid.classList.remove('list-view');
    }
}

// Apply filters from URL parameters
function applyURLFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const filter = urlParams.get('filter');
    
    if (category) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = category;
            filterBooks(category);
        }
    }
    
    if (filter === 'promo') {
        currentBooks = allBooks.filter(book => book.promo);
        displayBooks(currentBooks);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('livros.html')) {
            initBooksPage();
        }
    });
} else {
    if (window.location.pathname.includes('livros.html')) {
        initBooksPage();
    }
}
