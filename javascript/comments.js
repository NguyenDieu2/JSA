import { db } from './config.js';
import {
    collection, addDoc, getDocs, deleteDoc, doc, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getCurrentUser } from './auth.js';
import { ico } from './icons.js';

const COMMENTS = 'comments';
const productId = new URLSearchParams(location.search).get('id');

const $ = id => document.getElementById(id);
const form = $('cmtForm'), list = $('cmtList'), summary = $('cmtSummary'),
      countEl = $('cmtCount'), textEl = $('cmtText'), lenEl = $('cmtLen'),
      loginBox = $('cmtLogin'), asEl = $('cmtAs'), starBox = $('starInput');

let rating = 0;
let items = [];

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function stars(n) { return ico('star-fill').repeat(n) + ico('star-empty').repeat(5 - n); }

// Tô sao ở ô chấm điểm: sao đã chọn dùng icon sao đầy, còn lại dùng sao rỗng
function paintStars() {
    starBox.querySelectorAll('button').forEach(x => {
        const on = Number(x.dataset.v) <= rating;
        x.classList.toggle('on', on);
        x.querySelector('img').src = `./img/icons/star-${on ? 'fill' : 'empty'}.png`;
    });
}
function fmtDate(t) {
    if (!t) return 'Vừa xong';
    return t.toDate().toLocaleDateString('vi-VN') + ' ' +
           t.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function render() {
    const user = getCurrentUser();
    countEl.textContent = items.length ? `(${items.length})` : '';

    const rated = items.filter(c => c.rating > 0);
    summary.innerHTML = rated.length
        ? `<span class="stars">${stars(Math.round(rated.reduce((s, c) => s + c.rating, 0) / rated.length))}</span> ` +
          `${(rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1)}/5 · ${rated.length} lượt đánh giá`
        : 'Chưa có đánh giá nào';

    if (!items.length) {
        list.innerHTML = '<div class="cmt-empty">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nhận.</div>';
        return;
    }
    list.innerHTML = items.map(c => {
        const canDelete = user && (user.uid === c.uid || user.isAdmin);
        return `
        <article class="cmt-item">
            <div class="cmt-avatar">${esc((c.name || '?').trim().charAt(0).toUpperCase())}</div>
            <div>
                <div class="cmt-head">
                    <span class="cmt-name">${esc(c.name)}</span>
                    ${c.rating ? `<span class="cmt-stars">${stars(c.rating)}</span>` : ''}
                    <span class="cmt-date">${fmtDate(c.createTime)}</span>
                </div>
                <div class="cmt-text">${esc(c.text)}</div>
            </div>
            ${canDelete ? `<button class="cmt-del" data-id="${esc(c.id)}">Xóa</button>` : ''}
        </article>`;
    }).join('');
}

async function load() {
    try {
        const snap = await getDocs(query(collection(db, COMMENTS), where('productId', '==', productId)));
        items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createTime?.toMillis() || 0) - (a.createTime?.toMillis() || 0));
        render();
    } catch (err) {
        console.error('Lỗi tải bình luận:', err);
        list.innerHTML = '<div class="cmt-empty">Không tải được bình luận. Vui lòng thử lại sau.</div>';
    }
}

function setupForm() {
    const user = getCurrentUser();
    if (!user) {
        form.style.display = 'none';
        loginBox.style.display = 'block';
        return;
    }
    loginBox.style.display = 'none';
    form.style.display = 'block';
    asEl.innerHTML = `Bình luận với tên <strong>${esc(user.name || user.email)}</strong>`;
}

starBox.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const v = Number(b.dataset.v);
    rating = rating === v ? 0 : v; // bấm lại để bỏ chọn
    paintStars();
});

textEl.addEventListener('input', () => { lenEl.textContent = `${textEl.value.length}/500`; });

form.addEventListener('submit', async e => {
    e.preventDefault();
    const user = getCurrentUser();
    const text = textEl.value.trim();
    if (!user) return;
    if (text.length < 3) { alert('Bình luận cần ít nhất 3 ký tự'); return; }

    const btn = form.querySelector('.cmt-submit');
    btn.disabled = true;
    try {
        await addDoc(collection(db, COMMENTS), {
            productId,
            uid: user.uid,
            name: user.name || user.email,
            rating,
            text,
            createTime: Timestamp.now()
        });
        textEl.value = '';
        lenEl.textContent = '0/500';
        rating = 0;
        paintStars();
        await load();
    } catch (err) {
        console.error(err);
        alert(err.code === 'permission-denied'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để bình luận.'
            : 'Gửi bình luận thất bại: ' + err.message);
    } finally {
        btn.disabled = false;
    }
});

list.addEventListener('click', async e => {
    const b = e.target.closest('.cmt-del');
    if (!b || !confirm('Xóa bình luận này?')) return;
    try {
        await deleteDoc(doc(db, COMMENTS, b.dataset.id));
        await load();
    } catch (err) {
        alert('Xóa thất bại: ' + err.message);
    }
});

if (productId) {
    setupForm();
    load();
}