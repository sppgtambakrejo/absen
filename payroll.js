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
console.log("Payroll print template version: slip-final-v22");

const payrollBody = document.getElementById("payrollBody");
const btnLoadPayroll = document.getElementById("btnLoadPayroll");
const tanggalAwalInput = document.getElementById("tanggalAwal");
const tanggalAkhirInput = document.getElementById("tanggalAkhir");
const checkAll = document.getElementById("checkAll");
const btnPrintSelected = document.getElementById("btnPrintSelected");
const btnPrintAll = document.getElementById("btnPrintAll");
const btnExportExcel = document.getElementById("btnExportExcel");
const btnSimpanPayroll =
document.getElementById("btnSimpanPayroll");
const gajiDivisiList = document.getElementById("gajiDivisiList");
const grandTotalPayroll =
document.getElementById("grandTotalPayroll");
const detailPayrollCard = document.getElementById("detailPayrollCard");
const detailNama = document.getElementById("detailNama");
const detailPeriode = document.getElementById("detailPeriode");
const detailDaySelect = document.getElementById("detailDaySelect");
const detailHonorInput = document.getElementById("detailHonorInput");
const detailSelectedDate = document.getElementById("detailSelectedDate");
const detailSelectedHari = document.getElementById("detailSelectedHari");
const detailTotalHonor = document.getElementById("detailTotalHonor");
const btnSaveDayHonor = document.getElementById("btnSaveDayHonor");
const btnCancelDayHonor = document.getElementById("btnCancelDayHonor");
const btnCloseDetailPayroll = document.getElementById("btnCloseDetailPayroll");
const templateTitle = document.getElementById("templateTitle");
const templateSubtitle = document.getElementById("templateSubtitle");
const templateSubtitle2 = document.getElementById("templateSubtitle2");
const templatePeriodLabel = document.getElementById("templatePeriodLabel");
const templateFooterNote = document.getElementById("templateFooterNote");
const templateSigner1 = document.getElementById("templateSigner1");
const templateSigner2 = document.getElementById("templateSigner2");
const templateSigner3 = document.getElementById("templateSigner3");
const templateSigner2Signature = document.getElementById("templateSigner2Signature");
const templateSigner3Signature = document.getElementById("templateSigner3Signature");
const templateSigner2SignaturePreview = document.getElementById("templateSigner2SignaturePreview");
const templateSigner3SignaturePreview = document.getElementById("templateSigner3SignaturePreview");
const btnClearSigner2Signature = document.getElementById("btnClearSigner2Signature");
const btnClearSigner3Signature = document.getElementById("btnClearSigner3Signature");
const btnSaveSlipTemplate = document.getElementById("btnSaveSlipTemplate");
const btnResetSlipTemplate = document.getElementById("btnResetSlipTemplate");
const gajiKhususList = document.getElementById("gajiKhususList");
const gajiKhususDivisi = document.getElementById("gajiKhususDivisi");
const gajiKhususRelawan = document.getElementById("gajiKhususRelawan");
const gajiKhususLabel = document.getElementById("gajiKhususLabel");
const gajiKhususNominal = document.getElementById("gajiKhususNominal");
const btnSaveGajiKhusus = document.getElementById("btnSaveGajiKhusus");

let dataPayroll = [];
let editIndex = null;
let currentAbsensi = [];
let currentPeriode = { start: "", end: "" };

const defaultSlipTemplate = {
  templateVersion: 3,
  title: "TANDA TERIMA UPAH RELAWAN",
  subtitle: "SATUAN PELAYANAN PEMENUHAN GIZI",
  subtitle2: "LIMADUA BHAKTI BANGSA",
  periodLabel: "Periode",
  footerNote: "",
  signer1: "Penerima",
  signer2: "Akuntan",
  signer3: "Kepala SPPG",
  signer2Signature: "",
  signer3Signature: ""
};

let slipTemplate = { ...defaultSlipTemplate };

function loadSlipTemplate() {
  const saved = localStorage.getItem("slipTemplatePayroll");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const isOldDefaultTemplate =
        !parsed.templateVersion &&
        parsed.title === "SLIP GAJI RELAWAN" &&
        parsed.subtitle === "SPPG Tambakrejo Tempel";
      const isVersion2DefaultSignature =
        parsed.templateVersion === 2 &&
        parsed.signer1 === "Penerima" &&
        parsed.signer2 === "Mengetahui" &&
        parsed.signer3 === "Menyetujui";

      slipTemplate = isOldDefaultTemplate
        ? { ...defaultSlipTemplate }
        : { ...defaultSlipTemplate, ...parsed };

      if (isVersion2DefaultSignature) {
        slipTemplate.signer2 = defaultSlipTemplate.signer2;
        slipTemplate.signer3 = defaultSlipTemplate.signer3;
        slipTemplate.templateVersion = defaultSlipTemplate.templateVersion;
      }
    } catch (error) {
      slipTemplate = { ...defaultSlipTemplate };
    }
  }
  renderSlipTemplateForm();
}

function renderSlipTemplateForm() {
  if (!templateTitle) return;
  templateTitle.value = slipTemplate.title;
  templateSubtitle.value = slipTemplate.subtitle;
  templateSubtitle2.value = slipTemplate.subtitle2;
  templatePeriodLabel.value = slipTemplate.periodLabel;
  templateFooterNote.value = slipTemplate.footerNote;
  templateSigner1.value = slipTemplate.signer1;
  templateSigner2.value = slipTemplate.signer2;
  templateSigner3.value = slipTemplate.signer3;
  renderSignaturePreview(templateSigner2SignaturePreview, slipTemplate.signer2Signature);
  renderSignaturePreview(templateSigner3SignaturePreview, slipTemplate.signer3Signature);
}

function renderSignaturePreview(previewEl, signatureDataUrl) {
  if (!previewEl) return;

  if (!signatureDataUrl) {
    previewEl.classList.remove("has-signature");
    previewEl.innerHTML = "Belum ada tanda tangan";
    return;
  }

  previewEl.classList.add("has-signature");
  previewEl.innerHTML = `<img src="${signatureDataUrl}" alt="Pratinjau tanda tangan">`;
}

function clearFileInput(input) {
  if (input) input.value = "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeSignatureImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 640;
      const maxHeight = 240;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function applySignatureUpload(input, signatureKey, previewEl) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    alert("Gunakan file tanda tangan PNG, JPG, atau WEBP.");
    clearFileInput(input);
    return;
  }

  try {
    const rawDataUrl = await readFileAsDataUrl(file);
    slipTemplate[signatureKey] = await resizeSignatureImage(rawDataUrl);
    renderSignaturePreview(previewEl, slipTemplate[signatureKey]);
  } catch (error) {
    console.error("Gagal memproses tanda tangan:", error);
    alert("Gagal membaca file tanda tangan.");
  } finally {
    clearFileInput(input);
  }
}

function saveSlipTemplate() {
  slipTemplate.title = templateTitle.value || defaultSlipTemplate.title;
  slipTemplate.subtitle = templateSubtitle.value || defaultSlipTemplate.subtitle;
  slipTemplate.subtitle2 = templateSubtitle2.value || defaultSlipTemplate.subtitle2;
  slipTemplate.periodLabel = templatePeriodLabel.value || defaultSlipTemplate.periodLabel;
  slipTemplate.footerNote = templateFooterNote.value || defaultSlipTemplate.footerNote;
  slipTemplate.signer1 = templateSigner1.value || defaultSlipTemplate.signer1;
  slipTemplate.signer2 = templateSigner2.value || defaultSlipTemplate.signer2;
  slipTemplate.signer3 = templateSigner3.value || defaultSlipTemplate.signer3;
  slipTemplate.signer2Signature = slipTemplate.signer2Signature || "";
  slipTemplate.signer3Signature = slipTemplate.signer3Signature || "";

  localStorage.setItem("slipTemplatePayroll", JSON.stringify(slipTemplate));
  alert("Template slip gaji disimpan.");
}

function resetSlipTemplate() {
  slipTemplate = { ...defaultSlipTemplate };
  renderSlipTemplateForm();
  localStorage.setItem("slipTemplatePayroll", JSON.stringify(slipTemplate));
}

function renderSignatureImage(signatureDataUrl, altText) {
  if (!signatureDataUrl) return "";

  return `
    <img
      class="ttd-signature-img"
      src="${signatureDataUrl}"
      alt="${escapeHtml(altText)}"
    >
  `;
}

function formatSignerRole(label) {
  const text = String(label || "").trim();
  const parenthesized = text.match(/\(([^)]+)\)/);
  if (parenthesized) return parenthesized[1].trim();

  return text
    .replace(/^Mengetahui\s*/i, "")
    .replace(/^Menyetujui\s*/i, "")
    .trim();
}

// Modal controls for Gaji Divisi
const btnOpenGajiDivisi = document.getElementById("btnOpenGajiDivisi");
const gajiDivisiModal = document.getElementById("gajiDivisiModal");
const btnCloseGajiDivisi = document.getElementById("btnCloseGajiDivisi");
const btnCloseGajiDivisi2 = document.getElementById("btnCloseGajiDivisi2");
const btnOpenGajiKhusus = document.getElementById("btnOpenGajiKhusus");
const gajiKhususModal = document.getElementById("gajiKhususModal");
const btnCloseGajiKhusus = document.getElementById("btnCloseGajiKhusus");
const btnCloseGajiKhusus2 = document.getElementById("btnCloseGajiKhusus2");
const btnOpenSlipTemplate = document.getElementById("btnOpenSlipTemplate");
const slipTemplateModal = document.getElementById("slipTemplateModal");
const btnCloseSlipTemplate = document.getElementById("btnCloseSlipTemplate");
const btnCloseSlipTemplate2 = document.getElementById("btnCloseSlipTemplate2");

function openGajiModal() {
  if (!gajiDivisiModal) return;
  gajiDivisiModal.hidden = false;
}

function closeGajiModal() {
  if (!gajiDivisiModal) return;
  gajiDivisiModal.hidden = true;
}

function openGajiKhususModal() {
  if (!gajiKhususModal) return;
  renderGajiKhususForm();
  gajiKhususModal.hidden = false;
}

function closeGajiKhususModal() {
  if (!gajiKhususModal) return;
  gajiKhususModal.hidden = true;
}

function openSlipTemplateModal() {
  if (!slipTemplateModal) return;
  renderSlipTemplateForm();
  slipTemplateModal.hidden = false;
}

function closeSlipTemplateModal() {
  if (!slipTemplateModal) return;
  slipTemplateModal.hidden = true;
}

if (btnOpenGajiDivisi) btnOpenGajiDivisi.addEventListener("click", openGajiModal);
if (btnCloseGajiDivisi) btnCloseGajiDivisi.addEventListener("click", closeGajiModal);
if (btnCloseGajiDivisi2) btnCloseGajiDivisi2.addEventListener("click", closeGajiModal);
if (btnOpenGajiKhusus) btnOpenGajiKhusus.addEventListener("click", openGajiKhususModal);
if (btnCloseGajiKhusus) btnCloseGajiKhusus.addEventListener("click", closeGajiKhususModal);
if (btnCloseGajiKhusus2) btnCloseGajiKhusus2.addEventListener("click", closeGajiKhususModal);
if (btnOpenSlipTemplate) btnOpenSlipTemplate.addEventListener("click", openSlipTemplateModal);
if (btnCloseSlipTemplate) btnCloseSlipTemplate.addEventListener("click", closeSlipTemplateModal);
if (btnCloseSlipTemplate2) btnCloseSlipTemplate2.addEventListener("click", closeSlipTemplateModal);

const gajiBackdrop = document.querySelector('#gajiDivisiModal .modal-backdrop');
if (gajiBackdrop) gajiBackdrop.addEventListener('click', closeGajiModal);
const gajiKhususBackdrop = document.querySelector('#gajiKhususModal .modal-backdrop');
if (gajiKhususBackdrop) gajiKhususBackdrop.addEventListener('click', closeGajiKhususModal);
const slipTemplateBackdrop = document.querySelector('#slipTemplateModal .modal-backdrop');
if (slipTemplateBackdrop) slipTemplateBackdrop.addEventListener('click', closeSlipTemplateModal);

if (btnSaveSlipTemplate) btnSaveSlipTemplate.addEventListener("click", saveSlipTemplate);
if (btnResetSlipTemplate) btnResetSlipTemplate.addEventListener("click", resetSlipTemplate);
if (templateSigner2Signature) {
  templateSigner2Signature.addEventListener("change", () => {
    applySignatureUpload(
      templateSigner2Signature,
      "signer2Signature",
      templateSigner2SignaturePreview
    );
  });
}
if (templateSigner3Signature) {
  templateSigner3Signature.addEventListener("change", () => {
    applySignatureUpload(
      templateSigner3Signature,
      "signer3Signature",
      templateSigner3SignaturePreview
    );
  });
}
if (btnClearSigner2Signature) {
  btnClearSigner2Signature.addEventListener("click", () => {
    slipTemplate.signer2Signature = "";
    renderSignaturePreview(templateSigner2SignaturePreview, "");
    clearFileInput(templateSigner2Signature);
  });
}
if (btnClearSigner3Signature) {
  btnClearSigner3Signature.addEventListener("click", () => {
    slipTemplate.signer3Signature = "";
    renderSignaturePreview(templateSigner3SignaturePreview, "");
    clearFileInput(templateSigner3Signature);
  });
}
loadSlipTemplate();

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
let semuaGajiKhusus = {};
let holidayDates = new Set();
async function loadSettingPayroll() {

  console.log("loadSettingPayroll: mulai memuat setting gaji dan tanggal merah...");

  // LOAD GAJI DIVISI
  const snapshotDivisi =
  await getDocs(collection(db, "gajiDivisi"));

  semuaGajiDivisi = {};

  snapshotDivisi.forEach((doc) => {

    const data = doc.data();

    semuaGajiDivisi[data.divisi] =
    data.nominal || 0;

  });

  const snapshotKhusus =
  await getDocs(collection(db, "gajiKhusus"));

  semuaGajiKhusus = {};

  snapshotKhusus.forEach((dokumen) => {
    const data = dokumen.data();
    const relawanId = data.relawanId || dokumen.id;
    if (!relawanId) return;

    semuaGajiKhusus[relawanId] = {
      relawanId,
      nama: data.nama || "",
      divisi: data.divisi || "",
      label: data.label || "Gaji Khusus",
      nominal: Number(data.nominal || 0)
    };
  });

  // Load public holidays (tanggal merah) from Firestore collection 'tanggalMerah'
  try {
    const snapshotHolidays = await getDocs(collection(db, "tanggalMerah"));
    holidayDates = new Set();
    snapshotHolidays.forEach((h) => {
      const d = h.data().tanggal || h.id; // expected format 'YYYY-MM-DD'
      if (d) holidayDates.add(String(d));
    });
    console.log("loadSettingPayroll: tanggal merah dimuat, count=", holidayDates.size);
  } catch (e) {
    holidayDates = new Set();
    console.warn("loadSettingPayroll: gagal memuat tanggal merah", e);
  }

  console.log("loadSettingPayroll: gaji divisi count=", Object.keys(semuaGajiDivisi).length);
  console.log("loadSettingPayroll: gaji khusus count=", Object.keys(semuaGajiKhusus).length);

}
async function loadRelawanPayroll() {
  const snapshot = await getDocs(collection(db, "relawan"));

  semuaRelawan = [];

  snapshot.forEach((dokumen) => {
    semuaRelawan.push({
      id: dokumen.id,
      ...dokumen.data()
    });
  });

  await loadSettingPayroll();

  renderSettingGajiDivisi();
  renderGajiKhususForm();
  renderSettingGajiKhusus();
}

function renderSettingGajiDivisi() {
  gajiDivisiList.innerHTML = DIVISI_LIST.map((divisi) => `
    <div class="setting-row">
      <label for="gaji-divisi-${escapeHtml(divisi)}">${escapeHtml(divisi)}</label>

      <input
        type="number"
        min="0"
        placeholder="Nominal"
        id="gaji-divisi-${escapeHtml(divisi)}"
        data-divisi="${escapeHtml(divisi)}"
        value="${semuaGajiDivisi[divisi] || ""}"
      >

      <button type="button" data-action="save-gaji-divisi" data-divisi="${escapeHtml(divisi)}">
        Simpan
      </button>
    </div>
  `).join("");
}

gajiDivisiList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='save-gaji-divisi']");
  if (!button) return;

  const divisi = button.dataset.divisi;
  const input = button.closest(".setting-row")?.querySelector("input");
  const nominal = Number(input?.value || 0);

  if (nominal <= 0) {
    alert("Isi nominal gaji divisi dulu.");
    return;
  }

  button.disabled = true;
  button.innerText = "Menyimpan...";

  try {
    await setDoc(doc(db, "gajiDivisi", divisi), {
      divisi,
      nominal
    });

    semuaGajiDivisi[divisi] = nominal;
    alert(`Gaji divisi ${divisi} berhasil disimpan.`);
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan gaji divisi.");
  } finally {
    button.disabled = false;
    button.innerText = "Simpan";
  }
});

function getRelawanByDivisi(divisi) {
  return semuaRelawan
    .filter((item) => !divisi || item.divisi === divisi)
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
}

function renderGajiKhususForm() {
  if (!gajiKhususDivisi || !gajiKhususRelawan) return;

  gajiKhususDivisi.innerHTML = `
    <option value="">Pilih divisi</option>
    ${DIVISI_LIST.map((divisi) => `
      <option value="${escapeHtml(divisi)}">${escapeHtml(divisi)}</option>
    `).join("")}
  `;

  renderRelawanGajiKhususOptions();
}

function renderRelawanGajiKhususOptions() {
  if (!gajiKhususRelawan) return;

  const divisi = gajiKhususDivisi?.value || "";
  const relawanList = getRelawanByDivisi(divisi);

  gajiKhususRelawan.innerHTML = `
    <option value="">Pilih relawan</option>
    ${relawanList.map((item) => `
      <option value="${escapeHtml(item.id)}">${escapeHtml(item.nama || "-")}</option>
    `).join("")}
  `;

  fillSelectedGajiKhusus();
}

function fillSelectedGajiKhusus() {
  if (!gajiKhususRelawan || !gajiKhususLabel || !gajiKhususNominal) return;

  const setting = semuaGajiKhusus[gajiKhususRelawan.value];
  gajiKhususLabel.value = setting?.label || "";
  gajiKhususNominal.value = setting?.nominal || "";
}

function renderSettingGajiKhusus() {
  if (!gajiKhususList) return;

  const rows = Object.values(semuaGajiKhusus)
    .sort((a, b) => {
      const divisiOrder = DIVISI_LIST.indexOf(a.divisi) - DIVISI_LIST.indexOf(b.divisi);
      if (divisiOrder !== 0) return divisiOrder;
      return (a.nama || "").localeCompare(b.nama || "");
    });

  if (rows.length === 0) {
    gajiKhususList.innerHTML = `
      <div class="empty">Belum ada setting gaji khusus.</div>
    `;
    return;
  }

  gajiKhususList.innerHTML = rows.map((item) => `
    <div class="setting-row gaji-khusus-row">
      <label>
        ${escapeHtml(item.nama || "-")}
        <span>${escapeHtml(item.divisi || "-")} | ${escapeHtml(item.label || "Gaji Khusus")}</span>
      </label>
      <strong>${formatRupiah(item.nominal || 0)}</strong>
    </div>
  `).join("");
}

if (gajiKhususDivisi) {
  gajiKhususDivisi.addEventListener("change", () => {
    renderRelawanGajiKhususOptions();
  });
}

if (gajiKhususRelawan) {
  gajiKhususRelawan.addEventListener("change", fillSelectedGajiKhusus);
}

if (btnSaveGajiKhusus) {
  btnSaveGajiKhusus.addEventListener("click", async () => {
    const divisi = gajiKhususDivisi.value;
    const relawanId = gajiKhususRelawan.value;
    const label = gajiKhususLabel.value.trim();
    const nominal = Number(gajiKhususNominal.value || 0);
    const relawan = semuaRelawan.find((item) => item.id === relawanId);

    if (!divisi || !relawanId || !label || nominal <= 0) {
      alert("Lengkapi divisi, nama relawan, nama gaji khusus, dan nominal.");
      return;
    }

    if (!relawan) {
      alert("Data relawan tidak ditemukan.");
      return;
    }

    btnSaveGajiKhusus.disabled = true;
    btnSaveGajiKhusus.innerText = "Menyimpan...";

    try {
      const data = {
        relawanId,
        nama: relawan.nama || "",
        divisi,
        label,
        nominal
      };

      await setDoc(doc(db, "gajiKhusus", relawanId), data);

      semuaGajiKhusus[relawanId] = data;
      gajiKhususLabel.value = "";
      gajiKhususNominal.value = "";
      renderSettingGajiKhusus();

      if (dataPayroll.length > 0) {
        dataPayroll = buatPayroll(currentAbsensi);
        renderPayroll();
      }

      alert(`Gaji khusus ${relawan.nama} berhasil disimpan.`);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan gaji khusus.");
    } finally {
      btnSaveGajiKhusus.disabled = false;
      btnSaveGajiKhusus.innerText = "Simpan";
    }
  });
}

onAuthStateChanged(auth, (user) => {
  console.log("onAuthStateChanged: user=", user && user.uid ? user.uid : user);
  if (!user) {
    console.warn("User tidak terautentikasi, redirect ke login.html");
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

function tanggalDariHari(hariValue) {
  const match = String(hariValue || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return "";

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getKeteranganTidakHadir(absensi) {
  const keterangan = String(absensi?.keterangan || "").trim();
  return keterangan || "";
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(angka || 0);
}

function formatRupiahSlip(angka) {
  return `Rp${Number(angka || 0).toLocaleString("id-ID")}`;
}

function formatTanggalPendek(tanggalValue) {
  if (!tanggalValue) return "-";

  const tanggal = new Date(`${tanggalValue}T00:00:00`);
  const dd = String(tanggal.getDate()).padStart(2, "0");
  const mm = String(tanggal.getMonth() + 1).padStart(2, "0");
  const yyyy = tanggal.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

function formatPeriodeSlip(start, end) {
  if (!start || !end) return "-";
  return `${formatTanggalPendek(start)} - ${formatTanggalPendek(end)}`;
}

function terbilangRupiah(nilai) {
  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas"
  ];

  function sebut(angka) {
    angka = Math.floor(Number(angka || 0));

    if (angka < 12) return satuan[angka];
    if (angka < 20) return `${sebut(angka - 10)} Belas`;
    if (angka < 100) return `${sebut(Math.floor(angka / 10))} Puluh ${sebut(angka % 10)}`;
    if (angka < 200) return `Seratus ${sebut(angka - 100)}`;
    if (angka < 1000) return `${sebut(Math.floor(angka / 100))} Ratus ${sebut(angka % 100)}`;
    if (angka < 2000) return `Seribu ${sebut(angka - 1000)}`;
    if (angka < 1000000) return `${sebut(Math.floor(angka / 1000))} Ribu ${sebut(angka % 1000)}`;
    if (angka < 1000000000) return `${sebut(Math.floor(angka / 1000000))} Juta ${sebut(angka % 1000000)}`;
    return `${sebut(Math.floor(angka / 1000000000))} Miliar ${sebut(angka % 1000000000)}`;
  }

  const hasil = sebut(nilai).replace(/\s+/g, " ").trim();
  return hasil ? `${hasil} Rupiah` : "Nol Rupiah";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getAbsensiRange(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  const hasilById = new Map();

  function simpanAbsensi(dokumen, tanggalPeriode) {
    const data = dokumen.data();
    const tanggalJadwal = tanggalDariHari(data.hari) || tanggalPeriode;
    const tanggalRealtime = data.tanggal || "";

    hasilById.set(dokumen.id, {
      id: dokumen.id,
      ...data,
      tanggalJadwal,
      tanggalRealtime,
      tanggalPayroll: tanggalJadwal
    });
  }

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

    const qHari = query(
      collection(db, "absensi"),
      where("hari", "==", hariFormatted)
    );

    try {
      const snapshotHari = await getDocs(qHari);
      console.log("getAbsensiRange: query by 'hari'", tanggal, "-> docs:", snapshotHari.size);
      snapshotHari.forEach((dokumen) => simpanAbsensi(dokumen, tanggal));
    } catch (err) {
      console.error("getAbsensiRange: error querying", tanggal, err);
    }
  }

  return Array.from(hasilById.values());
}

function buatPayroll(dataAbsensi) {
  const rekap = {};
  const hadirTerhitung = new Set();

  dataAbsensi.forEach((item) => {
    if (item.tipe !== "masuk") return;

    const id = item.relawanId || item.nama;
    const tanggalPayroll =
      item.tanggalPayroll ||
      tanggalDariHari(item.hari) ||
      item.tanggal ||
      "-";
    const tanggalJadwal = item.tanggalJadwal || tanggalDariHari(item.hari) || tanggalPayroll;
    const hadirKey = `${id}|${tanggalPayroll}`;

    if (hadirTerhitung.has(hadirKey)) return;
    hadirTerhitung.add(hadirKey);

    const gajiKhusus = semuaGajiKhusus[id];
    const gajiDivisi = Number(semuaGajiDivisi[item.divisi] || 0);
    const tarif = gajiKhusus?.nominal > 0
      ? Number(gajiKhusus.nominal)
      : gajiDivisi;
    const modeGaji = gajiKhusus?.nominal > 0
      ? gajiKhusus.label || "Gaji Khusus"
      : "Gaji Divisi";

    if (!rekap[id]) {
      rekap[id] = {
        relawanId: id,
        nama: item.nama || "-",
        divisi: item.divisi || "-",
        jumlahHadir: 0,
        tarif,
        totalGaji: 0,
        modeGaji,
        isGajiKhusus: Boolean(gajiKhusus?.nominal > 0),
        gajiKhususLabel: gajiKhusus?.label || "",
        honorPerDay: {},
        absensiDetails: []
      };
    }

    rekap[id].jumlahHadir += 1;
    rekap[id].absensiDetails.push({
      tanggal: tanggalPayroll,
      tanggalJadwal,
      hari: item.hari || "-",
      honor: tarif
    });
  });

  Object.keys(rekap).forEach((id) => {
    const item = rekap[id];
    item.absensiDetails.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    item.jumlahHadir = item.absensiDetails.length;
    item.totalGaji = hitungTotalGaji(item);
  });

  const getDivisiOrder = (divisi) => {
    const index = DIVISI_LIST.indexOf(divisi);
    return index === -1 ? DIVISI_LIST.length : index;
  };

  return Object.values(rekap).sort((a, b) => {
    const divisiOrder = getDivisiOrder(a.divisi) - getDivisiOrder(b.divisi);
    if (divisiOrder !== 0) return divisiOrder;
    return a.nama.localeCompare(b.nama);
  });
}

function hitungTotalGaji(item) {
  const honorTotal = item.absensiDetails.reduce((sum, detail) => {
    const honorDay = getHonorHarian(item, detail);
    return sum + honorDay;
  }, 0);
  return honorTotal;
}

function getHonorHarian(item, detail) {
  if (!detail) return 0;

  const honorEdit = item.honorPerDay?.[detail.tanggal];
  if (honorEdit !== undefined && honorEdit !== null && honorEdit !== "") {
    return Number(honorEdit || 0);
  }

  const honorDetail = Number(detail.honor || 0);
  if (honorDetail > 0) return honorDetail;

  return Number(item.tarif || 0);
}

function renderPayroll() {
  checkAll.checked = false;

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

  const divisions = [...new Set(dataPayroll.map((item) => item.divisi))];
  const orderedDivisions = [
    ...DIVISI_LIST.filter((divisi) => divisions.includes(divisi)),
    ...divisions.filter((divisi) => !DIVISI_LIST.includes(divisi))
  ];

  const rowsHtml = orderedDivisions
    .map((divisi) => {
      const items = dataPayroll
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.divisi === divisi);
      if (!items.length) return "";

      const sectionRows = [`
        <tr class="division-header">
          <td colspan="8">Divisi: ${escapeHtml(divisi)}</td>
        </tr>
      `];

      sectionRows.push(
        ...items.map(({ item, index }) => {
          return `
            <tr>
              <td>
                <input type="checkbox" class="checkPayroll" data-index="${index}">
              </td>
              <td>${escapeHtml(item.nama)}</td>
              <td>${escapeHtml(item.divisi)}</td>
              <td>${item.jumlahHadir} hari</td>
              <td>${escapeHtml(item.modeGaji)}</td>
              <td>
                ${item.tarif > 0
                    ? formatRupiah(item.tarif)
                    : `<span style="color:red;font-weight:bold;">Belum diset</span>`
                }
              </td>
              <td>
                <b>
                  ${item.totalGaji > 0
                    ? formatRupiah(item.totalGaji)
                    : "-"
                  }
                </b>
              </td>
              <td class="row-actions">
                <button type="button" data-action="edit-day-honor" data-index="${index}">Edit Hari</button>
                <button type="button" data-action="print-single-slip" data-index="${index}">Print</button>
              </td>
            </tr>
          `;
        })
      );

      return sectionRows.join("");
    })
    .join("");

  payrollBody.innerHTML = rowsHtml;
}

payrollBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const index = Number(button.dataset.index);
  if (button.dataset.action === "edit-day-honor") {
    window.showEditDayHonorForm(index);
  }

  if (button.dataset.action === "print-single-slip") {
    window.printSingleSlip(index);
  }
});

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

  if (start > end) {
    alert("Periode awal tidak boleh lebih besar dari periode akhir.");
    return;
  }


  payrollBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty">
        Memuat data payroll...
      </td>
    </tr>
  `;

  try {
    console.log("Memulai load payroll", start, end);
    if (!auth || !auth.currentUser) {
      alert("Anda belum login. Silakan login lalu coba lagi.");
      console.warn("btnLoadPayroll: user not authenticated", auth && auth.currentUser);
      return;
    }
    const dataAbsensi = await getAbsensiRange(start, end);

    await loadSettingPayroll();

    currentAbsensi = dataAbsensi;
    currentPeriode = { start, end };
    dataPayroll = buatPayroll(dataAbsensi);

    renderPayroll();
  } catch (err) {
    console.error("Gagal memuat payroll:", err);
    payrollBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty error">
          Gagal memuat payroll: ${err && err.message ? err.message : String(err)}
        </td>
      </tr>
    `;
  }
});


function buatSlipHTML(item) {
  // helper: build list of dates between periode start and end
  function buildDates(start, end) {
    const out = [];
    if (!start || !end) return out;
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      const namaHari = NAMA_HARI[d.getDay()];
      out.push({ iso, namaHari, pretty: `${dd}/${mm}/${yyyy}` });
    }
    return out;
  }

  const periodeDates = buildDates(currentPeriode.start, currentPeriode.end);
  const detailHonorUtama = item.absensiDetails.find((detail) => getHonorHarian(item, detail) > 0);
  const honorHarianSlip = detailHonorUtama
    ? getHonorHarian(item, detailHonorUtama)
    : Number(item.tarif || 0) || (
        item.jumlahHadir > 0
          ? Math.round(Number(item.totalGaji || 0) / item.jumlahHadir)
          : 0
      );

  const tidakHadirByTanggal = new Map();
  currentAbsensi.forEach((absensi) => {
    const relawanKey = absensi.relawanId || absensi.nama;
    if (relawanKey !== item.relawanId) return;
    if (absensi.tipe !== "tidak_hadir") return;

    const tanggalTidakHadir =
      absensi.tanggalPayroll ||
      absensi.tanggalJadwal ||
      tanggalDariHari(absensi.hari) ||
      absensi.tanggal;
    const keterangan = getKeteranganTidakHadir(absensi);

    if (tanggalTidakHadir && keterangan) {
      tidakHadirByTanggal.set(tanggalTidakHadir, keterangan);
    }
  });

  const rows = periodeDates
    .map((d) => {
      const hadirDetail = item.absensiDetails.find((ad) => ad.tanggal === d.iso);
      const keteranganTidakHadir = tidakHadirByTanggal.get(d.iso);
      const statusAbsensi = hadirDetail
        ? "Hadir"
        : keteranganTidakHadir || "-";
      const honorTanggal = hadirDetail ? getHonorHarian(item, hadirDetail) : 0;
      return `<tr>
        <td>${escapeHtml(d.pretty)}</td>
        <td class="slip-center">${escapeHtml(d.namaHari)}</td>
        <td class="slip-center">${escapeHtml(statusAbsensi)}</td>
        <td class="slip-center">${formatRupiahSlip(honorTanggal)}</td>
      </tr>`;
    })
    .join("");

  const hadirCount = item.absensiDetails.length || 0;
  const periodeText = formatPeriodeSlip(currentPeriode.start, currentPeriode.end);
  const totalGaji = Number(item.totalGaji || 0);
  const totalTerbilang = slipTemplate.footerNote.trim()
    || terbilangRupiah(totalGaji);

  return `
    <div class="slip-gaji">
      <div class="slip-sheet">
        <div class="slip-sheet-head">
          <div class="slip-brand">
            <img src="logo.png" alt="">
            <div>
              <strong>${escapeHtml(slipTemplate.subtitle)}</strong>
              <strong>${escapeHtml(slipTemplate.subtitle2)}</strong>
            </div>
          </div>

          <div class="slip-receipt-title">
            <strong>${escapeHtml(slipTemplate.title)}</strong>
            <div>
              <span>No. Slip</span>
              <b>: ${escapeHtml((item.relawanId || item.nama || "-").slice(0, 10))}</b>
            </div>
            <div>
              <span>${escapeHtml(slipTemplate.periodLabel)}</span>
              <b>: ${escapeHtml(periodeText)}</b>
            </div>
          </div>
        </div>

        <div class="slip-summary">
          <div><span>Nama Relawan</span><b>${escapeHtml(item.nama)}</b></div>
          <div><span>Posisi/Divisi</span><b>${escapeHtml(item.divisi)}</b></div>
          <div><span>Jenis Gaji</span><b>${escapeHtml(item.modeGaji || "-")}</b></div>
          <div><span>Jumlah Hadir</span><b>${hadirCount} Hari</b></div>
          <div><span>Honor Harian</span><b>${formatRupiahSlip(honorHarianSlip)}</b></div>
          <div><span>Total Diterima</span><b>${formatRupiahSlip(totalGaji)}</b></div>
        </div>

        <table class="slip-days-table">
        <colgroup>
          <col style="width: 24%">
          <col style="width: 22%">
          <col style="width: 24%">
          <col style="width: 30%">
        </colgroup>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Hari</th>
            <th>Absensi</th>
            <th>Penerimaan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="slip-grand-row">
            <td colspan="3">Total Nominal Diterima</td>
            <td class="slip-center">${formatRupiahSlip(totalGaji)}</td>
          </tr>
        </tbody>
      </table>

        <div class="slip-terbilang">${escapeHtml(totalTerbilang)}</div>
        <div class="slip-terms">
          Slip ini dibuat berdasarkan rekap absensi periode ${escapeHtml(periodeText)} dan menjadi bukti penerimaan upah relawan.
        </div>

        <div class="slip-footer">
          <div class="ttd-box">
            <span class="ttd-title">${escapeHtml(slipTemplate.signer1)}</span>
            <div class="ttd-space"></div>
            <strong>${escapeHtml(item.nama)}</strong>
          </div>

          <div class="ttd-box">
            <span class="ttd-title">Mengetahui,</span>
            <div class="ttd-space">
              ${renderSignatureImage(slipTemplate.signer2Signature, `Tanda tangan ${formatSignerRole(slipTemplate.signer2)}`)}
            </div>
            <strong>${escapeHtml(formatSignerRole(slipTemplate.signer2))}</strong>
          </div>

          <div class="ttd-box">
            <span class="ttd-title">Menyetujui,</span>
            <div class="ttd-space">
              ${renderSignatureImage(slipTemplate.signer3Signature, `Tanda tangan ${formatSignerRole(slipTemplate.signer3)}`)}
            </div>
            <strong>${escapeHtml(formatSignerRole(slipTemplate.signer3))}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.showEditDayHonorForm = function(index) {
  const item = dataPayroll[index];
  if (!item) return;

  editIndex = index;
  detailNama.innerText = item.nama || "-";
  detailPeriode.innerText = `${currentPeriode.start || "-"} s/d ${currentPeriode.end || "-"}`;

  // populate select with absensiDetails
  detailDaySelect.innerHTML = (item.absensiDetails || []).map((d, idx) => `
    <option value="${idx}">${d.tanggal} - ${d.hari}</option>
  `).join("");

  detailDaySelect.disabled = (item.absensiDetails || []).length === 0;
  detailDaySelect.value = 0;

  const selectedDetail = (item.absensiDetails || [])[0];
  detailSelectedDate.innerText = selectedDetail ? `Tanggal: ${selectedDetail.tanggal}` : "Tanggal: -";
  detailSelectedHari.innerText = selectedDetail ? `Hari: ${selectedDetail.hari}` : "Hari: -";
  detailHonorInput.value = selectedDetail
    ? getHonorHarian(item, selectedDetail)
    : 0;

  detailTotalHonor.innerText = formatRupiah(calculateDetailTotalHonor(item, Number(detailHonorInput.value || 0)));
  detailPayrollCard.hidden = false;
};


function hideDetailPayrollForm() {
  detailPayrollCard.hidden = true;
}

function getSelectedDetailIndex() {
  return Number(detailDaySelect.value || 0);
}

function calculateDetailTotalHonor(item, draftValue = null) {
  const selectedIndex = getSelectedDetailIndex();
  return item.absensiDetails.reduce((sum, detail, index) => {
    const honorValue = index === selectedIndex && draftValue !== null
      ? draftValue
      : getHonorHarian(item, detail);
    return sum + honorValue;
  }, 0);
}

function updateSelectedDetailFields(item) {
  const selectedDetail = item.absensiDetails[getSelectedDetailIndex()];
  if (!selectedDetail) return;

  detailSelectedDate.innerText = `Tanggal: ${selectedDetail.tanggal}`;
  detailSelectedHari.innerText = `Hari: ${selectedDetail.hari}`;
  detailHonorInput.value = getHonorHarian(item, selectedDetail);
  detailTotalHonor.innerText = formatRupiah(calculateDetailTotalHonor(item, Number(detailHonorInput.value || 0)));
}

detailDaySelect.addEventListener("change", () => {
  const item = dataPayroll[editIndex];
  if (!item) return;
  updateSelectedDetailFields(item);
});

detailHonorInput.addEventListener("input", () => {
  const item = dataPayroll[editIndex];
  if (!item) return;
  detailTotalHonor.innerText = formatRupiah(calculateDetailTotalHonor(item, Number(detailHonorInput.value || 0)));
});

btnSaveDayHonor.addEventListener("click", () => {
  if (editIndex === null) return;

  const item = dataPayroll[editIndex];
  const selectedDetail = item.absensiDetails[getSelectedDetailIndex()];
  if (!item) return;

  if (selectedDetail) {
    item.honorPerDay[selectedDetail.tanggal] = Number(detailHonorInput.value || 0);
  }

  item.totalGaji = hitungTotalGaji(item);
  renderPayroll();
  hideDetailPayrollForm();
});

btnCancelDayHonor.addEventListener("click", () => {
  hideDetailPayrollForm();
});

if (btnCloseDetailPayroll) btnCloseDetailPayroll.addEventListener("click", hideDetailPayrollForm);

// single buatSlipHTML function is defined earlier; duplicate removed
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

function createExcelContent(rows, periodLabel, grandTotal) {
  const title = "Laporan Payroll Relawan";
  const generatedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const tableRows = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.nama)}</td>
        <td>${escapeHtml(row.divisi)}</td>
        <td>${row.jumlahHadir}</td>
        <td>${escapeHtml(row.modeGaji)}</td>
        <td>${escapeHtml(row.tarif)}</td>
        <td>${escapeHtml(row.totalGaji)}</td>
      </tr>
    `)
    .join("");

  return '\ufeff' + `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #888; padding: 8px; }
          th { background: #f3f4f6; font-weight: bold; }
          .title { font-size: 18pt; font-weight: bold; }
          .summary { margin: 8px 0 16px; }
          .total-row td { font-weight: bold; background: #eef2ff; }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="summary">${periodLabel}</div>
        <div class="summary">Tanggal Export: ${generatedAt}</div>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Divisi</th>
              <th>Jumlah Hadir</th>
              <th>Keterangan Gaji</th>
              <th>Tarif</th>
              <th>Total Gaji</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="5">Grand Total Gaji</td>
              <td>${grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadExcelFile(filename, content) {
  const blob = new Blob([content], {
    type: "application/vnd.ms-excel"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatExcelValue(amount) {
  return amount > 0 ? formatRupiah(amount) : "0";
}

btnExportExcel.addEventListener("click", () => {
  if (dataPayroll.length === 0) {
    alert("Load payroll dulu sebelum export Excel.");
    return;
  }

  const periodLabel = `Periode: ${currentPeriode.start} s/d ${currentPeriode.end}`;
  const grandTotal = formatExcelValue(
    dataPayroll.reduce((sum, item) => sum + (item.totalGaji || 0), 0)
  );

  const rows = dataPayroll.map((item) => ({
    nama: item.nama,
    divisi: item.divisi,
    jumlahHadir: item.jumlahHadir,
    modeGaji: item.modeGaji,
    tarif: formatExcelValue(item.tarif),
    totalGaji: formatExcelValue(item.totalGaji)
  }));

  const excelContent = createExcelContent(rows, periodLabel, grandTotal);
  downloadExcelFile(`Payroll-${currentPeriode.start}-sampai-${currentPeriode.end}.xls`, excelContent);
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
      "Payroll berhasil disimpan."
    );

  } catch(error) {

    console.error(error);

    alert(
      "Gagal menyimpan payroll."
    );

  }

});
loadRelawanPayroll();
