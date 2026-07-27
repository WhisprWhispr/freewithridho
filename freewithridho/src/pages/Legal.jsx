import React from 'react';
import { Shield, Eye, Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Legal.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-btn">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        <div className="legal-card">
          <div className="legal-header">
            <Shield size={36} className="legal-icon" />
            <h1>Kebijakan Privasi</h1>
            <p>Terakhir Diperbarui: Juli 2026</p>
          </div>
          <div className="legal-body">
            <section>
              <h2>1. Informasi yang Kami Kumpulkan</h2>
              <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar, seperti alamat email, nama pengguna, dan informasi pembayaran dasar yang diproses dengan aman melalui Tripay.</p>
            </section>
            <section>
              <h2>2. Penggunaan Informasi</h2>
              <p>Informasi yang kami kumpulkan digunakan untuk memproses transaksi Anda, menyediakan akses unduhan file premium di menu profil Anda, serta meningkatkan kualitas layanan kami.</p>
            </section>
            <section>
              <h2>3. Keamanan Data</h2>
              <p>Keamanan informasi Anda adalah prioritas kami. Kami menggunakan Firebase untuk otentikasi aman dan Firestore Database dengan aturan ketat untuk membatasi akses data yang tidak sah.</p>
            </section>
            <section>
              <h2>4. Pembagian Informasi Pihak Ketiga</h2>
              <p>Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga. Proses pembayaran Anda ditangani oleh Tripay Payment Gateway sesuai standar industri.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const TermsOfService = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-btn">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        <div className="legal-card">
          <div className="legal-header">
            <Scale size={36} className="legal-icon" />
            <h1>Syarat & Ketentuan</h1>
            <p>Terakhir Diperbarui: Juli 2026</p>
          </div>
          <div className="legal-body">
            <section>
              <h2>1. Ketentuan Lisensi Penggunaan</h2>
              <p>Setiap source code yang diunduh dari FREEWITHRIDHO (baik gratis maupun premium) dilisensikan untuk keperluan pembelajaran, modifikasi, dan pengembangan proyek pribadi Anda. Dilarang keras mendistribusikan ulang atau menjual kembali source code mentah tanpa modifikasi signifikan.</p>
            </section>
            <section>
              <h2>2. Kebijakan Pengembalian Dana</h2>
              <p>Karena produk kami merupakan aset digital berbentuk unduhan langsung, semua pembelian bersifat final dan tidak dapat dikembalikan atau di-refund setelah akses unduhan diberikan.</p>
            </section>
            <section>
              <h2>3. Batasan Tanggung Jawab</h2>
              <p>FREEWITHRIDHO tidak bertanggung jawab atas segala kerugian finansial, kerusakan data, atau masalah fungsionalitas yang disebabkan oleh penggunaan source code yang Anda unduh. Anda bertanggung jawab penuh atas konfigurasi dan integrasi proyek tersebut.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PrivacyPolicy, TermsOfService };
