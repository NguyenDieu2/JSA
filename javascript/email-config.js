// Gửi email thông báo trạng thái đơn hàng cho khách (qua dịch vụ EmailJS, không cần server riêng).
// Để trống 3 giá trị bên dưới = TẮT gửi email (khách vẫn thấy thông báo trong trang "Đơn hàng của tôi").
//
// Cách bật:
//  1. Tạo tài khoản miễn phí tại https://www.emailjs.com, vào "Email Services" thêm dịch vụ gửi mail (Gmail...) -> chép Service ID.
//  2. Vào "Email Templates" tạo template. Ô "To Email" điền {{to_email}}. Nội dung có thể dùng các biến:
//       {{to_name}} {{order_code}} {{status_label}} {{status_message}} {{order_total}} {{items_summary}} {{orders_url}} {{shop_name}}
//     Ví dụ tiêu đề: [{{shop_name}}] Đơn hàng #{{order_code}}: {{status_label}}  -> chép Template ID.
//  3. Vào "Account" lấy Public Key.
//  4. Dán 3 giá trị vào đây. Trong EmailJS, mục Security có thể giới hạn tên miền được phép gọi.
//
// Lưu ý: email được gửi từ trình duyệt của admin lúc bấm đổi trạng thái; gói miễn phí giới hạn số email mỗi tháng.
export const EMAILJS = {
    serviceId: '',
    templateId: '',
    publicKey: ''
};