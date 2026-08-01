import fs from 'fs';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3 });
}
function body(text) {
  return new Paragraph({ children: [new TextRun({ text, size: 24 })] });
}
function bold(text) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, size: 24 })] });
}
function italic(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, italics: true, size: 20, color: '888888' })] });
}
function spacer() {
  return new Paragraph({ text: '' });
}
function imgPlaceholder(label) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `[ ${label} ]`, bold: true, size: 22, color: 'AAAAAA' })],
    border: {
      top: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' },
      bottom: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' },
      left: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' },
      right: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' },
    },
    spacing: { before: 200, after: 200 },
  });
}

const doc = new Document({
  sections: [{
    properties: {},
    children: [

      // ─── COVER ─────────────────────────────────────────────────
      h1('Dokumen Flow Transaksi Midtrans'),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'FREEWITHRIDHO', bold: true, size: 36, color: '4338CA' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Platform Jual Beli Source Code Premium', size: 24, color: '555555' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'URL: freewithridho.netlify.app', size: 22, color: '4338CA' })],
      }),
      spacer(),
      spacer(),

      // ─── PENDAHULUAN ────────────────────────────────────────────
      h2('A. Pendahuluan'),
      body('FREEWITHRIDHO adalah platform marketplace source code premium yang memungkinkan pengguna membeli dan mengunduh proyek source code berkualitas tinggi. Integrasi pembayaran menggunakan Midtrans Snap, yang mendukung berbagai metode pembayaran populer di Indonesia.'),
      spacer(),
      bold('Metode pembayaran yang didukung:'),
      body('• QRIS (semua e-wallet)'),
      body('• GoPay / ShopeePay / OVO'),
      body('• Transfer Bank (BCA, BNI, BRI, Mandiri, Permata)'),
      body('• Kartu Kredit / Debit Visa & Mastercard'),
      body('• Indomaret / Alfamart (gerai tunai)'),
      spacer(),
      spacer(),

      // ─── STEP 1 ─────────────────────────────────────────────────
      h2('B. Alur Transaksi Step-by-Step'),
      spacer(),
      h3('Langkah 1 — Pemilihan Produk (Halaman Katalog)'),
      body('Pengguna mengunjungi halaman utama dan menelusuri katalog source code yang tersedia. Setiap produk ditampilkan dalam kartu yang memuat:'),
      body('• Judul dan deskripsi proyek'),
      body('• Harga (beserta harga diskon jika ada)'),
      body('• Teknologi yang digunakan'),
      body('• Rating dan jumlah pembeli'),
      spacer(),
      body('Pengguna menekan tombol "Beli Sekarang" pada produk yang diminati. Sistem memeriksa status login; jika belum login, pengguna akan diarahkan ke halaman login terlebih dahulu.'),
      spacer(),
      imgPlaceholder('SCREENSHOT 1 — Halaman Katalog Produk'),
      italic('Gambar 1: Tampilan halaman katalog produk FREEWITHRIDHO'),
      spacer(),
      spacer(),

      // ─── STEP 2 ─────────────────────────────────────────────────
      h3('Langkah 2 — Konfirmasi Pesanan (Halaman Checkout)'),
      body('Pengguna diarahkan ke halaman checkout yang menampilkan ringkasan pesanan secara lengkap, meliputi:'),
      body('• Nama proyek yang akan dibeli'),
      body('• Email akun pembeli'),
      body('• Harga yang harus dibayarkan'),
      spacer(),
      body('Pada tahap ini, pengguna juga dapat memasukkan Kode Promo (jika memiliki) untuk mendapatkan potongan harga. Sistem akan memvalidasi kode promo secara real-time dan menampilkan nilai diskon yang diperoleh.'),
      spacer(),
      body('Setelah pengguna menekan tombol "Lanjutkan ke Pembayaran", sistem akan:'),
      body('1. Mengirimkan data pesanan ke backend server (Express.js)'),
      body('2. Backend server membuat request ke API Midtrans'),
      body('3. Midtrans merespons dengan Snap Token yang unik'),
      spacer(),
      imgPlaceholder('SCREENSHOT 2 — Halaman Checkout'),
      italic('Gambar 2: Halaman konfirmasi pesanan dengan detail pembelian'),
      spacer(),
      spacer(),

      // ─── STEP 3 ─────────────────────────────────────────────────
      h3('Langkah 3 — Proses Pembayaran Midtrans (Snap)'),
      body('Setelah Snap Token diterima, popup Midtrans Snap muncul langsung di halaman checkout tanpa redirect ke halaman lain. Pengguna memilih metode pembayaran yang diinginkan dan mengikuti instruksi pembayaran.'),
      spacer(),
      body('Selama proses ini berlangsung, sistem akan menyimpan catatan transaksi di database (Firebase Firestore) dengan status PENDING. Jika popup ditutup sebelum pembayaran selesai, transaksi tetap tersimpan dan dapat dilanjutkan kapan saja melalui halaman Profil.'),
      spacer(),
      imgPlaceholder('SCREENSHOT 3 — Popup Pembayaran Midtrans Snap'),
      italic('Gambar 3: Popup Midtrans Snap dengan pilihan metode pembayaran'),
      spacer(),
      spacer(),

      // ─── STEP 4 ─────────────────────────────────────────────────
      h3('Langkah 4 — Konfirmasi & Akses Produk'),
      body('Setelah pembayaran berhasil dikonfirmasi oleh Midtrans, sistem backend akan menerima notifikasi Webhook dari Midtrans. Backend kemudian secara otomatis memperbarui status transaksi dari PENDING menjadi PAID di database.'),
      spacer(),
      body('Pengguna akan diarahkan ke halaman sukses dan dapat langsung:'),
      body('• Mengunduh source code yang telah dibeli'),
      body('• Melihat detail transaksi di halaman Profil → Tab "Koleksi"'),
      body('• Mendapatkan akses penuh ke semua file proyek'),
      spacer(),
      body('Notifikasi email otomatis juga dikirimkan ke alamat email pembeli sebagai bukti transaksi.'),
      spacer(),
      imgPlaceholder('SCREENSHOT 4 — Halaman Sukses & Tombol Unduh Produk'),
      italic('Gambar 4: Halaman konfirmasi pembayaran berhasil'),
      spacer(),
      spacer(),

      // ─── RINGKASAN ──────────────────────────────────────────────
      h2('C. Ringkasan Alur Sistem'),
      spacer(),
      body('Pengguna → Pilih Produk → Checkout → [Midtrans Snap] → Pembayaran → Webhook → Database Update → Akses Produk'),
      spacer(),
      spacer(),

      // ─── KEAMANAN ───────────────────────────────────────────────
      h2('D. Keamanan & Kepercayaan'),
      body('• Semua transaksi diproses oleh Midtrans yang telah bersertifikasi PCI-DSS'),
      body('• Data kartu kredit tidak pernah menyentuh server FREEWITHRIDHO'),
      body('• Setiap transaksi memiliki Order ID yang unik untuk keperluan rekonsiliasi'),
      body('• Database transaksi dilindungi oleh Firebase Security Rules'),
      spacer(),
      spacer(),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '— Dokumen ini dibuat untuk keperluan onboarding Midtrans —', italics: true, size: 20, color: '999999' })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('Dokumen_Flow_Transaksi_Midtrans.docx', buffer);
  console.log('File Word berhasil dibuat: Dokumen_Flow_Transaksi_Midtrans.docx');
});
