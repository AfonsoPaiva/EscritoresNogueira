// ==================================
// ARTICLE.JS - Article detail page functionality
// ==================================

let currentArticle = null;
let allBlogPosts = [];

// Initialize article page
function initArticlePage() {
    const urlParams = new URLSearchParams(window.location.search);
    let articleIdOrSlug = null;
    let isId = false;

    // query params: id or slugOrId
    if (urlParams.get('slug') || urlParams.get('slugOrId') || urlParams.get('id')) {
        articleIdOrSlug = urlParams.get('slug') || urlParams.get('slugOrId') || urlParams.get('id');
        if (articleIdOrSlug && /^[0-9]+$/.test(articleIdOrSlug)) isId = true;
    }

    // path: check for either 'artigo' or 'blog'
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const artigoIndex = pathParts.indexOf('artigo');
    const blogIndex = pathParts.indexOf('blog');
    const paramIndex = (artigoIndex !== -1) ? artigoIndex : (blogIndex !== -1 ? blogIndex : -1);
    if (paramIndex !== -1 && pathParts[paramIndex + 1]) {
        const pathParam = decodeURIComponent(pathParts[paramIndex + 1]);
        articleIdOrSlug = pathParam;
        isId = /^[0-9]+$/.test(pathParam);
    }

    if (articleIdOrSlug) {
        // pass raw string and flag whether it's an id
        loadArticleFromAPI(articleIdOrSlug, isId);
    } else {
        window.location.href = '/blog';
    }
}

// Load article from API
async function loadArticleFromAPI(articleIdOrSlug, isId) {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent) return;

    articleContent.innerHTML = '<div style="text-align: center; padding: 2rem;"><p>Carregando artigo...</p></div>';

    try {
        allBlogPosts = await api.getBlogPosts();
        if (!allBlogPosts || allBlogPosts.length === 0) throw new Error('Nenhum artigo encontrado');

        if (isId) {
            // match by id but compare as strings to preserve large Long values
            currentArticle = allBlogPosts.find(post => String(post.id) === String(articleIdOrSlug));
        } else {
            currentArticle = allBlogPosts.find(post => post.slug === articleIdOrSlug);
        }

        if (!currentArticle) { showArticleNotFoundError(); return; }

        displayArticle();
        loadRelatedArticles();

    } catch (error) {
        console.error('Erro ao carregar artigo:', error);
        showArticleLoadError();
    }
}

// Display article
function displayArticle() {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent || !currentArticle) return;
    
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

// Load related articles from fetched data
function loadRelatedArticles() {
    const relatedArticlesContainer = document.getElementById('relatedArticles');
    if (!relatedArticlesContainer || !currentArticle) return;

    const relatedArticles = allBlogPosts
        .filter(post => post.category === currentArticle.category && String(post.id) !== String(currentArticle.id))
        .slice(0, 3);

    if (relatedArticles.length < 3) {
        const otherArticles = allBlogPosts
            .filter(post => String(post.id) !== String(currentArticle.id) && !relatedArticles.find(r => String(r.id) === String(post.id)))
            .slice(0, 3 - relatedArticles.length);
        relatedArticles.push(...otherArticles);
    }

    relatedArticlesContainer.innerHTML = relatedArticles.map(post => {
        const articleUrl = post.slug ? `/artigo/${post.slug}` : `/artigo/${post.id}`;
        return `
        <div class="blog-card" onclick="window.location.href='${articleUrl}'">
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
                <a href="${articleUrl}" class="read-more">
                    Ler mais <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `}).join('');
}

// Show article not found error
function showArticleNotFoundError() {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent) return;
    
    articleContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
            <p style="color: var(--text-gray); font-size: 1.2rem;">Artigo não encontrado. Verifique a URL e tente novamente</p>
            <button onclick="window.location.href='/blog'" class="btn btn-primary" style="margin-top: 20px;">Voltar ao Blog</button>
        </div>
    `;
    
    // Redirect to blog after 3 seconds
    setTimeout(() => {
        window.location.href = '/blog';
    }, 3000);
}

// Show article load error
function showArticleLoadError() {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent) return;
    
    articleContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
            <p style="color: var(--text-gray); font-size: 1.2rem;">Erro ao carregar artigo. Verifique a sua conexão à internet</p>
            <button onclick="window.location.href='/blog'" class="btn btn-primary" style="margin-top: 20px;">Voltar ao Blog</button>
        </div>
    `;
    
    // Redirect to blog after 3 seconds
    setTimeout(() => {
        window.location.href = '/blog';
    }, 3000);
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
        if (window.location.pathname.includes('artigo')) {
            initArticlePage();
        }
    });
} else {
    if (window.location.pathname.includes('artigo')) {
        initArticlePage();
    }
}
