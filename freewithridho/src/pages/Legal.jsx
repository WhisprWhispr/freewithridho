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
              <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar, termasuk namun tidak terbatas pada alamat email, nomor telepon (untuk Partner), dan informasi pembayaran yang diproses dengan standar keamanan tertinggi melalui Midtrans.</p>
            </section>
            <section>
              <h2>2. Penggunaan Informasi</h2>
              <p>Informasi yang kami kumpulkan digunakan secara eksklusif untuk memproses transaksi, menyediakan akses unduhan premium, mengelola kelayakan Partner Developer, serta mencegah aktivitas penipuan di platform kami.</p>
            </section>
            <section>
              <h2>3. Keamanan & Penahanan Data (Data Retention)</h2>
              <p>Keamanan data Anda adalah prioritas absolut kami melalui enkripsi Firebase dan aturan ketat Firestore. Namun, perlu dicatat bahwa apabila akun Anda diblokir (banned) akibat pelanggaran kebijakan, kami berhak menyimpan rekam jejak pengenal Anda (email dan nomor telepon) ke dalam "Daftar Hitam" internal kami secara permanen untuk mencegah pendaftaran ulang.</p>
            </section>
            <section>
              <h2>4. Pembagian Pihak Ketiga</h2>
              <p>FREEWITHRIDHO tidak akan pernah menjual, menyewakan, atau memperdagangkan informasi pribadi Anda. Seluruh transaksi finansial ditangani langsung oleh Payment Gateway berlisensi tanpa menyimpan detail kartu kredit atau kredensial perbankan Anda di server kami.</p>
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
              <h2>1. Lisensi Penggunaan & Hak Cipta</h2>
              <p>Setiap source code dan aset digital yang diunduh dari FREEWITHRIDHO dilisensikan semata-mata untuk keperluan pembelajaran, modifikasi, dan pengembangan proyek pribadi atau komersial Anda sendiri. <strong>DILARANG KERAS</strong> untuk mendistribusikan ulang, membocorkan link unduhan, atau menjual kembali produk mentah secara langsung tanpa modifikasi yang signifikan.</p>
            </section>
            <section>
              <h2>2. Kebijakan Partner Developer & Penalti (Banned)</h2>
              <p>Partner Developer wajib menjaga kualitas proyek yang diunggah dan tidak melanggar hak kekayaan intelektual pihak manapun. FREEWITHRIDHO memiliki otoritas mutlak untuk memberikan teguran (Suspend) atau Pemblokiran Permanen (Banned) tanpa pemberitahuan sebelumnya. Apabila Anda di-banned, <strong>seluruh data akun, saldo pendapatan, dan proyek Anda akan dihapus dan dihanguskan secara permanen</strong>, dan Anda tidak akan diizinkan bergabung kembali ke platform ini.</p>
            </section>
            <section>
              <h2>3. Kebijakan Pengembalian Dana (No Refund)</h2>
              <p>Mengingat sifat produk kami sebagai aset digital yang dapat diunduh seketika (Instant Download), <strong>seluruh transaksi dan pembelian bersifat final (mutlak)</strong>. Kami tidak melayani permintaan pengembalian dana (Refund) setelah akses unduhan diberikan, kecuali terbukti ada kesalahan sistem dari pihak kami.</p>
            </section>
            <section>
              <h2>4. Pelepasan Tanggung Jawab</h2>
              <p>Segala kerugian finansial, kerusakan data, kerentanan keamanan, atau masalah fungsionalitas yang timbul akibat penggunaan source code yang Anda unduh adalah sepenuhnya tanggung jawab pengguna. Kami menyediakan source code "sebagaimana adanya" (AS IS) tanpa jaminan keberhasilan instan.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PrivacyPolicy, TermsOfService };
