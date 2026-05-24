import { db, auth } from "./firebase-config.js";

import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const btnLogout = document.getElementById("btnLogout");

const filterDivisi = document.getElementById("filterDivisi");
const filterHari = document.getElementById("filterHari");
const monitoringList = document.getElementById("monitoringList");

const totalHadir = document.getElementById("totalHadir");
const belumPulang = document.getElementById("belumPulang");
const sudahPulang = document.getElementById("sudahPulang");
const totalDivisi = document.getElementById("totalDivisi");

const searchRelawan = document.getElementById("searchRelawan");

const relawanPanel = document.getElementById("relawanPanel");
const namaRelawan = document.getElementById("namaRelawan");
const divisiRelawan = document.getElementById("divisiRelawan");
const pinRelawan = document.getElementById("pinRelawan");
const btnTambahRelawan = document.getElementById("btnTambahRelawan");
const listDataRelawan = document.getElementById("listDataRelawan");
const searchDataRelawan = document.getElementById("searchDataRelawan");

const btnAbsenManual = document.getElementById("btnAbsenManual");
const btnCekDatabaseAbsensi = document.getElementById("btnCekDatabaseAbsensi");
const manualModal = document.getElementById("manualModal");
const closeManualModal = document.getElementById("closeManualModal");
const manualDivisi = document.getElementById("manualDivisi");
const manualRelawan = document.getElementById("manualRelawan");
const manualTipe = document.getElementById("manualTipe");
const manualTanggalJadwal = document.getElementById("manualTanggalJadwal");
const manualRealtimeGroup = document.getElementById("manualRealtimeGroup");
const manualTanggal = document.getElementById("manualTanggal");
const manualJam = document.getElementById("manualJam");
const manualKeterangan = document.getElementById("manualKeterangan");
const btnSimpanManual = document.getElementById("btnSimpanManual");

const exportModal = document.getElementById("exportModal");
const closeExportModal = document.getElementById("closeExportModal");
const exportStartDate = document.getElementById("exportStartDate");
const exportEndDate = document.getElementById("exportEndDate");
const btnDownloadExcel = document.getElementById("btnDownloadExcel");

const databaseAbsensiPanel = document.getElementById("databaseAbsensiPanel");
const dbTanggalAwal = document.getElementById("dbTanggalAwal");
const dbTanggalAkhir = document.getElementById("dbTanggalAkhir");
const dbFilterDivisi = document.getElementById("dbFilterDivisi");
const dbFilterRelawan = document.getElementById("dbFilterRelawan");
const btnCariDatabaseAbsensi = document.getElementById("btnCariDatabaseAbsensi");
const dbAbsensiSummary = document.getElementById("dbAbsensiSummary");
const dbAbsensiList = document.getElementById("dbAbsensiList");

const editAbsensiModal = document.getElementById("editAbsensiModal");
const closeEditAbsensiModal = document.getElementById("closeEditAbsensiModal");
const editAbsensiId = document.getElementById("editAbsensiId");
const editAbsensiRelawan = document.getElementById("editAbsensiRelawan");
const editAbsensiTipe = document.getElementById("editAbsensiTipe");
const editAbsensiTanggalJadwal = document.getElementById("editAbsensiTanggalJadwal");
const editAbsensiRealtimeGroup = document.getElementById("editAbsensiRealtimeGroup");
const editAbsensiTanggal = document.getElementById("editAbsensiTanggal");
const editAbsensiJam = document.getElementById("editAbsensiJam");
const editAbsensiKeterangan = document.getElementById("editAbsensiKeterangan");
const btnUpdateAbsensi = document.getElementById("btnUpdateAbsensi");

const settingPanel = document.getElementById("settingPanel");
const settingNamaLokasi = document.getElementById("settingNamaLokasi");
const settingLatitude = document.getElementById("settingLatitude");
const settingLongitude = document.getElementById("settingLongitude");
const settingRadius = document.getElementById("settingRadius");
const btnAmbilLokasi = document.getElementById("btnAmbilLokasi");
const btnSimpanLokasi = document.getElementById("btnSimpanLokasi");

const menuButtons = document.querySelectorAll(
  ".menu-item, .mobile-nav button, .mobile-nav .mobile-link"
);

const DIVISI_LIST = [
  "Asisten Lapangan",
  "Persiapan",
  "Head Chef",
  "Pengolahan",
  "Pemorsian",
  "Distribusi",
  "Pencucian",
  "Kebersihan",
  "Keamanan",
  "Sanitarian"
];

const DIVISI_ALIASES = {
  "adm. gudang": "Persiapan",
  "content creator": "Persiapan",
  "security": "Keamanan"
};

let migrasiDivisiPromise = null;

const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

let semuaAbsensi = [];
let semuaRelawan = [];
let dataDatabaseAbsensi = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

function tanggalHariIni() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function tanggalKeHari(tanggalValue) {
  const tanggal = new Date(`${tanggalValue}T00:00:00`);
  const namaHari = NAMA_HARI[tanggal.getDay()];
  const dd = String(tanggal.getDate()).padStart(2, "0");
  const mm = String(tanggal.getMonth() + 1).padStart(2, "0");
  const yyyy = tanggal.getFullYear();

  return `${namaHari}, ${dd}/${mm}/${yyyy}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDivisi(value) {
  const text = String(value || "").trim();
  return DIVISI_ALIASES[text.toLowerCase()] || text;
}

function perluMigrasiDivisi(value) {
  const text = String(value || "").trim();
  return text && normalizeDivisi(text) !== text;
}

function getDivisiOrder(divisi) {
  const index = DIVISI_LIST.indexOf(normalizeDivisi(divisi));
  return index === -1 ? DIVISI_LIST.length : index;
}

function compareDivisi(a, b) {
  const orderA = getDivisiOrder(a);
  const orderB = getDivisiOrder(b);
  if (orderA !== orderB) return orderA - orderB;
  return String(a || "").localeCompare(String(b || ""));
}

async function commitBatchIfNeeded(batch, count) {
  if (count > 0) {
    await batch.commit();
  }
}

async function migrasiFieldDivisiKoleksi(namaKoleksi) {
  const snapshot = await getDocs(collection(db, namaKoleksi));
  let batch = writeBatch(db);
  let count = 0;
  let total = 0;

  for (const dokumen of snapshot.docs) {
    const data = dokumen.data();
    if (!perluMigrasiDivisi(data.divisi)) continue;

    batch.update(dokumen.ref, {
      divisi: normalizeDivisi(data.divisi)
    });

    count += 1;
    total += 1;

    if (count === 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  await commitBatchIfNeeded(batch, count);
  return total;
}

async function migrasiGajiDivisi() {
  const snapshot = await getDocs(collection(db, "gajiDivisi"));
  const nominalBaru = {};
  const dokumenLama = [];

  snapshot.forEach((dokumen) => {
    const data = dokumen.data();
    const divisiAsli = data.divisi || dokumen.id;
    const divisiBaru = normalizeDivisi(divisiAsli);
    const nominal = Number(data.nominal || 0);

    if (!perluMigrasiDivisi(divisiAsli)) {
      nominalBaru[divisiBaru] = nominalBaru[divisiBaru] || nominal;
      return;
    }

    nominalBaru[divisiBaru] = nominalBaru[divisiBaru] || nominal;
    dokumenLama.push(dokumen);
  });

  if (dokumenLama.length === 0) return 0;

  let batch = writeBatch(db);
  let count = 0;

  Object.entries(nominalBaru).forEach(([divisi, nominal]) => {
    if (!nominal) return;
    batch.set(doc(db, "gajiDivisi", divisi), {
      divisi,
      nominal
    }, { merge: true });
    count += 1;
  });

  dokumenLama.forEach((dokumen) => {
    if (normalizeDivisi(dokumen.id) === dokumen.id) return;
    batch.delete(dokumen.ref);
    count += 1;
  });

  await commitBatchIfNeeded(batch, count);
  return dokumenLama.length;
}

async function migrasiPayrollPeriode() {
  const snapshot = await getDocs(collection(db, "payrollPeriode"));
  let batch = writeBatch(db);
  let count = 0;
  let total = 0;

  for (const dokumen of snapshot.docs) {
    const data = dokumen.data();
    if (!Array.isArray(data.data)) continue;

    let berubah = false;
    const dataPayroll = data.data.map((item) => {
      if (!perluMigrasiDivisi(item?.divisi)) return item;
      berubah = true;
      return {
        ...item,
        divisi: normalizeDivisi(item.divisi)
      };
    });

    if (!berubah) continue;

    batch.update(dokumen.ref, {
      data: dataPayroll
    });

    count += 1;
    total += 1;

    if (count === 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  await commitBatchIfNeeded(batch, count);
  return total;
}

async function migrasiDivisiLama() {
  if (migrasiDivisiPromise) return migrasiDivisiPromise;

  migrasiDivisiPromise = (async () => {
    try {
      await migrasiFieldDivisiKoleksi("relawan");
      await migrasiFieldDivisiKoleksi("absensi");
      await migrasiFieldDivisiKoleksi("gajiKhusus");
      await migrasiGajiDivisi();
      await migrasiPayrollPeriode();
    } catch (error) {
      console.warn("Migrasi divisi lama gagal atau tidak lengkap:", error);
    }
  })();

  return migrasiDivisiPromise;
}

function getTimestampDate(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return null;
}

function formatJamInput(timestamp) {
  const tanggal = getTimestampDate(timestamp);
  if (!tanggal) return "";

  const hh = String(tanggal.getHours()).padStart(2, "0");
  const mm = String(tanggal.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatTanggalIndonesia(tanggalValue) {
  if (!tanggalValue) return "-";
  return tanggalKeHari(tanggalValue);
}

function formatJam(timestamp) {
  if (!timestamp) return "-";

  const tanggal = getTimestampDate(timestamp);
  if (!tanggal) return "-";

  return tanggal.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTanggal(timestamp) {
  if (!timestamp) return "-";

  const tanggal = getTimestampDate(timestamp);
  if (!tanggal) return "-";

  return tanggal.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function hitungDurasi(masuk, pulang) {
  if (!masuk || !pulang) return "-";

  const masukDate = getTimestampDate(masuk);
  const pulangDate = getTimestampDate(pulang);
  if (!masukDate || !pulangDate) return "-";

  const ms = pulangDate - masukDate;
  const jam = Math.floor(ms / 3600000);
  const menit = Math.floor((ms % 3600000) / 60000);

  return `${jam}j ${menit}m`;
}

function getDriveThumbnail(url) {
  if (!url) return "";

  const match = url.match(/\/d\/([^/]+)/);

  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w300`;
  }

  return url;
}

function isiFilterDivisi() {
  filterDivisi.innerHTML = `
    <option value="semua">Semua Divisi</option>
  `;

  DIVISI_LIST.forEach((divisi) => {
    filterDivisi.innerHTML += `
      <option value="${divisi}">
        ${divisi}
      </option>
    `;
  });
}

function isiDivisiRelawan() {
  divisiRelawan.innerHTML = `
    <option value="">Pilih Divisi</option>
  `;

  DIVISI_LIST.forEach((divisi) => {
    divisiRelawan.innerHTML += `
      <option value="${divisi}">
        ${divisi}
      </option>
    `;
  });
}

function isiManualDivisi() {
  manualDivisi.innerHTML = `
    <option value="">Pilih Divisi</option>
  `;

  DIVISI_LIST.forEach((divisi) => {
    manualDivisi.innerHTML += `
      <option value="${divisi}">
        ${divisi}
      </option>
    `;
  });
}

function isiDatabaseDivisi() {
  dbFilterDivisi.innerHTML = `
    <option value="semua">Semua Divisi</option>
  `;

  DIVISI_LIST.forEach((divisi) => {
    dbFilterDivisi.innerHTML += `
      <option value="${escapeHtml(divisi)}">
        ${escapeHtml(divisi)}
      </option>
    `;
  });
}

function isiDatabaseRelawan() {
  const divisi = dbFilterDivisi.value;
  const relawanTerfilter = semuaRelawan
    .filter((item) => divisi === "semua" || item.divisi === divisi)
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

  dbFilterRelawan.innerHTML = `
    <option value="semua">Semua Nama</option>
  `;

  relawanTerfilter.forEach((item) => {
    dbFilterRelawan.innerHTML += `
      <option value="${escapeHtml(item.id)}">
        ${escapeHtml(item.nama || "-")}
      </option>
    `;
  });
}

function isiEditAbsensiRelawan() {
  editAbsensiRelawan.innerHTML = `
    <option value="">Pilih Relawan</option>
  `;

  semuaRelawan
    .slice()
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
    .forEach((item) => {
      editAbsensiRelawan.innerHTML += `
        <option value="${escapeHtml(item.id)}">
          ${escapeHtml(item.nama || "-")} - ${escapeHtml(item.divisi || "-")}
        </option>
      `;
    });
}

function initFilterHari() {
  filterHari.value = tanggalHariIni();
}

function loadAbsensiDariTanggal(tanggalValue) {
  if (!tanggalValue) {
    monitoringList.innerHTML = `
      <div class="empty-state">
        Pilih tanggal terlebih dahulu.
      </div>
    `;

    totalHadir.innerText = 0;
    sudahPulang.innerText = 0;
    belumPulang.innerText = 0;
    totalDivisi.innerText = 0;

    return;
  }

  const hariFormatted = tanggalKeHari(tanggalValue);

  const q = query(
    collection(db, "absensi"),
    where("hari", "==", hariFormatted)
  );

  onSnapshot(q, (snapshot) => {
    semuaAbsensi = [];

    snapshot.forEach((dokumen) => {
      const data = dokumen.data();
      semuaAbsensi.push({
        id: dokumen.id,
        ...data,
        divisi: normalizeDivisi(data.divisi)
      });
    });

    renderDashboard();
  });
}

async function loadDataRelawan() {
  const snapshot = await getDocs(collection(db, "relawan"));

  semuaRelawan = [];

  snapshot.forEach((dokumen) => {
    const data = dokumen.data();
    semuaRelawan.push({
      id: dokumen.id,
      ...data,
      divisi: normalizeDivisi(data.divisi)
    });
  });

  renderDataRelawan();
}

async function loadSettingLokasi() {
  try {
    const ref = doc(db, "settings", "lokasi");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();

      settingNamaLokasi.value = data.nama || "";
      settingLatitude.value = data.latitude || "";
      settingLongitude.value = data.longitude || "";
      settingRadius.value = data.radius || "";
    }

  } catch (error) {
    console.error(error);
    alert("Gagal memuat setting lokasi.");
  }
}

async function sinkronkanAbsensiRelawan(relawanId, dataRelawan) {
  const q = query(
    collection(db, "absensi"),
    where("relawanId", "==", relawanId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return 0;
  }

  let batch = writeBatch(db);
  let jumlahBatch = 0;
  let totalUpdate = 0;

  for (const dokumen of snapshot.docs) {
    batch.update(dokumen.ref, {
      nama: dataRelawan.nama,
      divisi: dataRelawan.divisi
    });

    jumlahBatch += 1;
    totalUpdate += 1;

    if (jumlahBatch === 450) {
      await batch.commit();
      batch = writeBatch(db);
      jumlahBatch = 0;
    }
  }

  if (jumlahBatch > 0) {
    await batch.commit();
  }

  return totalUpdate;
}

function buatRekapExport(dataHari) {

  const rekap = {};

  dataHari.forEach((data) => {

    if (!rekap[data.relawanId]) {
      rekap[data.relawanId] = {
        nama: data.nama || "-",
        divisi: normalizeDivisi(data.divisi) || "-",
        masuk: null,
        pulang: null,
        status: "Hadir",
        keterangan: "-",
        lokasi: "-"
      };
    }

    if (data.tipe === "masuk") {
      rekap[data.relawanId].masuk = data.waktu;

      rekap[data.relawanId].lokasi =
        data.manual
          ? "Absen manual (admin)"
          : data.lokasi
            ? `${data.lokasi.jarakMeter} meter dari dapur`
            : "-";
    }

    if (data.tipe === "pulang") {
      rekap[data.relawanId].pulang = data.waktu;
    }

    if (data.tipe === "tidak_hadir") {
      rekap[data.relawanId].status = "Tidak Hadir";
      rekap[data.relawanId].keterangan = data.keterangan || "-";
    }

  });

  return Object.values(rekap);

}

function buatRekap() {
  const rekap = {};

  semuaAbsensi.forEach((data) => {
    if (data.tipe === "tidak_hadir") {
      return;
    }

    if (!rekap[data.relawanId]) {
      rekap[data.relawanId] = {
        nama: data.nama || "-",
        divisi: normalizeDivisi(data.divisi) || "-",
        masuk: null,
        pulang: null,
        foto: "",
        lokasiInfo: "-"
      };
    }

    if (data.tipe === "masuk") {
      rekap[data.relawanId].masuk = data.waktu;
      rekap[data.relawanId].foto = data.foto || "";

      rekap[data.relawanId].lokasiInfo = data.manual
        ? "Absen manual (admin)"
        : data.lokasi
          ? `${data.lokasi.jarakMeter} meter dari dapur`
          : "-";
    }

    if (data.tipe === "pulang") {
      rekap[data.relawanId].pulang = data.waktu;
    }
  });

  return Object.values(rekap);
}

function renderDashboard() {
  const divisiDipilih = filterDivisi.value;
  const keyword = searchRelawan.value.toLowerCase();

  let dataRekap = buatRekap();

  let dataTidakHadir = semuaAbsensi.filter(
    (item) => item.tipe === "tidak_hadir"
  );

  if (divisiDipilih !== "semua") {
    dataRekap = dataRekap.filter(
      (item) => item.divisi === divisiDipilih
    );

    dataTidakHadir = dataTidakHadir.filter(
      (item) => item.divisi === divisiDipilih
    );
  }

  if (keyword) {
    dataRekap = dataRekap.filter((item) =>
      (item.nama || "").toLowerCase().includes(keyword)
    );

    dataTidakHadir = dataTidakHadir.filter((item) =>
      (item.nama || "").toLowerCase().includes(keyword)
    );
  }

  const divisiAktif = [
    ...new Set(dataRekap.map((item) => item.divisi))
  ];

  totalHadir.innerText = dataRekap.length;
  sudahPulang.innerText = dataRekap.filter((item) => item.pulang).length;
  belumPulang.innerText = dataRekap.filter((item) => !item.pulang).length;
  totalDivisi.innerText = divisiAktif.length;

  if (dataRekap.length === 0 && dataTidakHadir.length === 0) {
    monitoringList.innerHTML = `
      <div class="empty-state">
        Belum ada data absensi.
      </div>
    `;
    return;
  }

  const grouped = {};

  dataRekap.forEach((item) => {
    if (!grouped[item.divisi]) {
      grouped[item.divisi] = [];
    }

    grouped[item.divisi].push(item);
  });

  monitoringList.innerHTML = "";

  if (dataTidakHadir.length > 0) {
    const tidakHadirHTML = dataTidakHadir
      .sort((a, b) =>
        (a.nama || "").localeCompare(b.nama || "")
      )
      .map((item) => `
        <div class="relawan-item">
          <div class="relawan-left">
            <div class="avatar">
              ${(item.nama || "?").charAt(0).toUpperCase()}
            </div>

            <div class="relawan-info">
              <h4>${item.nama || "-"}</h4>

              <div class="relawan-meta">
                <div class="meta-chip">
                  Tidak Hadir
                </div>

                ${
                  item.keterangan
                    ? `<div class="meta-chip">${item.keterangan}</div>`
                    : ""
                }
              </div>
            </div>
          </div>

          <div class="relawan-right">
            <div class="badge badge-tidak-hadir">
              Tidak Hadir
            </div>
          </div>
        </div>
      `)
      .join("");

    monitoringList.innerHTML += `
      <div class="divisi-card">
        <div class="divisi-header">
          <h3>Tidak Hadir</h3>

          <div class="divisi-count">
            ${dataTidakHadir.length} Relawan
          </div>
        </div>

        <div class="relawan-list">
          ${tidakHadirHTML}
        </div>
      </div>
    `;
  }

  Object.keys(grouped)
    .sort(compareDivisi)
    .forEach((divisi) => {
      const relawanList = grouped[divisi]
        .sort((a, b) =>
          (a.nama || "").localeCompare(b.nama || "")
        )
        .map((item) => {
          const statusClass = item.pulang
            ? "badge-pulang"
            : "badge-belum";

          const statusText = item.pulang
            ? "Sudah Pulang"
            : "Belum Pulang";

          return `
            <div class="relawan-item">
              <div class="relawan-left">
                <div class="avatar">
                  ${
                    item.foto
                      ? `<img src="${getDriveThumbnail(item.foto)}">`
                      : (item.nama || "?").charAt(0).toUpperCase()
                  }
                </div>

                <div class="relawan-info">
                  <h4>${item.nama || "-"}</h4>

                  <div class="relawan-meta">
                    <div class="meta-chip">
                      Masuk ${formatJam(item.masuk)} • ${formatTanggal(item.masuk)}
                    </div>

                    <div class="meta-chip">
                      Pulang ${formatJam(item.pulang)} • ${formatTanggal(item.pulang)}
                    </div>

                    <div class="meta-chip">
                      Durasi ${hitungDurasi(item.masuk, item.pulang)}
                    </div>

                    <div class="meta-chip">
                      Lokasi ${item.lokasiInfo}
                    </div>
                  </div>
                </div>
              </div>

              <div class="relawan-right">
                <div class="badge ${statusClass}">
                  ${statusText}
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      monitoringList.innerHTML += `
        <div class="divisi-card">
          <div class="divisi-header">
            <h3>${divisi}</h3>

            <div class="divisi-count">
              ${grouped[divisi].length} Relawan
            </div>
          </div>

          <div class="relawan-list">
            ${relawanList}
          </div>
        </div>
      `;
    });
}

function renderDataRelawan() {
  const keyword = searchDataRelawan.value.toLowerCase();

  let data = semuaRelawan;

  if (keyword) {
    data = data.filter((item) =>
      (item.nama || "").toLowerCase().includes(keyword)
    );
  }

  if (data.length === 0) {
    listDataRelawan.innerHTML = `
      <div class="empty-state">
        Tidak ada relawan.
      </div>
    `;
    return;
  }

  const grouped = {};

  DIVISI_LIST.forEach((divisi) => {
    grouped[divisi] = [];
  });

  data.forEach((item) => {
    const divisi = item.divisi || "Tanpa Divisi";

    if (!grouped[divisi]) {
      grouped[divisi] = [];
    }

    grouped[divisi].push(item);
  });

  listDataRelawan.innerHTML = "";

  Object.keys(grouped).forEach((divisi) => {
    const relawanDivisi = grouped[divisi];

    if (!relawanDivisi || relawanDivisi.length === 0) return;

    const cards = relawanDivisi
      .sort((a, b) =>
        (a.nama || "").localeCompare(b.nama || "")
      )
      .map((item) => {
        const statusValue = item.status || "aktif";

        return `
          <div class="data-relawan-card">
            <input
              type="text"
              value="${item.nama || ""}"
              id="nama-${item.id}"
              placeholder="Nama"
            >

            <select id="divisi-${item.id}">
              ${DIVISI_LIST.map((div) => `
                <option
                  value="${div}"
                  ${item.divisi === div ? "selected" : ""}
                >
                  ${div}
                </option>
              `).join("")}
            </select>

            <input
              type="text"
              value="${item.pin || ""}"
              id="pin-${item.id}"
              placeholder="PIN"
            >

            <select id="status-${item.id}">
              <option
                value="aktif"
                ${statusValue === "aktif" ? "selected" : ""}
              >
                Aktif
              </option>

              <option
                value="nonaktif"
                ${statusValue === "nonaktif" ? "selected" : ""}
              >
                Nonaktif
              </option>
            </select>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button
                class="btn-save"
                onclick="updateRelawan('${item.id}')"
              >
                Simpan
              </button>

              <button
                class="btn-delete"
                onclick="hapusRelawan('${item.id}')"
              >
                Hapus
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    listDataRelawan.innerHTML += `
      <div class="relawan-group">
        <div class="relawan-group-title">
          ${divisi}
        </div>

        <div class="relawan-group-list">
          ${cards}
        </div>
      </div>
    `;
  });
}

function getAbsensiKey(item) {
  return [
    item.relawanId || item.nama || "tanpa-relawan",
    item.tanggal || "tanpa-tanggal",
    item.tipe || "tanpa-tipe"
  ].join("|");
}

function getUrutanDoubleAbsensi(data, item) {
  const key = getAbsensiKey(item);
  const grup = data
    .filter((row) => getAbsensiKey(row) === key)
    .sort((a, b) => {
      const waktuA = getTimestampDate(a.waktu)?.getTime() || 0;
      const waktuB = getTimestampDate(b.waktu)?.getTime() || 0;
      return waktuA - waktuB;
    });

  if (grup.length <= 1) {
    return null;
  }

  return {
    total: grup.length,
    urutan: grup.findIndex((row) => row.id === item.id) + 1
  };
}

function getLokasiAbsensi(item) {
  if (item.manual) return "Manual admin";
  if (!item.lokasi) return "-";

  const jarak = item.lokasi.jarakMeter ?? "-";
  const lat = item.lokasi.lat ?? "-";
  const lng = item.lokasi.lng ?? "-";
  const accuracy = item.lokasi.accuracyMeter;
  const fakeGpsCheck = item.lokasi.fakeGpsCheck;
  const detailGps = [];

  if (accuracy !== undefined) {
    detailGps.push(`akurasi ${accuracy}m`);
  }

  if (fakeGpsCheck) {
    detailGps.push(`anti fake GPS: ${fakeGpsCheck}`);
  }

  return `${jarak} meter | ${lat}, ${lng}${
    detailGps.length ? ` | ${detailGps.join(" | ")}` : ""
  }`;
}

async function loadDatabaseAbsensi() {
  const start = dbTanggalAwal.value;
  const end = dbTanggalAkhir.value;

  if (!start || !end) {
    alert("Pilih tanggal awal dan tanggal akhir.");
    return;
  }

  if (start > end) {
    alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return;
  }

  btnCariDatabaseAbsensi.disabled = true;
  btnCariDatabaseAbsensi.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Memuat...
  `;

  try {
    const q = query(
      collection(db, "absensi"),
      where("tanggal", ">=", start),
      where("tanggal", "<=", end)
    );

    const snapshot = await getDocs(q);

    dataDatabaseAbsensi = [];

    snapshot.forEach((dokumen) => {
      const data = dokumen.data();
      dataDatabaseAbsensi.push({
        id: dokumen.id,
        ...data,
        divisi: normalizeDivisi(data.divisi)
      });
    });

    renderDatabaseAbsensi();
  } catch (error) {
    console.error(error);
    alert("Gagal memuat database absensi.");
  } finally {
    btnCariDatabaseAbsensi.disabled = false;
    btnCariDatabaseAbsensi.innerHTML = `
      <i class="fa-solid fa-magnifying-glass"></i>
      Cari Data
    `;
  }
}

function renderDatabaseAbsensi() {
  const divisi = dbFilterDivisi.value;
  const relawanId = dbFilterRelawan.value;

  let data = dataDatabaseAbsensi.slice();

  if (divisi !== "semua") {
    data = data.filter((item) => item.divisi === divisi);
  }

  if (relawanId !== "semua") {
    data = data.filter((item) => item.relawanId === relawanId);
  }

  data.sort((a, b) => {
    const tanggalCompare = (a.tanggal || "").localeCompare(b.tanggal || "");
    if (tanggalCompare !== 0) return tanggalCompare;

    const divisiCompare = compareDivisi(a.divisi, b.divisi);
    if (divisiCompare !== 0) return divisiCompare;

    const namaCompare = (a.nama || "").localeCompare(b.nama || "");
    if (namaCompare !== 0) return namaCompare;

    const waktuA = getTimestampDate(a.waktu)?.getTime() || 0;
    const waktuB = getTimestampDate(b.waktu)?.getTime() || 0;
    return waktuA - waktuB;
  });

  const doubleCount = data.filter((item) =>
    Boolean(getUrutanDoubleAbsensi(data, item))
  ).length;

  dbAbsensiSummary.innerText =
    `${data.length} dokumen ditemukan. ${doubleCount} dokumen terindikasi double absen.`;

  if (data.length === 0) {
    dbAbsensiList.innerHTML = `
      <div class="empty-state">
        Tidak ada data sesuai filter.
      </div>
    `;
    return;
  }

  dbAbsensiList.innerHTML = data.map((item) => {
    const doubleInfo = getUrutanDoubleAbsensi(data, item);
    const tipeClass = item.tipe === "pulang"
      ? "badge-pulang"
      : item.tipe === "tidak_hadir"
        ? "badge-tidak-hadir"
        : "badge-working";

    return `
      <div class="database-absensi-card" data-id="${escapeHtml(item.id)}">
        <div class="database-absensi-main">
          <div>
            <div class="database-absensi-title">
              ${escapeHtml(item.nama || "-")}
              ${
                doubleInfo
                  ? `<span class="double-badge">Double ${escapeHtml(item.tipe || "-")} ${doubleInfo.urutan}/${doubleInfo.total}</span>`
                  : ""
              }
            </div>
            <div class="database-absensi-subtitle">
              ${escapeHtml(item.divisi || "-")} | ID dokumen: ${escapeHtml(item.id)}
            </div>
          </div>

          <div class="database-actions">
            <button class="btn-save" data-action="edit-absensi" data-id="${escapeHtml(item.id)}">
              Edit
            </button>
            <button class="btn-delete" data-action="hapus-absensi" data-id="${escapeHtml(item.id)}">
              Hapus
            </button>
          </div>
        </div>

        <div class="database-detail-grid">
          <div>
            <span>Tipe</span>
            <strong class="badge ${tipeClass}">${escapeHtml(item.tipe || "-")}</strong>
          </div>
          <div>
            <span>Jadwal</span>
            <strong>${escapeHtml(item.hari || formatTanggalIndonesia(item.tanggal))}</strong>
          </div>
          <div>
            <span>Tanggal Real</span>
            <strong>${escapeHtml(item.tanggal || "-")}</strong>
          </div>
          <div>
            <span>Jam</span>
            <strong>${escapeHtml(formatJam(item.waktu))}</strong>
          </div>
          <div>
            <span>Sumber</span>
            <strong>${item.manual ? "Manual" : "Absensi aplikasi"}</strong>
          </div>
          <div>
            <span>Lokasi</span>
            <strong>${escapeHtml(getLokasiAbsensi(item))}</strong>
          </div>
          <div>
            <span>Keterangan</span>
            <strong>${escapeHtml(item.keterangan || "-")}</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function bukaEditAbsensi(id) {
  const item = dataDatabaseAbsensi.find((row) => row.id === id);

  if (!item) {
    alert("Data absensi tidak ditemukan.");
    return;
  }

  isiEditAbsensiRelawan();

  editAbsensiId.value = item.id;
  editAbsensiRelawan.value = item.relawanId || "";
  editAbsensiTipe.value = item.tipe || "masuk";
  editAbsensiTanggalJadwal.value = item.tanggal || tanggalHariIni();
  editAbsensiTanggal.value = item.tanggal || tanggalHariIni();
  editAbsensiJam.value = formatJamInput(item.waktu);
  editAbsensiKeterangan.value = item.keterangan || "";
  editAbsensiRealtimeGroup.style.display =
    editAbsensiTipe.value === "tidak_hadir" ? "none" : "block";

  editAbsensiModal.classList.add("show");
}

async function hapusAbsensi(id) {
  const item = dataDatabaseAbsensi.find((row) => row.id === id);
  const nama = item?.nama || "data ini";
  const konfirmasi = confirm(`Yakin ingin menghapus absensi ${nama}?`);

  if (!konfirmasi) return;

  try {
    await deleteDoc(doc(db, "absensi", id));
    dataDatabaseAbsensi = dataDatabaseAbsensi.filter((row) => row.id !== id);
    renderDatabaseAbsensi();

    if (filterHari.value) {
      loadAbsensiDariTanggal(filterHari.value);
    }

    alert("Data absensi berhasil dihapus.");
  } catch (error) {
    console.error(error);
    alert("Gagal menghapus data absensi.");
  }
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    menuButtons.forEach((item) =>
      item.classList.remove("active")
    );

    btn.classList.add("active");

    const text = btn.innerText.trim();
    
if (text === "Export") {

  exportStartDate.value =
  filterHari.value || tanggalHariIni();

  exportEndDate.value =
  filterHari.value || tanggalHariIni();

  exportModal.classList.add("show");

  return;

}

    if (text === "Data Relawan" || text === "Relawan") {

  document.querySelector(".filter-card").style.display = "none";
  document.querySelector(".stats-grid").style.display = "none";
  monitoringList.style.display = "none";

  relawanPanel.classList.remove("panel-hidden");
  relawanPanel.classList.add("panel-show");

  settingPanel.classList.remove("panel-show");
  settingPanel.classList.add("panel-hidden");

  databaseAbsensiPanel.classList.remove("panel-show");
  databaseAbsensiPanel.classList.add("panel-hidden");

  loadDataRelawan();

} else if (text === "Setting") {

  document.querySelector(".filter-card").style.display = "none";
  document.querySelector(".stats-grid").style.display = "none";
  monitoringList.style.display = "none";

  relawanPanel.classList.remove("panel-show");
  relawanPanel.classList.add("panel-hidden");

  databaseAbsensiPanel.classList.remove("panel-show");
  databaseAbsensiPanel.classList.add("panel-hidden");

  settingPanel.classList.remove("panel-hidden");
  settingPanel.classList.add("panel-show");

  loadSettingLokasi();

} else {

  document.querySelector(".filter-card").style.display = "flex";
  document.querySelector(".stats-grid").style.display = "grid";
  monitoringList.style.display = "block";

  relawanPanel.classList.remove("panel-show");
  relawanPanel.classList.add("panel-hidden");

  databaseAbsensiPanel.classList.remove("panel-show");
  databaseAbsensiPanel.classList.add("panel-hidden");

  settingPanel.classList.remove("panel-show");
  settingPanel.classList.add("panel-hidden");

}
  });
});

btnCekDatabaseAbsensi.addEventListener("click", async () => {
  document.querySelector(".stats-grid").style.display = "none";
  monitoringList.style.display = "none";

  relawanPanel.classList.remove("panel-show");
  relawanPanel.classList.add("panel-hidden");

  settingPanel.classList.remove("panel-show");
  settingPanel.classList.add("panel-hidden");

  databaseAbsensiPanel.classList.remove("panel-hidden");
  databaseAbsensiPanel.classList.add("panel-show");

  dbTanggalAwal.value = dbTanggalAwal.value || filterHari.value || tanggalHariIni();
  dbTanggalAkhir.value = dbTanggalAkhir.value || filterHari.value || tanggalHariIni();

  await loadDataRelawan();
  isiDatabaseRelawan();
  await loadDatabaseAbsensi();
});

dbFilterDivisi.addEventListener("change", () => {
  isiDatabaseRelawan();
  renderDatabaseAbsensi();
});

dbFilterRelawan.addEventListener("change", renderDatabaseAbsensi);
btnCariDatabaseAbsensi.addEventListener("click", loadDatabaseAbsensi);

dbAbsensiList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit-absensi") {
    bukaEditAbsensi(id);
    return;
  }

  if (action === "hapus-absensi") {
    hapusAbsensi(id);
  }
});

closeEditAbsensiModal.addEventListener("click", () => {
  editAbsensiModal.classList.remove("show");
});

editAbsensiModal.addEventListener("click", (e) => {
  if (e.target === editAbsensiModal) {
    editAbsensiModal.classList.remove("show");
  }
});

editAbsensiTipe.addEventListener("change", () => {
  editAbsensiRealtimeGroup.style.display =
    editAbsensiTipe.value === "tidak_hadir" ? "none" : "block";
});

btnUpdateAbsensi.addEventListener("click", async () => {
  const id = editAbsensiId.value;
  const relawanId = editAbsensiRelawan.value;
  const tipe = editAbsensiTipe.value;
  const tanggalJadwal = editAbsensiTanggalJadwal.value;
  const tanggal = editAbsensiTanggal.value;
  const jam = editAbsensiJam.value;
  const keterangan = editAbsensiKeterangan.value.trim();

  if (!id || !relawanId || !tipe || !tanggalJadwal) {
    alert("Lengkapi data absensi.");
    return;
  }

  if (tipe !== "tidak_hadir" && (!tanggal || !jam)) {
    alert("Lengkapi tanggal dan jam real absen.");
    return;
  }

  const relawan = semuaRelawan.find((item) => item.id === relawanId);

  if (!relawan) {
    alert("Data relawan tidak ditemukan.");
    return;
  }

  const tanggalReal = tipe === "tidak_hadir"
    ? tanggalJadwal
    : tanggal;

  const waktu = tipe === "tidak_hadir"
    ? new Date(`${tanggalJadwal}T00:00`)
    : new Date(`${tanggal}T${jam}`);

  try {
    await updateDoc(doc(db, "absensi", id), {
      relawanId,
      nama: relawan.nama,
      divisi: relawan.divisi,
      tipe,
      hari: tanggalKeHari(tanggalJadwal),
      tanggal: tanggalReal,
      waktu: Timestamp.fromDate(waktu),
      keterangan,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser.uid
    });

    const index = dataDatabaseAbsensi.findIndex((item) => item.id === id);

    if (index !== -1) {
      dataDatabaseAbsensi[index] = {
        ...dataDatabaseAbsensi[index],
        relawanId,
        nama: relawan.nama,
        divisi: relawan.divisi,
        tipe,
        hari: tanggalKeHari(tanggalJadwal),
        tanggal: tanggalReal,
        waktu: Timestamp.fromDate(waktu),
        keterangan
      };
    }

    renderDatabaseAbsensi();
    editAbsensiModal.classList.remove("show");

    if (filterHari.value) {
      loadAbsensiDariTanggal(filterHari.value);
    }

    alert("Data absensi berhasil diperbarui.");
  } catch (error) {
    console.error(error);
    alert("Gagal memperbarui data absensi.");
  }
});

manualDivisi.addEventListener("change", () => {
  const divisi = manualDivisi.value;

  manualRelawan.innerHTML = `
    <option value="">Pilih Relawan</option>
  `;

  semuaRelawan
    .filter((item) => item.divisi === divisi)
    .sort((a, b) =>
      (a.nama || "").localeCompare(b.nama || "")
    )
    .forEach((item) => {
      manualRelawan.innerHTML += `
        <option value="${item.id}">
          ${item.nama}
        </option>
      `;
    });
});

manualTipe.addEventListener("change", () => {
  if (manualTipe.value === "tidak_hadir") {
    manualRealtimeGroup.style.display = "none";
  } else {
    manualRealtimeGroup.style.display = "block";
  }
});

btnAbsenManual.addEventListener("click", async () => {
  await loadDataRelawan();

  manualTanggalJadwal.value = tanggalHariIni();
  manualTanggal.value = tanggalHariIni();
  manualJam.value = "";
  manualDivisi.value = "";
  manualRelawan.innerHTML = `
    <option value="">Pilih Relawan</option>
  `;
  manualTipe.value = "";
  manualKeterangan.value = "";
  manualRealtimeGroup.style.display = "block";

  manualModal.classList.add("show");
});

closeManualModal.addEventListener("click", () => {
  manualModal.classList.remove("show");
});

manualModal.addEventListener("click", (e) => {
  if (e.target === manualModal) {
    manualModal.classList.remove("show");
  }
});

closeExportModal.addEventListener("click", () => {
  exportModal.classList.remove("show");
});

exportModal.addEventListener("click", (e) => {
  if (e.target === exportModal) {
    exportModal.classList.remove("show");
  }
});

btnSimpanManual.addEventListener("click", async () => {
  const relawanId = manualRelawan.value;
  const tipe = manualTipe.value;
  const tanggalJadwal = manualTanggalJadwal.value;
  const tanggal = manualTanggal.value;
  const jam = manualJam.value;
  const keterangan = manualKeterangan.value.trim();

  if (!relawanId || !tipe || !tanggalJadwal) {
    alert("Lengkapi data absen manual.");
    return;
  }

  if (tipe !== "tidak_hadir" && (!tanggal || !jam)) {
    alert("Lengkapi tanggal dan jam realtime.");
    return;
  }

  const dataRelawan = semuaRelawan.find(
    (item) => item.id === relawanId
  );

  if (!dataRelawan) {
    alert("Data relawan tidak ditemukan.");
    return;
  }

  const hari = tanggalKeHari(tanggalJadwal);

  try {
    if (tipe === "tidak_hadir") {
      await addDoc(collection(db, "absensi"), {
        relawanId,
        nama: dataRelawan.nama,
        divisi: dataRelawan.divisi,
        tipe: "tidak_hadir",
        hari,
        tanggal: tanggalJadwal,
        waktu: Timestamp.fromDate(new Date(`${tanggalJadwal}T00:00`)),
        manual: true,
        keterangan,
        foto: "",
        dibuatOleh: auth.currentUser.uid
      });

      manualModal.classList.remove("show");

      filterHari.value = tanggalJadwal;
      loadAbsensiDariTanggal(tanggalJadwal);

      alert("Data tidak hadir berhasil disimpan ✅");
      return;
    }

    const waktu = new Date(`${tanggal}T${jam}`);

    await addDoc(collection(db, "absensi"), {
      relawanId,
      nama: dataRelawan.nama,
      divisi: dataRelawan.divisi,
      tipe,
      hari,
      tanggal,
      waktu: Timestamp.fromDate(waktu),
      manual: true,
      foto: "",
      keterangan,
      dibuatOleh: auth.currentUser.uid
    });

    manualModal.classList.remove("show");

    filterHari.value = tanggalJadwal;
    loadAbsensiDariTanggal(tanggalJadwal);

    alert("Absen manual berhasil ✅");
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan absen manual.");
  }
});

btnTambahRelawan.addEventListener("click", async () => {
  const nama = namaRelawan.value.trim();
  const divisi = divisiRelawan.value;
  const pin = pinRelawan.value.trim();

  if (!nama || !divisi || !pin) {
    alert("Lengkapi data relawan.");
    return;
  }

  try {
    await addDoc(collection(db, "relawan"), {
      nama,
      divisi,
      pin,
      status: "aktif"
    });

    namaRelawan.value = "";
    pinRelawan.value = "";
    divisiRelawan.value = "";

    await loadDataRelawan();

    alert("Relawan berhasil ditambahkan ✅");
  } catch (error) {
    console.error(error);
    alert("Gagal menambahkan relawan.");
  }
});

window.updateRelawan = async function(id) {
  const namaEl = document.getElementById(`nama-${id}`);
  const divisiEl = document.getElementById(`divisi-${id}`);
  const pinEl = document.getElementById(`pin-${id}`);
  const statusEl = document.getElementById(`status-${id}`);

  const nama = namaEl.value.trim();
  const divisi = divisiEl.value;
  const pin = pinEl.value.trim();
  const status = statusEl.value;

  if (!nama || !divisi || !pin || !status) {
    alert("Data relawan tidak boleh kosong.");
    return;
  }

  try {
    await updateDoc(doc(db, "relawan", id), {
      nama,
      divisi,
      pin,
      status
    });

    const totalAbsensiDisinkronkan = await sinkronkanAbsensiRelawan(id, {
      nama,
      divisi
    });

    await loadDataRelawan();

    alert(
      `Data relawan berhasil diperbarui ✅\n${totalAbsensiDisinkronkan} dokumen absensi ikut diperbarui.`
    );
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan data relawan.");
  }
};

window.hapusRelawan = async function(id) {
  const konfirmasi = confirm("Yakin ingin menghapus relawan ini?");

  if (!konfirmasi) return;

  try {
    await deleteDoc(doc(db, "relawan", id));

    await loadDataRelawan();

    alert("Relawan berhasil dihapus ✅");
  } catch (error) {
    console.error(error);
    alert("Gagal menghapus relawan.");
  }
};

searchRelawan.addEventListener("input", renderDashboard);
searchDataRelawan.addEventListener("input", renderDataRelawan);
filterDivisi.addEventListener("change", renderDashboard);

filterHari.addEventListener("change", () => {
  loadAbsensiDariTanggal(filterHari.value);
});
async function getAbsensiRange(start, end) {

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  let hasil = [];

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const tanggal = `${yyyy}-${mm}-${dd}`;
    const hariFormatted = tanggalKeHari(tanggal);

    const q = query(
      collection(db, "absensi"),
      where("hari", "==", hariFormatted)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      const data = doc.data();
      hasil.push({
        id: doc.id,
        ...data,
        divisi: normalizeDivisi(data.divisi)
      });
    });

  }

  return hasil;
}
btnDownloadExcel.addEventListener("click", async () => {

    const start =
    exportStartDate.value;

    const end =
    exportEndDate.value;

    if(!start || !end){

      alert(
        "Pilih tanggal export"
      );

      return;

    }

    const dataExport =
await getAbsensiRange(
  start,
  end
);

const groupedByHari = {};

dataExport.forEach((item) => {
  const hari = item.hari || "Tanpa Jadwal";

  if (!groupedByHari[hari]) {
    groupedByHari[hari] = [];
  }

  groupedByHari[hari].push(item);
});

const wb =
XLSX.utils.book_new();

Object.keys(groupedByHari).forEach((hari) => {

  const dataHari =
  groupedByHari[hari];

  const dataRekap =
buatRekapExport(dataHari);
dataRekap.sort((a, b) => {
  const urutanDivisi = compareDivisi(a.divisi, b.divisi);
  if (urutanDivisi !== 0) return urutanDivisi;

  return a.nama.localeCompare(b.nama);

});

const rows = [];

DIVISI_LIST.forEach((divisi) => {

  const dataDivisi =
  dataRekap.filter(
    (item)=>item.divisi === divisi
  );

  if(dataDivisi.length === 0)
  return;

  rows.push({
    No: "",
    Nama: `DIVISI: ${divisi}`,
    Divisi: "",
    Masuk: "",
    Pulang: "",
    Durasi: "",
    Status: "",
    Lokasi: "",
    Keterangan: ""
  });

  dataDivisi.forEach((item, index)=>{

    rows.push({

      No:
      index + 1,

      Nama:
      item.nama,

      Divisi:
      item.divisi,

      Masuk:
      formatJam(item.masuk),

      Pulang:
      formatJam(item.pulang),

      Durasi:
      hitungDurasi(
        item.masuk,
        item.pulang
      ),

      Status:
      item.status,

      Lokasi:
      item.lokasi,

      Keterangan:
      item.keterangan

    });

  });

});

  const aoa = [];
const totalHadir =
dataRekap.filter(
  (item)=>item.status !== "Tidak Hadir"
).length;

const totalTidakHadir =
dataRekap.filter(
  (item)=>item.status === "Tidak Hadir"
).length;

aoa.push([
  "LAPORAN ABSENSI RELAWAN",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
]);

aoa.push([
  hari,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
]);

aoa.push([
  `Total Hadir: ${totalHadir}`,
  "",
  `Tidak Hadir: ${totalTidakHadir}`,
  "",
  `Total Relawan: ${dataRekap.length}`,
  "",
  "",
  "",
  ""
]);

aoa.push([
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
]);

aoa.push([
  "No",
  "Nama",
  "Divisi",
  "Masuk",
  "Pulang",
  "Durasi",
  "Status",
  "Lokasi",
  "Keterangan"
]);

DIVISI_LIST.forEach((divisi) => {

  const dataDivisi =
  dataRekap.filter(
    (item)=>item.divisi === divisi
  );

  if(dataDivisi.length === 0)
  return;

  aoa.push([
    "",
    `DIVISI: ${divisi.toUpperCase()}`,
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

  dataDivisi.forEach((item, index)=>{

    aoa.push([
      index + 1,
      item.nama,
      item.divisi,
      formatJam(item.masuk),
      formatJam(item.pulang),
      hitungDurasi(item.masuk, item.pulang),
      item.status,
      item.lokasi,
      item.keterangan
    ]);

  });

  aoa.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

});

const ws =
XLSX.utils.aoa_to_sheet(aoa);
ws["!merges"] = [
  // Judul
  { s:{ r:0, c:0 }, e:{ r:0, c:8 } },

  // Tanggal
  { s:{ r:1, c:0 }, e:{ r:1, c:8 } },

  // Summary box
  { s:{ r:2, c:0 }, e:{ r:2, c:1 } },
  { s:{ r:2, c:2 }, e:{ r:2, c:3 } },
  { s:{ r:2, c:4 }, e:{ r:2, c:5 } }
];
ws["!cols"] = [
  { wch: 6 },
  { wch: 30 },
  { wch: 22 },
  { wch: 12 },
  { wch: 12 },
  { wch: 14 },
  { wch: 16 },
  { wch: 30 },
  { wch: 30 }
];

const range =
XLSX.utils.decode_range(ws["!ref"]);

for(let R = range.s.r; R <= range.e.r; R++){

  for(let C = range.s.c; C <= range.e.c; C++){

    const cellRef =
    XLSX.utils.encode_cell({
      r:R,
      c:C
    });

    if(!ws[cellRef])
    continue;

    ws[cellRef].s = {
      font:{
        name:"Calibri",
        sz:11
      },
      alignment:{
        vertical:"center",
        horizontal:C === 1 ? "left" : "center"
      },
      border:

R <= 3

?

{}

:

{
  top:{style:"thin",color:{rgb:"D1D5DB"}},
  bottom:{style:"thin",color:{rgb:"D1D5DB"}},
  left:{style:"thin",color:{rgb:"D1D5DB"}},
  right:{style:"thin",color:{rgb:"D1D5DB"}}
}
    };

   if(R === 4){

  ws[cellRef].s = {
    font:{
      name:"Calibri",
      sz:11,
      bold:true,
      color:{rgb:"FFFFFF"}
    },
    fill:{
      fgColor:{rgb:"0F172A"}
    },
    alignment:{
      vertical:"center",
      horizontal:"center"
    },
    border:{
      top:{style:"thin",color:{rgb:"0F172A"}},
      bottom:{style:"thin",color:{rgb:"0F172A"}},
      left:{style:"thin",color:{rgb:"0F172A"}},
      right:{style:"thin",color:{rgb:"0F172A"}}
    }
  };

}

    const isi =
    String(ws[cellRef].v || "");

if(R === 0){

  ws[cellRef].s = {
    font:{
      name:"Calibri",
      sz:16,
      bold:true,
      color:{rgb:"0F172A"}
    },
    alignment:{
      vertical:"center",
      horizontal:"center"
    }
  };

}

if(R === 1){

  ws[cellRef].s = {
    font:{
      name:"Calibri",
      sz:11,
      italic:true,
      color:{rgb:"475569"}
    },
    alignment:{
      vertical:"center",
      horizontal:"center"
    }
  };

}

if(R === 2){

  ws[cellRef].s = {
    font:{
      name:"Calibri",
      sz:11,
      bold:true,
      color:{rgb:"0F172A"}
    },
    fill:{
      fgColor:{rgb:"E2E8F0"}
    },
    alignment:{
      vertical:"center",
      horizontal:"center"
    }
  };

}

    if(isi.startsWith("DIVISI:")){

      ws[cellRef].s = {
        font:{
          name:"Calibri",
          sz:12,
          bold:true,
          color:{rgb:"0F2A4A"}
        },
        fill:{
          fgColor:{rgb:"EAF2FB"}
        },
        alignment:{
          vertical:"center",
          horizontal:"left"
        },
        border:{
          top:{style:"thin",color:{rgb:"B6C6D8"}},
          bottom:{style:"thin",color:{rgb:"B6C6D8"}}
        }
      };

    }

    if(isi === "Hadir"){

      ws[cellRef].s.fill = {
        fgColor:{rgb:"D9F2D9"}
      };

      ws[cellRef].s.font = {
        name:"Calibri",
        bold:true,
        color:{rgb:"006100"}
      };

    }

    if(isi === "Tidak Hadir"){

      ws[cellRef].s.fill = {
        fgColor:{rgb:"FDE2E2"}
      };

      ws[cellRef].s.font = {
        name:"Calibri",
        bold:true,
        color:{rgb:"991B1B"}
      };

    }

  }

}

ws["!rows"] = aoa.map((row, index)=>{

  if(index === 0){
    return { hpt:28 };
  }

  if(index === 1){
    return { hpt:22 };
  }

  if(index === 2){
    return { hpt:24 };
  }

  if(index === 4){
    return { hpt:24 };
  }

  if(
    String(row[1] || "")
    .startsWith("DIVISI:")
  ){
    return { hpt:24 };
  }

  return { hpt:22 };

});

const tanggalMatch =
hari.match(/\d{2}\/\d{2}\/\d{4}/);

const namaSheet =
tanggalMatch
  ?
  tanggalMatch[0].replaceAll("/", "-")
  :
  "Absensi";

XLSX.utils.book_append_sheet(
  wb,
  ws,
  namaSheet
);

});

XLSX.writeFile(
  wb,
  `laporan-${start}-sampai-${end}.xlsx`
);

  }
);
btnAmbilLokasi.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Browser tidak mendukung GPS.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (posisi) => {
      settingLatitude.value = posisi.coords.latitude;
      settingLongitude.value = posisi.coords.longitude;

      alert("Lokasi berhasil diambil ✅");
    },
    () => {
      alert("Gagal mengambil lokasi. Pastikan izin lokasi aktif.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
});

btnSimpanLokasi.addEventListener("click", async () => {
  const nama = settingNamaLokasi.value.trim();
  const latitude = Number(settingLatitude.value);
  const longitude = Number(settingLongitude.value);
  const radius = Number(settingRadius.value);

  if (!nama || !latitude || !longitude || !radius) {
    alert("Lengkapi semua data lokasi.");
    return;
  }

  try {
    await setDoc(doc(db, "settings", "lokasi"), {
      nama,
      latitude,
      longitude,
      radius,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser.uid
    });

    alert("Setting lokasi berhasil disimpan ✅");

  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan setting lokasi.");
  }
});
isiFilterDivisi();
isiDivisiRelawan();
isiManualDivisi();
isiDatabaseDivisi();
initFilterHari();

migrasiDivisiLama().finally(() => {
  loadAbsensiDariTanggal(filterHari.value);
});
