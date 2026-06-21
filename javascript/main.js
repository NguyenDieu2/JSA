document.addEventListener('DOMContentLoaded', function () {
    var CART_KEY = 'dieutech_cart';
    var ADMIN_PRODUCTS_KEY = 'dieutech_admin_products';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    // Render các sản phẩm do admin thêm (lưu trong localStorage) thành
    // .product-card giống hệt cấu trúc sản phẩm có sẵn, chèn vào cuối lưới.
    function renderAdminProducts() {
        var grid = document.querySelector('.product-grid');
        if (!grid) return;

        var adminProducts = [];
        try { adminProducts = JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_KEY)) || []; }
        catch (e) { adminProducts = []; }

        adminProducts.forEach(function (p) {
            var specsList = Array.isArray(p.descLines) && p.descLines.length
                ? p.descLines
                : String(p.specs || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);

            var li = specsList.map(function (line) {
                return '<li>' + line + '</li>';
            }).join('');

            var card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-id', p.id);
            card.setAttribute('data-name', p.name);
            card.setAttribute('data-price', p.price);
            card.setAttribute('data-img', p.img);
            card.setAttribute('data-specs', specsList.join(' | '));

            card.innerHTML =
                '<span class="product-icon"><img src="' + p.img + '" alt="' + p.name + '"></span>' +
                '<h3>' + p.name + '</h3>' +
                '<div class="product-specs"><ul>' + li + '</ul></div>' +
                '<span class="product-price">' + Number(p.price).toLocaleString('vi-VN') + 'đ</span>' +
                '<button class="buy-button" onclick="addToCart(this)">🛒 Thêm vào giỏ hàng</button>';

            grid.appendChild(card);
        });
    }

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

    window.addToCart = function (btn) {
        var card = btn.closest('.product-card');
        if (!card) return;

        var id    = card.getAttribute('data-id')    || '';
        var name  = card.getAttribute('data-name')  || '';
        var price = parseInt(card.getAttribute('data-price')) || 0;
        var img   = card.getAttribute('data-img')   || '';
        var specs = card.getAttribute('data-specs') || '';

        var cart     = getCart();
        var existing = null;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id) { existing = cart[i]; break; }
        }
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ id: id, name: name, price: price, img: img, specs: specs, qty: 1 });
        }
        saveCart(cart);

        btn.textContent = '✓ Đã thêm';
        btn.classList.add('added');
        btn.disabled = true;
        setTimeout(function () {
            btn.textContent = '🛒 Thêm vào giỏ hàng';
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
    const productCards = document.querySelectorAll(".product-card");
    const noProductsMessage = document.getElementById("noProductsMessage");

    function filterProducts() {
        const keyword = searchInput.value.toLowerCase().trim();
        let hasMatches = false;

        productCards.forEach(card => {
            const productName = card.getAttribute("data-name").toLowerCase();
            const productSpecs = card.getAttribute("data-specs").toLowerCase();

            if (productName.includes(keyword) || productSpecs.includes(keyword)) {
                card.style.display = ""; 
                hasMatches = true;
            } else {
                card.style.display = "none"; 
            }
        });

        if (hasMatches) {
            noProductsMessage.style.display = "none";
        } else {
            noProductsMessage.style.display = "block";
        }
    }
    searchInput.addEventListener("input", filterProducts);
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
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
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
            const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất tài khoản không?");
            if (confirmLogout) {
                localStorage.removeItem("currentUser");
                window.location.reload();
            }
        });
    }

    checkLoginStatus();
    updateBadge();
});