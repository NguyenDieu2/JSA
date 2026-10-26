import { fetchProducts } from './products.js';
import { CATEGORIES, PRICE_PRESETS } from './catalog.js';
import { PRODUCTS } from './product-data.js';
import { cleanVariants, priceRange } from './variants.js';
import { getCurrentUser, requireLogin, logout } from './auth.js';
import { refreshOrderBadge } from './order-notify.js';
import { ico } from './icons.js';

document.addEventListener('DOMContentLoaded', function () {
    var CART_KEY = 'dieutech_cart';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    async function renderAdminProducts() {
        var grid = document.querySelector('.product-grid');
        if (!grid) return;

        var products = [];
        try {
            products = await fetchProducts();
        } catch (e) {
            console.error('Lỗi tải sản phẩm từ Firebase:', e);
        }

        products.forEach(function (p) {
            var specsList = Array.isArray(p.descLines) && p.descLines.length
                ? p.descLines
                : String(p.specs || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);

            var li = specsList.map(function (line) {
                return '<li>' + esc(line) + '</li>';
            }).join('');

            var card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-id', p.id);
            card.setAttribute('data-category', p.category || 'other');
            card.setAttribute('data-name', p.name);
            card.setAttribute('data-price', p.price);
            card.setAttribute('data-img', p.img);
            card.setAttribute('data-specs', specsList.join(' | '));

            card.innerHTML =
                '<span class="product-icon"><a href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '"></a></span>' +
                '<h3>' + esc(p.name) + '</h3>' +
                '<div class="product-specs"><ul>' + li + '</ul></div>' +
                '<span class="product-price">' + Number(p.price).toLocaleString('vi-VN') + 'đ</span>' +
                '<button class="buy-button" onclick="addToCart(this)">' + ico('cart-add') + ' Thêm vào giỏ hàng</button>';

            var variants = cleanVariants(p.variants);
            if (variants.length) markVariantCard(card, p.price, variants);

            grid.appendChild(card);
        });

        // Sản phẩm admin vừa thêm vào DOM: cập nhật chip danh mục và áp lại bộ lọc
        refreshCategoryChips();
        filterProducts();
    }

    // Sản phẩm có biến thể (màu/dung lượng): khách phải chọn ở trang chi tiết trước khi mua
    function markVariantCard(card, base, variants) {
        card.setAttribute('data-has-variants', '1');
        var range = priceRange(base, variants);
        card.setAttribute('data-price', range.min);   // dùng giá thấp nhất cho bộ lọc giá
        var btn = card.querySelector('.buy-button');
        if (btn) btn.innerHTML = 'Chọn phiên bản ' + ico('arrow-right');
        var price = card.querySelector('.product-price');
        if (price) price.textContent = (range.min !== range.max ? 'Từ ' : '') + Number(range.min).toLocaleString('vi-VN') + 'đ';
    }
    document.querySelectorAll('.product-grid .product-card').forEach(function (card) {
        var p = PRODUCTS[card.getAttribute('data-id')];
        if (p && p.variants && p.variants.length) markVariantCard(card, p.price, p.variants);
    });

    renderAdminProducts();


    function updateBadge() {
        var badge = document.getElementById('cartBadge');
        if (!badge) return;
        var total = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
        badge.textContent   = total > 99 ? '99+' : String(total);
        badge.style.display = total > 0 ? 'flex' : 'none';
    }

    var toastTimer = null;
    function showToast(name) {
        var toast     = document.getElementById('toast');
        var toastName = document.getElementById('toastName');
        if (!toast || !toastName) return;
        toastName.textContent = name;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3000);
    }

    // Chưa đăng nhập chỉ được xem sản phẩm; bấm mua hàng thì yêu cầu đăng nhập/đăng ký
    window.addToCart = function (btn) {
        var card = btn.closest('.product-card');
        if (!card) return;

        // Có màu/dung lượng để chọn -> sang trang chi tiết, không thêm thẳng vào giỏ
        if (card.getAttribute('data-has-variants') === '1') {
            window.location.href = 'product.html?id=' + encodeURIComponent(card.getAttribute('data-id'));
            return;
        }

        if (!requireLogin('Bạn cần đăng nhập hoặc đăng ký để mua hàng. Chuyển đến trang đăng nhập ngay bây giờ?')) return;

        var id    = card.getAttribute('data-id')    || '';
        var name  = card.getAttribute('data-name')  || '';
        var price = parseInt(card.getAttribute('data-price')) || 0;
        var img   = card.getAttribute('data-img')   || '';
        var specs = card.getAttribute('data-specs') || '';
        var variant = card.getAttribute('data-variant') || '';

        var cart     = getCart();
        var existing = null;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id && (cart[i].variant || '') === variant) { existing = cart[i]; break; }
        }
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ id: id, name: name, price: price, img: img, specs: specs, variant: variant, qty: 1 });
        }
        saveCart(cart);

        btn.innerHTML = ico('check') + ' Đã thêm';
        btn.classList.add('added');
        btn.disabled = true;
        setTimeout(function () {
            btn.innerHTML = ico('cart-add') + ' Thêm vào giỏ hàng';
            btn.classList.remove('added');
            btn.disabled = false;
        }, 1800);

        updateBadge();
        showToast(name);
    };
    var themeCheckbox = document.getElementById('checkbox-theme');
    var currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeCheckbox) {
            themeCheckbox.checked = true; 
        }
    } else {
        document.body.classList.remove('light-theme');
        if (themeCheckbox) {
            themeCheckbox.checked = false; 
        }
    }
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', function (e) {
            if (e.target.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const noProductsMessage = document.getElementById("noProductsMessage");
    const categoryChips = document.getElementById("categoryChips");
    const priceChips = document.getElementById("priceChips");
    const priceMin = document.getElementById("priceMin");
    const priceMax = document.getElementById("priceMax");
    const filterCount = document.getElementById("filterCount");
    const filterReset = document.getElementById("filterReset");
    let activeCategory = 'all';

    function chipHtml(attr, value, label, active) {
        return '<button type="button" class="chip' + (active ? ' active' : '') + '" ' + attr + '="' + value + '">' + label + '</button>';
    }

    // Chip danh mục: kèm số lượng sản phẩm, ẩn danh mục chưa có sản phẩm nào
    function refreshCategoryChips() {
        if (!categoryChips) return;
        var cards = document.querySelectorAll('.product-card');
        var counts = {};
        cards.forEach(function (c) {
            var k = c.getAttribute('data-category') || 'other';
            counts[k] = (counts[k] || 0) + 1;
        });
        var html = chipHtml('data-cat', 'all', 'Tất cả (' + cards.length + ')', activeCategory === 'all');
        CATEGORIES.forEach(function (c) {
            if (counts[c.id]) html += chipHtml('data-cat', c.id, c.label + ' (' + counts[c.id] + ')', activeCategory === c.id);
        });
        categoryChips.innerHTML = html;
    }

    function markPriceChips() {
        if (!priceChips) return;
        var mn = priceMin.value === '' ? 0 : parseFloat(priceMin.value);
        var mx = priceMax.value === '' ? null : parseFloat(priceMax.value);
        priceChips.querySelectorAll('.chip').forEach(function (chip) {
            var p = PRICE_PRESETS[Number(chip.getAttribute('data-preset'))];
            chip.classList.toggle('active', p.min === mn && p.max === mx);
        });
    }

    function filterProducts() {
        const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const minV = priceMin ? parseFloat(priceMin.value) : NaN;
        const maxV = priceMax ? parseFloat(priceMax.value) : NaN;
        const min = isNaN(minV) ? 0 : minV * 1e6;
        const max = isNaN(maxV) ? Infinity : maxV * 1e6;
        const productCards = document.querySelectorAll(".product-card");
        let shown = 0;

        productCards.forEach(card => {
            const productName = (card.getAttribute("data-name") || '').toLowerCase();
            const productSpecs = (card.getAttribute("data-specs") || '').toLowerCase();
            const price = Number(card.getAttribute("data-price")) || 0;
            const category = card.getAttribute("data-category") || 'other';

            const ok = (productName.includes(keyword) || productSpecs.includes(keyword))
                && (activeCategory === 'all' || category === activeCategory)
                && price >= min && price <= max;

            card.style.display = ok ? "" : "none";
            if (ok) shown++;
        });

        if (noProductsMessage) noProductsMessage.style.display = shown ? "none" : "block";
        if (filterCount) filterCount.textContent = 'Hiển thị ' + shown + '/' + productCards.length + ' sản phẩm';
        markPriceChips();
    }

    if (categoryChips) {
        categoryChips.addEventListener('click', function (e) {
            var chip = e.target.closest('.chip');
            if (!chip) return;
            activeCategory = chip.getAttribute('data-cat');
            categoryChips.querySelectorAll('.chip').forEach(function (c) {
                c.classList.toggle('active', c === chip);
            });
            filterProducts();
        });
    }
    if (priceChips) {
        priceChips.innerHTML = PRICE_PRESETS.map(function (p, i) {
            return chipHtml('data-preset', i, p.label, false);
        }).join('');
        priceChips.addEventListener('click', function (e) {
            var chip = e.target.closest('.chip');
            if (!chip) return;
            var p = PRICE_PRESETS[Number(chip.getAttribute('data-preset'))];
            var same = priceMin.value !== '' ? parseFloat(priceMin.value) === p.min : p.min === 0;
            var sameMax = priceMax.value === '' ? p.max === null : parseFloat(priceMax.value) === p.max;
            if (same && sameMax) { priceMin.value = ''; priceMax.value = ''; }   // bấm lại để bỏ chọn
            else { priceMin.value = p.min; priceMax.value = p.max === null ? '' : p.max; }
            filterProducts();
        });
    }
    if (priceMin) priceMin.addEventListener('input', filterProducts);
    if (priceMax) priceMax.addEventListener('input', filterProducts);
    if (filterReset) {
        filterReset.addEventListener('click', function () {
            activeCategory = 'all';
            if (searchInput) searchInput.value = '';
            if (priceMin) priceMin.value = '';
            if (priceMax) priceMax.value = '';
            refreshCategoryChips();
            filterProducts();
        });
    }
    refreshCategoryChips();
    if (document.getElementById('filterBar')) filterProducts();

    if (searchInput) searchInput.addEventListener("input", filterProducts);
    if (searchBtn) {
        searchBtn.closest("form").addEventListener("submit", (e) => {
            e.preventDefault(); 
            filterProducts();
        });
    }
    const guestLinks = document.querySelectorAll(".guest-link");
    const userProfile = document.getElementById("user-profile");
    const userNameDisplay = document.getElementById("userNameDisplay");
    const logoutBtn = document.getElementById("logout");

    function checkLoginStatus() {
        const currentUser = getCurrentUser();
        const userName = currentUser && (currentUser.name || currentUser.fullname);
        const adminLink = document.getElementById("admin-link");

        if (userName) {
            guestLinks.forEach(link => link.style.display = "none"); 
            userProfile.style.display = "block"; 
            userNameDisplay.textContent = `Xin chào, ${userName}`; 
        } else {
            guestLinks.forEach(link => link.style.display = "block");
            userProfile.style.display = "none";
        }
        if (adminLink) {
            adminLink.style.display = (currentUser && currentUser.isAdmin) ? "block" : "none";
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logout('reload');
        });
    }

    checkLoginStatus();
    updateBadge();
    refreshOrderBadge(getCurrentUser());   // chấm báo số đơn có cập nhật mới trên menu "Đơn hàng"
});