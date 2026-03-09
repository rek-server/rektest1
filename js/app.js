import { initAuth, login, register, logout, currentUser, loginWithGoogle, getUserProfile, getUserOrders, resetPassword } from './auth.js';
import { getProducts, renderProductCard } from './products.js';
import { addToCart, getCart, removeFromCart, checkoutCart } from './cart.js';
import { toggleWishlistDB, getWishlistDB } from './wishlist.js';

window.showNotification = function(message, type = 'success', playSound = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Play sound
    if (playSound) {
        const audio = document.getElementById('notification-sound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Audio play prevented by browser policy"));
        }
    }
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    const duration = type === 'info' ? 5000 : 3000;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
};

const app = {
    products: [],
    wishlist: {},
    currentSearch: '',
    authInitialized: false,
    
    async init() {
        // Setup navigation
        window.addEventListener('hashchange', this.handleRoute.bind(this));
        
        // Setup Auth listener
        initAuth((user) => {
            if (!this.authInitialized) {
                this.authInitialized = true;
                this.handleRoute(); // Re-trigger route once auth is known
            }
            this.onUserChange(user);
        });
        
        // Fetch products and wishlist
        this.products = await getProducts();
        this.wishlist = await getWishlistDB();
        
        // Initial route
        this.handleRoute();
        
        // Setup global click handlers for logout
        document.getElementById('nav-logout').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            this.navigate('home');
        });

        // Mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        if (menuBtn && navMenu) {
            menuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('show');
            });
            
            // Close mobile menu when clicking a link
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    // Don't close if clicking profile button while logged in
                    if (link.id === 'nav-profile' && currentUser) {
                        return;
                    }
                    navMenu.classList.remove('show');
                });
            });
        }

        // Profile dropdown toggle
        const profileBtn = document.getElementById('nav-profile');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                // Only prevent default if it's not a link to login
                if (!currentUser) return;
                e.preventDefault();
                profileDropdown.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });
        }

        // Setup search bar
        const searchInput = document.getElementById('nav-search');
        searchInput.addEventListener('keyup', (e) => {
            this.currentSearch = e.target.value.toLowerCase();
            if (e.key === 'Enter') {
                if (window.location.hash !== '#shop') {
                    this.navigate('shop');
                } else {
                    this.applyFilters();
                }
            } else if (window.location.hash === '#shop') {
                this.applyFilters();
            }
        });

        // Close modal when clicking outside
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeProductModal();
                }
            });
        }
    },
    
    navigate(route) {
        window.location.hash = route;
    },
    
    handleRoute() {
        const hash = window.location.hash.substring(1) || 'home';
        
        const user = currentUser;

        // Enforce Admin Route
        if (hash.startsWith('admin')) {
            if (!user || user.email !== 'islammdnahidul407@gmail.com') {
                if (this.authInitialized) {
                    showNotification('Access Denied. Admins only.', 'error', true);
                    this.navigate('home');
                }
                return;
            }
        }
        
        const mainContent = document.getElementById('main-content');
        
        // Clear content
        mainContent.innerHTML = '';
        
        // Load template
        const template = document.getElementById(`tpl-${hash}`);
        if (template) {
            mainContent.appendChild(template.content.cloneNode(true));
            this.initSection(hash);
        } else {
            // Fallback to home
            this.navigate('home');
        }
    },
    
    async onUserChange(user) {
        const loginLink = document.getElementById('nav-login');
        const logoutLink = document.getElementById('nav-logout');
        const adminLink = document.getElementById('nav-admin');
        const profileLink = document.getElementById('nav-profile-link');
        
        if (user) {
            loginLink.classList.add('hidden');
            logoutLink.classList.remove('hidden');
            if (profileLink) profileLink.classList.remove('hidden');
            
            // Show admin link if email matches
            if (user.email === 'islammdnahidul407@gmail.com' && adminLink) {
                adminLink.classList.remove('hidden');
            } else if (adminLink) {
                adminLink.classList.add('hidden');
            }
            
        } else {
            loginLink.classList.remove('hidden');
            logoutLink.classList.add('hidden');
            if (adminLink) adminLink.classList.add('hidden');
            if (profileLink) profileLink.classList.add('hidden');
        }
        
        this.wishlist = await getWishlistDB();
        this.updateCartCount();
        
        // Re-render current section to update wishlist icons
        const hash = window.location.hash.substring(1) || 'home';
        if (['home', 'shop', 'offers', 'wishlist'].includes(hash)) {
            this.handleRoute();
        }
    },
    
    async initSection(section) {
        if (section === 'home') {
            const grid = document.getElementById('featured-grid');
            // Show first 6 products as featured
            const featured = this.products.slice(0, 6);
            grid.innerHTML = featured.map(p => renderProductCard(p, !!this.wishlist[p.id])).join('');
        } 
        else if (section === 'shop') {
            // Set search input value if any
            document.getElementById('nav-search').value = this.currentSearch;
            this.applyFilters();
        }
        else if (section === 'offers') {
            const grid = document.getElementById('offers-grid');
            const offers = this.products.filter(p => p.discount > 0);
            grid.innerHTML = offers.map(p => renderProductCard(p, !!this.wishlist[p.id])).join('');
        }
        else if (section === 'wishlist') {
            const grid = document.getElementById('wishlist-grid');
            const wlProducts = this.products.filter(p => this.wishlist[p.id]);
            if (wlProducts.length > 0) {
                grid.innerHTML = wlProducts.map(p => renderProductCard(p, true)).join('');
            } else {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Your wishlist is empty.</p>';
            }
        }
        else if (section === 'cart') {
            this.renderCart();
        }
        else if (section === 'login') {
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const res = await login(email, password);
                if (res.success) {
                    showNotification('Login successful.', 'success', true);
                    if (email === 'islammdnahidul407@gmail.com') {
                        this.navigate('admin');
                    } else {
                        this.navigate('home');
                    }
                } else {
                    showNotification(res.error, 'error', true);
                }
            });
            
            document.getElementById('btn-google-login').addEventListener('click', async () => {
                const res = await loginWithGoogle();
                if (res.success) {
                    showNotification('Google Login successful.', 'success', true);
                    if (currentUser && currentUser.email === 'islammdnahidul407@gmail.com') {
                        this.navigate('admin');
                    } else {
                        this.navigate('home');
                    }
                } else {
                    showNotification(res.error, 'error', true);
                }
            });
        }
        else if (section === 'register') {
            document.getElementById('register-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-name').value;
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                const res = await register(name, email, password);
                if (res.success) {
                    showNotification(res.message, 'success', true);
                    this.navigate('login');
                } else {
                    showNotification(res.error, 'error', true);
                }
            });
            
            document.getElementById('btn-google-register').addEventListener('click', async () => {
                const res = await loginWithGoogle();
                if (res.success) {
                    showNotification('Google Signup successful.', 'success', true);
                    this.navigate('home');
                } else {
                    showNotification(res.error, 'error', true);
                }
            });
        }
        else if (section === 'forgot-password') {
            document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('reset-email').value;
                const res = await resetPassword(email);
                if (res.success) {
                    showNotification(res.message, 'success', true);
                    this.navigate('login');
                } else {
                    showNotification(res.error, 'error', true);
                }
            });
        }
        else if (section === 'profile') {
            if (!currentUser) {
                this.navigate('login');
                return;
            }
            this.renderProfile();
        }
    },

    async renderProfile() {
        if (!currentUser) return;
        
        const nameEl = document.getElementById('profile-name');
        const emailEl = document.getElementById('profile-email');
        const dateEl = document.getElementById('profile-date');
        const ordersList = document.getElementById('orders-list');
        
        if (!nameEl || !emailEl || !dateEl || !ordersList) return;

        emailEl.textContent = currentUser.email;
        
        // Fetch profile
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
            nameEl.textContent = profile.name || currentUser.displayName || 'User';
            dateEl.textContent = new Date(profile.createdAt).toLocaleDateString();
        } else {
            nameEl.textContent = currentUser.displayName || 'User';
            dateEl.textContent = 'N/A';
        }
        
        // Fetch orders
        const orders = await getUserOrders(currentUser.uid);
        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="empty-msg">You have no past orders.</p>';
        } else {
            ordersList.innerHTML = orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">Order #${order.id.substring(0, 8)}</span>
                        <span class="order-date">${new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="order-details">
                        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                        <p><strong>Status:</strong> <span class="status ${order.status}">${order.status}</span></p>
                    </div>
                </div>
            `).join('');
        }
    },

    applyFilters() {
        if (window.location.hash !== '#shop') return;
        
        const category = document.getElementById('filter-category')?.value || 'all';
        const sort = document.getElementById('sort-options')?.value || 'default';
        const query = this.currentSearch;
        
        let filtered = this.products.filter(p => {
            const matchCat = category === 'all' || p.category === category;
            const matchSearch = p.name.toLowerCase().includes(query);
            return matchCat && matchSearch;
        });
        
        if (sort === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sort === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sort === 'rating') {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        const grid = document.getElementById('shop-grid');
        if (grid) {
            if (filtered.length > 0) {
                grid.innerHTML = filtered.map(p => renderProductCard(p, !!this.wishlist[p.id])).join('');
            } else {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No products found.</p>';
            }
        }
    },

    async toggleWishlist(productId) {
        if (!currentUser) {
            showNotification('Please login to add to wishlist', 'info');
            this.navigate('login');
            return;
        }

        const isAdded = await toggleWishlistDB(productId);
        if (isAdded) {
            this.wishlist[productId] = true;
            showNotification('Added to wishlist', 'success');
        } else {
            delete this.wishlist[productId];
            showNotification('Removed from wishlist', 'info');
        }
        
        // Re-render current section to update UI
        const hash = window.location.hash.substring(1) || 'home';
        if (hash === 'shop') {
            this.applyFilters();
        } else {
            this.initSection(hash);
        }
    },
    
    async addToCart(productId) {
        if (!currentUser) {
            showNotification('Please login to add to cart', 'info');
            this.navigate('login');
            return;
        }

        await addToCart(productId, 1);
        this.updateCartCount();
        showNotification('Added to cart!', 'success');
    },
    
    async updateCartCount() {
        const cart = await getCart();
        let count = 0;
        for (const key in cart) {
            count += cart[key].quantity || cart[key]; // handle both DB and local format
        }
        document.getElementById('nav-cart').innerText = `Cart (${count})`;
    },
    
    async renderCart() {
        const cart = await getCart();
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');
        
        if (Object.keys(cart).length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            cartTotalEl.innerText = '৳ 0';
            return;
        }
        
        let html = '';
        let total = 0;
        
        for (const productId in cart) {
            const qty = cart[productId].quantity || cart[productId];
            const product = this.products.find(p => p.id === productId);
            
            if (product) {
                total += product.price * qty;
                html += `
                    <div class="cart-item">
                        <img src="${product.image || 'https://picsum.photos/seed/'+product.name.replace(/\s/g, '')+'/50/50'}" class="cart-item-img" alt="${product.name}">
                        <div class="cart-item-details">
                            <div class="cart-item-name">${product.name}</div>
                            <div class="cart-item-price">৳ ${product.price} x ${qty}</div>
                        </div>
                        <div class="cart-item-actions">
                            <button class="btn" onclick="app.removeFromCart('${productId}')">Remove</button>
                        </div>
                    </div>
                `;
            }
        }
        
        cartItemsContainer.innerHTML = html;
        cartTotalEl.innerText = `৳ ${total}`;
    },
    
    async removeFromCart(productId) {
        await removeFromCart(productId);
        this.renderCart();
        this.updateCartCount();
    },

    async checkout() {
        if (!currentUser) {
            showNotification('Please login to checkout', 'info');
            this.navigate('login');
            return;
        }

        const cartTotalEl = document.getElementById('cart-total');
        if (!cartTotalEl) return;
        
        const totalText = cartTotalEl.innerText.replace('৳ ', '');
        const totalAmount = parseFloat(totalText);
        
        if (totalAmount <= 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }

        const res = await checkoutCart(totalAmount);
        if (res.success) {
            showNotification('Order placed successfully!', 'success');
            this.updateCartCount();
            this.navigate('profile');
        } else {
            showNotification(res.error, 'error');
        }
    },

    viewProductDetails(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('product-modal');
        const detailsContainer = document.getElementById('modal-product-details');
        
        if (!modal || !detailsContainer) return;

        const discountHtml = product.discount ? `<span class="discount">-${product.discount}%</span>` : '';
        const oldPriceHtml = product.old_price ? `<span class="old-price" style="text-decoration: line-through; color: #94a3b8; margin-right: 10px;">৳ ${product.old_price}</span>` : '';

        // Generate stars
        const rating = Math.round(product.rating || 0);
        let stars = '';
        for(let i=1; i<=5; i++) {
            stars += i <= rating ? '★' : '☆';
        }

        detailsContainer.innerHTML = `
            <img src="${product.image || 'https://picsum.photos/seed/'+product.name.replace(/\s/g, '')+'/400/300'}" alt="${product.name}" class="modal-product-img">
            <div class="modal-product-title">${product.name}</div>
            <div class="modal-product-price">
                ${oldPriceHtml} ৳ ${product.price} ${discountHtml}
            </div>
            <div style="color: #f59e0b; margin-bottom: 15px;">${stars} (${product.rating || 0})</div>
            <div class="modal-product-desc">
                ${product.description || 'No description available for this product. It is a great product that you will surely love.'}
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="app.addToCart('${product.id}'); app.closeProductModal();">Add to Cart</button>
        `;

        modal.classList.remove('hidden');
    },

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
};

// Expose app to window for inline onclick handlers
window.app = app;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
