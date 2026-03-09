import { db, auth } from './firebase.js';
import { ref, set, get, remove } from "firebase/database";

// Fallback to local storage if not logged in
let localCart = JSON.parse(localStorage.getItem('cart')) || {};

export async function addToCart(productId, quantity = 1) {
    const user = auth.currentUser;
    if (user) {
        const cartRef = ref(db, `cart/${user.uid}/${productId}`);
        const snapshot = await get(cartRef);
        let currentQty = 0;
        if (snapshot.exists()) {
            currentQty = snapshot.val().quantity || 0;
        }
        await set(cartRef, { quantity: currentQty + quantity });
    } else {
        localCart[productId] = (localCart[productId] || 0) + quantity;
        localStorage.setItem('cart', JSON.stringify(localCart));
    }
}

export async function getCart() {
    const user = auth.currentUser;
    if (user) {
        const cartRef = ref(db, `cart/${user.uid}`);
        const snapshot = await get(cartRef);
        if (snapshot.exists()) {
            return snapshot.val(); // { productId: { quantity: X } }
        }
        return {};
    } else {
        return localCart;
    }
}

export async function removeFromCart(productId) {
    const user = auth.currentUser;
    if (user) {
        const cartRef = ref(db, `cart/${user.uid}/${productId}`);
        await remove(cartRef);
    } else {
        delete localCart[productId];
        localStorage.setItem('cart', JSON.stringify(localCart));
    }
}

export async function clearCart() {
    const user = auth.currentUser;
    if (user) {
        const cartRef = ref(db, `cart/${user.uid}`);
        await remove(cartRef);
    } else {
        localCart = {};
        localStorage.setItem('cart', JSON.stringify(localCart));
    }
}

export async function checkoutCart(totalAmount) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Must be logged in to checkout" };

    const cartRef = ref(db, `cart/${user.uid}`);
    const snapshot = await get(cartRef);
    
    if (!snapshot.exists()) {
        return { success: false, error: "Cart is empty" };
    }

    const cartItems = snapshot.val();
    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    const orderRef = ref(db, `orders/${orderId}`);
    await set(orderRef, {
        userId: user.uid,
        items: cartItems,
        total: totalAmount,
        status: 'pending',
        createdAt: Date.now()
    });

    // Clear cart after successful order
    await remove(cartRef);
    
    return { success: true, orderId: orderId };
}
