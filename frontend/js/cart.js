// ==================================
// CART.JS - Shopping cart functionality
// ==================================

// Declare global cart variable
window.cart = window.cart || null;

class ShoppingCart {
    constructor() {
        this.items = this.loadCart();
        this.init();
    }

    init() {
        console.log('🛒 ShoppingCart inicializado');
        this.updateCartUI();
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Cart button
        const cartBtn = document.getElementById('cartBtn');
        const closeCart = document.getElementById('closeCart');

        console.log('🛒 Anexando event listeners', { 
            cartBtn: !!cartBtn, 
            closeCart: !!closeCart 
        });

        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                console.log('🛒 Cart button clicado');
                this.toggleCart();
            });
            console.log('✅ Event listener adicionado ao cartBtn');
        } else {
            console.error('❌ cartBtn não encontrado!');
        }

        if (closeCart) {
            closeCart.addEventListener('click', () => this.closeCart());
        }

        // Checkout button
        const checkoutBtn = document.querySelector('.btn-checkout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }

        // Fixed header buttons
        const fixedCartBtn = document.getElementById('fixedCartBtn');
        if (fixedCartBtn) {
            fixedCartBtn.addEventListener('click', () => this.toggleCart());
            console.log('✅ Event listener adicionado ao fixedCartBtn');
        }

        console.log('🛒 Event listeners do carrinho anexados');
    }

    loadCart() {
        const cartData = localStorage.getItem('escritores_cart');
        return cartData ? JSON.parse(cartData) : [];
    }

    saveCart() {
        localStorage.setItem('escritores_cart', JSON.stringify(this.items));
    }

    addItem(book, quantity = 1) {
        const existingItem = this.items.find(item => item.id === book.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: book.id,
                title: book.title,
                author: book.author,
                price: book.price,
                quantity: quantity,
                image: book.image
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showNotification('Livro adicionado ao carrinho!');
    }

    removeItem(bookId) {
        this.items = this.items.filter(item => item.id !== bookId);
        this.saveCart();
        this.updateCartUI();
        this.showNotification('Livro removido do carrinho');
    }

    updateQuantity(bookId, quantity) {
        const item = this.items.find(item => item.id === bookId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(bookId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getItemCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    updateCartUI() {
        // Update cart count badge
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = this.getItemCount();
        }

        // Update fixed cart count badge
        const fixedCartCount = document.getElementById('fixedCartCount');
        if (fixedCartCount) {
            const count = this.getItemCount();
            fixedCartCount.textContent = count;
            fixedCartCount.style.display = count > 0 ? 'flex' : 'none';
        }

        // Update cart items
        const cartItems = document.getElementById('cartItems');
        if (cartItems) {
            if (this.items.length === 0) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>O seu carrinho está vazio</p>
                    </div>
                `;
            } else {
                cartItems.innerHTML = this.items.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            ${item.image ? `<img src="${item.image}" alt="${item.title}">` : '<i class="fas fa-book"></i>'}
                        </div>
                        <div class="cart-item-info">
                            <div class="cart-item-title">${item.title}</div>
                            <div class="cart-item-author">${item.author}</div>
                            <div class="cart-item-footer">
                                <div class="cart-item-price">${item.price.toFixed(2)}€</div>
                                <div class="cart-item-quantity">
                                    <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span>${item.quantity}</span>
                                    <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <button class="remove-item" onclick="cart.removeItem(${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Update cart total
        const cartTotal = document.getElementById('cartTotal');
        if (cartTotal) {
            cartTotal.textContent = `${this.getTotal().toFixed(2)}€`;
        }
    }

    toggleCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        
        console.log('🛒 toggleCart chamado', { 
            cartSidebar: !!cartSidebar, 
            overlay: !!overlay,
            cartActive: cartSidebar?.classList.contains('active')
        });
        
        if (cartSidebar && overlay) {
            cartSidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            console.log('🛒 Classes toggleadas', {
                cartActive: cartSidebar.classList.contains('active'),
                overlayActive: overlay.classList.contains('active')
            });
            
            // Close user panel if open
            const userSidebar = document.getElementById('userSidebar');
            if (userSidebar) {
                userSidebar.classList.remove('active');
            }
        } else {
            console.error('❌ Elementos não encontrados!', { cartSidebar, overlay });
        }
    }

    closeCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        
        if (cartSidebar && overlay) {
            cartSidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    closeUserPanel() {
        const userSidebar = document.getElementById('userSidebar');
        if (userSidebar) {
            userSidebar.classList.remove('active');
        }
    }

    checkout() {
        if (this.items.length === 0) {
            this.showNotification('O carrinho está vazio', 'error');
            return;
        }

        // Redirect to payment page
        window.location.href = 'pagamento.html';
    }

    showNotification(message, type = 'success') {
        console.log('🛒 Cart chamando notificação:', { message, type });
        // Use global notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.error('❌ window.showNotification não disponível');
        }
    }

    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateCartUI();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize cart
if (!window.cart) {
    window.cart = new ShoppingCart();
    console.log('✅ window.cart criado e disponível');
} else {
    console.log('⚠️ window.cart já existe');
}
