(function () {
    var isLight = localStorage.getItem('theme') === 'light';

    function applyToBody() {
        document.body.classList.toggle('light-theme', isLight);
    }

    if (document.body) {
        applyToBody();
    } else {
        document.addEventListener('DOMContentLoaded', applyToBody);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var checkbox = document.getElementById('checkbox-theme');
        if (!checkbox) return;

        checkbox.checked = isLight;
        checkbox.addEventListener('change', function (e) {
            isLight = e.target.checked;
            document.body.classList.toggle('light-theme', isLight);
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    });

    window.addEventListener('storage', function (e) {
        if (e.key !== 'theme') return;
        isLight = e.newValue === 'light';
        document.body.classList.toggle('light-theme', isLight);
        var checkbox = document.getElementById('checkbox-theme');
        if (checkbox) checkbox.checked = isLight;
    });
})();