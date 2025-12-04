// ==================================
// API.JS - Backend API service
// ==================================

const API_CONFIG = {
    // Change this to your production URL when deploying
    // Backend runs under context path '/api' (see backend application.yml)
    baseUrl: 'http://localhost:8080/api',
    timeout: 10000
};

/**
 * API Service for communicating with the backend
 */
const api = {
    /**
     * Make a fetch request with error handling
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<any>} - Response data
     */
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Request timeout:', endpoint);
                throw new Error('Request timeout');
            }
            console.error('API Error:', error);
            throw error;
        }
    },

    // ==================
    // BOOKS ENDPOINTS
    // ==================

    /**
     * Get all active books
     * @returns {Promise<Array>} - List of books
     */
    async getBooks() {
        return this.request('/books');
    },

    /**
     * Get featured books
     * @returns {Promise<Array>} - List of featured books
     */
    async getFeaturedBooks() {
        return this.request('/books/featured');
    },

    /**
     * Get a single book by slug
     * @param {string} slug - Book slug
     * @returns {Promise<Object>} - Book details
     */
    async getBookBySlug(slug) {
        return this.request(`/books/${slug}`);
    },

    /**
     * Get a single book by ID
     * @param {number} id - Book ID
     * @returns {Promise<Object>} - Book details
     */
    async getBookById(id) {
        return this.request(`/books/${id}`);
    },

    // ==================
    // BLOG ENDPOINTS
    // ==================

    /**
     * Get all blog posts
     * @returns {Promise<Array>} - List of blog posts
     */
    async getBlogPosts() {
        return this.request('/blog/posts');
    },

    /**
     * Get a single blog post by slug
     * @param {string} slug - Blog post slug
     * @returns {Promise<Object>} - Blog post details
     */
    async getBlogPostBySlug(slug) {
        return this.request(`/blog/posts/${slug}`);
    },

    /**
     * Get blog categories
     * @returns {Promise<Array>} - List of blog categories
     */
    async getBlogCategories() {
        return this.request('/blog/categories');
    },

    // ==================
    // BOOK COMMENTS ENDPOINTS
    // ==================

    /**
     * Get approved comments for a book
     * @param {number} bookId - Book ID
     * @param {number} page - Page number (default: 0)
     * @param {number} size - Page size (default: 10)
     * @returns {Promise<Object>} - Paginated comments
     */
    async getBookComments(bookId, page = 0, size = 10) {
        return this.request(`/books/${bookId}/comments?page=${page}&size=${size}`);
    },

    /**
     * Submit a new comment for a book
     * @param {number} bookId - Book ID
     * @param {Object} data - Comment data {authorName, authorEmail, rating, title, content}
     * @returns {Promise<Object>} - Response with submitted comment
     */
    async submitBookComment(bookId, data) {
        return this.request(`/books/${bookId}/comments`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Mark a comment as helpful
     * @param {number} commentId - Comment ID
     * @returns {Promise<Object>} - Response with updated comment
     */
    async markCommentHelpful(commentId) {
        return this.request(`/books/comments/${commentId}/helpful`, {
            method: 'PUT'
        });
    }
};

/**
 * Transform backend book data to frontend format
 * Backend now returns data in the correct format via BookDTO
 * This function now just ensures compatibility and provides defaults
 * @param {Object} book - Book from API
 * @returns {Object} - Transformed book for frontend
 */
function transformBook(book) {
    // samplePages is already an array from the backend
    let samplePages = book.samplePages || [];
    
    // Ensure samplePages is always an array
    if (typeof samplePages === 'string') {
        try {
            samplePages = JSON.parse(samplePages);
        } catch (e) {
            samplePages = samplePages.split(',').map(s => s.trim()).filter(s => s);
        }
    }
    
    return {
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        category: book.category || 'geral',
        price: parseFloat(book.price) || 0,
        oldPrice: book.oldPrice ? parseFloat(book.oldPrice) : null,
        description: book.description || '',
        isbn: book.isbn || '',
        pages: book.pages || 0,
        year: book.year || null,
        language: book.language || 'Português',
        publisher: book.publisher || '',
        featured: book.featured || false,
        promo: book.promo || false,
        image: book.image || null,
        stock: book.stock || 0,
        rating: book.rating || 0,
        reviewCount: book.reviewCount || 0,
        samplePages: samplePages
    };
}

/**
 * Transform array of books
 * @param {Array} books - Books from API
 * @returns {Array} - Transformed books
 */
function transformBooks(books) {
    return books.map(transformBook);
}

// Export for use in other modules
window.api = api;
window.transformBook = transformBook;
window.transformBooks = transformBooks;
