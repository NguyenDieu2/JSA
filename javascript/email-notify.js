// Gửi email báo trạng thái đơn hàng cho khách bằng EmailJS (cấu hình ở email-config.js).
import { EMAILJS } from './email-config.js';
import { statusLabel, STATUS_MESSAGES } from './orders-db.js';

export function emailEnabled() {
    return !!(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);
}

// Trả về { ok: true } | { skipped: 'not-configured' | 'no-email' }; ném lỗi nếu gửi thất bại
export async function sendStatusEmail(order, status) {
    if (!emailEnabled()) return { skipped: 'not-configured' };
    if (!order.email) return { skipped: 'no-email' };

    const items = (Array.isArray(order.items) ? order.items : [])
        .map(it => `${it.name}${it.variant ? ' (' + it.variant + ')' : ''} × ${Number(it.qty) || 1}`).join(', ');

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: EMAILJS.serviceId,
            template_id: EMAILJS.templateId,
            user_id: EMAILJS.publicKey,
            template_params: {
                to_email: order.email,
                to_name: `${order.ho || ''} ${order.ten || ''}`.trim() || 'Quý khách',
                order_code: order.id,
                status_label: statusLabel(status),
                status_message: STATUS_MESSAGES[status] || '',
                order_total: (Number(order.total) || 0).toLocaleString('vi-VN') + 'đ',
                items_summary: items,
                orders_url: new URL('orders.html', location.href).href,
                shop_name: 'DIEU TECH'
            }
        })
    });
    if (!res.ok) throw new Error((await res.text()) || ('HTTP ' + res.status));
    return { ok: true };
}