// Bộ icon PNG dùng chung (thư mục img/icons), thay cho emoji / ký tự mặc định.
// Dùng trong các chuỗi HTML do JS tạo ra: `${ico('cart-add')} Thêm vào giỏ hàng`
// Tên icon: cart, cart-add, check, tick, close, trash, edit, settings, shield, lock, box, receipt,
//           warning, bell, camera, cash, arrow-right, arrow-left, star-fill, star-empty, flag-vn
export const ico = (name, cls = '') =>
    `<img class="ico${cls ? ' ' + cls : ''}" src="./img/icons/${name}.png" alt="">`;