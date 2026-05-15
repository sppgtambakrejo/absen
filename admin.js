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

const settingPanel = document.getElementById("settingPanel");
const settingNamaLokasi = document.getElementById("settingNamaLokasi");
const settingLatitude = document.getElementById("settingLatitude");
const settingLongitude = document.getElementById("settingLongitude");
const settingRadius = document.getElementById("settingRadius");
const btnAmbilLokasi = document.getElementById("btnAmbilLokasi");
const btnSimpanLokasi = document.getElementById("btnSimpanLokasi");

const menuButtons = document.querySelectorAll(
  ".menu-item, .mobile-nav button"
);

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

function formatJam(timestamp) {
  if (!timestamp) return "-";

  return timestamp.toDate().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTanggal(timestamp) {
  if (!timestamp) return "-";

  return timestamp.toDate().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function hitungDurasi(masuk, pulang) {
  if (!masuk || !pulang) return "-";

  const ms = pulang.toDate() - masuk.toDate();
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
      semuaAbsensi.push({
        id: dokumen.id,
        ...dokumen.data()
      });
    });

    renderDashboard();
  });
}

async function loadDataRelawan() {
  const snapshot = await getDocs(collection(db, "relawan"));

  semuaRelawan = [];

  snapshot.forEach((dokumen) => {
    semuaRelawan.push({
      id: dokumen.id,
      ...dokumen.data()
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

function buatRekapExport(dataHari) {

  const rekap = {};

  dataHari.forEach((data) => {

    if (!rekap[data.relawanId]) {
      rekap[data.relawanId] = {
        nama: data.nama || "-",
        divisi: data.divisi || "-",
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
        divisi: data.divisi || "-",
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
    .sort()
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

  loadDataRelawan();

} else if (text === "Setting") {

  document.querySelector(".filter-card").style.display = "none";
  document.querySelector(".stats-grid").style.display = "none";
  monitoringList.style.display = "none";

  relawanPanel.classList.remove("panel-show");
  relawanPanel.classList.add("panel-hidden");

  settingPanel.classList.remove("panel-hidden");
  settingPanel.classList.add("panel-show");

  loadSettingLokasi();

} else {

  document.querySelector(".filter-card").style.display = "flex";
  document.querySelector(".stats-grid").style.display = "grid";
  monitoringList.style.display = "block";

  relawanPanel.classList.remove("panel-show");
  relawanPanel.classList.add("panel-hidden");

  settingPanel.classList.remove("panel-show");
  settingPanel.classList.add("panel-hidden");

}
  });
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

    await loadDataRelawan();

    alert("Data relawan berhasil diperbarui ✅");
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
      hasil.push({
        id: doc.id,
        ...doc.data()
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

  const urutanA =
  DIVISI_LIST.indexOf(a.divisi);

  const urutanB =
  DIVISI_LIST.indexOf(b.divisi);

  if (urutanA !== urutanB) {
    return urutanA - urutanB;
  }

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
initFilterHari();

loadAbsensiDariTanggal(filterHari.value);
