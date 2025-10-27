// ==================================
// BOOKS.JS - Books catalog page functionality
// ==================================

let currentBooks = [...booksData];
let currentView = 'grid';

// Initialize books page
function initBooksPage() {
    loadBooks();
    attachFilters();
    applyURLFilters();
}

// Load books with skeleton animation
function loadBooks() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    // Display books immediately (skeleton is shown by default in HTML)
    displayBooks(currentBooks);
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
    
    booksGrid.innerHTML = books.map(book => `
        <div class="book-card" onclick="window.location.href='livro.html?id=${book.id}'" data-aos="fade-up">
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
    `).join('');
    
    // Reinitialize AOS for new elements
    AOS.refresh();
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
    if (category === '') {
        currentBooks = [...booksData];
    } else {
        currentBooks = booksData.filter(book => book.category === category);
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
        currentBooks = booksData.filter(book => book.promo);
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
