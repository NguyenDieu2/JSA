import { getCurrentUser, logout } from './auth.js';
import { watchOrderHistory, orderStatusView, statusLabel, STATUS_MESSAGES } from './orders-db.js';
import { unseenOf, markSeen, setBadge } from './order-notify.js';
import { ico } from './icons.js';

const CART_KEY = 'dieutech_cart';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtMoney(n) {
    return (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
}
function fmtDate(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return '';
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
const PAYMENT_LABELS = {
    visa: 'Thẻ Visa',
    mastercard: 'Thẻ Mastercard',
    applepay: 'Apple Pay',
    momo: 'Ví MoMo',
    cod: 'Thanh toán khi nhận hàng (COD)',
    banking: 'Chuyển khoản ngân hàng'
};
function paymentLabel(method) {
    return PAYMENT_LABELS[method] || method || 'Chưa rõ';
}

// Dòng thời gian: Chờ xác nhận -> Đã xác nhận -> Đang giao -> Đã giao (đơn hủy: các bước đã qua + Đã hủy)
const FLOW = ['pending', 'confirmed', 'shipping', 'delivered'];
function trackHtml(o) {
    if (o.pendingSync) return '';
    const at = {};
    (Array.isArray(o.statusHistory) ? o.statusHistory : []).forEach(h => { at[h.status] = h.at; });   // lần gần nhất của mỗi trạng thái
    if (!at.pending) at.pending = Date.parse(o.date) || 0;
    if (o.status !== 'pending' && !at[o.status] && o.updateMs) at[o.status] = o.updateMs;

    const cancelled = o.status === 'cancelled';
    const steps = cancelled ? FLOW.filter(s => s !== 'delivered' && at[s]).concat('cancelled') : FLOW;
    const cur = steps.indexOf(o.status);
    return `<div class="oc-track${cancelled ? ' is-cancelled' : ''}">` + steps.map((s, i) => {
        const state = cancelled ? (s === 'cancelled' ? 'cancel' : 'done') : (i < cur ? 'done' : i === cur ? 'current' : 'todo');
        return `<div class="oc-step ${state}"><span class="dot"></span><b>${esc(statusLabel(s))}</b><small>${at[s] ? esc(fmtDate(at[s])) : ''}</small></div>`;
    }).join('') + '</div>';
}

function renderOrderCard(order, isNew) {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map(it => `
        <div class="oi-row">
            <div class="oi-thumb">
                ${it.img ? `<img src="${esc(it.img)}" alt="${esc(it.name)}" onerror="this.style.display='none'">` : `<span class="oi-fallback">${ico('box')}</span>`}
            </div>
            <div class="oi-info">
                <div class="oi-name">${esc(it.name) || 'Sản phẩm'}</div>
                <div class="oi-meta">${it.variant ? esc(it.variant) + ' · ' : ''}SL: ${Number(it.qty) || 1} × ${fmtMoney(it.price)}</div>
            </div>
            <div class="oi-sub">${fmtMoney((it.price || 0) * (it.qty || 1))}</div>
        </div>
    `).join('');

    const st = orderStatusView(order);
    const couponHtml = order.discount > 0
        ? `<div><span>Mã giảm giá</span>${esc(order.coupon || '')} (−${fmtMoney(order.discount)})</div>` : '';

    return `
        <article class="order-card">
            <header class="oc-head">
                <div>
                    <div class="oc-id">Đơn hàng #${esc(order.id) || '—'}</div>
                    <div class="oc-date">${esc(fmtDate(order.date))}</div>
                </div>
                <div class="oc-state"><span class="oc-status st-${esc(st.id)}">${esc(st.label)}</span>${isNew ? '<span class="oc-new">Mới</span>' : ''}</div>
            </header>
            ${trackHtml(order)}
            <div class="oc-items">${itemsHtml || '<p class="oc-empty">Không có sản phẩm trong đơn này</p>'}</div>
            <div class="oc-delivery">
                <div><span>Người nhận</span>${esc(order.ho)} ${esc(order.ten)}</div>
                <div><span>Điện thoại</span>${esc(order.phone) || '—'}</div>
                <div><span>Địa chỉ</span>${esc(order.addr)}${order.city ? ', ' + esc(order.city) : ''}</div>
                <div><span>Ngày giao dự kiến</span>${esc(order.ngayGiao) || '—'}</div>
                <div><span>Thanh toán</span>${esc(paymentLabel(order.payment))}</div>
                ${couponHtml}
            </div>
            <footer class="oc-foot">
                <span>Tổng cộng</span>
                <strong>${fmtMoney(order.total)}</strong>
            </footer>
        </article>
    `;
}

let stopWatching = null;
let currentOrders = [];
let prevStatus = null;           // trạng thái ở lần cập nhật trước, để báo khi admin vừa đổi

function showToast(o) {
    const el = document.createElement('div');
    el.className = 'order-toast';
    el.innerHTML = `<strong>Đơn #${esc(o.id)}: ${esc(statusLabel(o.status))}</strong><span>${esc(STATUS_MESSAGES[o.status] || '')}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 5000);
}

// Hộp "Cập nhật đơn hàng": các đơn có trạng thái khác với lần khách xem gần nhất
function notifyBox() {
    let box = document.getElementById('ordersNotify');
    if (!box) {
        box = document.createElement('div');
        box.id = 'ordersNotify';
        document.getElementById('ordersList').before(box);
    }
    return box;
}
function renderNotify(unseen) {
    const box = notifyBox();
    if (!unseen.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.className = 'notify-box';
    box.style.display = 'block';
    box.innerHTML = `
        <div class="notify-head">
            <strong>${ico('bell')} Cập nhật đơn hàng (${unseen.length})</strong>
            <button type="button" class="notify-btn" id="notifyRead">Đã xem tất cả</button>
        </div>
        <ul class="notify-list">${unseen.map(o => `
            <li><b>Đơn #${esc(o.id)}</b> — ${esc(statusLabel(o.status))}<span>${esc(STATUS_MESSAGES[o.status] || '')}</span></li>`).join('')}
        </ul>`;
}

function renderOrders() {
    const wrap  = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    const count = document.getElementById('ordersCount');
    const user  = getCurrentUser();
    const unseen = user ? unseenOf(user.uid, currentOrders) : [];
    const unseenIds = new Set(unseen.map(o => o.id));

    renderNotify(unseen);
    if (user) setBadge(unseen.length, user.uid);

    if (!currentOrders.length) {
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        empty.style.display = 'flex';
        if (count) count.style.display = 'none';
        return;
    }
    wrap.style.display = 'flex';
    empty.style.display = 'none';
    wrap.innerHTML = currentOrders.map(o => renderOrderCard(o, unseenIds.has(o.id))).join('');
    if (count) {
        count.textContent = `${currentOrders.length} đơn hàng`;
        count.style.display = 'inline-flex';
    }
}

function onOrders(orders) {
    if (prevStatus) {   // không báo ở lần tải đầu tiên, chỉ báo khi trạng thái đổi lúc đang mở trang
        orders.filter(o => !o.pendingSync && prevStatus.has(o.id) && prevStatus.get(o.id) !== o.status).forEach(showToast);
    }
    prevStatus = new Map(orders.map(o => [o.id, o.status]));
    currentOrders = orders;
    renderOrders();
}

function startWatching() {
    const wrap = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    wrap.style.display = 'flex';
    empty.style.display = 'none';
    wrap.innerHTML = '<p class="oc-empty">Đang tải đơn hàng...</p>';
    if (stopWatching) stopWatching();
    stopWatching = watchOrderHistory(getCurrentUser(), onOrders);
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch {}
    const total = cart.reduce((s, i) => s + (i.qty || 0), 0);
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = total > 0 ? 'flex' : 'none';
}

function renderHeaderAuthState() {
    const user = getCurrentUser();
    const guestLinks  = document.querySelectorAll('.guest-link');
    const userProfile = document.getElementById('user-profile');
    const userName     = document.getElementById('userNameDisplay');
    const adminLink    = document.getElementById('admin-link');
    const ordersContent = document.getElementById('ordersContent');
    const guestNotice    = document.getElementById('guestNotice');

    const name = user && (user.name || user.fullname);
    if (name) {
        guestLinks.forEach(el => el.style.display = 'none');
        if (userProfile) userProfile.style.display = 'flex';
        if (userName) userName.textContent = `Xin chào, ${name}`;
        if (adminLink) adminLink.style.display = user.isAdmin ? 'block' : 'none';
        if (ordersContent) ordersContent.style.display = 'block';
        if (guestNotice) guestNotice.style.display = 'none';
        startWatching();
    } else {
        guestLinks.forEach(el => el.style.display = 'block');
        if (userProfile) userProfile.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (ordersContent) ordersContent.style.display = 'none';
        if (guestNotice) guestNotice.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderHeaderAuthState();
    updateCartBadge();

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout('reload'));
    }

    // Khách bấm "Đã xem tất cả": ghi nhớ trạng thái đã xem, ẩn thông báo và chấm báo trên menu
    document.addEventListener('click', e => {
        if (!e.target.closest('#notifyRead')) return;
        const user = getCurrentUser();
        if (user) markSeen(user.uid, currentOrders);
        renderOrders();
    });
});

window.addEventListener('pagehide', () => { if (stopWatching) stopWatching(); });