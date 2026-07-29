import jsPDF from 'jspdf';

export const generatePartnerPDF = (user, partner) => {
  if (!user || !partner) return;
  
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Latar Belakang (Dark Premium Theme)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Aksen Gradient Atas
  doc.setFillColor(139, 92, 246); // #8b5cf6 (Purple)
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  // Border Emas / Premium
  doc.setDrawColor(217, 119, 6); // #d97706
  doc.setLineWidth(2);
  doc.rect(20, 40, pageWidth - 40, pageHeight - 80, 'S');
  
  // Judul Sertifikat
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT KEPUTUSAN MITRA', pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('FREEWITHRIDHO - Premium Source Code Marketplace', pageWidth / 2, 125, { align: 'center' });
  
  // Garis Pemisah
  doc.setDrawColor(51, 65, 85); // #334155
  doc.setLineWidth(1);
  doc.line(60, 150, pageWidth - 60, 150);
  
  // Konten Utama
  doc.setTextColor(241, 245, 249); // #f1f5f9
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const textBody = `Dengan ini kami menyatakan bahwa pendaftaran kemitraan atas nama:`;
  doc.text(textBody, 60, 200);
  
  // Data Mitra
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(250, 204, 21); // #facc15 (Yellow)
  doc.text(user.displayName || (user.email.split('@')[0]), 60, 235);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 245, 249);
  doc.text(`Email: ${user.email}`, 60, 255);
  if (partner.phone) {
    doc.text(`No. WhatsApp: ${partner.phone}`, 60, 275);
  }
  
  // Status & Keputusan
  const approvalDate = partner.updatedAt ? new Date(partner.updatedAt.seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('id-ID');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const body2 = [
    `Telah kami evaluasi dan dinyatakan RESMI DITERIMA sebagai Mitra (Partner)`,
    `di platform FREEWITHRIDHO sejak tanggal ${approvalDate}.`,
    ``,
    `Sebagai Mitra resmi, Anda kini memiliki hak penuh untuk:`,
    `- Mengunggah dan menjual Source Code original karya Anda.`,
    `- Mendapatkan komisi sebesar 70% dari setiap penjualan produk Anda.`,
    `- Menarik saldo penghasilan (Withdrawal) sesuai ketentuan platform.`,
    `- Mendapatkan dukungan prioritas dari tim FREEWITHRIDHO.`,
    ``,
    `Surat ini merupakan bukti sah persetujuan kemitraan digital. Kami berharap`,
    `kerjasama ini dapat memberikan manfaat maksimal bagi kedua belah pihak.`
  ];
  
  doc.text(body2, 60, 320);
  
  // TTD Section
  doc.setFontSize(12);
  doc.setTextColor(241, 245, 249);
  doc.text('Hormat Kami,', pageWidth - 160, 500, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Admin FREEWITHRIDHO', pageWidth - 160, 580, { align: 'center' });
  
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 220, 565, pageWidth - 100, 565);
  
  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Dokumen ini dicetak otomatis pada ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, pageHeight - 50, { align: 'center' });
  doc.text(`Dokumen ini sah dan tidak memerlukan tanda tangan basah.`, pageWidth / 2, pageHeight - 35, { align: 'center' });
  
  // Save PDF
  doc.save(`Sertifikat_Mitra_${user.displayName || user.email.split('@')[0]}.pdf`);
};
