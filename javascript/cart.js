const CART_KEY   = 'dieutech_cart';
const COUPONS    = { 'DIEU10': 10, 'TECH20': 20, 'SALE15': 15 };
let appliedDiscount = 0;
function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function fmt(n) { return n.toLocaleString('vi-VN') + 'đ'; }
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
                    <img src="${item.img}" alt="${item.name}">
                </div>
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.specs || ''}</p>
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
                    <span>✕</span>
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
        renderCart();
    }, rows.length * 80 + 350);
}
function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    const msg  = document.getElementById('couponMsg');
    if (COUPONS[code]) {
        appliedDiscount = COUPONS[code];
        msg.textContent = `✓ Áp dụng thành công! Giảm ${appliedDiscount}%`;
        msg.className   = 'coupon-hint success';
    } else {
        appliedDiscount = 0;
        msg.textContent = '✕ Mã giảm giá không hợp lệ';
        msg.className   = 'coupon-hint error';
    }
    recalcSummary();
}
function checkout() {
   window.location.href = 'delivery.html';
}
renderCart()