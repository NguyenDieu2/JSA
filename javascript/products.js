import { db } from './config.js';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const PRODUCTS_COLLECTION = 'products';

// Lấy toàn bộ sản phẩm, mới nhất trước
export async function fetchProducts() {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createTime', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

// Lấy 1 sản phẩm theo id (dùng cho trang chi tiết product.html)
export async function fetchProduct(id) {
    const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
    return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
}

// Thêm sản phẩm mới, data: { name, price, img, specs, descLines }
export async function addProduct(data) {
    return addDoc(collection(db, PRODUCTS_COLLECTION), {
        ...data,
        createTime: Timestamp.now()
    });
}

// Cập nhật sản phẩm đã có, data: { name, price, img, specs, descLines }
export async function updateProduct(id, data) {
    return updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
        ...data,
        updateTime: Timestamp.now()
    });
}

// Xóa sản phẩm theo id
export async function deleteProduct(id) {
    return deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}