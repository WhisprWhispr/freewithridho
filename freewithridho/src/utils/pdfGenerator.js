import jsPDF from 'jspdf';

// Helper: Load logo PNG (transparent) from public folder as base64 for jsPDF
const loadLogoBase64 = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/FREEWITHRIDHO.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
  });
};

export const generatePartnerPDF = async (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.width;   // 210
  const ph = doc.internal.pageSize.height;  // 297
  const ML = 15; // Margin Left
  const MR = 15; // Margin Right
  const contentW = pw - ML - MR;

  // --- Load logo ---
  const logoBase64 = await loadLogoBase64();

  // ===================== HEADER =====================
  // Background gelap
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pw, 55, 'F');
  
  // Garis emas bawah header
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 55, pw, 1.5, 'F');

  // Logo (Image removed by request)

  // Nama platform & deskripsi (kanan logo)
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('FREEWITHRIDHO', ML + 40, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Premium Source Code Marketplace', ML + 40, 31);
  doc.text('partner@freewithridho.com  |  freewithridho.com', ML + 40, 37);

  // Judul dokumen + SKU (di kanan)
  const stampId = data.id || `PRT-${Date.now().toString().slice(-8)}`;
  const sku = `FWR-REG-${stampId}`;

  doc.setFontSize(11);
  doc.setTextColor(250, 204, 21);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMULIR REGISTRASI MITRA', pw - MR, 22, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. SKU: ${sku}`, pw - MR, 29, { align: 'right' });

  const tglStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Tanggal: ${tglStr}`, pw - MR, 35, { align: 'right' });

  const statusLabel = data.status === 'approved' ? 'DISETUJUI' : 'PENDING';
  const statusColor = data.status === 'approved' ? [16, 185, 129] : [245, 158, 11];
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(`Status: ${statusLabel}`, pw - MR, 42, { align: 'right' });

  // ===================== JUDUL SECTION =====================
  let y = 65;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DATA PEMOHON KEMITRAAN', ML, y);
  
  // Garis bawah judul section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 2, pw - MR, y + 2);

  y += 8;

  // ===================== TABEL DATA =====================
  const tableRows = [
    { label: 'Nama Lengkap',     value: data.fullName  || '-' },
    { label: 'Alamat Email',     value: data.email     || '-' },
    { label: 'Nomor WhatsApp',   value: data.phone     || '-' },
    { label: 'Link Portofolio',  value: data.portfolio || '-' },
    { label: 'Keahlian / Skills',value: data.skills    || '-' },
    { label: 'Alasan Bergabung', value: data.reason    || '-' },
  ];

  const LABEL_W  = 45;
  const VALUE_X  = ML + LABEL_W + 5;
  const VALUE_W  = contentW - LABEL_W - 5;
  const ROW_PAD  = 4;

  doc.setFillColor(248, 250, 252);
  
  let totalH = 0;
  const rowHeights = tableRows.map(row => {
    const lines = doc.splitTextToSize(row.value, VALUE_W).length;
    return Math.max(lines * 5, 8) + ROW_PAD * 2;
  });
  totalH = rowHeights.reduce((a, b) => a + b, 0);

  doc.roundedRect(ML, y, contentW, totalH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, contentW, totalH, 2, 2, 'D');

  let ry = y;
  tableRows.forEach((row, i) => {
    const rh = rowHeights[i];
    const textY = ry + ROW_PAD + 4;

    if (i % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(ML + 0.3, ry + 0.3, contentW - 0.6, rh - 0.3, 'F');
    }

    doc.setFillColor(226, 232, 240);
    doc.rect(ML + 0.3, ry + 0.3, LABEL_W, rh - 0.3, 'F');

    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(row.label, ML + 3, textY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(row.value, VALUE_W);
    doc.text(lines, VALUE_X, textY);

    if (i < tableRows.length - 1) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(ML, ry + rh, ML + contentW, ry + rh);
    }

    ry += rh;
  });

  y = ry + 8;

  // ===================== CATATAN STATUS =====================
  if (data.status === 'pending') {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, contentW, 22, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('CATATAN PENTING & VERIFIKASI:', ML + 4, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 29, 29);
    doc.text('1. Pendaftaran Anda saat ini berstatus PENDING dan sedang diverifikasi secara menyeluruh oleh administrator.', ML + 4, y + 12);
    doc.text('2. Tim operasional kami akan menghubungi Anda melalui email atau nomor WhatsApp di atas dalam waktu 1-3 hari kerja.', ML + 4, y + 17);

    y += 28;
  } else {
    y += 6;
  }

  // ===================== TANDA TANGAN =====================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PERSETUJUAN & TANDA TANGAN', ML, y);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 2, pw - MR, y + 2);
  y += 6;

  const sigBoxW  = (contentW - 10) / 2;
  const sigBoxH  = 45;
  const leftX    = ML;
  const rightX   = ML + sigBoxW + 10;

  // TTD Admin (kiri)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, y, sigBoxW, sigBoxH, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Menyetujui,', leftX + sigBoxW / 2, y + 6, { align: 'center' });
  doc.text('Administrator Platform', leftX + sigBoxW / 2, y + 11, { align: 'center' });

  if (data.status === 'approved' && data.adminSignature) {
    try {
      doc.addImage(data.adminSignature, 'PNG', leftX + 15, y + 14, sigBoxW - 30, 22);
    } catch (e) { console.warn('Admin sig error:', e); }
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(leftX + 8, y + sigBoxH - 6, leftX + sigBoxW - 8, y + sigBoxH - 6);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const adminLabel = (data.status === 'approved' && data.adminName) ? data.adminName : 'Tim Verifikasi FREEWITHRIDHO';
  doc.text(adminLabel, leftX + sigBoxW / 2, y + sigBoxH - 2, { align: 'center' });

  // TTD Pemohon (kanan)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, sigBoxW, sigBoxH, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Pemohon Kemitraan,', rightX + sigBoxW / 2, y + 6, { align: 'center' });
  doc.text('Calon Mitra', rightX + sigBoxW / 2, y + 11, { align: 'center' });

  if (data.applicantSignature) {
    try {
      doc.addImage(data.applicantSignature, 'PNG', rightX + 15, y + 14, sigBoxW - 30, 22);
    } catch (e) { console.warn('Applicant sig error:', e); }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(rightX + 8, y + sigBoxH - 6, rightX + sigBoxW - 8, y + sigBoxH - 6);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.fullName || 'Pemohon', rightX + sigBoxW / 2, y + sigBoxH - 2, { align: 'center' });

  // ===================== FOOTER =====================
  doc.setFillColor(217, 119, 6);
  doc.rect(0, ph - 16, pw, 0.8, 'F');

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Dicetak otomatis oleh sistem FREEWITHRIDHO pada ${new Date().toLocaleString('id-ID')}  |  SKU Document: ${sku}`,
    pw / 2, ph - 10, { align: 'center' }
  );
  doc.text('Dokumen ini sah secara digital dan tidak memerlukan tanda tangan basah.', pw / 2, ph - 5, { align: 'center' });

  // Save
  const fileName = `Pendaftaran_Partner_${(data.fullName || 'partner').replace(/\s+/g, '_')}${data.status === 'approved' ? '_Approved' : ''}.pdf`;
  doc.save(fileName);
};

// SERTIFIKAT KEMITRAAN (LANDSCAPE & PREMIUM)
export const generatePartnerCertificatePDF = async (user, partner) => {
  if (!user || !partner) return;
  
  // Use Landscape mode (l)
  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Latar Belakang (Dark Premium Theme)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Aksen Gradient Kiri dan Kanan (Simulasi dengan kotak warna)
  doc.setFillColor(139, 92, 246); // Purple
  doc.rect(0, 0, 20, pageHeight, 'F');
  doc.setFillColor(217, 119, 6); // Gold
  doc.rect(pageWidth - 20, 0, 20, pageHeight, 'F');
  
  // Border Dalam Emas / Premium
  doc.setDrawColor(217, 119, 6); // Gold
  doc.setLineWidth(3);
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80, 'S');
  
  // Border Tipis Dalam
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(45, 45, pageWidth - 90, pageHeight - 90, 'S');

  // Load logo real
  const logoBase64 = await loadLogoBase64();

  // Logo di tengah atas sertifikat (Image removed by request)
  
  // SKU RESMI (Top Right)
  const stampId = partner.id || `PRT-${Date.now().toString().slice(-8)}`;
  const sku = `SKU RESMI: FWR-CERT-${stampId}`;
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'bold');
  doc.text(sku, pageWidth - 60, 65, { align: 'right' });
  
  // Judul Sertifikat (geser ke bawah untuk kasih ruang logo)
  doc.setTextColor(250, 204, 21); // Yellow/Gold
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('SERTIFIKAT KEMITRAAN RESMI', pageWidth / 2, 155, { align: 'center', charSpace: 2 });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 245, 249); // White-ish
  doc.text('Diberikan secara resmi oleh FREEWITHRIDHO kepada:', pageWidth / 2, 180, { align: 'center' });
  
  // Nama Mitra (Sangat Besar)
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const partnerName = user.displayName || user.email.split('@')[0];
  doc.text(partnerName.toUpperCase(), pageWidth / 2, 250, { align: 'center' });
  
  // Garis Bawah Nama
  const nameWidth = doc.getTextWidth(partnerName.toUpperCase());
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(2);
  doc.line((pageWidth - nameWidth) / 2 - 20, 265, (pageWidth + nameWidth) / 2 + 20, 265);

  // Email / Kontak Mitra
  doc.setFontSize(14);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID Pengguna: ${user.email}`, pageWidth / 2, 290, { align: 'center' });
  
  // Status & Keputusan (Paragraf Tengah yang Lebar)
  const approvalDate = partner.updatedAt ? new Date(partner.updatedAt.seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('id-ID');
  
  doc.setFontSize(14);
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'normal');
  
  const bodyText = `Sertifikat ini mengesahkan bahwa individu yang namanya tercantum di atas telah memenuhi segala persyaratan operasional dan kualitas, serta dinyatakan secara sah sebagai MITRA PENGEMBANG PROFESIONAL (Verified Developer Partner) di platform FREEWITHRIDHO terhitung sejak ${approvalDate}. Mitra memiliki hak istimewa penuh untuk mempublikasikan, menjual karya cipta digital, serta meraih pendapatan mandiri melalui ekosistem kami.`;
  
  const splitBody = doc.splitTextToSize(bodyText, pageWidth - 160);
  doc.text(splitBody, pageWidth / 2, 340, { align: 'center', lineHeightFactor: 1.5 });
  
  // TTD Section (Bawah)
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  
  // Tanggal Terbit (Kiri)
  doc.text('Diterbitkan Di:', 100, 460);
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.text('Medan, Indonesia', 100, 480);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Tanggal: ${approvalDate}`, 100, 500);

  // TTD Admin (Kanan)
  doc.text('Mengesahkan,', pageWidth - 100, 440, { align: 'center' });
  
  if (partner.adminSignature) {
    try {
      // Perbesar ukuran tanda tangan untuk landscape
      doc.addImage(partner.adminSignature, 'PNG', pageWidth - 160, 450, 120, 60);
    } catch (e) {
      console.warn("Failed to add admin signature image", e);
    }
  }

  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.text('Chief Executive Officer', pageWidth - 100, 520, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('FREEWITHRIDHO TEAM', pageWidth - 100, 540, { align: 'center' });
  
  // Stempel Digital / Badge
  doc.setFillColor(217, 119, 6);
  doc.circle(pageWidth / 2, 490, 30, 'F');
  doc.setFillColor(15, 23, 42);
  doc.circle(pageWidth / 2, 490, 27, 'F');
  doc.setTextColor(250, 204, 21);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL', pageWidth / 2, 487, { align: 'center' });
  doc.text('PARTNER', pageWidth / 2, 499, { align: 'center' });

  // Save PDF
  doc.save(`Sertifikat_Kemitraan_Resmi_${partnerName.replace(/\s+/g, '_')}.pdf`);
};
