import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    sendPasswordResetEmail
} from "firebase/auth";
import { ref, set, get } from "firebase/database";

export let currentUser = null;

export function initAuth(onUserChange) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        onUserChange(user);
    });
}

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            // Sign out immediately if not verified
            await signOut(auth);
            return { success: false, error: "Please verify your email before logging in. Check your inbox." };
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function register(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);
        
        // Save user to DB
        await set(ref(db, 'users/' + user.uid), {
            name: name,
            email: email,
            createdAt: Date.now()
        });
        
        // Sign out the user so they have to log in after verifying
        await signOut(auth);
        
        return { success: true, message: `Registration successful! A verification link has been sent to your email.` };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: "Password reset email sent! Check your inbox." };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function resendVerificationEmail(email, password) {
    try {
        // Need to sign in to send verification email
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await sendEmailVerification(user);
            await signOut(auth);
            return { success: true, message: "Verification email resent! Check your inbox." };
        } else {
            await signOut(auth);
            return { success: false, error: "Email is already verified. You can log in." };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user exists in DB, if not, add them
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, {
                name: user.displayName,
                email: user.email,
                createdAt: Date.now()
            });
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logout() {
    await signOut(auth);
}

export async function getUserProfile(uid) {
    try {
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function getUserOrders(uid) {
    try {
        const ordersRef = ref(db, 'orders');
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
            const allOrders = snapshot.val();
            const userOrders = [];
            for (const orderId in allOrders) {
                if (allOrders[orderId].userId === uid) {
                    userOrders.push({ id: orderId, ...allOrders[orderId] });
                }
            }
            return userOrders.sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    } catch (error) {
        console.error("Error fetching user orders:", error);
        return [];
    }
}
