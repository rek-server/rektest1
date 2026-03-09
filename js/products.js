import { db } from './firebase.js';
import { ref, get, child, set } from "firebase/database";

export async function getProducts() {
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `products`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object to array
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            // Seed some data if empty
            await seedProducts();
            return await getProducts();
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function seedProducts() {
    const sampleProducts = {
        p001: { name: "Wireless Earbuds", price: 75, old_price: 120, discount: 38, rating: 4.2, category: "electronics" },
        p002: { name: "Smart Watch", price: 150, old_price: 200, discount: 25, rating: 4.5, category: "electronics" },
        p003: { name: "Running Shoes", price: 60, old_price: 80, discount: 25, rating: 4.0, category: "fashion" },
        p004: { name: "Leather Wallet", price: 25, old_price: 40, discount: 37, rating: 4.8, category: "accessories" },
        p005: { name: "Bluetooth Speaker", price: 45, old_price: 60, discount: 25, rating: 4.1, category: "electronics" },
        p006: { name: "Sunglasses", price: 15, old_price: 30, discount: 50, rating: 3.9, category: "accessories" },
        p007: { name: "Gaming Mouse", price: 35, old_price: 50, discount: 30, rating: 4.6, category: "electronics" },
        p008: { name: "Backpack", price: 40, old_price: 65, discount: 38, rating: 4.3, category: "fashion" }
    };
    
    await set(ref(db, 'products'), sampleProducts);
}

export function renderProductCard(product, inWishlist = false) {
    const discountHtml = product.discount ? `<span class="discount">-${product.discount}%</span>` : '';
    const oldPriceHtml = product.old_price ? `<span class="old-price">৳ ${product.old_price}</span>` : '';
    
    // Generate stars
    const rating = Math.round(product.rating || 0);
    let stars = '';
    for(let i=1; i<=5; i++) {
        stars += i <= rating ? '★' : '☆';
    }

    const heart = inWishlist ? '♥' : '♡';
    const heartClass = inWishlist ? 'active' : '';

    return `
        <div class="product-card">
            <button class="wishlist-btn ${heartClass}" onclick="app.toggleWishlist('${product.id}')">${heart}</button>
            <img src="${product.image || 'https://picsum.photos/seed/'+product.name.replace(/\s/g, '')+'/150/150'}" alt="${product.name}" class="product-img" loading="lazy">
            <div class="product-name">${product.name}</div>
            <div class="product-price">
                ৳ ${product.price}
                <br>
                ${oldPriceHtml} ${discountHtml}
            </div>
            <div class="product-rating">${stars}</div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="btn add-to-cart-btn" style="flex: 1;" onclick="app.addToCart('${product.id}')">Add to Cart</button>
                <button class="btn btn-secondary" style="flex: 1;" onclick="app.viewProductDetails('${product.id}')">View Details</button>
            </div>
        </div>
    `;
}
