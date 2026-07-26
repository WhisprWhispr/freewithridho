import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Download, ArrowRight } from 'lucide-react';
// import { getProjectById } from '../services/projectService'; // We will fetch this if needed
import './Success.css';

const Success = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const navigate = useNavigate();

  // In a real app, you would verify this reference with your backend or Firestore
  // to ensure it's actually PAID and belongs to the current user.
  // For this demo, we'll just show a success message.

  if (!reference) {
    return (
      <div className="success-page">
        <div className="success-card error">
          <AlertCircle size={48} className="icon-error" />
          <h1>Referensi Tidak Valid</h1>
          <p>Transaksi tidak ditemukan.</p>
          <button onClick={() => navigate('/')} className="btn-home">Kembali ke Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-card">
        <CheckCircle size={56} className="icon-success" />
        <h1>Pembayaran Berhasil!</h1>
        <p>Terima kasih atas pembelian Anda.</p>
        
        <div className="transaction-info">
          <span>Ref: <strong>{reference}</strong></span>
        </div>

        <p className="success-note">
          Akses source code akan dikirimkan ke email Anda, atau Anda dapat melihatnya di riwayat pembelian.
        </p>

        <Link to="/" className="btn-home">
          Kembali ke Beranda <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

export default Success;
