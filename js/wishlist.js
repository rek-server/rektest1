import { db, auth } from './firebase.js';
import { ref, set, get, remove } from "firebase/database";

let localWishlist = JSON.parse(localStorage.getItem('wishlist')) || {};

export async function toggleWishlistDB(productId) {
    const user = auth.currentUser;
    if (user) {
        const wlRef = ref(db, `wishlist/${user.uid}/${productId}`);
        const snapshot = await get(wlRef);
        if (snapshot.exists()) {
            await remove(wlRef);
            return false; // removed
        } else {
            await set(wlRef, true);
            return true; // added
        }
    } else {
        if (localWishlist[productId]) {
            delete localWishlist[productId];
            localStorage.setItem('wishlist', JSON.stringify(localWishlist));
            return false;
        } else {
            localWishlist[productId] = true;
            localStorage.setItem('wishlist', JSON.stringify(localWishlist));
            return true;
        }
    }
}

export async function getWishlistDB() {
    const user = auth.currentUser;
    if (user) {
        const wlRef = ref(db, `wishlist/${user.uid}`);
        const snapshot = await get(wlRef);
        return snapshot.exists() ? snapshot.val() : {};
    }
    return localWishlist;
}
