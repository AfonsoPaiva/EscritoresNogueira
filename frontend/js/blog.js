// ==================================
// BLOG.JS - Blog page functionality
// ==================================

// Initialize blog page
function initBlogPage() {
    loadBlogPosts();
}

// Load all blog posts
function loadBlogPosts() {
    const blogPostsGrid = document.getElementById('blogPosts');
    if (!blogPostsGrid) return;
    
    blogPostsGrid.innerHTML = blogPosts.map(post => `
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
    
    // Remove loading class to show footer
    document.body.classList.remove('loading');
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
