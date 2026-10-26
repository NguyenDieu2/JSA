import { checkSession } from './check_session.js';
import { requireLogin, getCurrentUser } from './auth.js';
import { refreshOrderBadge } from './order-notify.js';
import { ico } from './icons.js';
import { COUPONS } from './catalog.js';

const CART_KEY   = 'dieutech_cart';
const COUPON_KEY = 'dieutech_coupon';   // delivery.js đọc khóa này để tính giảm giá vào đơn
let appliedDiscount = 0;
function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function fmt(n) { return n.toLocaleString('vi-VN') + 'đ'; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderCart() {
    const cart      = getCart();
    const container = document.getElementById('cartItems');
    const empty     = document.getElementById('emptyCart');
    const actions   = document.getElementById('cartActions');
    const summary   = document.getElementById('orderSummary');
    const header    = document.getElementById('cartHeaderRow');
    container.innerHTML = '';
    if (cart.length === 0) {
        empty.style.display   = 'flex';
        actions.style.display = 'none';
        summary.style.display = 'none';
        header.style.display  = 'none';
        updateBadge(0);
        return;
    }
    empty.style.display   = 'none';
    actions.style.display = 'flex';
    summary.style.display = 'flex';
    header.style.display  = 'grid';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className  = 'cart-item';
        div.dataset.id = item.id;
        div.innerHTML  = `
            <div class="item-product col-product">
                <div class="item-img-wrap">
                    <img src="${esc(item.img)}" alt="${esc(item.name)}">
                </div>
                <div class="item-info">
                    <h3>${esc(item.name)}</h3>
                    ${item.variant ? `<p class="item-variant" style="color:#4facfe;font-weight:600">${esc(item.variant)}</p>` : ''}
                    <p>${esc(item.specs)}</p>
                </div>
            </div>
            <div class="item-price col-price" data-label="Đơn giá">${fmt(item.price)}</div>
            <div class="item-qty col-qty" data-label="Số lượng">
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
                    <input class="qty-input" type="number" value="${item.qty}" min="1" max="99"
                           onchange="setQty('${item.id}', this.value)">
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="item-total col-total" data-label="Thành tiền">${fmt(item.price * item.qty)}</div>
            <div class="col-action">
                <button class="remove-btn" onclick="removeItem('${item.id}')" title="Xóa sản phẩm">
                    <span>${ico('close')}</span>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    recalcSummary();
    updateBadge(cart.reduce((s, i) => s + i.qty, 0));
}
function updateBadge(total) {
    const badge = document.getElementById('cartBadge');
    if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}
function recalcSummary() {
    const cart = getCart();
    let subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('subtotal').textContent = fmt(subtotal);
    const discRow = document.getElementById('discountRow');
    let discount  = 0;
    if (appliedDiscount > 0) {
        discount = Math.round(subtotal * appliedDiscount / 100);
        document.getElementById('discountAmount').textContent = '−' + fmt(discount);
        discRow.style.display = 'flex';
    } else {
        discRow.style.display = 'none';
    }
    document.getElementById('grandTotal').textContent = fmt(subtotal - discount);
}
function changeQty(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.min(99, Math.max(1, item.qty + delta));
    saveCart(cart);
    renderCart();
}
function setQty(id, val) {
    let qty  = parseInt(val);
    if (isNaN(qty) || qty < 1)  qty = 1;
    if (qty > 99) qty = 99;
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = qty;
    saveCart(cart);
    renderCart();
}
function removeItem(id) {
    const row = document.querySelector(`.cart-item[data-id="${id}"]`);
    if (row) {
        row.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            let cart = getCart().filter(i => i.id !== id);
            saveCart(cart);
            renderCart();
        }, 300);
    }
}
function clearCart() {
    const rows = document.querySelectorAll('.cart-item');
    rows.forEach((row, idx) => {
        setTimeout(() => { row.style.animation = 'fadeOut 0.3s ease forwards'; }, idx * 80);
    });
    setTimeout(() => {
        saveCart([]);
        localStorage.removeItem(COUPON_KEY);
        renderCart();
    }, rows.length * 80 + 350);
}
function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    const msg  = document.getElementById('couponMsg');
    if (COUPONS[code]) {
        appliedDiscount = COUPONS[code];
        localStorage.setItem(COUPON_KEY, JSON.stringify({ code }));
        msg.innerHTML = `${ico('check')} Áp dụng thành công! Giảm ${appliedDiscount}%`;
        msg.className   = 'coupon-hint success';
    } else {
        appliedDiscount = 0;
        localStorage.removeItem(COUPON_KEY);
        msg.innerHTML = ico('close') + ' Mã giảm giá không hợp lệ';
        msg.className   = 'coupon-hint error';
    }
    recalcSummary();
}
// Kiểm tra nhanh (localStorage) trước, rồi kiểm tra Firebase Auth thật
// trước khi cho sang trang giao hàng — hai lớp bảo vệ bổ sung cho nhau.
async function checkout() {
    if (!requireLogin('Bạn cần đăng nhập hoặc đăng ký để thanh toán. Chuyển đến trang đăng nhập ngay bây giờ?')) return;
    const user = await checkSession();
    if (!user) return; // checkSession đã tự chuyển về login.html
    window.location.href = 'delivery.html';
}

// Các hàm được gọi qua onclick trong HTML cần gắn vào window vì file này
// giờ là module (do có import checkSession)
window.changeQty    = changeQty;
window.setQty       = setQty;
window.removeItem   = removeItem;
window.clearCart    = clearCart;
window.applyCoupon  = applyCoupon;
window.checkout     = checkout;

// Khôi phục mã giảm giá đã áp dụng (không bị mất khi tải lại trang)
function restoreCoupon() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(COUPON_KEY)); } catch {}
    if (!saved || !COUPONS[saved.code]) { localStorage.removeItem(COUPON_KEY); return; }
    appliedDiscount = COUPONS[saved.code];
    document.getElementById('couponInput').value = saved.code;
    const msg = document.getElementById('couponMsg');
    msg.innerHTML = `${ico('check')} Áp dụng thành công! Giảm ${appliedDiscount}%`;
    msg.className   = 'coupon-hint success';
}

restoreCoupon();
renderCart();
refreshOrderBadge(getCurrentUser());