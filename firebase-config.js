import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {

  apiKey: "AIzaSyBIT9dCLqUS2WJOO31fB-akefV3YcHUPzQ",

  authDomain: "absensi-sppg-7b34f.firebaseapp.com",

  projectId: "absensi-sppg-7b34f",

  storageBucket: "absensi-sppg-7b34f.firebasestorage.app",

  messagingSenderId: "450543267439",

  appId: "1:450543267439:web:3a391827dea2a50e0c279a"

};

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);

const auth =
  getAuth(app);

export {
  db,
  auth
};