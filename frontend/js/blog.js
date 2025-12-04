// ==================================
// BLOG.JS - Blog page functionality
// ==================================

// Initialize blog page
function initBlogPage() {
    loadBlogPosts();
}

// Load all blog posts from API
async function loadBlogPosts() {
    const blogPostsGrid = document.getElementById('blogPosts');
    if (!blogPostsGrid) return;
    
    // Show loading state
    blogPostsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><p>Carregando artigos...</p></div>';

    try {
        // Fetch blog posts from API
        const posts = await api.getBlogPosts();

        if (!posts || posts.length === 0) {
            blogPostsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><p>Nenhum artigo encontrado.</p></div>';
            document.body.classList.remove('loading');
            return;
        }

        // Render blog posts
        blogPostsGrid.innerHTML = posts.map(post => `
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

        document.body.classList.remove('loading');

    } catch (error) {
        console.error('Erro ao carregar artigos:', error);
        
        // Display styled error container
        blogPostsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                <p style="color: var(--text-gray); font-size: 1.2rem;">Erro ao carregar artigos. Verifique a sua conexão à internet</p>
                <button onclick="loadBlogPosts()" class="btn btn-primary" style="margin-top: 20px;">Tentar Novamente</button>
            </div>
        `;
        
        document.body.classList.remove('loading');
    }
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
        if (window.location.pathname.includes('blog.html')) {
            initBlogPage();
        }
    });
} else {
    if (window.location.pathname.includes('blog.html')) {
        initBlogPage();
    }
}
