// Biến thể sản phẩm (màu sắc, dung lượng...). Dùng chung cho trang chi tiết, trang chủ và trang quản trị.
//
// Cấu trúc dữ liệu:
//   variants: [
//     { name: 'Màu sắc',   type: 'color', options: [ { label: 'Đen', swatch: '#1f1f1f', priceDelta: 0 }, ... ] },
//     { name: 'Dung lượng',               options: [ { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 5000000 } ] }
//   ]
// Giá bán = giá gốc của sản phẩm + tổng priceDelta của các tùy chọn đã chọn. Tùy chọn đầu tiên của mỗi nhóm
// (hoặc tùy chọn có default: true) là mặc định.

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const DELTA = /^[+-]\d+$/;

export function slug(text) {
    return String(text).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Làm sạch dữ liệu đọc từ Firestore (đề phòng thiếu trường / sai kiểu)
export function cleanVariants(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(g => {
        if (!g || typeof g.name !== 'string' || !Array.isArray(g.options)) return null;
        const options = g.options
            .filter(o => o && typeof o.label === 'string' && o.label.trim())
            .map(o => ({
                label: o.label.trim(),
                priceDelta: Number.isFinite(Number(o.priceDelta)) ? Number(o.priceDelta) : 0,
                ...(typeof o.swatch === 'string' && HEX.test(o.swatch) ? { swatch: o.swatch } : {}),
                ...(o.default ? { default: true } : {})
            }));
        if (!options.length) return null;
        return { name: g.name.trim(), ...(g.type === 'color' ? { type: 'color' } : {}), options };
    }).filter(Boolean);
}

// "Màu sắc: Đen #1f1f1f, Bạc #d9d9db" + "Dung lượng: 256GB, 512GB +3000000"  ->  { variants } hoặc { error }
export function parseVariants(text) {
    const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
    const variants = [];
    const groupNames = new Set();
    for (const line of lines) {
        const i = line.indexOf(':');
        if (i < 1) return { error: `Dòng "${line}" thiếu dấu ":". Định dạng: Tên nhóm: tùy chọn 1, tùy chọn 2` };
        const name = line.slice(0, i).trim();
        if (groupNames.has(name.toLowerCase())) return { error: `Nhóm "${name}" bị trùng` };
        groupNames.add(name.toLowerCase());

        const options = [];
        const labels = new Set();
        for (const raw of line.slice(i + 1).split(',')) {
            const tokens = raw.trim().split(/\s+/).filter(Boolean);
            if (!tokens.length) continue;
            let priceDelta = 0, swatch = '';
            for (let k = 0; k < 2; k++) {              // mã màu và chênh lệch giá có thể đứng theo thứ tự bất kỳ ở cuối
                const last = tokens[tokens.length - 1];
                if (tokens.length > 1 && DELTA.test(last)) { priceDelta = parseInt(last, 10); tokens.pop(); }
                else if (tokens.length > 1 && HEX.test(last)) { swatch = last; tokens.pop(); }
            }
            const label = tokens.join(' ');
            if (labels.has(label.toLowerCase())) return { error: `Tùy chọn "${label}" trong nhóm "${name}" bị trùng` };
            labels.add(label.toLowerCase());
            options.push({ label, priceDelta, ...(swatch ? { swatch } : {}) });
        }
        if (!options.length) return { error: `Nhóm "${name}" chưa có tùy chọn nào` };
        variants.push({ name, ...(options.some(o => o.swatch) ? { type: 'color' } : {}), options });
    }
    return { variants };
}

// Ngược lại với parseVariants: để đổ lại vào ô nhập khi sửa sản phẩm
export function variantsToText(variants) {
    return cleanVariants(variants).map(g =>
        `${g.name}: ` + g.options.map(o => [
            o.label,
            o.swatch || '',
            o.priceDelta ? (o.priceDelta > 0 ? '+' : '') + o.priceDelta : ''
        ].filter(Boolean).join(' ')).join(', ')
    ).join('\n');
}

export function defaultSelection(variants) {
    const sel = {};
    variants.forEach(g => {
        const o = g.options.find(x => x.default) || g.options[0];
        sel[g.name] = o.label;
    });
    return sel;
}

function chosen(variants, sel) {
    return variants.map(g => g.options.find(o => o.label === sel[g.name]) || g.options[0]);
}
export function computePrice(base, variants, sel) {
    return (Number(base) || 0) + chosen(variants, sel).reduce((s, o) => s + (o.priceDelta || 0), 0);
}
export function variantLabel(variants, sel) {
    return chosen(variants, sel).map(o => o.label).join(' · ');
}
// Khóa riêng cho mỗi phiên bản (dùng làm một phần id dòng giỏ hàng). Mỗi nhóm đóng góp slug của tùy chọn đã chọn;
// nếu slug rỗng (nhãn toàn ký tự lạ) hoặc trùng với tùy chọn khác trong nhóm (VD "Đen" và "Den") thì thêm số thứ tự.
export function variantKey(variants, sel) {
    return variants.map(g => {
        const o = g.options.find(x => x.label === sel[g.name]) || g.options[0];
        const idx = g.options.indexOf(o);
        const s = slug(o.label);
        const clash = !s || g.options.some((x, i) => i !== idx && slug(x.label) === s);
        return clash ? `${s || 'o'}-${idx}` : s;
    }).join('_');
}
// Giá thấp nhất / cao nhất trên toàn bộ các tổ hợp (để hiện "Từ ..." ở trang chủ)
export function priceRange(base, variants) {
    let min = Number(base) || 0, max = min;
    variants.forEach(g => {
        const d = g.options.map(o => o.priceDelta || 0);
        min += Math.min(...d);
        max += Math.max(...d);
    });
    return { min, max };
}