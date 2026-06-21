function loadCart() {
    try {
        const raw = localStorage.getItem('cartItems') || localStorage.getItem('dieutech_cart');
        return JSON.parse(raw) || [];
    } catch { return []; }
}

function clearCart() {
    localStorage.removeItem('cartItems');
    localStorage.removeItem('dieutech_cart');
}

function renderCart() {
    const items = loadCart();
    const list  = document.getElementById('cartList');
    const tots  = document.getElementById('totalsWrap');

    if (!items.length) {
        list.innerHTML = '<div class="empty"><div class="eico">🛒</div><p>Giỏ hàng trống</p></div>';
        tots.style.display = 'none';
        return;
    }

    let total = 0;
    list.innerHTML = items.map(it => {
        const qty = it.qty || 1;
        const pr  = it.price || 0;
        total += pr * qty;
        const img = it.img
            ? `<img src="${it.img}" alt="${it.name}" onerror="this.style.display='none'">`
            : `<span style="font-size:26px">📦</span>`;
        return `
        <div class="cart-row">
            <div class="thumb">${img}<div class="badge">${qty}</div></div>
            <div class="item-info">
                <div class="item-name">${it.name}</div>
                <div class="item-meta">${it.color ? 'Màu: ' + it.color + ' · ' : ''}SL: ${qty}</div>
            </div>
            <div class="item-price">${(pr * qty).toLocaleString('vi-VN')}₫</div>
        </div>`;
    }).join('');

    const f = n => n.toLocaleString('vi-VN') + '₫';
    document.getElementById('v-sub').textContent   = f(total);
    document.getElementById('v-total').textContent = f(total);
    tots.style.display = 'block';
}

let city = 'Hồ Chí Minh';
document.querySelectorAll('[data-city]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        city = el.dataset.city;
        document.getElementById('city-btn').textContent = city;
    });
});

let payment = 'visa';
document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        payment = btn.dataset.method;
    });
});

document.getElementById('inp-date').min = new Date().toISOString().split('T')[0];

function val(id) { return document.getElementById(id).value.trim(); }
function setErr(fId, hasErr) {
    document.getElementById(fId).classList.toggle('has-error', hasErr);
}

function validate() {
    const phone = val('inp-phone').replace(/\s/g, '');
    const ok = {
        ho:    val('inp-ho').length > 0,
        ten:   val('inp-ten').length > 0,
        phone: /^[0-9]{9,11}$/.test(phone),
        addr:  val('inp-addr').length >= 5,
        date:  val('inp-date').length > 0,
    };
    setErr('f-ho',    !ok.ho);
    setErr('f-ten',   !ok.ten);
    setErr('f-phone', !ok.phone);
    setErr('f-addr',  !ok.addr);
    setErr('f-date',  !ok.date);
    if (Object.values(ok).includes(false))
        document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return Object.values(ok).every(Boolean);
}

['inp-ho','inp-ten','inp-phone','inp-addr','inp-date'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const fId = 'f-' + id.replace('inp-', '');
        document.getElementById(fId)?.classList.remove('has-error');
    });
});

document.getElementById('confirmBtn').addEventListener('click', () => {
    if (!validate()) return;
    const items = loadCart();
    if (!items.length) { alert('Giỏ hàng trống!'); return; }

    const id = 'DT-' + Date.now().toString(36).toUpperCase().slice(-6);
    const order = {
        id, date: new Date().toISOString(),
        ho: val('inp-ho'), ten: val('inp-ten'),
        phone: val('inp-phone'), city, addr: val('inp-addr'),
        ngayGiao: document.getElementById('inp-date').value,
        payment, items,
        total: items.reduce((s, it) => s + (it.price||0) * (it.qty||1), 0),
    };

    const hist = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    hist.unshift(order);
    localStorage.setItem('orderHistory', JSON.stringify(hist));
    localStorage.setItem('lastOrder', JSON.stringify(order));

    document.getElementById('orderId').textContent = id;
    const m = document.getElementById('modal');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('show'), 10);
});

function continueShopping() {
    const m = document.getElementById('modal');
    m.classList.remove('show');
    setTimeout(() => m.style.display = 'none', 300);
    clearCart();
    renderCart();
}

function goHome() {
    clearCart();
    window.location.href = 'index.html';
}
renderCart();