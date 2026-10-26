// Danh mục & khoảng giá dùng chung cho trang chủ (main.js) và trang quản trị (admin.js).
// Thêm danh mục mới chỉ cần thêm 1 dòng vào CATEGORIES.
export const CATEGORIES = [
    { id: 'laptop',  label: 'Laptop' },
    { id: 'phone',   label: 'Điện thoại' },
    { id: 'audio',   label: 'Âm thanh' },
    { id: 'watch',   label: 'Đồng hồ' },
    { id: 'desktop', label: 'Máy tính để bàn' },
    { id: 'camera',  label: 'Máy ảnh' },
    { id: 'other',   label: 'Khác' }
];

// Đơn vị: triệu đồng. max = null nghĩa là không giới hạn.
export const PRICE_PRESETS = [
    { label: 'Dưới 15 triệu', min: 0,  max: 15 },
    { label: '15 – 30 triệu', min: 15, max: 30 },
    { label: '30 – 50 triệu', min: 30, max: 50 },
    { label: 'Trên 50 triệu', min: 50, max: null }
];
// Mã giảm giá (% trên tạm tính). Dùng chung cho giỏ hàng và trang giao hàng.
// Lưu ý: chạy hoàn toàn phía trình duyệt nên chỉ phù hợp để demo; muốn chặt chẽ cần kiểm tra ở server.
export const COUPONS = { 'DIEU10': 10, 'TECH20': 20, 'SALE15': 15 };