import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKw-NuNvh7QDCS995W1xvYCleIulSOC-s",
  authDomain: "jsi-final-58fa9.firebaseapp.com",
  projectId: "jsi-final-58fa9",
  storageBucket: "jsi-final-58fa9.firebasestorage.app",
  messagingSenderId: "776373464252",
  appId: "1:776373464252:web:ddd9acf7523709ba2cf4b9",
  measurementId: "G-B8F6RZVHB5"
};

const app = initializeApp(firebaseConfig);
// Analytics không bắt buộc: chỉ bật khi trình duyệt hỗ trợ, và lỗi analytics không được kéo sập các trang khác
isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
const auth = getAuth(app);
const db = getFirestore(app);

export {auth, db};