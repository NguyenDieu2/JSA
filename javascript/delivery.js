import { getCurrentUser } from './auth.js';
import { createOrder, saveLocalOrder, markOrderSynced } from './orders-db.js';
import { COUPONS } from './catalog.js';
import { ico } from './icons.js';

const CART_KEY   = 'dieutech_cart';
const COUPON_KEY = 'dieutech_coupon';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(COUPON_KEY);
}

// Mã giảm giá khách đã áp dụng ở giỏ hàng (cart.js lưu lại)
function getCoupon() {
    try {
        const c = JSON.parse(localStorage.getItem(COUPON_KEY));
        return c && COUPONS[c.code] ? { code: c.code, percent: COUPONS[c.code] } : null;
    } catch { return null; }
}

function calcTotals(items) {
    const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    const coupon   = getCoupon();
    const discount = coupon ? Math.round(subtotal * coupon.percent / 100) : 0;
    return { subtotal, coupon, discount, total: subtotal - discount };
}

function renderCart() {
    const items = loadCart();
    const list  = document.getElementById('cartList');
    const tots  = document.getElementById('totalsWrap');

    if (!items.length) {
        list.innerHTML = `<div class="empty"><div class="eico">${ico('cart')}</div><p>Giỏ hàng trống</p></div>`;
        tots.style.display = 'none';
        return;
    }

    list.innerHTML = items.map(it => {
        const qty = it.qty || 1;
        const pr  = it.price || 0;
        const img = it.img
            ? `<img src="${esc(it.img)}" alt="${esc(it.name)}" onerror="this.style.display='none'">`
            : ico('box');
        return `
        <div class="cart-row">
            <div class="thumb">${img}<div class="badge">${qty}</div></div>
            <div class="item-info">
                <div class="item-name">${esc(it.name)}</div>
                <div class="item-meta">${it.variant ? esc(it.variant) + ' · ' : ''}SL: ${qty}</div>
            </div>
            <div class="item-price">${(pr * qty).toLocaleString('vi-VN')}₫</div>
        </div>`;
    }).join('');

    const { subtotal, coupon, discount, total } = calcTotals(items);
    const f = n => n.toLocaleString('vi-VN') + '₫';
    document.getElementById('v-sub').textContent   = f(subtotal);
    document.getElementById('v-total').textContent = f(total);

    // Dòng giảm giá (chỉ hiện khi có mã)
    let row = document.getElementById('v-discount-row');
    if (discount > 0) {
        if (!row) {
            row = document.createElement('div');
            row.className = 'total-row';
            row.id = 'v-discount-row';
            row.innerHTML = '<span id="v-discount-label"></span><span id="v-discount"></span>';
            tots.querySelector('.total-row.grand').before(row);
        }
        document.getElementById('v-discount-label').textContent = `Giảm giá (${coupon.code} −${coupon.percent}%)`;
        document.getElementById('v-discount').textContent = '−' + f(discount);
    } else if (row) {
        row.remove();
    }
    tots.style.display = 'block';
}

let city = 'Hồ Chí Minh';
document.querySelectorAll('[data-city]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        city = el.dataset.city;
        document.getElementById('city-btn').textContent = city;
    });
});

let payment = 'visa';
document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        payment = btn.dataset.method;
    });
});

document.getElementById('inp-date').min = new Date().toISOString().split('T')[0];

function val(id) { return document.getElementById(id).value.trim(); }
function setErr(fId, hasErr) {
    document.getElementById(fId).classList.toggle('has-error', hasErr);
}

function validate() {
    const phone = val('inp-phone').replace(/\s/g, '');
    const ok = {
        ho:    val('inp-ho').length > 0,
        ten:   val('inp-ten').length > 0,
        phone: /^[0-9]{9,11}$/.test(phone),
        addr:  val('inp-addr').length >= 5,
        date:  val('inp-date').length > 0,
    };
    setErr('f-ho',    !ok.ho);
    setErr('f-ten',   !ok.ten);
    setErr('f-phone', !ok.phone);
    setErr('f-addr',  !ok.addr);
    setErr('f-date',  !ok.date);
    if (Object.values(ok).includes(false))
        document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return Object.values(ok).every(Boolean);
}

['inp-ho','inp-ten','inp-phone','inp-addr','inp-date'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const fId = 'f-' + id.replace('inp-', '');
        document.getElementById(fId)?.classList.remove('has-error');
    });
});

document.getElementById('confirmBtn').addEventListener('click', async () => {
    if (!validate()) return;
    const items = loadCart();
    if (!items.length) { alert('Giỏ hàng trống!'); return; }

    const user = getCurrentUser();
    if (!user) {
        alert('Bạn cần đăng nhập để đặt hàng.');
        window.location.href = 'login.html';
        return;
    }

    const id = 'DT-' + Date.now().toString(36).toUpperCase().slice(-6);
    const { subtotal, coupon, discount, total } = calcTotals(items);
    const order = {
        id, date: new Date().toISOString(),
        uid: user.uid, email: user.email || '',
        ho: val('inp-ho'), ten: val('inp-ten'),
        phone: val('inp-phone'), city, addr: val('inp-addr'),
        ngayGiao: document.getElementById('inp-date').value,
        payment, status: 'pending',
        items: JSON.parse(JSON.stringify(items)),
        subtotal, coupon: coupon ? coupon.code : '', discount, total,
        synced: false,
    };

    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;   // giữ khóa sau khi đặt xong để không bấm trùng thành 2 đơn

    // 1) Lưu vào máy trước: đơn luôn hiện ở trang "Đơn hàng", kể cả khi Firestore lỗi
    saveLocalOrder(order);

    // 2) Gửi lên Firestore để admin xem được
    let syncError = null;
    try {
        await createOrder(order);
        markOrderSynced(id);
    } catch (err) {
        syncError = err;
        console.error('Gửi đơn lên Firestore thất bại:', err);   // thường do Firestore Rules chưa cho phép ghi "orders"
    }

    clearCart();   // đơn đã được lưu: dọn giỏ ngay để tránh đặt trùng

    document.getElementById('orderId').textContent = id;
    const msg = document.querySelector('.modal-msg');
    const old = document.getElementById('syncWarn');
    if (old) old.remove();
    if (syncError && msg) {
        const code = syncError.code ? ` (${esc(syncError.code)})` : '';
        msg.insertAdjacentHTML('beforeend',
            `<br><br><span id="syncWarn" style="color:#fbbf24;font-size:13px">Đơn hàng đã được lưu trên thiết bị này nhưng chưa gửi được lên hệ thống${code}. ` +
            `Hệ thống sẽ tự gửi lại khi bạn mở trang Đơn hàng.</span>`);
    }
    const m = document.getElementById('modal');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('show'), 10);
});

function continueShopping() {
    const m = document.getElementById('modal');
    m.classList.remove('show');
    setTimeout(() => m.style.display = 'none', 300);
    clearCart();
    renderCart();
}

function goHome() {
    clearCart();
    window.location.href = 'index.html';
}
// Module không tự gắn hàm ra global; HTML đang gọi onclick="continueShopping()" / "goHome()"
window.continueShopping = continueShopping;
window.goHome = goHome;

localStorage.removeItem('cartItems');   // khóa giỏ hàng cũ của phiên bản trước, không còn dùng
renderCart();