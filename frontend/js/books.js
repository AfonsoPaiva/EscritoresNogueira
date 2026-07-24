// ==================================
// BOOKS.JS - Books catalog page functionality
// ==================================

let allBooks = []; // All books from API
let currentBooks = [];
let currentView = 'list';
let isLoading = false;

// Helper: slugify a string for option values
function slugify(str) {
    if (!str) return '';
    return String(str).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Helper: get readable category name from book
function getBookCategoryName(book) {
    const c = book.category;
    if (!c) return 'Geral';
    if (typeof c === 'object') {
        return c.name || c.title || c.label || String(c) || 'Geral';
    }
    return String(c);
}

// Helper: get a normalized category slug for book (used in option values and filtering)
function getBookCategorySlug(book) {
    const c = book.category;
    if (!c) return 'geral';
    if (typeof c === 'object') {
        return slugify(c.slug || c.name || c.title || JSON.stringify(c));
    }
    return slugify(c);
}

// Populate category select from unique categories in `allBooks`
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    // Keep the default "all" option first
    const defaultOption = '<option value="">Todas as Categorias</option>';

    // Build map slug -> display name
    const map = new Map();
    allBooks.forEach(b => {
        const name = getBookCategoryName(b) || 'Geral';
        const slug = getBookCategorySlug(b) || 'geral';
        if (!map.has(slug)) map.set(slug, name);
    });

    // Sort categories alphabetically by display name
    const opts = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));

    // Preserve any previously selected value
    const prev = select.value || '';

    select.innerHTML = defaultOption + opts.map(([slug, name]) => `\n        <option value="${slug}">${name}</option>`).join('');

    // Restore previous selection if still available
    if (prev) {
        const opt = Array.from(select.options).find(o => o.value === prev);
        if (opt) select.value = prev;
    }
}

// Initialize books page
async function initBooksPage() {
    await loadBooks();
    attachFilters();
    applyURLFilters();
}

// Load books from static API
async function loadBooks() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    isLoading = true;
    showLoadingSkeleton(booksGrid);
    
    try {
        const booksFromApi = await api.getBooks();
        allBooks = transformBooks(booksFromApi);
        currentBooks = [...allBooks];
        populateCategoryFilter();
        displayBooks(currentBooks);
    } catch (error) {
        console.error('Error loading books:', error);
        allBooks = window.booksData || [];
        currentBooks = [...allBooks];
        populateCategoryFilter();
        displayBooks(currentBooks);
    } finally {
        isLoading = false;
    }
}

// Show loading skeleton
function showLoadingSkeleton(container) {
    const skeletonCards = Array(4).fill('').map(() => `
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
    
    booksGrid.classList.add('list-view');

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
        const categoryName = typeof book.category === 'object' ? (book.category?.name || 'Geral') : (book.category || 'Geral');
        const imageUrl = book.image || book.coverImage || book.coverUrl || null;
        const isPromo = book.promo === true;
        const oldPrice = isPromo ? (book.oldPrice || book.originalPrice || null) : null;
        const bookUrl = book.slug ? `/livro/${book.slug}` : `/livro/${book.id}`;
        const buyUrl = book.buyUrl || (book.isbn ? `https://www.amazon.com/dp/${book.isbn.replace(/[^a-zA-Z0-9]/g, '')}` : '#');
        
        return `
        <div class="book-card" data-href="${bookUrl}" data-book-id="${book.id}" data-aos="slide-up" data-aos-stagger-group="books">
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
                    <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary buy-btn" onclick="event.stopPropagation();">
                        Comprar
                    </a>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Attach click events to book cards
    attachBookCardEvents(booksGrid);
    
    // Reinitialize AOS for new elements
    if (typeof initGSAPAnimations === 'function') { try { initGSAPAnimations(); } catch (e) { console.warn('initGSAPAnimations failed', e); } }
    if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) { console.warn('ScrollTrigger.refresh failed', e); } }
}

// Attach click events to book cards using event delegation
function attachBookCardEvents(container) {
    if (!container) return;
    
    // Remove any existing listeners by cloning
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    // Add click listener to container (event delegation)
    newContainer.addEventListener('click', function(e) {
        const buyBtn = e.target.closest('.buy-btn');
        if (buyBtn) {
            // Let the buy link navigate directly
            return;
        }
        
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
}

// Filter books by category
function filterBooks(category) {
    if (category === '' || category === 'all') {
        currentBooks = [...allBooks];
    } else {
        currentBooks = allBooks.filter(book => getBookCategorySlug(book) === category);
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

// Toggle view (always list view)
function toggleView(view = 'list') {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    currentView = 'list';
    booksGrid.classList.add('list-view');
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
        if (window.location.pathname.includes('/livros')) {
            initBooksPage();
        }
    });
} else {
    if (window.location.pathname.includes('/livros')) {
        initBooksPage();
    }
}
