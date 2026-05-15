import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const statusText = document.getElementById("status");

function usernameKeEmail(username) {
  if (username === "admin") {
    return "asistenlapangantambakrejo@gmail.com";
  }

  return username;
}

btnLogin.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    statusText.innerText = "Username dan password wajib diisi.";
    return;
  }

  const email = usernameKeEmail(username);

  try {
    await signInWithEmailAndPassword(auth, email, password);

    statusText.innerText = "Login berhasil ✅";

    window.location.href = "admin.html";

  } catch (error) {
    console.error(error);
    statusText.innerText = "Username atau password salah ❌";
  }
});