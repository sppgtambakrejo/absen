import { db, auth } from "./firebase-config.js";

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const relawanSelect = document.getElementById("relawan");
const pinInput = document.getElementById("pin");
const statusText = document.getElementById("status");
const btnMasuk = document.getElementById("btnMasuk");
const btnPulang = document.getElementById("btnPulang");
const btnAmbilFoto = document.getElementById("btnAmbilFoto");
const divisiSelect = document.getElementById("divisi");
const hariSelect = document.getElementById("hari");
const kameraBox = document.getElementById("kameraBox");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbyjinFBRETY1Leixxrc2wAkgAbeZaWjmzTYixXXI9sEb1-eiZRXTefbHVZh31Ccl9rrWw/exec";

const LOKASI_DAPUR = {
  lat: -7.689355,
  lng: 110.299039
};

const RADIUS_METER = 100;
const GPS_SAMPLE_COUNT = 3;
const GPS_MAX_ACCURACY_METER = 120;
const GPS_MAX_AGE_MS = 120000;
const GPS_MAX_SAMPLE_DISTANCE_METER = 180;
const GPS_MAX_SPEED_METER_PER_SECOND = 35;
const GPS_SAMPLE_DELAY_MS = 1800;
const GPS_TIMEOUT_MS = 25000;

const DIVISI_LIST = [
  "Asisten Lapangan",
  "ADM. Gudang",
  "Persiapan",
  "Pengolahan",
  "Pemorsian",
  "Distribusi",
  "Pencucian",
  "Kebersihan",
  "Security",
  "Content Creator",
  "Sanitarian"
];

const NAMA_HARI = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

let dataRelawan = [];
let userSiap = false;
let streamKamera = null;

function isiDivisi() {
  divisiSelect.innerHTML = `<option value="">Pilih Divisi</option>`;

  DIVISI_LIST.forEach((divisi) => {
    divisiSelect.innerHTML += `
      <option value="${divisi}">
        ${divisi}
      </option>
    `;
  });
}

function isiHari() {
  hariSelect.innerHTML = `<option value="">Pilih Hari</option>`;

  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const tanggal = new Date();
    tanggal.setDate(now.getDate() + i);

    const namaHari = NAMA_HARI[tanggal.getDay() - 1];

    if (!namaHari) continue;

    const hari = String(tanggal.getDate()).padStart(2, "0");
    const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
    const tahun = tanggal.getFullYear();

    const formatTanggal = `${hari}/${bulan}/${tahun}`;

    hariSelect.innerHTML += `
      <option value="${namaHari}, ${formatTanggal}">
        ${namaHari}, ${formatTanggal}
      </option>
    `;
  }
}

function tanggalHariIni() {
  const now = new Date();

  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, "0");
  const tanggal = String(now.getDate()).padStart(2, "0");

  return `${tahun}-${bulan}-${tanggal}`;
}

function getarGagal() {
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

async function loginAnonim() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error(error);
    statusText.innerText = "Login sistem gagal ❌";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userSiap = true;
    await loadRelawan();
    statusText.innerText = "Sistem siap ✅";
  }
});

async function loadRelawan() {
  const q = query(
    collection(db, "relawan"),
    where("status", "==", "aktif")
  );

  const snapshot = await getDocs(q);

  dataRelawan = [];

  snapshot.forEach((dokumen) => {
    dataRelawan.push({
      id: dokumen.id,
      ...dokumen.data()
    });
  });

  tampilkanRelawan();
}

function tampilkanRelawan() {
  const divisiDipilih = divisiSelect.value;

  relawanSelect.innerHTML = `<option value="">Pilih Nama Relawan</option>`;

  dataRelawan
    .filter((relawan) => {
      if (!divisiDipilih) return true;
      return relawan.divisi === divisiDipilih;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .forEach((relawan) => {
      relawanSelect.innerHTML += `
        <option value="${relawan.id}">
          ${relawan.nama}
        </option>
      `;
    });
}

divisiSelect.addEventListener("change", tampilkanRelawan);

async function cekAbsensiHariIni(relawanId, tipe, hari) {
  const q = query(
    collection(db, "absensi"),
    where("relawanId", "==", relawanId),
    where("hari", "==", hari),
    where("tipe", "==", tipe)
  );

  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

async function cekBelumPulang(relawanId, hariDipilih) {
  const qMasuk = query(
    collection(db, "absensi"),
    where("relawanId", "==", relawanId),
    where("tipe", "==", "masuk")
  );

  const snapshotMasuk = await getDocs(qMasuk);

  for (const docMasuk of snapshotMasuk.docs) {
    const dataMasuk = docMasuk.data();
    const hariMasuk = dataMasuk.hari;

    if (hariMasuk === hariDipilih) continue;

    const qPulang = query(
      collection(db, "absensi"),
      where("relawanId", "==", relawanId),
      where("hari", "==", hariMasuk),
      where("tipe", "==", "pulang")
    );

    const snapshotPulang = await getDocs(qPulang);

    if (snapshotPulang.empty) {
      return hariMasuk;
    }
  }

  return null;
}

async function bukaKamera() {
  try {
    streamKamera = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    video.srcObject = streamKamera;
    kameraBox.style.display = "block";

    statusText.innerText = "Kamera aktif, silakan ambil foto.";
  } catch (error) {
    console.error(error);
    statusText.innerText = "Kamera tidak diizinkan.";
    getarGagal();
  }
}

function tutupKamera() {
  if (streamKamera) {
    streamKamera.getTracks().forEach((track) => {
      track.stop();
    });
  }

  kameraBox.style.display = "none";
}

async function getLokasiUser() {
  const samples = [];

  for (let i = 0; i < GPS_SAMPLE_COUNT; i++) {
    statusText.innerText = `Mengecek GPS (${i + 1}/${GPS_SAMPLE_COUNT})...`;

    const lokasi = await ambilSampelGps();
    samples.push(lokasi);

    if (i < GPS_SAMPLE_COUNT - 1) {
      await delay(GPS_SAMPLE_DELAY_MS);
    }
  }

  return validasiGps(samples);
}

function ambilSampelGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS tidak didukung browser ini."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;

        resolve({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
          timestamp: position.timestamp,
          mocked: Boolean(coords.mocked || coords.isMock || position.mocked)
        });
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;

            resolve({
              lat: coords.latitude,
              lng: coords.longitude,
              accuracy: coords.accuracy,
              altitudeAccuracy: coords.altitudeAccuracy,
              heading: coords.heading,
              speed: coords.speed,
              timestamp: position.timestamp,
              mocked: Boolean(coords.mocked || coords.isMock || position.mocked)
            });
          },
          () => {
            reject(new Error("GPS gagal. Coba buka izin lokasi di browser."));
          },
          {
            enableHighAccuracy: true,
            timeout: GPS_TIMEOUT_MS,
            maximumAge: 0
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 0
      }
    );
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function validasiGps(samples) {
  if (!samples.length) {
    throw new Error("GPS gagal dibaca.");
  }

  const now = Date.now();

  samples.forEach((sample) => {
    if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) {
      throw new Error("Data GPS tidak valid.");
    }

    if (sample.mocked) {
      throw new Error("Terdeteksi fake GPS. Matikan mock location lalu coba lagi.");
    }

    if (!Number.isFinite(sample.accuracy) || sample.accuracy > GPS_MAX_ACCURACY_METER) {
      throw new Error(
        `Akurasi GPS belum stabil (${Math.round(sample.accuracy || 0)} meter). Tunggu sebentar atau coba di area terbuka.`
      );
    }

    if (!sample.timestamp || now - sample.timestamp > GPS_MAX_AGE_MS) {
      throw new Error("Data GPS terlalu lama. Aktifkan GPS lalu coba lagi.");
    }
  });

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const current = samples[i];
    const jarak = hitungJarakMeter(
      prev.lat,
      prev.lng,
      current.lat,
      current.lng
    );
    const durasiDetik = Math.max((current.timestamp - prev.timestamp) / 1000, 1);
    const speed = jarak / durasiDetik;

    if (jarak > GPS_MAX_SAMPLE_DISTANCE_METER || speed > GPS_MAX_SPEED_METER_PER_SECOND) {
      throw new Error("GPS belum stabil. Tunggu beberapa detik, pastikan lokasi aktif, lalu coba lagi.");
    }
  }

  const bestSample = samples.reduce((best, sample) => {
    return sample.accuracy < best.accuracy ? sample : best;
  }, samples[0]);

  return {
    ...bestSample,
    sampleCount: samples.length,
    fakeGpsCheck: "lolos"
  };
}

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => value * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

function compressImage(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const tempCanvas = document.createElement("canvas");

      const maxWidth = 420;
      const scale = maxWidth / img.width;

      tempCanvas.width = maxWidth;
      tempCanvas.height = img.height * scale;

      const ctx = tempCanvas.getContext("2d");

      ctx.drawImage(
        img,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      resolve(
        tempCanvas.toDataURL(
          "image/jpeg",
          0.55
        )
      );
    };

    img.onerror = () => {
      reject(new Error("Gagal memproses foto."));
    };

    img.src = base64;
  });
}

async function uploadFoto(base64, namaRelawan) {
  try {
    statusText.innerText = "Proses Verifikasi...";

    const namaAman = namaRelawan
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify({
        namaFile: `${namaAman}-masuk-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        base64: base64.split(",")[1]
      })
    });

    const text = await response.text();

    console.log("RESPON APPS SCRIPT:", text);

    let hasil = {};

    try {
      hasil = JSON.parse(text);
    } catch {
      throw new Error("Response Apps Script bukan JSON.");
    }

    if (!hasil.success) {
      throw new Error(hasil.error || "Upload foto gagal.");
    }

    return hasil.url;
  } catch (error) {
    console.error(error);
    throw new Error("Upload foto gagal: " + error.message);
  }
}

async function prosesAbsen(tipe, fotoBase64 = "") {
  try {
    if (!userSiap) {
      statusText.innerText = "Sistem belum siap.";
      return;
    }

    const relawanId = relawanSelect.value;
    const pin = pinInput.value.trim();
    const hari = hariSelect.value;

    if (!divisiSelect.value || !hari || !relawanId || !pin) {
      statusText.innerText = "Lengkapi semua data.";
      getarGagal();
      return;
    }

    const relawan = dataRelawan.find(
      (item) => item.id === relawanId
    );

    if (!relawan) {
      statusText.innerText = "Relawan tidak ditemukan.";
      getarGagal();
      return;
    }

    if (relawan.pin !== pin) {
      statusText.innerText = "PIN salah ❌";
      getarGagal();
      return;
    }
    if (relawan.status === "nonaktif") {
  statusText.innerText =
    "Akun relawan nonaktif. Hubungi admin.";

  alert("Akun relawan nonaktif. Hubungi admin.");

  getarGagal();
  return;
}

    statusText.innerText = "Mengecek GPS...";

    const lokasi = await getLokasiUser();

    const jarak = hitungJarakMeter(
      lokasi.lat,
      lokasi.lng,
      LOKASI_DAPUR.lat,
      LOKASI_DAPUR.lng
    );

    statusText.innerText = `GPS berhasil ✅ Jarak ${Math.round(jarak)} meter`;

    if (jarak > RADIUS_METER) {
      statusText.innerText =
        `Diluar radius (${Math.round(jarak)} meter).`;
      getarGagal();
      return;
    }

    statusText.innerText = "Cek absensi...";

    const sudahAbsen = await cekAbsensiHariIni(
      relawan.id,
      tipe,
      hari
    );

    if (sudahAbsen) {
      statusText.innerText =
        tipe === "masuk"
          ? "Sudah absen masuk."
          : "Sudah absen pulang.";

      getarGagal();
      return;
    }

    if (tipe === "pulang") {
      const sudahMasuk = await cekAbsensiHariIni(
        relawan.id,
        "masuk",
        hari
      );

      if (!sudahMasuk) {
        statusText.innerText =
          "Belum bisa absen pulang karena belum absen masuk.";

        getarGagal();
        return;
      }
    }

    if (tipe === "masuk") {
      const belumPulangHari = await cekBelumPulang(
        relawan.id,
        hari
      );

      if (belumPulangHari) {
        alert(
          `Kamu belum absen pulang hari ${belumPulangHari}`
        );
      }
    }

    let fotoUrl = "";

    if (fotoBase64) {
      statusText.innerText = "Compress foto...";

      const compressed = await compressImage(fotoBase64);

      statusText.innerText = "Upload Google Drive...";

      fotoUrl = await uploadFoto(
        compressed,
        relawan.nama
      );
    }

    statusText.innerText = "Menyimpan Data...";

    await addDoc(collection(db, "absensi"), {
      relawanId: relawan.id,
      nama: relawan.nama,
      divisi: relawan.divisi,
      hari,
      tipe,
      tanggal: tanggalHariIni(),
      waktu: serverTimestamp(),
      foto: fotoUrl,
      lokasi: {
        lat: lokasi.lat,
        lng: lokasi.lng,
        jarakMeter: Math.round(jarak),
        accuracyMeter: Math.round(lokasi.accuracy),
        sampleCount: lokasi.sampleCount,
        fakeGpsCheck: lokasi.fakeGpsCheck
      },
      dibuatOleh: auth.currentUser.uid
    });

    const pesanBerhasil =
      tipe === "masuk"
        ? "Absen masuk berhasil ✅"
        : "Absen pulang berhasil ✅";

    statusText.innerText = pesanBerhasil;
    alert(pesanBerhasil);

    pinInput.value = "";
  } catch (error) {
    console.error(error);

    statusText.innerText =
      error.message || "Terjadi kesalahan ❌";

    alert(error.message || "Terjadi kesalahan.");
    getarGagal();
  }
}

btnMasuk.addEventListener("click", async () => {
  await bukaKamera();
});

btnAmbilFoto.addEventListener("click", async () => {
  if (!video.videoWidth || !video.videoHeight) {
    statusText.innerText = "Kamera belum siap, tunggu sebentar.";
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(video, 0, 0);

  const fotoBase64 = canvas.toDataURL("image/jpeg", 0.7);

  tutupKamera();

  await prosesAbsen("masuk", fotoBase64);
});

btnPulang.addEventListener("click", async () => {
  await prosesAbsen("pulang");
});

isiDivisi();
isiHari();
loginAnonim();
