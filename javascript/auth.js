// Nơi duy nhất xử lý "đã đăng nhập hay chưa" cho toàn bộ trang.
// Dùng localStorage.currentUser để kiểm tra nhanh (không cần chờ mạng);
// check_session.js vẫn giữ vai trò kiểm tra Firebase Auth thật ở bước thanh toán.

import { auth } from './config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

export function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); }
    catch { return null; }
}

export function isLoggedIn() {
    return !!getCurrentUser();
}

// Gọi trước khi cho phép một hành động cần đăng nhập (thêm giỏ hàng, thanh toán...).
// Trả về true nếu đã đăng nhập; false nếu chưa (và đã hỏi người dùng có muốn sang trang đăng nhập không).
export function requireLogin(message = 'Bạn cần đăng nhập hoặc đăng ký để tiếp tục. Chuyển đến trang đăng nhập ngay bây giờ?') {
    if (isLoggedIn()) return true;
    if (confirm(message)) {
        window.location.href = 'login.html';
    }
    return false;
}

// Đăng xuất dùng chung, luôn hỏi xác nhận trước. Đăng xuất cả phiên Firebase để không còn quyền ghi/đọc Firestore sau khi thoát.
export async function logout(redirect = 'login.html') {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    localStorage.removeItem('currentUser');
    try { await signOut(auth); } catch (err) { console.error('Lỗi đăng xuất Firebase:', err); }
    if (redirect === 'reload') {
        window.location.reload();
    } else {
        window.location.href = redirect;
    }
}