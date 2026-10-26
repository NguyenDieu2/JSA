// Thông báo trạng thái đơn hàng cho khách: theo dõi trạng thái đã xem + chấm báo trên menu "Đơn hàng".
import { fetchMyOrders } from './orders-db.js';

const seenKey = uid => 'dieutech_seen_' + uid;      // { mã đơn: trạng thái khách đã xem }
const BADGE_CACHE = 'dieutech_badge';                // sessionStorage: tránh gọi Firestore ở mỗi trang

// Đơn cũ (tạo trước khi có trạng thái) không có trường status: coi như đang chờ xác nhận
const statusOf = o => o.status || 'pending';

function readSeen(uid) {
    try { return JSON.parse(localStorage.getItem(seenKey(uid))) || {}; }
    catch { return {}; }
}

// Đơn có trạng thái khác với lần khách xem gần nhất (đơn mới đặt mặc định đã "xem" ở trạng thái chờ xác nhận)
export function unseenOf(uid, orders) {
    const seen = readSeen(uid);
    return orders.filter(o => !o.pendingSync && (seen[o.id] || 'pending') !== statusOf(o));
}

export function markSeen(uid, orders) {
    const seen = readSeen(uid);
    orders.forEach(o => { if (!o.pendingSync) seen[o.id] = statusOf(o); });
    try { localStorage.setItem(seenKey(uid), JSON.stringify(seen)); } catch {}
}

function renderBadge(n) {
    // Chỉ link "Đơn hàng" trên menu (header); các link cùng địa chỉ trong nội dung trang (VD ở trang hồ sơ) không gắn chấm
    document.querySelectorAll('header a[href="orders.html"]').forEach(a => {
        let b = a.querySelector('.nav-order-badge');
        if (!n) { if (b) b.remove(); return; }
        if (!b) {
            b = document.createElement('span');
            b.className = 'nav-order-badge';
            b.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;' +
                'margin-left:6px;border-radius:9px;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;font-size:11px;font-weight:700;line-height:1;';
            a.appendChild(b);
        }
        b.textContent = n > 99 ? '99+' : String(n);
        b.title = `${n} đơn hàng có cập nhật mới`;
        b.setAttribute('aria-label', b.title);
    });
}

// Cập nhật chấm báo (dùng khi trang Đơn hàng đã biết số liệu mới nhất) và nhớ lại cho các trang khác
export function setBadge(n, uid) {
    try { sessionStorage.setItem(BADGE_CACHE, JSON.stringify({ uid, n, t: Date.now() })); } catch {}
    renderBadge(n);
}

// Gọi ở mọi trang có menu: hiện số đơn có cập nhật mới. Chỉ hỏi Firestore tối đa mỗi 60 giây.
export async function refreshOrderBadge(user) {
    if (!user || !user.uid) { renderBadge(0); return; }
    let cache = null;
    try { cache = JSON.parse(sessionStorage.getItem(BADGE_CACHE)); } catch {}
    if (cache && cache.uid === user.uid && Date.now() - cache.t < 60000) { renderBadge(cache.n); return; }
    try {
        const orders = await fetchMyOrders(user.uid);
        setBadge(unseenOf(user.uid, orders).length, user.uid);
    } catch (err) {
        console.warn('Không kiểm tra được thông báo đơn hàng:', err && err.code ? err.code : err);
        setBadge(0, user.uid);   // ghi nhớ kết quả lỗi 60 giây để không gọi lại Firestore ở mỗi lần mở trang
    }
}