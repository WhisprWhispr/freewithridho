import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, ArrowRight, Download, Package } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './Success.css';

const Success = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const status = searchParams.get('status'); // bisa 'pending' dari callback Midtrans
  const navigate = useNavigate();
  const { user } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [transaction, setTransaction] = useState(null);
  const [project, setProject] = useState(null);
  const [verifyError, setVerifyError] = useState(false);

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
          // Transaksi belum masuk Firestore (delay callback Midtrans), tunggu dulu
          setTransaction({ status: 'PENDING', merchantRef: reference });
        } else {
          const txData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setTransaction(txData);

          // Kalau sudah PAID, fetch juga data project untuk tampilkan download link
          if (txData.status === 'PAID' && txData.projectId) {
            try {
              // Import dynamically to avoid circular dep issue
              const { getProjectById } = await import('../services/projectService');
              const projectData = await getProjectById(txData.projectId);
              setProject(projectData);
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

          <p className="success-note">
            Anda juga dapat mengunduh source code kapan saja dari halaman <strong>Profil → Riwayat Pembelian</strong>.
          </p>

          <Link to="/" className="btn-home">
            Kembali ke Beranda <ArrowRight size={18} />
          </Link>
        </div>
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
          Pembayaran Anda sedang diproses. Status akan diperbarui secara otomatis setelah Midtrans mengkonfirmasi pembayaran.
        </p>

        <div className="transaction-info">
          <span>Ref: <strong>{reference}</strong></span>
        </div>

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
