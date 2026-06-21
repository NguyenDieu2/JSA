const PRODUCTS_KEY = 'dieutech_admin_products';
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); }
    catch { return null; }
}
function getAdminProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; }
    catch { return []; }
}
function saveAdminProducts(list) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
}
function fmt(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function slugify(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
function renderAdminList() {
    const list = getAdminProducts();
    const wrap = document.getElementById('adminList');
    document.getElementById('countLabel').textContent = list.length;
    if (!list.length) {
        wrap.innerHTML = '<div class="admin-empty"><div class="e-icon">📦</div><p>Chưa có sản phẩm nào do admin thêm</p></div>';
        return;
    }
    wrap.innerHTML = list.map(p => `
        <div class="admin-product-row">
            <img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0.3">
            <div class="p-info">
                <div class="p-name">${p.name}</div>
                <div class="p-price">${fmt(p.price)}</div>
            </div>
            <button class="p-delete" onclick="deleteProduct('${p.id}')" title="Xóa">✕</button>
        </div>
    `).join('');
}
function deleteProduct(id) {
    if (!confirm('Xóa sản phẩm này khỏi danh sách?')) return;
    const list = getAdminProducts().filter(p => p.id !== id);
    saveAdminProducts(list);
    renderAdminList();
}

document.getElementById('p-img').addEventListener('input', function () {
    const preview = document.getElementById('imgPreview');
    const url = this.value.trim();
    if (url) {
        preview.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='<span>Không tải được ảnh</span>'">`;
    } else {
        preview.innerHTML = '<span>Xem trước ảnh</span>';
    }
});

document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name  = document.getElementById('p-name').value.trim();
    const price = parseInt(document.getElementById('p-price').value);
    const img   = document.getElementById('p-img').value.trim();
    const descLines = document.getElementById('p-desc').value
        .split('\n').map(s => s.trim()).filter(Boolean);
    if (!name || !price || !img || !descLines.length) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }
    const product = {
        id: slugify(name) + '-' + Date.now().toString(36).slice(-4),
        name,
        price,
        img,
        specs: descLines.join(' | '),
        descLines,
        addedAt: new Date().toISOString()
    };
    const list = getAdminProducts();
    list.push(product);
    saveAdminProducts(list);
    this.reset();
    document.getElementById('imgPreview').innerHTML = '<span>Xem trước ảnh</span>';
    renderAdminList();
    alert('Đã thêm sản phẩm! Sản phẩm sẽ hiển thị trên trang chủ.');
});

function checkAccess() {
    const user = getCurrentUser();
    const isAdmin = user && user.isAdmin === true;
    if (isAdmin) {
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('accessDenied').style.display = 'none';
        document.getElementById('adminTopBar').style.display = 'flex';
        renderAdminList();
    } else {
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        document.getElementById('adminTopBar').style.display = 'none';
    }
}
document.getElementById('adminLogout').addEventListener('click', function () {
    if (confirm('Đăng xuất khỏi tài khoản quản trị?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
});
checkAccess();