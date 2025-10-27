// ==================================
// UTILS.JS - Reusable utility functions
// ==================================

/**
 * Render a book card template
 * @param {Object} book - Book object with id, title, author, price, etc.
 * @param {Object} options - Options: { wrapper: 'div', wrapperClass: '', onClick: '', dataAos: '' }
 * @returns {String} HTML template for book card
 */
function renderBookCard(book, options = {}) {
    const {
        wrapper = 'div',
        wrapperClass = 'book-card',
        onClick = `window.location.href='livro.html?id=${book.id}'`,
        dataAos = ''
    } = options;

    const aosAttr = dataAos ? ` data-aos="${dataAos}"` : '';
    
    return `
        <${wrapper} class="${wrapperClass}" onclick="${onClick}"${aosAttr}>
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
        </${wrapper}>
    `;
}

/**
 * Render multiple book cards
 * @param {Array} books - Array of book objects
 * @param {Object} options - Options for renderBookCard
 * @returns {String} HTML string of all book cards joined together
 */
function renderBookCards(books, options = {}) {
    return books.map(book => renderBookCard(book, options)).join('');
}

/**
 * Render a blog card template
 * @param {Object} post - Post object with id, title, excerpt, date, readTime, etc.
 * @param {Object} options - Options: { onClick: '', image: 'icon', dataAos: '' }
 * @returns {String} HTML template for blog card
 */
function renderBlogCard(post, options = {}) {
    const {
        onClick = `window.location.href='artigo.html?id=${post.id}'`,
        imageIcon = 'newspaper',
        dataAos = ''
    } = options;

    const aosAttr = dataAos ? ` data-aos="${dataAos}"` : '';
    
    return `
        <div class="blog-card" onclick="${onClick}"${aosAttr}>
            <div class="blog-image">
                ${post.image ? `<img src="${post.image}" alt="${post.title}">` : `<i class="fas fa-${imageIcon}"></i>`}
            </div>
            <div class="blog-content">
                <div class="blog-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(post.date)}</span>
                    <span><i class="far fa-clock"></i> ${post.readTime}</span>
                </div>
                <h3 class="blog-title">${post.title}</h3>
                <p class="blog-excerpt">${post.excerpt}</p>
                <a href="artigo.html?id=${post.id}" class="read-more">
                    Ler mais <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `;
}

/**
 * Render multiple blog cards
 * @param {Array} posts - Array of blog post objects
 * @param {Object} options - Options for renderBlogCard
 * @returns {String} HTML string of all blog cards joined together
 */
function renderBlogCards(posts, options = {}) {
    return posts.map(post => renderBlogCard(post, options)).join('');
}

/**
 * Extract form values by input type or name
 * @param {HTMLElement} form - Form element
 * @param {Array} fields - Array of { type/name: 'email', name: 'fieldName' }
 * @returns {Object} Object with extracted values
 */
function getFormValues(form, fields) {
    const values = {};
    
    fields.forEach(field => {
        const selector = field.type ? `input[type="${field.type}"]` : `[name="${field.name}"]`;
        const element = form.querySelector(selector);
        
        if (element) {
            values[field.name || field.type] = element.value;
        }
    });
    
    return values;
}

/**
 * Toggle sidebar visibility with overlay
 * @param {String} sidebarId - ID of sidebar to toggle
 * @param {String} overlayId - ID of overlay element (default: 'overlay')
 * @param {String} excludeSidebarId - ID of sidebar to close (optional, for closing conflicting sidebars)
 */
function toggleSidebar(sidebarId, overlayId = 'overlay', excludeSidebarId = null) {
    const sidebar = document.getElementById(sidebarId);
    const overlay = document.getElementById(overlayId);
    
    if (!sidebar || !overlay) {
        console.error(`❌ Sidebar or overlay not found: ${sidebarId}, ${overlayId}`);
        return;
    }
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Close conflicting sidebar if specified
    if (excludeSidebarId) {
        const excludeSidebar = document.getElementById(excludeSidebarId);
        if (excludeSidebar) {
            excludeSidebar.classList.remove('active');
        }
    }
    
    console.log(`🔄 Sidebar toggled: ${sidebarId}`, { active: sidebar.classList.contains('active') });
}

/**
 * Close sidebar
 * @param {String} sidebarId - ID of sidebar to close
 * @param {String} overlayId - ID of overlay element (default: 'overlay')
 */
function closeSidebar(sidebarId, overlayId = 'overlay') {
    const sidebar = document.getElementById(sidebarId);
    const overlay = document.getElementById(overlayId);
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay && !document.getElementById('userSidebar')?.classList.contains('active') && 
                   !document.getElementById('cartSidebar')?.classList.contains('active')) {
        overlay.classList.remove('active');
    }
}

/**
 * Initialize tabs for page
 * @param {String} tabsSelector - CSS selector for tab elements
 * @param {String} contentsSelector - CSS selector for content elements
 * @param {String} activeClass - Class name for active state (default: 'active')
 * @param {Function} onTabChange - Callback when tab changes
 */
function initPageTabs(tabsSelector, contentsSelector, activeClass = 'active', onTabChange = null) {
    const tabs = document.querySelectorAll(tabsSelector);
    const contents = document.querySelectorAll(contentsSelector);

    if (tabs.length === 0 || contents.length === 0) {
        console.warn('⚠️ Tabs or contents not found:', { tabsSelector, contentsSelector });
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove(activeClass));
            contents.forEach(c => c.classList.remove(activeClass));

            // Add active class to clicked tab and corresponding content
            tab.classList.add(activeClass);
            
            const targetTab = tab.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            
            if (targetContent) {
                targetContent.classList.add(activeClass);

                // Trigger AOS refresh if available
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }

                // Call callback if provided
                if (onTabChange) {
                    onTabChange(targetTab);
                }
            }

            // Update URL hash
            history.replaceState(null, null, `#${targetTab}`);
        });
    });
}

/**
 * Initialize page on load (replaces repeated pattern in multiple files)
 * @param {String} pageName - Page name to check in pathname (e.g., 'livro.html')
 * @param {Function} initFunction - Function to call on page load
 */
function initPageOnLoad(pageName, initFunction) {
    const checkAndInit = () => {
        if (window.location.pathname.includes(pageName)) {
            initFunction();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInit);
    } else {
        checkAndInit();
    }
}

/**
 * Handle URL hash navigation (replaces repeated pattern in multiple files)
 * @param {String} selector - CSS selector for hash target elements (e.g., '[data-tab]')
 */
function handleURLHash(selector = '[data-tab]') {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const targetElement = document.querySelector(`${selector}[data-tab="${hash}"]`);
        if (targetElement) {
            targetElement.click();
        }
    }
}

/**
 * Utility to format date (if not already available globally)
 * @param {String} dateString - Date string to format
 * @returns {String} Formatted date
 */
function formatDateLocale(dateString) {
    if (typeof formatDate === 'function') {
        return formatDate(dateString);
    }
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-PT', options);
}

/**
 * Find item in array by property
 * @param {Array} array - Array to search
 * @param {String} property - Property name to match
 * @param {*} value - Value to match
 * @returns {Object|null} Found item or null
 */
function findByProperty(array, property, value) {
    return array.find(item => item[property] === value);
}

/**
 * Filter array by property value
 * @param {Array} array - Array to filter
 * @param {String} property - Property name
 * @param {*} value - Value to match
 * @returns {Array} Filtered array
 */
function filterByProperty(array, property, value) {
    return array.filter(item => item[property] === value);
}

/**
 * Show/hide loading state
 * @param {Boolean} show - Whether to show loading
 * @param {String} elementId - ID of element to update (default: null for body)
 * @param {String} className - Class name to add (default: 'loading')
 */
function setLoadingState(show, elementId = null, className = 'loading') {
    const element = elementId ? document.getElementById(elementId) : document.body;
    
    if (show) {
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
}

/**
 * Safe DOM element getter with logging
 * @param {String} elementId - ID of element
 * @param {String} context - Context for logging
 * @returns {HTMLElement|null} Element or null
 */
function safeGetElement(elementId, context = '') {
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.warn(`⚠️ Element not found: #${elementId} ${context}`);
        return null;
    }
    
    return element;
}

/**
 * Batch get multiple elements
 * @param {Array} ids - Array of element IDs
 * @returns {Object} Object with id keys and element values
 */
function getElements(ids) {
    const elements = {};
    
    ids.forEach(id => {
        elements[id] = safeGetElement(id);
    });
    
    return elements;
}

console.log('✅ Utils.js loaded - Reusable utilities available');
