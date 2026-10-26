import { auth } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

function getAuthUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

async function checkSession() {
    const user = await getAuthUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

export { checkSession, getAuthUser };