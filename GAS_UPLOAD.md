# Google Apps Script: Endpoint untuk menyimpan tanda tangan ke Google Drive

File ini berisi contoh `Code.gs` untuk di-deploy sebagai Web App (Google Apps Script) yang menerima POST JSON berisi `dataUrl` (base64 image), menyimpan file ke Google Drive, dan mengembalikan metadata file.

---

## Code.gs (contoh)

```javascript
function doPost(e) {
  try {
    var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};

    // Keamanan sederhana: ganti secret ini dan gunakan token di client
    var ALLOWED_TOKEN = 'REPLACE_WITH_SECRET';
    var token = body.token || '';
    if (ALLOWED_TOKEN && token !== ALLOWED_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ success:false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var dataUrl = body.dataUrl || '';
    if (!dataUrl) {
      throw new Error('Missing dataUrl');
    }

    var match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL');
    }

    var contentType = match[1];
    var base64 = match[3];
    var bytes = Utilities.base64Decode(base64);

    // Set folder ID tujuan (ganti dengan folder Anda)
    var FOLDER_ID = 'REPLACE_FOLDER_ID';
    var filename = body.filename || ('sig_' + new Date().getTime() + '.png');

    var blob = Utilities.newBlob(bytes, contentType, filename);
    var file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);

    var meta = {
      url: file.getUrl(),
      id: file.getId(),
      timestamp: new Date().toISOString(),
      signer: body.signer || null
    };

    return ContentService
      .createTextOutput(JSON.stringify({ success:true, meta: meta }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success:false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Langkah deploy (singkat)

- Buka https://script.google.com dan buat "New project".
- Paste kode `Code.gs` di atas.
- Ubah `REPLACE_WITH_SECRET` dan `REPLACE_FOLDER_ID` sesuai kebutuhan.
- Klik `Deploy` → `New deployment` → pilih `Web app`.
- Set `Who has access` ke `Anyone` atau `Anyone with Google account` (pilih sesuai kebutuhan).
- Klik `Deploy` dan salin `Web app URL`.

Masukkan URL tersebut ke `GAS_ENDPOINT` di `payroll.js` dan atur `USE_GAS = true`.

## Contoh pemanggilan dari client (ringkas)

```javascript
const payload = {
  dataUrl: dataUrl, // hasil canvas.toDataURL('image/png') atau hasil resize
  signer: 'Akuntan',
  filename: `sig_akuntan_${Date.now()}.png`,
  token: 'REPLACE_WITH_SECRET'
};

const res = await fetch('https://script.google.com/macros/s/XXX/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
});
const result = await res.json();
if (result.success) {
  // result.meta.url berisi link file Drive
}
```

## Catatan keamanan & kuota
- Jika endpoint di-set `Anyone`, siapa pun bisa memanggilnya jika mengetahui URL. Gunakan `token` sederhana atau batasi akses ke akun Google.
- Periksa kuota Apps Script & Drive. Untuk volume kecil (puluhan–ratus file/bulan) biasanya aman.
- Simpan juga salinan lokal (localStorage/IndexedDB) sebagai cache/backup.

---

Jika mau, saya bisa:
- bantu deploy langkah demi langkah, atau
- otomatisasi penempatan `GAS_ENDPOINT` ke `payroll.js` (hanya memasukkan URL dan mengaktifkan `USE_GAS`).

