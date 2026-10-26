// Dữ liệu chi tiết của 6 sản phẩm có sẵn, key = data-id trên trang chủ.
// Sản phẩm admin thêm mới được lấy từ Firestore theo id (xem product.js).
// Nhóm "Màu sắc": mỗi phần tử là [tên màu, mã màu hiển thị]. Màu không đổi giá (priceDelta 0).
const colors = (...list) => [{ name: 'Màu sắc', type: 'color', options: list.map(([label, swatch]) => ({ label, swatch, priceDelta: 0 })) }];

// Cách thêm dung lượng (giá bán = giá gốc + priceDelta), ví dụ:
//   variants: [
//     ...colors(['Đen', '#1f1f1f'], ['Bạc', '#d9d9db']),
//     { name: 'Dung lượng', options: [ { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 5000000 } ] }
//   ],
// Giá chênh lệch bạn tự điền theo bảng giá thật của cửa hàng.
export const PRODUCTS = {
    'macbook-pro-m3': {
        name: 'MacBook Pro M3', price: 49990000, img: './img/mac.png',
        gallery: ['./img/mac1.png', './img/mac2.png', './img/mac3.png'],
        specs: 'Chip Apple M3 Max 14 nhân | RAM 36GB | 1TB | 14.2" Liquid Retina XDR',
        variants: colors(['Đen không gian', '#2d2d2f'], ['Bạc', '#d8d9da']),
        details: ['Card đồ họa: 30 nhân Neural Engine 16 nhân', 'Dung lượng RAM: 36GB', 'Ổ cứng: 1TB',
                  'Kích thước màn hình: 14.2 inches', 'Pin: 72.4Wh', 'Loại CPU: Apple M3 Max 14 nhân']
    },
    'iphone-16-pro-max': {
        name: 'iPhone 16 Pro Max', price: 26590000, img: './img/iphone.png',
        gallery: ['./img/phone1.png', './img/phone2.png', './img/phone3.png'],
        specs: 'Chip A18 Pro | Camera 48MP | Titan Grade 5 | 6.3" Super Retina XDR OLED',
        variants: colors(['Titan sa mạc', '#b7a08b'], ['Titan tự nhiên', '#b9b2a7'], ['Titan trắng', '#efeeea'], ['Titan đen', '#3a3a3c']),
        details: ['Độ phân giải màn hình: 2622 x 1206 pixels', 'Tần số quét: 120Hz', 'Ổ cứng: 1TB',
                  'Kiểu màn hình: Dynamic Island', 'Công nghệ - Tiện ích: Face ID, FaceTime', 'Cổng sạc: USB Type-C']
    },
    'airpods-max': {
        name: 'AirPods Max', price: 13590000, img: './img/airpod.png',
        gallery: ['./img/air1.png', './img/air2.png', './img/air3.png'],
        specs: 'Chip Apple H1 | Chống ồn chủ động | Pin 20 giờ | 386.2g',
        variants: colors(['Đen', '#3b3b3d'], ['Trắng ánh sao', '#e7e3da'], ['Xanh dương', '#9fb4cf'], ['Tím', '#c9bdd9'], ['Cam', '#e0a98a']),
        details: ['Tính năng Chủ Động Khử Tiếng Ồn đẳng cấp Pro', 'Cảm biến phát hiện hộp', 'Cảm biến quang học',
                  'Chế độ Âm Thanh Không Gian Cá Nhân Hóa với tính năng theo dõi chuyển động đầu chủ động',
                  'Cảm biến vị trí', 'Tính năng khác: Sạc nhanh']
    },
    'apple-watch-ultra-3': {
        name: 'Apple Watch Ultra 3', price: 22990000, img: './img/watch.png',
        gallery: ['./img/watch1.png', './img/watch2.png', './img/watch3.png'],
        specs: 'Chip S10 | Retina luôn bật | Mặt 49mm | Thiết kế mặt vuông',
        variants: colors(['Titan tự nhiên', '#bdb6aa'], ['Titan đen', '#3a3a3c']),
        details: ['Trọng lượng: 61.8 gram', 'Chất liệu dây: Cao Su', 'Hệ điều hành: WatchOS', 'Cổng sạc: Từ tính',
                  'Kích thước cổ tay phù hợp: Vừa với cổ tay cỡ 13 – 21 cm', 'Độ phân giải: 422 x 514 pixel']
    },
    'imac-m4': {
        name: 'iMac M4', price: 48990000, img: './img/imac.png',
        gallery: ['./img/imac1.png', './img/imac2.png', './img/imac3.png'],
        specs: 'Chip Apple M4 10 lõi | Retina 4.5K | RAM 24GB | 512GB',
        variants: colors(['Xanh lá', '#8fbf9f'], ['Vàng', '#f2cf6b'], ['Cam', '#f0a56b'], ['Hồng', '#eab0c0'], ['Tím', '#b9b0e0'], ['Xanh dương', '#7aa7e0'], ['Bạc', '#d9d9db']),
        details: ['Card đồ họa: GPU 8 lõi', 'Kích thước màn hình: 24 inches', 'Độ phân giải màn hình: 4480 x 2520 (4.5K)',
                  'Hệ điều hành: macOS', 'Trọng lượng: 4.42 kg', 'Nguồn: 143W']
    },
    'canon-eos-r50': {
        name: 'Máy ảnh Canon EOS R50', price: 19490000, img: './img/canon.png',
        gallery: ['./img/canon1.png', './img/canon2.png', './img/canon3.png'],
        specs: 'APS-C CMOS | Video 4K 30fps | LCD 3.0" | 24.2MP',
        variants: colors(['Đen', '#1f1f1f'], ['Trắng', '#f2f2f2']),
        details: ['Tỷ lệ ảnh: 3:2', 'Chế độ lấy nét: Continuous-Servo AF, Manual Focus, Single-Servo AF',
                  'Độ nhạy ISO: 100 đến 32000 (mở rộng: 51200)', 'Hẹn giờ chụp: Độ trễ 2/10 giây',
                  'Định dạng ảnh: C-RAW, HEIF, JPEG, Raw', 'Độ phân giải màn hình: 1.040.000 điểm']
    }
};