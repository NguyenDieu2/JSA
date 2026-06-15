const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        location.href = "login.html";
    });
}
document.addEventListener('DOMContentLoaded', function () {

    var CART_KEY = 'dieutech_cart';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }


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
    var themeToggleBtn = document.getElementById('theme-toggle');
    var currentTheme = localStorage.getItem('theme');
    var themeIcon = document.getElementById('themeImg');
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggleBtn) themeImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3hJ7MXd2HfwcZjO_dJ4On7fjHdV7X-iLC91uX66evaw&s';
    } else {
        document.body.classList.remove('light-theme');
        if (themeToggleBtn) themeImg.src = 'https://img.pikbest.com/element_our/20230503/bg/ad46e5739aa71.png!w700wp'; 
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            document.body.classList.toggle('light-theme');

            if (document.body.classList.contains('light-theme')) {
                localStorage.setItem('theme', 'light');
                themeImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3hJ7MXd2HfwcZjO_dJ4On7fjHdV7X-iLC91uX66evaw&s';
            } else {
                localStorage.setItem('theme', 'dark');
                tthemeImg.src = 'https://img.pikbest.com/element_our/20230503/bg/ad46e5739aa71.png!w700wp';
            }
        });
    }
    updateBadge();
});