// Tab "Đơn hàng" trong trang quản trị: xem đơn trên Firestore và đổi trạng thái.
import { fetchAllOrders, updateOrderStatus, ORDER_STATUSES } from './orders-db.js';
import { sendStatusEmail } from './email-notify.js';
import { ico } from './icons.js';

const PAYMENT_LABELS = {
    visa: 'Thẻ Visa', mastercard: 'Thẻ Mastercard', applepay: 'Apple Pay',
    momo: 'Ví MoMo', cod: 'Thanh toán khi nhận hàng (COD)', banking: 'Chuyển khoản ngân hàng'
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

let noticeTimer = null;
// Thông báo nhỏ phía trên danh sách đơn (không chặn thao tác như alert)
function notice(text, kind) {
    let box = $('ordersNotice');
    if (!box) {
        box = document.createElement('div');
        box.id = 'ordersNotice';
        $('adminOrders').before(box);
    }
    box.className = 'orders-notice ' + (kind || '');
    box.textContent = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { box.textContent = ''; box.className = 'orders-notice'; }, 8000);
}

// Sau khi đổi trạng thái: khách luôn thấy thông báo trong trang "Đơn hàng"; email gửi thêm nếu đã cấu hình
async function emailCustomer(o, status) {
    try {
        const r = await sendStatusEmail(o, status);
        if (r.ok) return notice(`Đã đổi trạng thái đơn #${o.id} và gửi email thông báo cho khách.`, 'ok');
        if (r.skipped === 'no-email') return notice(`Đã đổi trạng thái đơn #${o.id}. Đơn này không có email khách nên chưa gửi email; khách vẫn thấy thông báo trong trang Đơn hàng.`, 'ok');
        notice(`Đã đổi trạng thái đơn #${o.id}. Khách sẽ thấy thông báo trong trang "Đơn hàng của tôi" (chưa bật gửi email, xem email-config.js).`, 'ok');
    } catch (err) {
        console.error('Gửi email thất bại:', err);
        notice(`Đã đổi trạng thái đơn #${o.id} nhưng gửi email thất bại: ${err.message}`, 'err');
    }
}

let orders = [];
let statusFilter = 'all';
let started = false;

function visibleOrders() {
    const kw = $('orderSearch').value.toLowerCase().trim();
    return orders.filter(o => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (!kw) return true;
        return [o.id, o.ho, o.ten, o.phone, o.email].some(v => String(v || '').toLowerCase().includes(kw));
    });
}

function renderChips() {
    const count = id => orders.filter(o => o.status === id).length;
    $('orderStatusChips').innerHTML =
        `<button type="button" class="chip${statusFilter === 'all' ? ' active' : ''}" data-status="all">Tất cả (${orders.length})</button>` +
        ORDER_STATUSES.map(s =>
            `<button type="button" class="chip${statusFilter === s.id ? ' active' : ''}" data-status="${s.id}">${s.label} (${count(s.id)})</button>`
        ).join('');
}

function renderCard(o) {
    const items = Array.isArray(o.items) ? o.items : [];
    return `
    <article class="ao-card">
        <header class="ao-head">
            <div>
                <div class="ao-code">Đơn #${esc(o.id)}</div>
                <div class="ao-date">${esc(fmtDate(o.date))}</div>
            </div>
            <select class="ao-status st-${esc(o.status)}" data-doc="${esc(o.docId)}" aria-label="Trạng thái đơn">
                ${ORDER_STATUSES.map(s => `<option value="${s.id}"${s.id === o.status ? ' selected' : ''}>${s.label}</option>`).join('')}
            </select>
        </header>
        <div class="ao-body">
            <div class="ao-cust">
                <div><span>Người nhận</span>${esc(o.ho)} ${esc(o.ten)}</div>
                <div><span>Điện thoại</span>${esc(o.phone || '—')}</div>
                <div><span>Email</span>${esc(o.email || '—')}</div>
                <div><span>Địa chỉ</span>${esc(o.addr)}${o.city ? ', ' + esc(o.city) : ''}</div>
                <div><span>Ngày giao</span>${esc(o.ngayGiao || '—')}</div>
                <div><span>Thanh toán</span>${esc(PAYMENT_LABELS[o.payment] || o.payment || '—')}</div>
                ${o.discount > 0 ? `<div><span>Mã giảm giá</span>${esc(o.coupon || '')} (−${money(o.discount)})</div>` : ''}
            </div>
            <ul class="ao-items">
                ${items.map(it => `
                <li>
                    <span class="ao-item-name">${esc(it.name)}${it.variant ? ` <em>(${esc(it.variant)})</em>` : ''} <em>× ${Number(it.qty) || 1}</em></span>
                    <span>${money((it.price || 0) * (it.qty || 1))}</span>
                </li>`).join('') || '<li class="ao-none">Không có sản phẩm</li>'}
            </ul>
        </div>
        <footer class="ao-foot">
            <span>Tổng cộng</span>
            <strong>${money(o.total)}</strong>
        </footer>
    </article>`;
}

function render() {
    renderChips();
    const pending = orders.filter(o => o.status === 'pending').length;
    $('ordersBadge').textContent = pending || '';

    const list = visibleOrders();
    $('ordersSummary').textContent = `Hiển thị ${list.length}/${orders.length} đơn hàng`;
    $('adminOrders').innerHTML = list.length
        ? list.map(renderCard).join('')
        : `<div class="admin-empty"><div class="e-icon">${ico('receipt')}</div><p>Không có đơn hàng phù hợp</p></div>`;
}

async function load() {
    const box = $('adminOrders');
    box.innerHTML = '<div class="admin-empty"><p>Đang tải đơn hàng...</p></div>';
    try {
        orders = await fetchAllOrders();
        render();
    } catch (err) {
        console.error('Lỗi tải đơn hàng:', err);
        box.innerHTML = `<div class="admin-empty"><div class="e-icon">${ico('warning')}</div><p>` +
            (err.code === 'permission-denied'
                ? 'Không có quyền đọc đơn hàng. Hãy kiểm tra Firestore Rules cho collection "orders".'
                : 'Không tải được đơn hàng. Vui lòng thử lại.') + '</p></div>';
    }
}

export function initOrdersTab() {
    if (started) return;
    started = true;

    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
            $('tab-products').style.display = btn.dataset.tab === 'products' ? 'block' : 'none';
            $('tab-orders').style.display   = btn.dataset.tab === 'orders'   ? 'block' : 'none';
        });
    });

    $('orderStatusChips').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        statusFilter = chip.dataset.status;
        render();
    });
    $('orderSearch').addEventListener('input', render);
    $('ordersRefresh').addEventListener('click', load);

    $('adminOrders').addEventListener('change', async e => {
        const sel = e.target.closest('.ao-status');
        if (!sel) return;
        const o = orders.find(x => x.docId === sel.dataset.doc);
        if (!o) return;
        const next = sel.value, prev = o.status;
        if (next === prev) return;
        if (next === 'cancelled' && !confirm('Hủy đơn hàng này?')) { sel.value = prev; return; }
        sel.disabled = true;
        try {
            await updateOrderStatus(o.docId, next);
            o.status = next;
            render();
            emailCustomer(o, next);
        } catch (err) {
            console.error(err);
            alert('Đổi trạng thái thất bại: ' + err.message);
            sel.value = prev;
            sel.disabled = false;
        }
    });

    load();
}