import { fetchProducts, addProduct, updateProduct, deleteProduct as deleteProductDoc } from './products.js';
import { getCurrentUser, logout } from './auth.js';
import { CATEGORIES } from './catalog.js';
import { initOrdersTab } from './admin-orders.js';
import { parseVariants, variantsToText } from './variants.js';
import { ico } from './icons.js';

let adminProductsCache = [];
let editingProductId = null;

async function getAdminProducts() {
    try {
        return await fetchProducts();
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
        return [];
    }
}
function catLabel(id) {
    const c = CATEGORIES.find(x => x.id === id);
    return c ? c.label : 'Khác';
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function slugify(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
async function renderAdminList() {
    const list = await getAdminProducts();
    adminProductsCache = list;
    const wrap = document.getElementById('adminList');
    document.getElementById('countLabel').textContent = list.length;
    if (!list.length) {
        wrap.innerHTML = `<div class="admin-empty"><div class="e-icon">${ico('box')}</div><p>Chưa có sản phẩm nào do admin thêm</p></div>`;
        return;
    }
    wrap.innerHTML = list.map(p => `
        <div class="admin-product-row">
            <img src="${esc(p.img)}" alt="${esc(p.name)}" onerror="this.style.opacity=0.3">
            <div class="p-info">
                <div class="p-name">${esc(p.name)}</div>
                <div class="p-price">${fmt(p.price)}</div>
                <span class="p-cat">${catLabel(p.category)}</span>
            </div>
            <div class="p-actions">
                <button class="p-edit" onclick="editProduct('${esc(p.id)}')" title="Sửa">${ico('edit')}</button>
                <button class="p-delete" onclick="deleteProduct('${esc(p.id)}')" title="Xóa">${ico('trash')}</button>
            </div>
        </div>
    `).join('');
}
window.deleteProduct = async function (id) {
    if (!confirm('Xóa sản phẩm này khỏi danh sách?')) return;
    try {
        await deleteProductDoc(id);
        if (editingProductId === id) cancelEditProduct();
        renderAdminList();
    } catch (err) {
        alert('Xóa thất bại: ' + err.message);
    }
};

const categorySelect = document.getElementById('p-category');
categorySelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

// Thay giao diện xổ xuống mặc định của trình duyệt bằng menu tuỳ chỉnh. Trả về hàm đồng bộ lại giao diện sau khi gán .value bằng code.
function buildCategoryDropdown(select) {
    select.classList.add('cat-native');
    select.tabIndex = -1;
    const wrap = document.createElement('div');
    wrap.className = 'cat-dropdown';
    wrap.innerHTML = `
        <button type="button" class="cat-toggle" aria-haspopup="listbox" aria-expanded="false">
            <span class="cat-label"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <ul class="cat-menu" role="listbox">
            ${Array.from(select.options).map(o => `<li role="option" data-value="${o.value}">${o.textContent}</li>`).join('')}
        </ul>`;
    select.insertAdjacentElement('afterend', wrap);

    const toggle = wrap.querySelector('.cat-toggle');
    const label  = wrap.querySelector('.cat-label');
    const items  = Array.from(wrap.querySelectorAll('li'));

    function sync() {
        const cur = select.options[select.selectedIndex];
        label.textContent = cur ? cur.textContent : '';
        items.forEach(li => li.classList.toggle('selected', li.dataset.value === select.value));
    }
    function setOpen(open) {
        wrap.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    }
    function choose(value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
    }

    toggle.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));
    wrap.querySelector('.cat-menu').addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!li) return;
        choose(li.dataset.value);
        setOpen(false);
        toggle.focus();
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) setOpen(false); });
    toggle.addEventListener('keydown', e => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const i = select.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1);
            if (i >= 0 && i < select.options.length) choose(select.options[i].value);
        }
    });
    sync();
    return sync;
}
const syncCategoryUI = buildCategoryDropdown(categorySelect);

const productForm   = document.getElementById('productForm');
const formSubmitBtn = productForm.querySelector("button[type='submit']");
const formTitle     = document.getElementById('formTitle'); // tùy chọn, có thể không tồn tại trong HTML

// Nút "Hủy sửa" — tạo thêm nếu HTML chưa có sẵn, để không phải sửa admin.html
let cancelEditBtn = document.getElementById('cancelEditBtn');
if (!cancelEditBtn && formSubmitBtn) {
    cancelEditBtn = document.createElement('button');
    cancelEditBtn.type = 'button';
    cancelEditBtn.id = 'cancelEditBtn';
    cancelEditBtn.textContent = 'Hủy sửa';
    cancelEditBtn.style.display = 'none';
    cancelEditBtn.className = 'admin-cancel';
    formSubmitBtn.insertAdjacentElement('afterend', cancelEditBtn);
}
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => cancelEditProduct());
}

function setImgPreview(url) {
    const preview = document.getElementById('imgPreview');
    if (url) {
        preview.innerHTML = `<img src="${esc(url)}" onerror="this.parentElement.innerHTML='<span>Không tải được ảnh</span>'">`;
    } else {
        preview.innerHTML = '<span>Xem trước ảnh</span>';
    }
}

document.getElementById('p-img').addEventListener('input', function () {
    setImgPreview(this.value.trim());
});

window.editProduct = function (id) {
    const p = adminProductsCache.find(item => item.id === id);
    if (!p) return;

    editingProductId = id;
    document.getElementById('p-name').value  = p.name || '';
    categorySelect.value = CATEGORIES.some(c => c.id === p.category) ? p.category : 'other';
    syncCategoryUI();
    document.getElementById('p-price').value = p.price || '';
    document.getElementById('p-img').value   = p.img || '';
    document.getElementById('p-gallery').value = (Array.isArray(p.gallery) ? p.gallery : []).join('\n');
    document.getElementById('p-variants').value = variantsToText(p.variants);
    const descLines = Array.isArray(p.descLines) && p.descLines.length
        ? p.descLines
        : String(p.specs || '').split('|').map(s => s.trim()).filter(Boolean);
    document.getElementById('p-desc').value = descLines.join('\n');
    setImgPreview(p.img || '');

    if (formSubmitBtn) formSubmitBtn.textContent = 'Cập nhật sản phẩm';
    if (formTitle) formTitle.textContent = 'Sửa sản phẩm';
    if (cancelEditBtn) cancelEditBtn.style.display = 'block';

    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function cancelEditProduct() {
    editingProductId = null;
    productForm.reset();
    syncCategoryUI();
    setImgPreview('');
    if (formSubmitBtn) formSubmitBtn.textContent = 'Thêm sản phẩm';
    if (formTitle) formTitle.textContent = 'Thêm sản phẩm mới';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
}

productForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name  = document.getElementById('p-name').value.trim();
    const price = parseInt(document.getElementById('p-price').value);
    const img   = document.getElementById('p-img').value.trim();
    const descLines = document.getElementById('p-desc').value
        .split('\n').map(s => s.trim()).filter(Boolean);
    const gallery = document.getElementById('p-gallery').value
        .split('\n').map(s => s.trim()).filter(Boolean);
    const parsed = parseVariants(document.getElementById('p-variants').value);
    if (parsed.error) {
        alert('Biến thể không hợp lệ: ' + parsed.error);
        return;
    }
    if (!name || !price || !img || !descLines.length) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }
    if (gallery.some(u => !/^https?:\/\//i.test(u))) {
        alert('Link ảnh phụ phải bắt đầu bằng http:// hoặc https://');
        return;
    }
    const data = {
        slug: slugify(name),
        name,
        price,
        img,
        gallery,
        variants: parsed.variants,
        category: categorySelect.value,
        specs: descLines.join(' | '),
        descLines
    };
    if (formSubmitBtn) formSubmitBtn.disabled = true;
    try {
        if (editingProductId) {
            await updateProduct(editingProductId, data);
            await renderAdminList();
            cancelEditProduct();
            alert('Đã cập nhật sản phẩm!');
        } else {
            await addProduct(data);
            productForm.reset();
            syncCategoryUI();
            setImgPreview('');
            await renderAdminList();
            alert('Đã thêm sản phẩm! Sản phẩm sẽ hiển thị trên trang chủ.');
        }
    } catch (err) {
        alert((editingProductId ? 'Cập nhật' : 'Thêm') + ' sản phẩm thất bại: ' + err.message);
    } finally {
        if (formSubmitBtn) formSubmitBtn.disabled = false;
    }
});

function checkAccess() {
    const user = getCurrentUser();
    const isAdmin = user && user.isAdmin === true;
    if (isAdmin) {
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('accessDenied').style.display = 'none';
        document.getElementById('adminTopBar').style.display = 'flex';
        renderAdminList();
        initOrdersTab();
    } else {
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        document.getElementById('adminTopBar').style.display = 'none';
    }
}
document.getElementById('adminLogout').addEventListener('click', function () {
    logout('login.html');
});
checkAccess();