import { auth, db } from './config.js';
import {
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

(function () {
  const existing = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (existing) {
    location.href = existing.isAdmin ? "admin.html" : "index.html";
  }
})();

function firebaseErrorMsg(code) {
  switch (code) {
    case "auth/popup-blocked": return "Trình duyệt đang chặn popup. Hãy cho phép popup rồi thử lại";
    case "auth/unauthorized-domain": return "Tên miền chưa được cấp phép trong Firebase Authentication";
    case "auth/network-request-failed": return "Lỗi kết nối mạng. Vui lòng thử lại";
    case "auth/account-exists-with-different-credential": return "Email này đã đăng ký bằng phương thức khác";
    case "auth/invalid-email": return "Email không hợp lệ";
    case "auth/missing-email": return "Vui lòng nhập email";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password": return "Email hoặc mật khẩu không chính xác";
    case "auth/too-many-requests": return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau";
    default: return "Đăng nhập thất bại. Vui lòng thử lại";
  }
}

async function saveSession(user) {
  const userRef = doc(db, "users", user.uid);
  let snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      fullname: user.displayName || user.email,
      isAdmin: false,
      createdAt: serverTimestamp()
    });
    snap = await getDoc(userRef);
  }
  const data = snap.data();
  const session = {
    uid: user.uid,
    email: user.email,
    name: data.fullname || user.displayName || user.email,
    isAdmin: data.isAdmin === true
  };
  localStorage.setItem("currentUser", JSON.stringify(session));
  return session;
}

let form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const emailVal = email.value.trim();
    const passwordVal = password.value;   // không trim: mật khẩu có thể chứa khoảng trắng (đăng ký không trim)

    if (submitBtn) submitBtn.disabled = true;

    try {
      const cred = await signInWithEmailAndPassword(auth, emailVal, passwordVal);
      const session = await saveSession(cred.user);
      alert(session.isAdmin ? "Đăng nhập quản trị thành công!" : "Đăng nhập thành công!");
      location.href = session.isAdmin ? "admin.html" : "index.html";
    } catch (err) {
      alert(firebaseErrorMsg(err.code));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

const provider = new GoogleAuthProvider();
let googleBtn = document.getElementById("googleLogin");
if (googleBtn) {
  googleBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (googleBtn.dataset.busy) return;
    googleBtn.dataset.busy = '1';
    try {
      const result = await signInWithPopup(auth, provider);
      const session = await saveSession(result.user);
      alert("Xin chào " + session.name);
      location.href = session.isAdmin ? "admin.html" : "index.html";
    } catch (err) {
      // người dùng tự đóng popup thì không cần báo lỗi
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      console.error(err);
      alert(firebaseErrorMsg(err.code));
    } finally {
      delete googleBtn.dataset.busy;
    }
  });
}
let showPasswordBtn = document.getElementById('showPassword');
if (showPasswordBtn) {
  showPasswordBtn.addEventListener('click', function (e) {
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

// Quên mật khẩu: gửi thư đặt lại mật khẩu tới email đang nhập ở ô Email
auth.languageCode = 'vi'; // thư đặt lại mật khẩu bằng tiếng Việt
const forgotLink = document.querySelector('.forgot-password');
if (forgotLink) {
  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (forgotLink.dataset.busy) return;

    const emailInput = document.getElementById('email');
    const emailVal = emailInput ? emailInput.value.trim() : '';
    if (!emailVal) {
      alert('Vui lòng nhập email của bạn vào ô Email, sau đó bấm "Quên mật khẩu?" lại.');
      if (emailInput) emailInput.focus();
      return;
    }
    if (!confirm('Gửi thư đặt lại mật khẩu tới ' + emailVal + '?')) return;

    forgotLink.dataset.busy = '1';
    try {
      await sendPasswordResetEmail(auth, emailVal);
      // Thông báo trung tính, không tiết lộ email có tồn tại hay không
      alert('Nếu email này đã đăng ký, bạn sẽ nhận được thư đặt lại mật khẩu trong ít phút. Hãy kiểm tra cả mục Spam.');
    } catch (err) {
      console.error(err);
      // user-not-found vẫn trả thông báo trung tính như trên
      if (err.code === 'auth/user-not-found') {
        alert('Nếu email này đã đăng ký, bạn sẽ nhận được thư đặt lại mật khẩu trong ít phút. Hãy kiểm tra cả mục Spam.');
      } else {
        alert(firebaseErrorMsg(err.code));
      }
    } finally {
      delete forgotLink.dataset.busy;
    }
  });
}