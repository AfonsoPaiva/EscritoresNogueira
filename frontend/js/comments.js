// ==================================
// COMMENTS.JS - Book comments management
// ==================================

/**
 * Comments module for handling book reviews/comments
 * - Loads approved comments from API
 * - Renders them with proper formatting
 * - Calculates average rating (only approved comments)
 * - Handles "no comments" state
 */
const commentsModule = {
    currentBookId: null,
    comments: [],

    /**
     * Initialize comments for a book
     * @param {number} bookId - Book ID
     */
    async init(bookId) {
        console.log('📝 Comments module initializing for book ID:', bookId);
        this.currentBookId = bookId;
        await this.loadComments();
        this.render();
        console.log('📝 Comments module initialized, comments count:', this.comments.length);
    },

    /**
     * Load approved comments from API
     */
    async loadComments() {
        console.log('📝 loadComments() called for bookId:', this.currentBookId);
        
        // Validate bookId before making API call
        if (!this.currentBookId || this.currentBookId === 'null' || this.currentBookId === 'undefined') {
            console.log('⚠️ Invalid bookId, skipping API call');
            this.comments = [];
            return;
        }
        
        try {
            const response = await api.getBookComments(this.currentBookId);
            console.log('📝 API response:', response);
            console.log('📝 response.data:', response.data);
            this.comments = response.data || response || [];
            // Ensure it's an array
            if (!Array.isArray(this.comments)) {
                console.log('📝 comments is not an array, setting to empty');
                this.comments = [];
            }
            console.log(`📝 Carregados ${this.comments.length} comentários aprovados:`, this.comments);
        } catch (error) {
            console.error('❌ Erro ao carregar comentários:', error);
            this.comments = [];
        }
    },

    /**
     * Render comments or "no comments" message
     */
    render() {
        console.log('📝 render() called, comments count:', this.comments.length);
        const reviewsList = document.querySelector('.reviews-list');
        console.log('📝 reviewsList element:', reviewsList);
        if (!reviewsList) {
            console.log('❌ .reviews-list not found in DOM!');
            return;
        }

        if (this.comments.length === 0) {
            console.log('📝 No comments, rendering empty message');
            this.renderNoComments(reviewsList);
        } else {
            console.log('📝 Rendering', this.comments.length, 'comments');
            this.renderComments(reviewsList);
        }

        // Update average rating display
        this.updateAverageRating();
    },

    /**
     * Render "no comments" message
     */
    renderNoComments(container) {
        container.innerHTML = `
            <div class="no-comments-message" style="text-align: center; padding: 2rem;">
                <i class="fas fa-comment" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p style="color: #666; font-size: 1.1rem;">Ainda não existem comentários para este livro.</p>
                <p style="color: #999; font-size: 0.95rem;">Sê o primeiro a deixar uma avaliação!</p>
            </div>
        `;
    },

    /**
     * Render all comments
     */
    renderComments(container) {
        container.innerHTML = this.comments.map(comment => this.createCommentHTML(comment)).join('');
        this.attachCommentEvents(container);
    },

    /**
     * Create HTML for a single comment
     */
    createCommentHTML(comment) {
        const starHTML = this.generateStarRating(comment.rating);
        const formattedDate = this.formatDate(comment.createdAt);
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        return `
            <div class="review-item" data-comment-id="${comment.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="reviewer-details">
                            <h4 class="reviewer-name">${escapeHtml(comment.authorName)}</h4>
                            <div class="review-rating">
                                ${starHTML}
                            </div>
                        </div>
                    </div>
                    <div class="review-date">${formattedDate}</div>
                </div>
                <div class="review-content">
                    <h5 class="review-title">${escapeHtml(comment.title)}</h5>
                    <p>${escapeHtml(comment.content)}</p>
                </div>
                <div class="review-actions">
                    <button class="helpful-btn" onclick="commentsModule.markHelpful(event, ${comment.id})">
                        <i class="fas fa-thumbs-up"></i>
                        Útil (${comment.helpfulCount || 0})
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate star rating HTML
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    },

    /**
     * Format date for display (Portuguese)
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('pt-PT', options);
    },

    /**
     * Mark comment as helpful
     */
    async markHelpful(event, commentId) {
        event.preventDefault();
        try {
            const response = await api.markCommentHelpful(commentId);
            if (response.success) {
                // Update helpful count in UI
                const comment = this.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.helpfulCount = (comment.helpfulCount || 0) + 1;
                    const button = event.target.closest('.helpful-btn');
                    if (button) {
                        button.innerHTML = `<i class="fas fa-thumbs-up"></i> Útil (${comment.helpfulCount})`;
                        button.disabled = true;
                        button.style.opacity = '0.6';
                    }
                    window.showNotification('Obrigado pelo feedback!', 'success');
                }
            }
        } catch (error) {
            console.error('Erro ao marcar como útil:', error);
            window.showNotification('Erro ao processar sua ação.', 'error');
        }
    },

    /**
     * Calculate and display average rating and breakdown (only approved comments)
     */
    updateAverageRating() {
        if (this.comments.length === 0) {
            this.setAverageRating(0, 0);
            this.setRatingBreakdown({}, 0);
            return;
        }

        // Calculate average rating
        const totalRating = this.comments.reduce((sum, c) => sum + (c.rating || 0), 0);
        const averageRating = (totalRating / this.comments.length).toFixed(1);
        
        // Calculate rating breakdown (count for each star rating)
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.comments.forEach(comment => {
            const rating = comment.rating || 0;
            if (rating >= 1 && rating <= 5) {
                ratingCounts[rating]++;
            }
        });

        this.setAverageRating(averageRating, this.comments.length);
        this.setRatingBreakdown(ratingCounts, this.comments.length);
    },

    /**
     * Set average rating display in the UI
     */
    setAverageRating(average, count) {
        // Update rating display (if exists in page)
        const ratingDisplay = document.querySelector('.book-rating');
        if (ratingDisplay) {
            if (count === 0) {
                ratingDisplay.innerHTML = `
                    <div class="no-ratings-message" style="text-align: center; color: #999;">
                        <p>Sem avaliações ainda</p>
                    </div>
                `;
            } else {
                const averageValue = parseFloat(average) || 0;
                const starHTML = this.generateStarRating(averageValue);
                ratingDisplay.innerHTML = `
                    <div class="rating-stars">${starHTML}</div>
                    <div class="rating-value">${averageValue.toFixed(1)}</div>
                    <div class="rating-count">(${count} ${count === 1 ? 'avaliação' : 'avaliações'})</div>
                `;
            }
        }

        // Update overall rating in reviews summary section
        const overallRatingDiv = document.querySelector('.overall-rating');
        if (overallRatingDiv) {
            if (count === 0) {
                overallRatingDiv.innerHTML = `
                    <div class="no-ratings-message" style="text-align: center; padding: 2rem; color: #999;">
                        <i class="fas fa-star" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                        <p style="margin-top: 0.5rem; font-size: 1rem;">Ainda não existem avaliações</p>
                        <p style="font-size: 0.9rem; margin-top: 0.25rem;">Sê o primeiro a avaliar este livro!</p>
                    </div>
                `;
            } else {
                const averageValue = parseFloat(average) || 0;
                const starHTML = this.generateStarRating(averageValue);
                overallRatingDiv.innerHTML = `
                    <div class="rating-number">${averageValue.toFixed(1)}</div>
                    <div class="rating-stars">${starHTML}</div>
                    <div class="rating-count">${count} ${count === 1 ? 'avaliação' : 'avaliações'}</div>
                `;
            }
        }
    },

    /**
     * Set rating breakdown bars in the UI
     * @param {Object} ratingCounts - Object with counts for each star: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
     * @param {number} totalComments - Total number of approved comments
     */
    setRatingBreakdown(ratingCounts, totalComments) {
        const ratingBreakdown = document.querySelector('.rating-breakdown');
        if (!ratingBreakdown) return;

        if (totalComments === 0) {
            ratingBreakdown.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: #999;">
                    <p>Sem dados de avaliação disponíveis</p>
                </div>
            `;
            return;
        }

        // Build breakdown bars (from 5 stars to 1 star)
        let breakdownHTML = '';
        for (let stars = 5; stars >= 1; stars--) {
            const count = ratingCounts[stars] || 0;
            const percentage = ((count / totalComments) * 100).toFixed(0);
            
            breakdownHTML += `
                <div class="rating-bar">
                    <span class="rating-label">${stars} ${stars === 1 ? 'estrela' : 'estrelas'}</span>
                    <div class="rating-progress">
                        <div class="rating-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="rating-percent">${percentage}%</span>
                </div>
            `;
        }

        ratingBreakdown.innerHTML = breakdownHTML;
    },

    /**
     * Attach event listeners to comment elements
     */
    attachCommentEvents(container) {
        // Events are attached inline in HTML (onclick attributes)
        // This method can be used for additional event delegation if needed
    }
};

// Export for use in other modules
window.commentsModule = commentsModule;
