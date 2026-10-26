import { db } from './config.js';
import {
    updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteField } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getCurrentUser, logout } from './auth.js';
import { getAuthUser } from './check_session.js';
import { loadOrderHistory, orderStatusView } from './orders-db.js';
import { refreshOrderBadge } from './order-notify.js';
import { ico } from './icons.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = 'pf-msg ' + (text ? (ok ? 'ok' : 'err') : '');
}

/* ---------- Header (trang này không dùng main.js) ---------- */
function renderHeader(user) {
    const name = user && (user.name || user.fullname);
    document.querySelectorAll('.guest-link').forEach(el => el.style.display = name ? 'none' : 'block');
    $('user-profile').style.display = name ? 'flex' : 'none';
    if (name) $('userNameDisplay').textContent = `Xin chào, ${name}`;
    $('admin-link').style.display = user && user.isAdmin ? 'block' : 'none';
}
function updateBadge() {
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('dieutech_cart')) || []; } catch {}
    const total = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const badge = $('cartBadge');
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = total > 0 ? 'flex' : 'none';
}
$('logout').addEventListener('click', () => logout('index.html'));

/* ---------- Lịch sử mua hàng ---------- */
function renderHistory(orders) {
    const spent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0);
    $('pfStats').innerHTML = `
        <div class="pf-stat"><span>Số đơn hàng</span><strong>${orders.length}</strong></div>
        <div class="pf-stat"><span>Tổng chi tiêu (không tính đơn đã hủy)</span><strong>${money(spent)}</strong></div>`;

    if (!orders.length) {
        $('historyList').innerHTML = `
            <div class="pf-empty"><div class="pf-state-icon">${ico('box')}</div>
            <p>Bạn chưa có đơn hàng nào.</p>
            <a href="index.html#products" class="button">Mua sắm ngay</a></div>`;
        return;
    }
    const LIMIT = 10;
    $('historyList').innerHTML = orders.slice(0, LIMIT).map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const names = items.slice(0, 2).map(it => `${esc(it.name)}${it.variant ? ' (' + esc(it.variant) + ')' : ''} × ${Number(it.qty) || 1}`).join(', ');
        const more = items.length > 2 ? ` và ${items.length - 2} sản phẩm khác` : '';
        const st = orderStatusView(o);
        return `
        <div class="pf-order">
            <div>
                <div class="pf-code">Đơn #${esc(o.id)}</div>
                <div class="pf-date">${esc(fmtDate(o.date))}</div>
            </div>
            <div class="pf-items">${names || 'Không có sản phẩm'}${more}</div>
            <span class="pf-status st-${esc(st.id)}">${esc(st.label)}</span>
            <strong class="pf-total">${money(o.total)}</strong>
        </div>`;
    }).join('') + (orders.length > LIMIT
        ? `<p class="pf-more">Đang hiển thị ${LIMIT}/${orders.length} đơn mới nhất. <a href="orders.html" class="pf-link">Xem tất cả</a></p>` : '');
}

/* ---------- Khởi tạo ---------- */
(async function init() {
    const local = getCurrentUser();
    renderHeader(local);
    updateBadge();

    if (!local) {
        $('guestNotice').style.display = 'flex';
        return;
    }

    // Cần phiên Firebase thật để đổi tên / mật khẩu
    const fbUser = await getAuthUser();
    if (!fbUser || fbUser.uid !== local.uid) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }
    $('profileContent').style.display = 'block';
    refreshOrderBadge(local);

    let avatarData = '';   // data URL ảnh đại diện (lưu ở users/{uid}.avatar)
    const nameInput = $('pfName');
    function fillIdentity() {
        $('pfEmail').value = fbUser.email || local.email || '';
        nameInput.value = local.name || '';
        renderAvatar();
    }
    fillIdentity();

    /* --- Ảnh đại diện --- */
    function renderAvatar() {
        const box = $('pfAvatar');
        if (avatarData && avatarData.startsWith('data:image/')) {
            box.textContent = '';
            const img = document.createElement('img');
            img.src = avatarData;
            img.alt = 'Ảnh đại diện';
            box.appendChild(img);
        } else {
            box.textContent = (local.name || local.email || '?').trim().charAt(0).toUpperCase();
        }
        $('avatarRemove').style.display = avatarData ? '' : 'none';
    }

    // Cắt vuông ở giữa, thu về 256x256 JPEG để nhẹ (khoảng 15–40KB) rồi lưu thẳng vào Firestore
    function toSquareDataUrl(file, size = 256) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const s = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';              // ảnh PNG trong suốt -> nền trắng
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid-image')); };
            img.src = url;
        });
    }

    const avatarFile = $('avatarFile'), avatarMsg = $('avatarMsg');
    $('avatarPick').addEventListener('click', () => avatarFile.click());
    $('pfAvatar').addEventListener('click', () => avatarFile.click());

    avatarFile.addEventListener('change', async () => {
        const file = avatarFile.files[0];
        avatarFile.value = '';                          // cho phép chọn lại cùng một file
        if (!file) return;
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return showMsg(avatarMsg, 'Chỉ hỗ trợ ảnh PNG, JPG, WEBP hoặc GIF', false);
        if (file.size > 5 * 1024 * 1024) return showMsg(avatarMsg, 'Ảnh quá lớn (tối đa 5MB)', false);

        showMsg(avatarMsg, 'Đang lưu ảnh...', true);
        try {
            const dataUrl = await toSquareDataUrl(file);
            await setDoc(doc(db, 'users', fbUser.uid), { avatar: dataUrl }, { merge: true });
            avatarData = dataUrl;
            renderAvatar();
            showMsg(avatarMsg, 'Đã cập nhật ảnh đại diện', true);
        } catch (err) {
            console.error(err);
            showMsg(avatarMsg, err.message === 'invalid-image'
                ? 'Không đọc được ảnh này. Hãy thử ảnh khác.'
                : err.code === 'permission-denied'
                    ? 'Không có quyền lưu ảnh. Hãy kiểm tra Firestore Rules cho collection "users".'
                    : 'Lưu ảnh thất bại. Vui lòng thử lại.', false);
        }
    });

    $('avatarRemove').addEventListener('click', async () => {
        if (!confirm('Xóa ảnh đại diện?')) return;
        try {
            await setDoc(doc(db, 'users', fbUser.uid), { avatar: deleteField() }, { merge: true });
            avatarData = '';
            renderAvatar();
            showMsg(avatarMsg, 'Đã xóa ảnh đại diện', true);
        } catch (err) {
            console.error(err);
            showMsg(avatarMsg, 'Xóa ảnh thất bại. Vui lòng thử lại.', false);
        }
    });

    // Tải ảnh đã lưu (không chặn phần còn lại của trang)
    getDoc(doc(db, 'users', fbUser.uid))
        .then(snap => { avatarData = snap.exists() ? (snap.data().avatar || '') : ''; renderAvatar(); })
        .catch(err => console.error('Không tải được ảnh đại diện:', err));

    /* --- Sửa tên --- */
    $('infoForm').addEventListener('submit', async e => {
        e.preventDefault();
        const msg = $('infoMsg'), btn = e.target.querySelector('.pf-btn');
        const name = nameInput.value.trim();
        if (name.length < 2) return showMsg(msg, 'Tên cần ít nhất 2 ký tự', false);
        if (name === local.name) return showMsg(msg, 'Tên chưa thay đổi', false);

        btn.disabled = true;
        try {
            await updateProfile(fbUser, { displayName: name });
            await setDoc(doc(db, 'users', fbUser.uid), { fullname: name }, { merge: true });
            local.name = name;
            localStorage.setItem('currentUser', JSON.stringify(local));
            renderHeader(local);
            fillIdentity();
            showMsg(msg, 'Đã cập nhật tên hiển thị', true);
        } catch (err) {
            console.error(err);
            showMsg(msg, err.code === 'permission-denied'
                ? 'Không có quyền cập nhật hồ sơ. Hãy kiểm tra Firestore Rules cho collection "users".'
                : 'Cập nhật thất bại. Vui lòng thử lại.', false);
        } finally {
            btn.disabled = false;
        }
    });

    /* --- Đổi mật khẩu --- */
    const hasPassword = fbUser.providerData.some(p => p.providerId === 'password');
    if (!hasPassword) {
        $('pwdForm').style.display = 'none';
        $('pwdNote').style.display = 'block';
    }
    function pwdError(code) {
        switch (code) {
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'Mật khẩu hiện tại không đúng';
            case 'auth/weak-password': return 'Mật khẩu mới quá yếu';
            case 'auth/too-many-requests': return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau';
            case 'auth/requires-recent-login': return 'Phiên đăng nhập đã cũ. Hãy đăng nhập lại rồi thử lại';
            case 'auth/network-request-failed': return 'Lỗi kết nối mạng. Vui lòng thử lại';
            default: return 'Đổi mật khẩu thất bại. Vui lòng thử lại';
        }
    }
    $('pwdForm').addEventListener('submit', async e => {
        e.preventDefault();
        const msg = $('pwdMsg'), btn = e.target.querySelector('.pf-btn');
        const cur = $('pwdCurrent').value, next = $('pwdNew').value, conf = $('pwdConfirm').value;

        if (!cur) return showMsg(msg, 'Vui lòng nhập mật khẩu hiện tại', false);
        if (next.length < 8) return showMsg(msg, 'Mật khẩu mới phải có ít nhất 8 ký tự', false);
        if (!/[a-z]/.test(next)) return showMsg(msg, 'Mật khẩu mới phải chứa chữ cái thường', false);
        if (!/[A-Z]/.test(next)) return showMsg(msg, 'Mật khẩu mới phải chứa chữ in hoa', false);
        if (!/[0-9]/.test(next)) return showMsg(msg, 'Mật khẩu mới phải chứa chữ số', false);
        if (next !== conf) return showMsg(msg, 'Mật khẩu nhập lại không khớp', false);
        if (next === cur) return showMsg(msg, 'Mật khẩu mới phải khác mật khẩu hiện tại', false);

        btn.disabled = true;
        try {
            // Firebase yêu cầu xác thực lại trước khi đổi mật khẩu
            await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, cur));
            await updatePassword(fbUser, next);
            e.target.reset();
            showMsg(msg, 'Đã đổi mật khẩu thành công', true);
        } catch (err) {
            console.error(err);
            showMsg(msg, pwdError(err.code), false);
        } finally {
            btn.disabled = false;
        }
    });

    /* --- Lịch sử --- */
    $('historyList').innerHTML = '<div class="pf-empty"><p>Đang tải lịch sử mua hàng...</p></div>';
    renderHistory(await loadOrderHistory(local));
})();