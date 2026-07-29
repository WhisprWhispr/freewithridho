import jsPDF from 'jspdf';

// Fungsi bantuan untuk menggambar logo vector "FWR"
const drawVectorLogo = (doc, x, y, scale = 1) => {
  doc.setFillColor(217, 119, 6); // Gold
  doc.rect(x, y, 15 * scale, 15 * scale, 'F');
  doc.setFillColor(139, 92, 246); // Purple
  doc.rect(x + 10 * scale, y + 10 * scale, 15 * scale, 15 * scale, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12 * scale);
  doc.setFont('helvetica', 'bold');
  doc.text('FWR', x + 28 * scale, y + 18 * scale);
};

export const generatePartnerPDF = (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryColor = [15, 23, 42]; // slate-900

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Vector Logo in Header
  drawVectorLogo(doc, 15, 15, 0.8);

  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('FREEWITHRIDHO', 50, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Formulir Registrasi Kemitraan Developer Profesional', 50, 29);
  doc.text('Email: partner@freewithridho.com | Web: freewithridho.com', 50, 35);

  // Document Stamp ID (Right top)
  const stampId = data.id || `PRT-${Date.now().toString().slice(-8)}`;
  const sku = `SKU: FWR-REG-${stampId}`;
  
  doc.setFontSize(12);
  doc.setTextColor(250, 204, 21); // Yellow Accent
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRASI MITRA', pageWidth - 15, 22, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.text(sku, pageWidth - 15, 29, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Tanggal: ${dateStr}`, pageWidth - 15, 35, { align: 'right' });

  // Decorative Line
  doc.setFillColor(217, 119, 6); // Gold
  doc.rect(0, 50, pageWidth, 2, 'F');

  let currentY = 65;

  // Introduction text
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  
  if (data.status === 'approved') {
    doc.text('Selamat! Pendaftaran Anda sebagai mitra pengembang di platform FREEWITHRIDHO telah DISETUJUI. Berikut adalah rincian lengkap dari data formulir pendaftaran Anda:', 15, currentY, { maxWidth: pageWidth - 30 });
  } else {
    doc.text('Terima kasih telah mendaftar sebagai mitra pengembang di platform FREEWITHRIDHO. Berikut adalah rincian lengkap dari data formulir pendaftaran Anda yang sedang kami proses:', 15, currentY, { maxWidth: pageWidth - 30 });
  }

  currentY += 15;

  // Draw data details container box (Wider and taller to fill the screen)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, currentY, pageWidth - 20, 130, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(10, currentY, pageWidth - 20, 130, 3, 3, 'D');

  // Details Content inside box
  const drawRow = (label, value, yOffset) => {
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, yOffset);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    
    // Make text area wider
    const splitValue = doc.splitTextToSize(value || '-', pageWidth - 70);
    doc.text(splitValue, 60, yOffset);
    return splitValue.length * 6; // Return calculated dynamic Y height delta
  };

  let rowY = currentY + 12;
  rowY += drawRow('Nama Lengkap', data.fullName, rowY) + 6;
  rowY += drawRow('Alamat Email', data.email, rowY) + 6;
  rowY += drawRow('Nomor WhatsApp', data.phone, rowY) + 6;
  rowY += drawRow('Link Portofolio', data.portfolio, rowY) + 6;
  rowY += drawRow('Keahlian / Skills', data.skills, rowY) + 6;
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Alasan Bergabung', 15, rowY);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  const reasonText = doc.splitTextToSize(data.reason || '-', pageWidth - 70);
  doc.text(reasonText, 60, rowY);

  currentY += 140;

  // Terms notice box at bottom ONLY if pending
  if (data.status === 'pending') {
    doc.setFillColor(239, 68, 68, 0.05); // light red/orange alert box
    doc.setDrawColor(239, 68, 68, 0.25);
    doc.roundedRect(10, currentY, pageWidth - 20, 24, 2, 2, 'F');
    doc.roundedRect(10, currentY, pageWidth - 20, 24, 2, 2, 'D');

    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('CATATAN PENTING & VERIFIKASI:', 15, currentY + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(127, 29, 29);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Pendaftaran Anda saat ini berstatus PENDING dan sedang diverifikasi secara menyeluruh oleh administrator.', 15, currentY + 11);
    doc.text('2. Tim operasional kami akan menghubungi Anda melalui email atau nomor WhatsApp di atas dalam waktu 1-3 hari kerja.', 15, currentY + 16);
    
    currentY += 35;
  } else {
    currentY += 10;
  }

  // Signatures Section (Centered and well-spaced)
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  
  // Admin Signature Area (Left)
  doc.text('Menyetujui,', 40, currentY, { align: 'center' });
  doc.text('Administrator Platform', 40, currentY + 5, { align: 'center' });
  
  if (data.status === 'approved' && data.adminSignature) {
    try {
      doc.addImage(data.adminSignature, 'PNG', 15, currentY + 10, 50, 25);
    } catch (e) {
      console.warn("Failed to add admin signature image", e);
    }
  }

  // Applicant Signature Area (Right)
  doc.text('Pemohon Kemitraan,', pageWidth - 40, currentY, { align: 'center' });
  doc.text('Calon Mitra', pageWidth - 40, currentY + 5, { align: 'center' });
  
  if (data.applicantSignature) {
    try {
      doc.addImage(data.applicantSignature, 'PNG', pageWidth - 65, currentY + 10, 50, 25);
    } catch (e) {
      console.warn("Failed to add applicant signature image", e);
    }
  }

  currentY += 45;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  
  // Admin Name
  if (data.status === 'approved' && data.adminName) {
    doc.text(data.adminName, 40, currentY, { align: 'center' });
    doc.setDrawColor(148, 163, 184);
    doc.line(15, currentY + 2, 65, currentY + 2);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Tim Verifikasi FREEWITHRIDHO', 40, currentY + 7, { align: 'center' });
  } else {
    doc.text('Tim FREEWITHRIDHO', 40, currentY, { align: 'center' });
    doc.setDrawColor(148, 163, 184);
    doc.line(15, currentY + 2, 65, currentY + 2);
  }

  // Applicant Name
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.fullName, pageWidth - 40, currentY, { align: 'center' });
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 65, currentY + 2, pageWidth - 15, currentY + 2);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Tanda Tangan Digital Sah', pageWidth - 40, currentY + 7, { align: 'center' });

  // Footer (Always at bottom)
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Dicetak dari sistem pada ${new Date().toLocaleString('id-ID')} | SKU Document: ${sku}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save document
  const fileName = `Pendaftaran_Partner_${data.fullName.replace(/\s+/g, '_')}${data.status === 'approved' ? '_Approved' : ''}.pdf`;
  doc.save(fileName);
};


// KSERTIFIKAT KEMITRAAN (LANDSCAPE & PREMIUM)
export const generatePartnerCertificatePDF = (user, partner) => {
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

  // Vector Logo in Center Top
  drawVectorLogo(doc, pageWidth / 2 - 15, 65, 1.2);
  
  // SKU RESMI (Top Right)
  const stampId = partner.id || `PRT-${Date.now().toString().slice(-8)}`;
  const sku = `SKU RESMI: FWR-CERT-${stampId}`;
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'bold');
  doc.text(sku, pageWidth - 60, 65, { align: 'right' });
  
  // Judul Sertifikat
  doc.setTextColor(250, 204, 21); // Yellow/Gold
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('SERTIFIKAT KEMITRAAN RESMI', pageWidth / 2, 140, { align: 'center', charSpace: 2 });
  
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
  doc.text('Jakarta, Indonesia', 100, 480);
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
