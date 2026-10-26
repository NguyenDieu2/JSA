import { PRODUCTS } from './product-data.js';
import { fetchProduct } from './products.js';
import { cleanVariants, defaultSelection, computePrice, variantLabel, variantKey } from './variants.js';
import { ico } from './icons.js';

const id   = new URLSearchParams(location.search).get('id');
const root = document.getElementById('productRoot');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('vi-VN') + 'đ';

// Ưu tiên dữ liệu có sẵn; nếu không có thì là sản phẩm admin thêm -> lấy từ Firestore
async function getProduct(id) {
    if (PRODUCTS[id]) return { id, ...PRODUCTS[id], variants: cleanVariants(PRODUCTS[id].variants) };
    const p = await fetchProduct(id);
    if (!p) return null;
    const details = Array.isArray(p.descLines) && p.descLines.length
        ? p.descLines
        : String(p.specs || '').split('|').map(s => s.trim()).filter(Boolean);
    return {
        id: p.id, name: p.name, price: p.price, img: p.img,
        gallery: [p.img, ...(Array.isArray(p.gallery) ? p.gallery : []).filter(u => u && u !== p.img)], // ảnh chính + ảnh phụ
        specs: details.join(' | '), details,
        variants: cleanVariants(p.variants)
    };
}

function notFound() {
    document.title = 'Không tìm thấy sản phẩm - DIEU TECH';
    root.innerHTML = `<div class="product-missing">
        <h3>Không tìm thấy sản phẩm</h3>
        <p>Sản phẩm không tồn tại hoặc đã bị xóa.</p>
        <a href="index.html#products" class="button">Về trang sản phẩm</a></div>`;
    document.getElementById('comments').style.display = 'none';
}

const signed = n => (n > 0 ? '+' : '−') + fmt(Math.abs(n));

// Khối chọn màu / dung lượng: nhóm màu hiện ô tròn, các nhóm khác hiện nút chữ kèm chênh lệch giá
function variantHtml(p) {
    if (!p.variants.length) return '';
    return '<div class="variant-box">' + p.variants.map((g, gi) => `
        <div class="variant-group">
            <div class="variant-label">${esc(g.name)}: <strong data-sel="${gi}"></strong></div>
            <div class="variant-options">
                ${g.options.map((o, oi) => (g.type === 'color' && o.swatch)
                    ? `<button type="button" class="opt opt-color" data-g="${gi}" data-o="${oi}" title="${esc(o.label)}" aria-label="${esc(o.label)}" style="--sw:${esc(o.swatch)}"><span></span></button>`
                    : `<button type="button" class="opt opt-text" data-g="${gi}" data-o="${oi}">${esc(o.label)}${o.priceDelta ? `<small>${signed(o.priceDelta)}</small>` : ''}</button>`
                ).join('')}
            </div>
        </div>`).join('') + '</div>';
}

// Cập nhật giá, nhãn đã chọn và các thuộc tính data-* mà addToCart() (main.js) đọc khi thêm vào giỏ
function applySelection(p, sel) {
    const card = root.querySelector('.product-card');
    const price = computePrice(p.price, p.variants, sel);
    const key = variantKey(p.variants, sel);
    card.dataset.id = key ? `${p.id}__${key}` : p.id;      // mỗi phiên bản là một dòng riêng trong giỏ
    card.dataset.price = price;
    card.dataset.variant = variantLabel(p.variants, sel);
    root.querySelector('#priceLine').textContent = 'Giá sản phẩm: ' + fmt(price);
    p.variants.forEach((g, gi) => {
        root.querySelector(`[data-sel="${gi}"]`).textContent = sel[g.name];
        root.querySelectorAll(`.opt[data-g="${gi}"]`).forEach((b, oi) => {
            const on = g.options[oi].label === sel[g.name];
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
        });
    });
}

function render(p) {
    document.title = p.name + ' - DIEU TECH';
    const multi = p.gallery.length > 1;
    const slides = p.gallery.map((src, i) =>
        `<div class="carousel-item${i ? '' : ' active'}">
            <img src="${esc(src)}" alt="${esc(p.name)}" class="d-block w-100" onerror="this.style.opacity=0.3">
        </div>`).join('');
    const dots = p.gallery.map((_, i) =>
        `<button type="button" data-bs-target="#demo" data-bs-slide-to="${i}"${i ? '' : ' class="active"'}></button>`).join('');

    root.innerHTML = `
    <div class="product-card"
         data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-price="${esc(p.price)}"
         data-img="${esc(p.img)}" data-specs="${esc(p.specs)}">
        <h3 class="product-name">${esc(p.name)}</h3>
        <div class="product-total">
            <div id="demo" class="carousel slide">
                ${multi ? `<div class="carousel-indicators">${dots}</div>` : ''}
                <div class="product-img"><div class="carousel-inner">${slides}</div></div>
                ${multi ? `
                <button class="carousel-control-prev" type="button" data-bs-target="#demo" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#demo" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>` : ''}
            </div>
            <div class="total">
                <div class="fee">
                    <ul class="product-specs">${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
                </div>
                ${variantHtml(p)}
                <h3 id="priceLine">Giá sản phẩm: ${fmt(p.price)}</h3>
                <button class="buy-button" onclick="addToCart(this)">${ico('cart-add')} Thêm vào giỏ hàng</button>
            </div>
        </div>
    </div>`;

    if (multi && window.bootstrap) new bootstrap.Carousel('#demo', { ride: 'carousel' });

    if (p.variants.length) {
        const sel = defaultSelection(p.variants);
        applySelection(p, sel);
        root.addEventListener('click', e => {
            const b = e.target.closest('.opt');
            if (!b) return;
            const g = p.variants[Number(b.dataset.g)];
            sel[g.name] = g.options[Number(b.dataset.o)].label;
            applySelection(p, sel);
        });
    }
}

(async function init() {
    if (!id) return notFound();
    try {
        const p = await getProduct(id);
        p ? render(p) : notFound();
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
        root.innerHTML = '<div class="product-missing"><h3>Không tải được sản phẩm</h3><p>Vui lòng thử lại sau.</p></div>';
    }
})();