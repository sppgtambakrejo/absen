// payroll.js

import { db, auth } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  addDoc,
Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("Payroll aktif");

const payrollBody = document.getElementById("payrollBody");
const btnLoadPayroll = document.getElementById("btnLoadPayroll");
const tanggalAwalInput = document.getElementById("tanggalAwal");
const tanggalAkhirInput = document.getElementById("tanggalAkhir");
const checkAll = document.getElementById("checkAll");
const btnPrintSelected = document.getElementById("btnPrintSelected");
const btnPrintAll = document.getElementById("btnPrintAll");
const btnSimpanPayroll =
document.getElementById("btnSimpanPayroll");
const gajiDivisiList = document.getElementById("gajiDivisiList");
const gajiRelawanList = document.getElementById("gajiRelawanList");
const grandTotalPayroll =
document.getElementById("grandTotalPayroll");

let dataPayroll = [];

const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];
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

let semuaRelawan = [];
let semuaGajiDivisi = {};
let semuaPayrollRelawan = {};
async function loadSettingPayroll() {

  // LOAD GAJI DIVISI
  const snapshotDivisi =
  await getDocs(collection(db, "gajiDivisi"));

  semuaGajiDivisi = {};

  snapshotDivisi.forEach((doc) => {

    const data = doc.data();

    semuaGajiDivisi[data.divisi] =
    data.nominal || 0;

  });

  // LOAD PAYROLL RELAWAN
  const snapshotRelawan =
  await getDocs(collection(db, "payrollRelawan"));

  semuaPayrollRelawan = {};

  snapshotRelawan.forEach((doc) => {

    semuaPayrollRelawan[doc.id] =
    doc.data();

  });

}
async function loadRelawanPayroll() {
  const snapshot = await getDocs(collection(db, "relawan"));

  semuaRelawan = [];

 snapshot.forEach(async (dokumen) => {
    semuaRelawan.push({
      id: dokumen.id,
      ...dokumen.data()
    });
    const dataRelawan = dokumen.data();

const payrollLama =
semuaPayrollRelawan[dokumen.id];

if (payrollLama) {

  // AUTO SYNC
  if (
    payrollLama.nama !== dataRelawan.nama ||
    payrollLama.divisi !== dataRelawan.divisi ||
    payrollLama.status !== dataRelawan.status
  ) {

    await setDoc(
      doc(db, "payrollRelawan", dokumen.id),
      {
        ...payrollLama,
        nama: dataRelawan.nama || "-",
        divisi: dataRelawan.divisi || "-",
        status: dataRelawan.status || "aktif"
      }
    );

  }

}
  });

  await loadSettingPayroll();

/* reload lagi setelah sync */
await loadSettingPayroll();

renderSettingGajiDivisi();
renderSettingGajiRelawan();
}

function renderSettingGajiDivisi() {
  window.simpanGajiDivisi = async function(divisi) {
  const input = document.getElementById(`gaji-divisi-${divisi}`);
  const nominal = Number(input.value || 0);

  if (!nominal) {
    alert("Isi nominal gaji divisi dulu.");
    return;
  }

  await setDoc(doc(db, "gajiDivisi", divisi), {
    divisi,
    nominal
  });

  alert(`Gaji divisi ${divisi} berhasil disimpan ✅`);
};
  gajiDivisiList.innerHTML = DIVISI_LIST.map((divisi) => `
    <div class="setting-row">
      <label>${divisi}</label>

      <input
  type="number"
  placeholder="Nominal"
  id="gaji-divisi-${divisi}"
  value="${semuaGajiDivisi[divisi] || ""}"
>

<button onclick="simpanGajiDivisi('${divisi}')">
  Simpan
</button>
    </div>
  `).join("");
}

function renderSettingGajiRelawan() {
  if (semuaRelawan.length === 0) {
    gajiRelawanList.innerHTML = `
      <div class="empty">
        Belum ada data relawan.
      </div>
    `;
    return;
  }

  gajiRelawanList.innerHTML = semuaRelawan
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
    .map((item) => {

  const payroll =
  semuaPayrollRelawan[item.id] || {};

  return `
      <div class="relawan-gaji-row">

        <div class="relawan-gaji-info">
          <strong>${item.nama || "-"}</strong>
          <span>${item.divisi || "-"}</span>
        </div>

        <select id="mode-gaji-${item.id}">

  <option
    value="divisi"
    ${
      payroll.ikutGajiDivisi !== false
      ? "selected"
      : ""
    }
  >
    Ikut Gaji Divisi
  </option>

  <option
    value="khusus"
    ${
      payroll.ikutGajiDivisi === false
      ? "selected"
      : ""
    }
  >
    Gaji Khusus
  </option>

</select>

        <input
          type="number"
          placeholder="Gaji khusus"
          id="gaji-khusus-${item.id}"
          value="${payroll.gajiKhusus || ""}"
        >

        <button onclick="simpanGajiRelawan('${item.id}')">
          Simpan
        </button>

      </div>
    `;
}).join("");
}

window.simpanGajiRelawan = async function(id) {
  const relawan = semuaRelawan.find((item) => item.id === id);

  if (!relawan) {
    alert("Relawan tidak ditemukan.");
    return;
  }

  const mode = document.getElementById(`mode-gaji-${id}`).value;
  const gajiKhusus = Number(
    document.getElementById(`gaji-khusus-${id}`).value || 0
  );

  if (mode === "khusus" && !gajiKhusus) {
    alert("Isi gaji khusus dulu.");
    return;
  }

  await setDoc(doc(db, "payrollRelawan", id), {
    relawanId: id,
    nama: relawan.nama || "-",
    divisi: relawan.divisi || "-",
    status: relawan.status || "aktif",
    ikutGajiDivisi: mode === "divisi",
    gajiKhusus: mode === "khusus" ? gajiKhusus : 0
  });

  alert(`Setting gaji ${relawan.nama} berhasil disimpan ✅`);
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

function tanggalKeHari(tanggalValue) {
  const tanggal = new Date(`${tanggalValue}T00:00:00`);
  const namaHari = NAMA_HARI[tanggal.getDay()];
  const dd = String(tanggal.getDate()).padStart(2, "0");
  const mm = String(tanggal.getMonth() + 1).padStart(2, "0");
  const yyyy = tanggal.getFullYear();

  return `${namaHari}, ${dd}/${mm}/${yyyy}`;
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(angka || 0);
}

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

    snapshot.forEach((dokumen) => {
      hasil.push({
        id: dokumen.id,
        ...dokumen.data()
      });
    });
  }

  return hasil;
}

function buatPayroll(dataAbsensi) {
  const rekap = {};

  dataAbsensi.forEach((item) => {
    if (item.tipe !== "masuk") return;

    const id = item.relawanId || item.nama;

    const settingRelawan =
      semuaPayrollRelawan[id] || {};

    const ikutGajiDivisi =
      settingRelawan.ikutGajiDivisi !== false;

    const gajiKhusus =
      Number(settingRelawan.gajiKhusus || 0);

    const gajiDivisi =
      Number(semuaGajiDivisi[item.divisi] || 0);

    const tarif =
      ikutGajiDivisi
        ? gajiDivisi
        : gajiKhusus;

    if (!rekap[id]) {
      rekap[id] = {
        nama: item.nama || "-",
        divisi: item.divisi || "-",
        jumlahHadir: 0,
        tarif,
        totalGaji: 0,
        modeGaji: ikutGajiDivisi ? "Gaji Divisi" : "Gaji Khusus"
      };
    }

    rekap[id].jumlahHadir += 1;
  });

  Object.keys(rekap).forEach((id) => {
    rekap[id].totalGaji =
      rekap[id].jumlahHadir * rekap[id].tarif;
  });

  return Object.values(rekap).sort((a, b) =>
    a.nama.localeCompare(b.nama)
  );
}

function renderPayroll() {
  const totalSemuaGaji =
dataPayroll.reduce(
  (sum, item) =>
    sum + (item.totalGaji || 0),
  0
);

grandTotalPayroll.innerText =
formatRupiah(totalSemuaGaji);
  if (dataPayroll.length === 0) {
    grandTotalPayroll.innerText =
formatRupiah(0);
    payrollBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Belum ada data payroll
        </td>
      </tr>
    `;
    return;
  }

  payrollBody.innerHTML = dataPayroll.map((item, index) => `
    <tr>
      <td>
        <input type="checkbox" class="checkPayroll" data-index="${index}">
      </td>

      <td>${item.nama}</td>
      <td>${item.divisi}</td>
      <td>${item.jumlahHadir} hari</td>
      <td>${item.modeGaji}</td>
      <td>
  ${item.tarif > 0
    ? formatRupiah(item.tarif)
    : `<span style="color:red;font-weight:bold;">Belum diset</span>`
  }
</td>
      <td>
  <b>
    ${item.tarif > 0
      ? formatRupiah(item.totalGaji)
      : "-"
    }
  </b>
</td>

      <td>
        <button onclick="printSingleSlip(${index})">
          Print
        </button>
      </td>
    </tr>
  `).join("");
}

checkAll.addEventListener("change", () => {
  document.querySelectorAll(".checkPayroll").forEach((checkbox) => {
    checkbox.checked = checkAll.checked;
  });
});

btnLoadPayroll.addEventListener("click", async () => {
  const start = tanggalAwalInput.value;
  const end = tanggalAkhirInput.value;

  if (!start || !end) {
    alert("Pilih periode awal dan akhir dulu.");
    return;
  }


  payrollBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty">
        Memuat data payroll...
      </td>
    </tr>
  `;

  const dataAbsensi = await getAbsensiRange(start, end);

  await loadSettingPayroll();

dataPayroll = buatPayroll(dataAbsensi);

  renderPayroll();
});
function buatSlipHTML(item) {
  return `
    <div class="slip-gaji">
      <div class="slip-header">
        <h1>SLIP GAJI RELAWAN</h1>
        <p>SPPG Tambakrejo Tempel</p>
        <p>Periode: ${tanggalAwalInput.value} s/d ${tanggalAkhirInput.value}</p>
      </div>

      <div class="slip-body">
        <div class="slip-label">Nama</div>
        <div>: ${item.nama}</div>

        <div class="slip-label">Divisi</div>
        <div>: ${item.divisi}</div>

        <div class="slip-label">Jumlah Hadir</div>
        <div>: ${item.jumlahHadir} Hari</div>

        <div class="slip-label">Mode Gaji</div>
        <div>: ${item.modeGaji}</div>

        <div class="slip-label">Tarif</div>
        <div>: ${item.tarif > 0 ? formatRupiah(item.tarif) : "Belum diset"}</div>
      </div>

      <div class="slip-total">
        <div>Total Gaji</div>
        <h2>${item.tarif > 0 ? formatRupiah(item.totalGaji) : "-"}</h2>
      </div>

      <div class="slip-footer">
        <div class="ttd-box">
          Akuntan
          <div class="ttd-space"></div>
          (........................)
        </div>

        <div class="ttd-box">
          Kepala SPPG
          <div class="ttd-space"></div>
          (........................)
        </div>

        <div class="ttd-box">
          Penerima
          <div class="ttd-space"></div>
          (${item.nama})
        </div>
      </div>
    </div>
  `;
}
window.printSingleSlip = function(index) {
  const item = dataPayroll[index];
  const printArea = document.getElementById("printArea");

  printArea.innerHTML = buatSlipHTML(item);

  window.print();
};
btnPrintSelected.addEventListener("click", () => {
  const checked = document.querySelectorAll(".checkPayroll:checked");

  if (checked.length === 0) {
    alert("Pilih minimal satu relawan dulu.");
    return;
  }

  const printArea = document.getElementById("printArea");

  printArea.innerHTML = [...checked]
    .map((checkbox) => {
      const index = Number(checkbox.dataset.index);
      return buatSlipHTML(dataPayroll[index]);
    })
    .join("");

  window.print();
});

btnPrintAll.addEventListener("click", () => {
  if (dataPayroll.length === 0) {
    alert("Load payroll dulu.");
    return;
  }

  const printArea = document.getElementById("printArea");

  printArea.innerHTML = dataPayroll
    .map((item) => buatSlipHTML(item))
    .join("");

  window.print();
});
btnSimpanPayroll.addEventListener("click", async () => {

  if (dataPayroll.length === 0) {
    alert("Load payroll dulu.");
    return;
  }

  const totalPayroll =
  dataPayroll.reduce(
    (sum, item) => sum + item.totalGaji,
    0
  );

  try {

    await addDoc(
      collection(db, "payrollPeriode"),
      {
        periodeAwal:
          tanggalAwalInput.value,

        periodeAkhir:
          tanggalAkhirInput.value,

        totalRelawan:
          dataPayroll.length,

        totalPayroll,

        dibuatPada:
          Timestamp.now(),

        data:
          dataPayroll
      }
    );

    alert(
      "Payroll berhasil disimpan ✅"
    );

  } catch(error) {

    console.error(error);

    alert(
      "Gagal menyimpan payroll."
    );

  }

});
loadRelawanPayroll();