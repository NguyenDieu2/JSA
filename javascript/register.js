import { auth, db } from './config.js';
import {
  createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
if (localStorage.getItem("currentUser")) {
  location.href = "index.html";
}

function firebaseErrorMsg(code) {
  switch (code) {
    case "auth/email-already-in-use": return "Email này đã được đăng ký. Vui lòng dùng email khác!";
    case "auth/invalid-email": return "Email không hợp lệ";
    case "auth/weak-password": return "Mật khẩu quá yếu";
    default: return "Đăng ký thất bại. Vui lòng thử lại";
  }
}

let form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector("button[type='submit']");
  let fullname = document.getElementById("fullname").value.trim();
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value;
  let confirmPassword = document.getElementById("confirmPassword").value;
  let terms = document.getElementById("terms").checked;
  let lowerCaseLetter = /[a-z]/g;
  let upperCaseLetter = /[A-Z]/g;
  let numbers = /[0-9]/g;

  if (fullname.length < 2) {
    alert("Họ và tên phải có ít nhất 2 ký tự");
  } else if (!email) {
    alert("Vui lòng nhập email");
  } else if (password.length < 8) {
    alert("Mật khẩu phải có ít nhất 8 ký tự");
  } else if (!password.match(lowerCaseLetter)) {
    alert("Mật khẩu phải chứa chữ cái thường");
  } else if (!password.match(upperCaseLetter)) {
    alert("Mật khẩu phải chứa chữ in hoa");
  } else if (!password.match(numbers)) {
    alert("Mật khẩu phải chứa chữ số");
  } else if (!terms) {
    alert("Vui lòng đồng ý với điều khoản dịch vụ!");
  } else if (password !== confirmPassword) {
    alert("Mật khẩu không khớp");
  } else {
    if (submitBtn) submitBtn.disabled = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await updateProfile(user, { displayName: fullname });

      await setDoc(doc(db, "users", user.uid), {
        email,
        fullname,
        isAdmin: false,
        createdAt: serverTimestamp()
      });

      localStorage.setItem("currentUser", JSON.stringify({
        uid: user.uid,
        email,
        name: fullname,
        isAdmin: false
      }));

      alert("Đăng ký thành công");
      location.href = "index.html";
    } catch (err) {
      alert(firebaseErrorMsg(err.code));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
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