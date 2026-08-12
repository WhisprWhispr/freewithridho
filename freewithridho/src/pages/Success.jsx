import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, ArrowRight, Download, Package, MessageCircle, X, Copy } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import emailjs from '@emailjs/browser';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import './Success.css';

const Success = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const status = searchParams.get('status');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [transaction, setTransaction] = useState(null);
  const [project, setProject] = useState(null);
  const [verifyError, setVerifyError] = useState(false);

  // States for Developer Contact Modal
  const [showDevContactModal, setShowDevContactModal] = useState(false);
  const [developerPhone, setDeveloperPhone] = useState(null);
  
  // State for Admin Phone (Crypto Payment)
  const adminPhone = '6281275623551'; 
  const dummyCryptoAddress = 'ALAMAT-WALLET-CRYPTO-ANDA'; // Placeholder
  
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard!');
  };

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setVerifyError(true);
      return;
    }

    const verifyTransaction = async () => {
      try {
        // Cari transaksi berdasarkan merchantRef
        const q = query(
          collection(db, 'transactions'),
          where('merchantRef', '==', reference)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // Transaksi belum masuk Firestore, tunggu dulu
          setTransaction({ status: 'PENDING', merchantRef: reference });
        } else {
          let txData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          
          // --- SMART DEMO BYPASS ---
          // Smart update based on URL params (fallback)
          const urlStatus = searchParams.get('transaction_status') || searchParams.get('status');
          if (txData.status === 'PENDING' && (urlStatus === 'settlement' || urlStatus === 'capture' || urlStatus === 'success')) {
            console.warn('Smart bypass: Auto-approving because payment was successful.');
            await updateDoc(doc(db, 'transactions', snapshot.docs[0].id), { status: 'PAID' });
            txData.status = 'PAID';
          }
          // --------------------------------

          setTransaction(txData);

          // Kalau sudah PAID, fetch juga data project untuk tampilkan download link
          if (txData.status === 'PAID' && txData.projectId) {
            try {
              // Import dynamically to avoid circular dep issue
              const { getProjectById } = await import('../services/projectService');
              const projectData = await getProjectById(txData.projectId);
              setProject(projectData);

              // Referral commissions are now credited instantly when the code is saved in Profile, 
              // so we no longer do it here at checkout.
              
              // Fetch Developer Phone if packageType is hosting_domain
              if (txData.packageType === 'hosting_domain' && projectData?.ownerId) {
                try {
                  const devDoc = await getDoc(doc(db, 'users', projectData.ownerId));
                  if (devDoc.exists()) {
                    setDeveloperPhone(devDoc.data().phone || null);
                    setShowDevContactModal(true);
                  }
                } catch (e) {
                  console.error('Failed to fetch developer phone', e);
                }
              }

              // Send email if not sent yet
              if (!txData.emailSent) {
                let emailSentSuccessfully = false;

                // Try Nodemailer backend first
                try {
                  console.log('Attempting to send email via backend Nodemailer...');
                  const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      toEmail: txData.userEmail || user?.email,
                      toName: (txData.userEmail || user?.email || 'Customer').split('@')[0],
                      projectTitle: txData.projectTitle || projectData?.title || 'Source Code',
                      downloadUrl: projectData?.downloadUrl || 'Hubungi admin',
                      orderId: txData.merchantRef,
                      amount: txData.amount
                    })
                  });
                  const result = await response.json();
                  if (response.ok && result.success) {
                    emailSentSuccessfully = true;
                    console.log('Email sent successfully via backend Nodemailer!');
                  } else {
                    console.warn('Backend email failed:', result.message);
                  }
                } catch (backendErr) {
                  console.warn('Failed to send email via backend, attempting EmailJS fallback:', backendErr);
                }

                // Fallback to EmailJS if backend failed
                if (!emailSentSuccessfully) {
                  try {
                    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
                    
                    if (serviceId && templateId && publicKey) {
                      await emailjs.send(
                        serviceId,
                        templateId,
                        {
                          to_email: txData.userEmail || user?.email,
                          to_name: (txData.userEmail || user?.email || 'Customer').split('@')[0],
                          project_title: txData.projectTitle || projectData?.title || 'Source Code',
                          download_url: projectData?.downloadUrl || 'Hubungi admin',
                          order_id: txData.merchantRef,
                          amount: txData.amount?.toLocaleString('id-ID')
                        },
                        publicKey
                      );
                      emailSentSuccessfully = true;
                      console.log('Email sent successfully via EmailJS!');
                    } else {
                      console.warn('EmailJS keys not configured.');
                    }
                  } catch (emailErr) {
                    console.error('Failed to send email via EmailJS:', emailErr);
                  }
                }

                // Mark as sent in Firestore if successful
                if (emailSentSuccessfully) {
                  await updateDoc(doc(db, 'transactions', snapshot.docs[0].id), {
                    emailSent: true
                  });
                }
              }
            } catch (e) {
              console.warn('Could not fetch project data:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error verifying transaction:', err);
        // Jika gagal, tampilkan status pending
        setTransaction({ status: 'PENDING', merchantRef: reference });
      } finally {
        setVerifying(false);
      }
    };

    verifyTransaction();
  }, [reference, user]);

  // Generate & download PDF invoice
  const generateInvoicePDF = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Draw stylish border around the page
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.rect(3, 3, pdfWidth - 6, pdfHeight - 6);

    // Header Area (Deep Slate Background)
    pdf.setFillColor(15, 23, 42);
    pdf.rect(4, 4, pdfWidth - 8, 40, 'F');

    // Logo & Branding
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FREEWITHRIDHO', 10, 20);

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Premium Source Code Marketplace', 10, 26);
    pdf.text('support@freewithridho.com', 10, 31);

    // Invoice Label (Top Right)
    pdf.setFontSize(14);
    pdf.setTextColor(99, 102, 241); // Indigo accent
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE RESMI', pdfWidth - 12, 20, { align: 'right' });

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    const now = new Date();
    pdf.text(`Tanggal: ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pdfWidth - 12, 26, { align: 'right' });
    pdf.text(`Waktu: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`, pdfWidth - 12, 31, { align: 'right' });

    // Decorative Accent Line
    pdf.setFillColor(99, 102, 241);
    pdf.rect(4, 44, pdfWidth - 8, 2, 'F');

    // Body content positioning
    let currentY = 58;

    // Customer Info Card
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(10, currentY, pdfWidth - 20, 22, 2, 2, 'F');
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DITERBITKAN UNTUK:', 14, currentY + 6);
    
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.text(user?.email?.split('@')[0].toUpperCase() || 'DEVELOPER', 14, currentY + 12);
    
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(user?.email || '-', 14, currentY + 17);

    currentY += 28;

    // Transaction Details Table / List
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESKRIPSI', 12, currentY);
    pdf.text('JUMLAH', pdfWidth - 12, currentY, { align: 'right' });

    // Table Header Underline
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(10, currentY + 3, pdfWidth - 10, currentY + 3);

    currentY += 10;

    // Item Details
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    const projectTitle = project?.title || transaction?.projectTitle || 'Source Code';
    const splitTitle = pdf.splitTextToSize(projectTitle, 80);
    pdf.text(splitTitle, 12, currentY);

    // Status Badge inside item details
    pdf.setFontSize(8);
    pdf.setTextColor(16, 185, 129); // Emerald green for LUNAS
    pdf.setFillColor(209, 250, 229);
    const badgeY = currentY + (splitTitle.length * 4.5);
    pdf.roundedRect(12, badgeY, 16, 4.5, 1, 1, 'F');
    pdf.text('LUNAS', 15, badgeY + 3.5);

    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    const itemAmount = transaction?.amount || 0;
    pdf.text(`Rp ${itemAmount.toLocaleString('id-ID')}`, pdfWidth - 12, currentY + 2, { align: 'right' });

    currentY += 25;

    // Divider before total
    pdf.setDrawColor(203, 213, 225);
    pdf.line(10, currentY, pdfWidth - 10, currentY);

    currentY += 5;

    // Summary Box
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(10, currentY, pdfWidth - 20, 20, 2, 2, 'F');

    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Metode Pembayaran:', 14, currentY + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INSTANPAY (QRIS/E-Wallet)', 14, currentY + 13);

    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL AKHIR:', pdfWidth - 55, currentY + 8, { align: 'right' });
    pdf.setFontSize(12);
    pdf.setTextColor(99, 102, 241); // Indigo Total
    pdf.text(`Rp ${itemAmount.toLocaleString('id-ID')}`, pdfWidth - 14, currentY + 8, { align: 'right' });

    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Ref: ${transaction?.merchantRef || '-'}`, pdfWidth - 14, currentY + 15, { align: 'right' });

    // Footer Info
    const footerY = pdfHeight - 15;
    pdf.setDrawColor(241, 245, 249);
    pdf.line(10, footerY, pdfWidth - 10, footerY);

    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Terima kasih telah mempercayai FREEWITHRIDHO sebagai mitra coding Anda.', pdfWidth / 2, footerY + 5, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(99, 102, 241);
    pdf.text('freewithridho.com', pdfWidth / 2, footerY + 9, { align: 'center' });

    pdf.save(`Invoice-${transaction?.merchantRef || 'FWR'}.pdf`);
  };

  // Tampilan loading (verifikasi)
  if (verifying) {
    return (
      <div className="success-page">
        <div className="success-card">
          <div className="success-loading-spinner"></div>
          <h1>Memverifikasi Pembayaran...</h1>
          <p>Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  // Tidak ada reference atau transaksi tidak ditemukan setelah retry
  if (verifyError || !reference) {
    return (
      <div className="success-page">
        <div className="success-card error">
          <AlertCircle size={48} className="icon-error" />
          <h1>Referensi Tidak Valid</h1>
          <p>Transaksi tidak ditemukan. Silakan periksa riwayat pembelian Anda di halaman Profil.</p>
          <button onClick={() => navigate('/')} className="btn-home">Kembali ke Home</button>
        </div>
      </div>
    );
  }

  // Pembayaran Berhasil (PAID)
  if (transaction?.status === 'PAID') {
    return (
      <div className="success-page">
        <div className="success-card">
          <CheckCircle size={56} className="icon-success" />
          <h1>Pembayaran Berhasil! 🎉</h1>
          <p>Terima kasih, <strong>{user?.email}</strong>! Pembelian Anda telah dikonfirmasi.</p>

          <div className="transaction-info">
            <span>Ref: <strong>{transaction.merchantRef}</strong></span>
          </div>

          {/* PDF Invoice Button */}
          <button
            onClick={generateInvoicePDF}
            className="btn-invoice"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8', padding: '0.6rem 1.2rem', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s',
              margin: '0.5rem auto',
            }}
          >
            📄 Unduh Kwitansi (PDF)
          </button>

          {/* Tombol Unduh muncul HANYA jika PAID dan ada downloadUrl */}
          {project?.downloadUrl && (
            <div className="download-section">
              <Package size={24} className="download-icon" />
              <h3>{project.title}</h3>
              <a
                href={project.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download"
              >
                <Download size={18} /> Unduh Source Code
              </a>
            </div>
          )}

          {project?.downloadUrl ? (
            <p className="success-note">
              Anda juga dapat mengunduh source code kapan saja dari halaman <strong>Profil → Riwayat Pembelian</strong>.
            </p>
          ) : (
            <p className="success-note">
              Data pesanan Anda telah kami terima. Proses aktivasi/layanan akan segera dilakukan oleh Admin. Anda dapat mengecek status pesanan di halaman <strong>Profil → Riwayat Pembelian</strong>.
            </p>
          )}

          <Link to="/" className="btn-home">
            Kembali ke Beranda <ArrowRight size={18} />
          </Link>
        </div>

        {/* Developer Contact Modal */}
        {showDevContactModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', animation: 'fadeIn 0.3s ease' }}>
            <div className="modal-content" style={{ background: '#0f172a', padding: '2rem', borderRadius: '16px', maxWidth: '450px', width: '100%', border: '1px solid rgba(139,92,246,0.3)', position: 'relative', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <button 
                onClick={() => setShowDevContactModal(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              
              <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <CheckCircle size={32} color="#10b981" />
              </div>
              
              <h2 style={{ fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.75rem' }}>Pesanan Berhasil!</h2>
              
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Terima kasih telah memesan paket <strong>Hosting & Custom Domain ({transaction.customDomainName}{transaction.domainExtension})</strong> untuk website ini. 
                <br/><br/>
                Tahap selanjutnya adalah aktivasi server dan konfigurasi domain. Silakan hubungi Developer kami via WhatsApp untuk mempercepat proses setup website Anda.
              </p>

              {developerPhone ? (
                <a 
                  href={`https://wa.me/${developerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo, saya baru saja membeli template ${project?.title || 'Website'} beserta layanan Hosting & Domain (${transaction.customDomainName}${transaction.domainExtension}). Berikut Nomor Referensi Pembayaran saya: ${transaction.merchantRef}. Mohon bantuannya untuk proses setup selanjutnya. Terima kasih!`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#25D366', color: '#fff', textDecoration: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <MessageCircle size={20} />
                  Hubungi Developer Sekarang
                </a>
              ) : (
                <p style={{ color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                  Maaf, nomor WhatsApp Developer tidak tersedia saat ini. Silakan hubungi admin utama.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pembayaran Menunggu (PENDING)
  return (
    <div className="success-page">
      <div className="success-card pending">
        <Clock size={56} className="icon-pending" />
        <h1>Menunggu Konfirmasi</h1>
        <p>
          Pembayaran Anda sedang diproses. Status akan diperbarui secara otomatis setelah INSTANPAY mengkonfirmasi pembayaran.
        </p>

        <div className="transaction-info">
          <span>Ref: <strong>{reference}</strong></span>
        </div>
        
        {transaction?.paymentMethod === 'crypto' && (
          <p className="success-note" style={{ color: '#8b5cf6' }}>
            Info: Pembayaran Crypto (USDT) membutuhkan waktu konfirmasi jaringan (sekitar 1-3 menit).
          </p>
        )}

        <p className="success-note">
          Jika sudah membayar dan tombol unduh belum muncul, coba refresh halaman ini dalam beberapa menit. Atau cek di <strong>Profil → Riwayat Pembelian</strong>.
        </p>

        <div className="btn-group">
          <button onClick={() => window.location.reload()} className="btn-refresh">
            Refresh Status
          </button>
          <Link to="/profile" className="btn-home">
            Lihat Profil <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
