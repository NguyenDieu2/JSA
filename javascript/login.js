if (localStorage.getItem("currentUser")) {
  location.href = "main.html"; 
}

let form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!localStorage.getItem("users")) {
      alert("Không tìm thấy người dùng nào!");
    } else {
      let users = JSON.parse(localStorage.getItem("users"));

      let email = document.getElementById("email");
      let password = document.getElementById("password");

      let existingUser = users.find(
        (user) =>
          user.email === email.value.trim() &&
          user.password === password.value.trim()
      );

      if (existingUser) {
        localStorage.setItem("currentUser", JSON.stringify(existingUser));
        alert("Đăng nhập thành công!");
        location.href = "main.html"; 
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
      if (pw.type === 'password') {
          pw.type = 'text';
          this.textContent = '🙈';
      } else {
          pw.type = 'password';
          this.textContent = '👁';
      }
  });
}