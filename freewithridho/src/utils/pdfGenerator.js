import { jsPDF } from 'jspdf';

/**
 * Generates a PDF for partner registration/approval.
 * 
 * @param {Object} data - The partner data object.
 * @param {string} data.fullName - Applicant's full name.
 * @param {string} data.email - Applicant's email.
 * @param {string} data.phone - Applicant's phone number.
 * @param {string} data.portfolio - Applicant's portfolio link.
 * @param {string} data.skills - Applicant's skills.
 * @param {string} data.reason - Reason for joining.
 * @param {string} data.status - 'pending' or 'approved'.
 * @param {string} [data.id] - Partner application ID / Ticket ID.
 * @param {string} [data.applicantSignature] - Base64 string of applicant's signature.
 * @param {string} [data.adminSignature] - Base64 string of admin's signature.
 * @param {string} [data.adminName] - Name of the admin who approved.
 */
export const generatePartnerPDF = (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  // Colors
  const primaryColor = [15, 23, 42]; // slate-900

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('FREEWITHRIDHO', 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Bukti Registrasi Kemitraan Developer', 15, 27);
  doc.text('Hubungi Kami: partner@freewithridho.com', 15, 33);

  // Document Stamp ID (Right top)
  const stampId = data.id || `PRT-${Date.now().toString().slice(-8)}`;
  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241); // Indigo Accent
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRASI PARTNER', pageWidth - 15, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID Tiket: ${stampId}`, pageWidth - 15, 27, { align: 'right' });
  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Tanggal: ${dateStr}`, pageWidth - 15, 33, { align: 'right' });

  // Decorative Line
  doc.setFillColor(99, 102, 241);
  doc.rect(6, 44, pageWidth - 12, 2, 'F');

  let currentY = 60;

  // Introduction text
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  
  if (data.status === 'approved') {
    doc.text('Selamat! Pendaftaran Anda sebagai mitra pengembang di platform kami telah DISETUJUI. Berikut adalah ringkasan data formulir pendaftaran Anda:', 15, currentY, { maxWidth: pageWidth - 30 });
  } else {
    doc.text('Terima kasih telah mendaftar sebagai mitra pengembang di platform kami. Berikut adalah ringkasan data formulir pendaftaran Anda:', 15, currentY, { maxWidth: pageWidth - 30 });
  }

  currentY += 12;

  // Draw data details container box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, currentY, pageWidth - 30, 95, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, currentY, pageWidth - 30, 95, 2, 2, 'D');

  // Details Content inside box
  const drawRow = (label, value, yOffset) => {
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yOffset);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    
    const splitValue = doc.splitTextToSize(value || '-', pageWidth - 90);
    doc.text(splitValue, 70, yOffset);
    return splitValue.length * 5; // Return calculated dynamic Y height delta
  };

  let rowY = currentY + 8;
  drawRow('Nama Lengkap', data.fullName, rowY);
  rowY += 10;
  drawRow('Alamat Email', data.email, rowY);
  rowY += 10;
  drawRow('Nomor WhatsApp', data.phone, rowY);
  rowY += 10;
  drawRow('Link Portofolio', data.portfolio, rowY);
  rowY += 10;
  drawRow('Keahlian / Skills', data.skills, rowY);
  rowY += 10;

  // Alasan Bergabung (can be multiline, handled dynamically)
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('Alasan Bergabung', 20, rowY);
  
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  const reasonText = doc.splitTextToSize(data.reason || '-', pageWidth - 90);
  doc.text(reasonText, 70, rowY);

  currentY += 110;

  // Terms notice box at bottom ONLY if pending
  if (data.status === 'pending') {
    doc.setFillColor(239, 68, 68, 0.05); // light red/orange alert box
    doc.setDrawColor(239, 68, 68, 0.25);
    doc.roundedRect(15, currentY, pageWidth - 30, 24, 2, 2, 'F');
    doc.roundedRect(15, currentY, pageWidth - 30, 24, 2, 2, 'D');

    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('CATATAN PENTING & VERIFIKASI:', 20, currentY + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(127, 29, 29);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Pendaftaran Anda saat ini berstatus PENDING dan sedang diverifikasi oleh administrator.', 20, currentY + 11);
    doc.text('2. Tim kami akan menghubungi Anda melalui email atau nomor WhatsApp di atas dalam waktu 1-3 hari kerja.', 20, currentY + 16);
    
    currentY += 40; // Add spacing for signatures below the box
  } else {
    currentY += 10; // Less spacing needed if no box
  }

  // Signatures
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  
  // Admin Signature Area
  doc.text('Hormat kami,', 15, currentY);
  
  if (data.status === 'approved' && data.adminSignature) {
    try {
      doc.addImage(data.adminSignature, 'PNG', 15, currentY + 2, 40, 20);
    } catch (e) {
      console.warn("Failed to add admin signature image", e);
    }
  }

  // Applicant Signature Area
  doc.text('Calon Partner,', pageWidth - 60, currentY);
  
  if (data.applicantSignature) {
    try {
      doc.addImage(data.applicantSignature, 'PNG', pageWidth - 60, currentY + 2, 40, 20);
    } catch (e) {
      console.warn("Failed to add applicant signature image", e);
    }
  }

  currentY += 25;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  
  // Admin Name
  if (data.status === 'approved' && data.adminName) {
    doc.text(data.adminName, 15, currentY);
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Administrator / FREEWITHRIDHO Team', 15, currentY + 4);
  } else {
    doc.text('FREEWITHRIDHO Team', 15, currentY);
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Verifikasi Sistem Digital', 15, currentY + 4);
  }

  // Applicant Name
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.fullName, pageWidth - 60, currentY);
  
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Tanda Tangan Digital', pageWidth - 60, currentY + 4);

  // Save document
  const fileName = `Pendaftaran_Partner_${data.fullName.replace(/\s+/g, '_')}${data.status === 'approved' ? '_Approved' : ''}.pdf`;
  doc.save(fileName);
};
