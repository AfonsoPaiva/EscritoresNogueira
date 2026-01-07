// ==================================
// ARTICLE.JS - Article detail page functionality
// ==================================

let currentArticle = null;
let allBlogPosts = [];

// Initialize article page (slug-only)
function initArticlePage() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const artigoIndex = pathParts.indexOf('artigo');
    let articleSlug = null;

    if (artigoIndex !== -1 && pathParts[artigoIndex + 1]) {
        articleSlug = decodeURIComponent(pathParts[artigoIndex + 1]);
    }

    // Reject numeric IDs and redirect to blog
    if (articleSlug && /^\d+$/.test(articleSlug)) {
        console.warn(`Numeric ID "${articleSlug}" detected in URL. Redirecting to /blog as only slugs are supported.`);
        window.location.href = '/blog';
        return;
    }

    if (articleSlug) {
        loadArticleFromAPI(articleSlug);
    } else {
        console.warn('No article slug found in URL. Redirecting to /blog.');
        window.location.href = '/blog';
    }
}

// Load article from API — slug-only
async function loadArticleFromAPI(articleSlug) {
    const articleContent = document.getElementById('articleContent');
    if (!articleContent) {
        console.error('articleContent element not found');
        return;
    }

    articleContent.innerHTML = '<div style="text-align: center; padding: 2rem;"><p>Carregando artigo...</p></div>';

    try {
        const post = await api.getBlogPostBySlug(articleSlug);
        
        if (!post || !post.id) { 
            showArticleNotFoundError(); 
            return; 
        }

        currentArticle = post;
        displayArticle();

        // Load other posts for related articles section
        try { 
            allBlogPosts = await api.getBlogPosts(); 
        } catch (e) { 
            allBlogPosts = []; 
        }
        loadRelatedArticles();

    } catch (error) {
        console.error('Error loading article by slug:', error);
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
        const articleUrl = post.slug ? `/artigo/${post.slug}` : '#';
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

// Initialize on page load — run only for article detail paths
(function initOnLoad() {
    if (window.location.pathname.startsWith('/artigo/')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initArticlePage);
        } else {
            initArticlePage();
        }
    }
})();
