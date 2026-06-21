if (localStorage.getItem("currentUser")) {
  location.href = "index.html";
}
let form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  let fullname = document.getElementById("fullname").value.trim();
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value;
  let confirmPassword = document.getElementById("confirmPassword").value;
  let terms = document.getElementById("terms").checked;
  let existingUsers = localStorage.getItem("users")
    ? JSON.parse(localStorage.getItem("users"))
    : [];
  let emailExists = existingUsers.find(u => u.email === email);
  let lowerCaseLetter = /[a-z]/g;
  let upperCaseLetter = /[A-Z]/g;
  let numbers = /[0-9]/g;

  if (fullname.length < 6) {
    alert("Tên tài khoản phải hơn 6 chữ cái");
  } else if (!email) {
    alert("Vui lòng nhập email");
  } else if (password.length < 8) {
    alert("Mật khẩu phải ít nhất 8 chữ số");
  } else if (!password.match(lowerCaseLetter)) {
    alert("Mật khẩu phải chứa chữ cái thường");
  } else if (!password.match(upperCaseLetter)) {
    alert("Mật khẩu phải chứa chữ in hoa");
  } else if (!password.match(numbers)) {
    alert("Mật khẩu phải chứa chữ số hoặc ký tự đặc biệt");
  } else if (!terms) {
    alert("Vui lòng đồng ý với điều khoản dịch vụ!");
  } else if(password !== confirmPassword) {
    alert("Mật khẩu không khớp");
  } else if (emailExists) {
    alert("Email này đã được đăng ký. Vui lòng dùng email khác!");
  } else {
    existingUsers.push({
        email,
        password,
        fullname,
      });

    localStorage.setItem("users", JSON.stringify(existingUsers));
    localStorage.setItem("currentUser", JSON.stringify({ email, name: fullname }));
    alert("Đăng ký thành công");
    location.href = "index.html";
  }
});
document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const input = document.getElementById(targetId);
          const icon = btn.querySelector('img');
          input.type = input.type === 'password' ? 'text' : 'password';
           if (icon) {
          icon.src = input.type === 'password' ? './img/eye-hide.png' : './img/eye-show.png';
          }
      });
  });
  const pwdInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');
  pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      let strength = 0;
      if (val.length >= 8) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;
      const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
      const widths = ['0%', '25%', '50%', '75%', '100%'];
      strengthBar.style.width = widths[strength];
      strengthBar.style.background = colors[strength];
});