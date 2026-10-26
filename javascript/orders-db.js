// Đọc / ghi đơn hàng: Firestore (collection "orders") + bản dự phòng trong trình duyệt (localStorage "orderHistory").
// Dùng chung cho delivery.js, orders.js, profile.js và admin-orders.js.
import { db } from './config.js';
import {
    collection, getDocs, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, doc, query, where, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const ORDERS = 'orders';
const LOCAL_KEY = 'orderHistory';

export const ORDER_STATUSES = [
    { id: 'pending',   label: 'Chờ xác nhận' },
    { id: 'confirmed', label: 'Đã xác nhận' },
    { id: 'shipping',  label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'cancelled', label: 'Đã hủy' }
];

export function statusLabel(id) {
    const s = ORDER_STATUSES.find(x => x.id === id);
    return s ? s.label : ORDER_STATUSES[0].label;
}

// Lời nhắn gửi khách theo từng trạng thái (dùng cho thông báo trong trang Đơn hàng và cho email)
export const STATUS_MESSAGES = {
    pending:   'Đơn hàng đang chờ cửa hàng xác nhận.',
    confirmed: 'Cửa hàng đã xác nhận đơn hàng và đang chuẩn bị hàng cho bạn.',
    shipping:  'Đơn hàng đang được giao tới bạn.',
    delivered: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua sắm tại DIEU TECH!',
    cancelled: 'Đơn hàng đã bị hủy. Nếu cần hỗ trợ, vui lòng liên hệ hotline của cửa hàng.'
};

// Trạng thái để hiển thị cho khách: đơn chưa gửi được lên Firestore có nhãn riêng
export function orderStatusView(o) {
    if (o.pendingSync) return { id: 'unsynced', label: 'Chưa gửi lên hệ thống' };
    const id = o.status || 'pending';
    return { id, label: statusLabel(id) };
}

/* ---------- Bản lưu trong trình duyệt ---------- */
function readLocal() {
    try {
        const list = JSON.parse(localStorage.getItem(LOCAL_KEY));
        return Array.isArray(list) ? list : [];
    } catch { return []; }
}
function writeLocal(list) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }
    catch (err) { console.error('Không ghi được lịch sử đơn hàng:', err); }
}
// Lưu đơn vào máy TRƯỚC khi gửi lên Firestore để đơn không bao giờ bị mất (synced:false = chưa gửi)
export function saveLocalOrder(order) {
    const list = readLocal().filter(o => o.id !== order.id);
    list.unshift(order);
    writeLocal(list);
    try { localStorage.setItem('lastOrder', JSON.stringify(order)); } catch {}
}
export function markOrderSynced(id) {
    const list = readLocal();
    const o = list.find(x => x.id === id);
    if (o) { o.synced = true; writeLocal(list); }
}

/* ---------- Firestore ---------- */
// Doc Firestore -> object đơn hàng dùng trên giao diện (id = mã đơn hiển thị, docId = id tài liệu)
function toOrder(d) {
    const data = d.data();
    const t = data.createTime && data.createTime.toDate ? data.createTime.toDate() : null;
    return Object.assign({}, data, {
        docId: d.id,
        id: data.code || d.id,
        date: data.date || (t ? t.toISOString() : ''),
        createMs: t ? t.getTime() : 0,
        updateMs: data.updateTime && data.updateTime.toDate ? data.updateTime.toDate().getTime() : 0,
        status: data.status || 'pending'
    });
}

// Gửi đơn lên Firestore. Id tài liệu cố định = uid_mã đơn nên gửi lại nhiều lần không tạo đơn trùng.
export async function createOrder(order) {
    const { id, synced, pendingSync, ...rest } = order;
    const ref = doc(db, ORDERS, `${order.uid}_${id}`);
    try { if ((await getDoc(ref)).exists()) return; } catch { /* chưa có tài liệu / chưa đọc được: cứ thử ghi */ }
    await setDoc(ref, {
        ...rest, code: id, createTime: Timestamp.now(),
        statusHistory: [{ status: rest.status || 'pending', at: Date.parse(rest.date) || Date.now() }]   // lịch sử trạng thái (dòng thời gian cho khách)
    });
}

// Gửi lại các đơn của người dùng còn nằm trong máy mà chưa lên được Firestore
export async function syncPendingOrders(user) {
    if (!user || !user.uid) return 0;
    const list = readLocal();
    let changed = 0;
    for (const o of list) {
        if (o.synced !== false || o.uid !== user.uid) continue;
        try { await createOrder(o); o.synced = true; changed++; }
        catch (err) { console.warn('Chưa đồng bộ được đơn', o.id, err && err.code ? err.code : err); }
    }
    if (changed) writeLocal(list);
    return changed;
}

// Admin: toàn bộ đơn, mới nhất trước
export async function fetchAllOrders() {
    const snap = await getDocs(query(collection(db, ORDERS), orderBy('createTime', 'desc')));
    return snap.docs.map(toOrder);
}

// Khách: đơn của chính mình (sắp xếp phía client để không cần tạo index)
export async function fetchMyOrders(uid) {
    const snap = await getDocs(query(collection(db, ORDERS), where('uid', '==', uid)));
    return snap.docs.map(toOrder).sort((a, b) => b.createMs - a.createMs);
}

// Gộp đơn trên Firestore với đơn còn trong máy (chưa lên được / đơn cũ), không trùng lặp
function mergeWithLocal(remote, user) {
    const seen = new Set(remote.map(o => o.id));
    const local = readLocal()
        .filter(o => !seen.has(o.id) && (!o.uid || (user && o.uid === user.uid)))
        .map(o => Object.assign({}, o, { pendingSync: o.synced === false }));
    return remote.concat(local).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Lịch sử mua của người dùng (tải một lần)
export async function loadOrderHistory(user) {
    let remote = [];
    if (user && user.uid) {
        await syncPendingOrders(user);
        try { remote = await fetchMyOrders(user.uid); }
        catch (err) { console.error('Không tải được đơn hàng từ Firestore:', err); }
    }
    return mergeWithLocal(remote, user);
}

// Lịch sử mua theo thời gian thực: admin đổi trạng thái thì callback chạy lại ngay, không cần tải lại trang.
// Trả về hàm hủy theo dõi.
export function watchOrderHistory(user, callback) {
    let stop = () => {};
    let cancelled = false;
    if (!user || !user.uid) { callback(mergeWithLocal([], user)); return stop; }
    syncPendingOrders(user).catch(() => {}).then(() => {
        if (cancelled) return;
        stop = onSnapshot(
            query(collection(db, ORDERS), where('uid', '==', user.uid)),
            snap => callback(mergeWithLocal(snap.docs.map(toOrder).sort((a, b) => b.createMs - a.createMs), user)),
            err => { console.error('Không theo dõi được đơn hàng:', err); callback(mergeWithLocal([], user)); }
        );
    });
    return () => { cancelled = true; stop(); };
}

export function updateOrderStatus(docId, status) {
    return updateDoc(doc(db, ORDERS, docId), {
        status, updateTime: Timestamp.now(),
        statusHistory: arrayUnion({ status, at: Date.now() })
    });
}