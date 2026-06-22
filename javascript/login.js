(function () {
  const existing = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (existing) {
    location.href = existing.isAdmin ? "admin.html" : "index.html";
  }
})();

const ADMIN_ACCOUNT = {
  email: "admin@gmail.com",
  password: "admin123",
  fullname: "Quản trị viên"
};

let form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let email = document.getElementById("email");
    let password = document.getElementById("password");
    let emailVal = email.value.trim();
    let passwordVal = password.value.trim();

    if (emailVal === ADMIN_ACCOUNT.email && passwordVal === ADMIN_ACCOUNT.password) {
      const adminSession = {
        email: ADMIN_ACCOUNT.email,
        name: ADMIN_ACCOUNT.fullname,
        isAdmin: true
      };
      localStorage.setItem("currentUser", JSON.stringify(adminSession));
      alert("Đăng nhập quản trị thành công!");
      location.href = "admin.html";
      return;
    }

    if (!localStorage.getItem("users")) {
      alert("Không tìm thấy người dùng nào!");
    } else {
      let users = JSON.parse(localStorage.getItem("users"));

      let existingUser = users.find(
        (user) =>
          user.email === emailVal &&
          user.password === passwordVal
      );

      if (existingUser) {
        const loginSession = {
          email: existingUser.email,
          name: existingUser.fullname
        };
        localStorage.setItem("currentUser", JSON.stringify(loginSession));
        alert("Đăng nhập thành công!");
        location.href = "index.html"; 
      } else {
        alert("Email hoặc mật khẩu không chính xác");
      }
    }
  });
}
let showPasswordBtn = document.getElementById('showPassword');
if (showPasswordBtn) {
  showPasswordBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const pw = document.getElementById('password');
      const icon = this.querySelector('img');
      if (pw.type === 'password') {
          pw.type = 'text';
          if (icon) icon.src = './img/eye-show.png';
      } else {
          pw.type = 'password';
          if (icon) icon.src = './img/eye-hide.png';
      }
  });
}