import fs from 'fs';
import PDFDocument from 'pdfkit';

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('Dokumen_Flow_Transaksi_Midtrans.pdf'));

// Title
doc.fontSize(20).text('Dokumen Flow Transaksi Midtrans', { align: 'center' });
doc.fontSize(16).fillColor('#4338ca').text('FREEWITHRIDHO (Platform Premium Source Code)', { align: 'center' });
doc.moveDown(3);

// Step 1
doc.fontSize(14).fillColor('#333').text('1. Halaman Pemilihan Produk (Katalog)');
doc.fontSize(11).fillColor('#666').text('Pengguna melihat daftar produk dan harga. Saat tombol "Beli Sekarang" ditekan, pengguna akan diarahkan ke halaman Checkout.');
doc.moveDown(1);
doc.image('C:/Users/User/.gemini/antigravity-ide/brain/0daf7bd8-bf17-484a-8076-5af40e4218ce/flow_step_1_catalog_1785484838348.png', {
  fit: [450, 300],
  align: 'center',
  valign: 'center'
});
doc.addPage();

// Step 2
doc.fontSize(14).fillColor('#333').text('2. Halaman Checkout');
doc.fontSize(11).fillColor('#666').text('Pengguna dapat memeriksa rincian pesanan dan memasukkan kode promo. Saat tombol "Lanjutkan ke Pembayaran" ditekan, sistem menghubungi API Midtrans untuk mendapatkan snapToken.');
doc.moveDown(1);
doc.image('C:/Users/User/.gemini/antigravity-ide/brain/0daf7bd8-bf17-484a-8076-5af40e4218ce/flow_step_2_checkout_1785484858946.png', {
  fit: [450, 300],
  align: 'center',
  valign: 'center'
});
doc.addPage();

// Step 3
doc.fontSize(14).fillColor('#333').text('3. Popup Pembayaran Midtrans (Snap)');
doc.fontSize(11).fillColor('#666').text('Popup pembayaran Midtrans akan muncul dengan berbagai opsi (QRIS, Bank Transfer, E-Wallet). Transaksi direkam di database dengan status PENDING.');
doc.moveDown(1);
doc.image('C:/Users/User/.gemini/antigravity-ide/brain/0daf7bd8-bf17-484a-8076-5af40e4218ce/flow_step_3_midtrans_1785484871751.png', {
  fit: [450, 300],
  align: 'center',
  valign: 'center'
});
doc.addPage();

// Step 4
doc.fontSize(14).fillColor('#333').text('4. Pembayaran Berhasil & Produk Terbuka');
doc.fontSize(11).fillColor('#666').text('Setelah pembayaran berhasil dibayar (Webhook dikonfirmasi dari Midtrans ke Backend), status berubah menjadi PAID dan pembeli dapat mengunduh source code secara instan.');
doc.moveDown(1);
doc.image('C:/Users/User/.gemini/antigravity-ide/brain/0daf7bd8-bf17-484a-8076-5af40e4218ce/flow_step_4_success_1785484882725.png', {
  fit: [450, 300],
  align: 'center',
  valign: 'center'
});

doc.end();

console.log('PDF berhasil dibuat: Dokumen_Flow_Transaksi_Midtrans.pdf');
