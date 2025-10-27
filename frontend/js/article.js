// ==================================
// ARTICLE.JS - Article detail page functionality
// ==================================

let currentArticle = null;

// Initialize article page
function initArticlePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = parseInt(urlParams.get('id'));
    
    if (articleId) {
        loadArticle(articleId);
    } else {
        window.location.href = 'blog.html';
    }
}

// Load article details
function loadArticle(articleId) {
    currentArticle = blogPosts.find(post => post.id === articleId);
    
    if (!currentArticle) {
        window.location.href = 'blog.html';
        return;
    }
    
    displayArticle();
    loadRelatedArticles();
}

// Display article
function displayArticle() {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent) return;
    
    articleContent.innerHTML = `
        <div class="article-header" data-aos="fade-up">
            <h1 class="article-title">${currentArticle.title}</h1>
            <div class="article-meta">
                <span><i class="far fa-user"></i> ${currentArticle.author}</span>
                <span><i class="far fa-calendar"></i> ${formatDate(currentArticle.date)}</span>
                <span><i class="far fa-clock"></i> ${currentArticle.readTime}</span>
                <span><i class="fas fa-tag"></i> ${currentArticle.category}</span>
            </div>
        </div>
        
        ${currentArticle.image ? `
            <div class="article-featured-image" data-aos="fade-up">
                <img src="${currentArticle.image}" alt="${currentArticle.title}">
            </div>
        ` : ''}
        
        <div class="article-body" data-aos="fade-up">
            ${currentArticle.content}
        </div>
    `;
    
    // Update page title
    document.title = `${currentArticle.title} - Escritores Nogueira`;
}

// Load related articles
function loadRelatedArticles() {
    const relatedArticlesContainer = document.getElementById('relatedArticles');
    if (!relatedArticlesContainer || !currentArticle) return;
    
    // Get articles from the same category, excluding current article
    const relatedArticles = blogPosts
        .filter(post => post.category === currentArticle.category && post.id !== currentArticle.id)
        .slice(0, 3);
    
    // If not enough from same category, fill with other articles
    if (relatedArticles.length < 3) {
        const otherArticles = blogPosts
            .filter(post => post.id !== currentArticle.id && !relatedArticles.includes(post))
            .slice(0, 3 - relatedArticles.length);
        relatedArticles.push(...otherArticles);
    }
    
    relatedArticlesContainer.innerHTML = relatedArticles.map(post => `
        <div class="blog-card" onclick="window.location.href='artigo.html?id=${post.id}'">
            <div class="blog-image">
                ${post.image ? `<img src="${post.image}" alt="${post.title}">` : '<i class="fas fa-newspaper"></i>'}
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
    `).join('');
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-PT', options);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('artigo.html')) {
            initArticlePage();
        }
    });
} else {
    if (window.location.pathname.includes('artigo.html')) {
        initArticlePage();
    }
}
