import React from 'react';
import { Shield, Eye, Scale, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
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
            <p>Berlaku efektif sejak: 1 Juli 2026 · Versi 2.0</p>
          </div>
          <div className="legal-body">
            <div className="legal-notice">
              <AlertTriangle size={18} />
              <span>Dengan menggunakan layanan FREEWITHRIDHO, Anda dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan dalam Kebijakan Privasi ini secara penuh.</span>
            </div>

            <section>
              <h2>1. Informasi yang Kami Kumpulkan</h2>
              <p>Kami mengumpulkan data yang Anda berikan secara sukarela saat mendaftar dan bertransaksi, meliputi:</p>
              <ul>
                <li><strong>Data Identitas:</strong> Nama lengkap, alamat email, dan foto profil (jika disinkronkan melalui Google).</li>
                <li><strong>Data Finansial (Partner):</strong> Nomor rekening bank, nama pemilik rekening, dan nama bank — digunakan semata-mata untuk keperluan pencairan dana.</li>
                <li><strong>Data Transaksi:</strong> Riwayat pembelian, nomor pesanan, jumlah pembayaran, dan status transaksi yang diproses oleh Payment Gateway berlisensi (Midtrans).</li>
                <li><strong>Data Teknis:</strong> Alamat IP, jenis perangkat, dan informasi browser yang dikumpulkan secara otomatis untuk kepentingan keamanan dan analitik platform.</li>
              </ul>
            </section>

            <section>
              <h2>2. Tujuan Penggunaan Data</h2>
              <p>Seluruh data yang kami kumpulkan digunakan secara eksklusif untuk tujuan-tujuan berikut:</p>
              <ul>
                <li>Memproses dan mengkonfirmasi transaksi pembelian produk digital.</li>
                <li>Mengirimkan akses unduhan dan invoice melalui email terdaftar.</li>
                <li>Mengelola kelayakan, verifikasi, dan komisi akun Partner Developer.</li>
                <li>Mendeteksi, menginvestigasi, dan mencegah aktivitas penipuan atau penyalahgunaan platform.</li>
                <li>Meningkatkan kualitas layanan melalui analisis penggunaan platform secara anonim.</li>
              </ul>
            </section>

            <section>
              <h2>3. Keamanan & Retensi Data</h2>
              <p>Keamanan data pengguna adalah prioritas absolut kami. Seluruh data disimpan dengan enkripsi standar industri melalui infrastruktur Firebase (Google Cloud). Namun, Anda perlu memahami ketentuan penting berikut:</p>
              <div className="legal-warning-box">
                <XCircle size={16} />
                <span>Apabila akun Anda diblokir (<strong>banned</strong>) akibat pelanggaran kebijakan yang telah dibuktikan, kami berhak dan AKAN menyimpan data pengenal Anda (email, nomor telepon, dan alamat IP) secara permanen dalam "Daftar Hitam" internal kami untuk mencegah pendaftaran ulang. Data ini <strong>tidak dapat dihapus atas permintaan pengguna yang terbukti melanggar</strong>.</span>
              </div>
            </section>

            <section>
              <h2>4. Ketentuan Pembagian Data kepada Pihak Ketiga</h2>
              <p><strong>FREEWITHRIDHO berkomitmen untuk TIDAK pernah menjual, menyewakan, atau memperdagangkan informasi pribadi Anda kepada pihak manapun</strong> untuk tujuan komersial. Satu-satunya pengecualian adalah penyampaian data minimum kepada penyedia layanan teknis (seperti Midtrans untuk pembayaran dan Firebase untuk database) yang diperlukan untuk menjalankan platform, dengan mereka terikat pada kebijakan kerahasiaan mereka sendiri.</p>
            </section>

            <section>
              <h2>5. Hak Pengguna</h2>
              <p>Anda memiliki hak untuk mengakses, mengoreksi, atau mengajukan penghapusan data pribadi Anda. Pengajuan dapat dilakukan melalui email resmi kami. Namun, hak penghapusan data tidak berlaku bagi pengguna yang masuk dalam Daftar Hitam sebagaimana dijelaskan pada Pasal 3.</p>
            </section>

            <section>
              <h2>6. Kontak & Pertanyaan Privasi</h2>
              <p>Untuk pertanyaan atau kekhawatiran terkait privasi data Anda, hubungi kami melalui: <strong>support@freewithridho.com</strong>. Kami berkomitmen merespons setiap permintaan dalam 5 hari kerja.</p>
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
            <h1>Syarat &amp; Ketentuan Layanan</h1>
            <p>Berlaku efektif sejak: 1 Juli 2026 · Versi 2.0</p>
          </div>
          <div className="legal-body">
            <div className="legal-notice">
              <AlertTriangle size={18} />
              <span>Penggunaan platform FREEWITHRIDHO dalam bentuk apapun merupakan persetujuan penuh dan tidak bersyarat terhadap seluruh ketentuan di bawah ini. Jika Anda tidak menyetujui, segera hentikan penggunaan layanan kami.</span>
            </div>

            <section>
              <h2>1. Lisensi Penggunaan Produk Digital</h2>
              <p>Setiap source code dan aset digital yang diperoleh melalui FREEWITHRIDHO diberikan lisensi terbatas, non-eksklusif, dan tidak dapat dipindahtangankan untuk:</p>
              <ul>
                <li>Keperluan belajar, eksplorasi, dan pengembangan kemampuan teknis pribadi.</li>
                <li>Modifikasi dan pengembangan untuk proyek komersial Anda sendiri.</li>
              </ul>
              <div className="legal-warning-box danger">
                <XCircle size={16} />
                <span><strong>DILARANG KERAS:</strong> Mendistribusikan ulang produk dalam bentuk aslinya (tanpa modifikasi signifikan), membocorkan atau menyebarkan link unduhan kepada pihak ketiga, menjual kembali produk secara langsung, atau mengunggah ulang ke platform lain tanpa izin tertulis dari pemilik.</span>
              </div>
            </section>

            <section>
              <h2>2. Kebijakan Partner Developer</h2>
              <p>Sebagai Partner Developer yang telah disetujui, Anda bertanggung jawab penuh atas seluruh konten yang Anda unggah. Ketentuan mutlak yang harus dipatuhi:</p>
              <ul>
                <li>Hanya unggah source code yang Anda buat sendiri atau yang Anda miliki lisensi resmi untuk dijual kembali.</li>
                <li>Jamin bahwa kode yang diunggah berfungsi sebagaimana mestinya sesuai deskripsi yang disajikan.</li>
                <li>Dilarang mengunggah konten yang mengandung: malware, exploit ilegal, pornografi, konten SARA, atau apapun yang melanggar hukum Republik Indonesia.</li>
              </ul>
              <div className="legal-warning-box danger">
                <XCircle size={16} />
                <span><strong>SANKSI PELANGGARAN:</strong> FREEWITHRIDHO memiliki otoritas mutlak dan tanpa batas waktu untuk memberikan <strong>Suspensi Sementara</strong> atau <strong>Pemblokiran Permanen (BAN)</strong> terhadap akun Partner yang melanggar ketentuan ini. Saat di-ban: seluruh data akun, saldo pendapatan yang belum dicairkan, dan semua proyek akan <strong>dihapus dan dihanguskan secara permanen</strong> tanpa kompensasi dan tanpa hak banding.</span>
              </div>
            </section>

            <section>
              <h2>3. Kebijakan Pengembalian Dana (No Refund Policy)</h2>
              <p>Mengingat sifat produk kami sebagai <strong>aset digital yang dapat diakses secara instan</strong> (Instant Digital Delivery), seluruh transaksi yang telah berhasil dilakukan bersifat <strong>final dan tidak dapat dibatalkan</strong>. <strong>Kami tidak melayani permintaan pengembalian dana (Refund) dalam kondisi apapun</strong>, setelah link unduhan atau akses produk telah diberikan kepada pembeli.</p>
              <p>Satu-satunya pengecualian adalah apabila terbukti secara teknis terdapat kesalahan sistem dari pihak kami yang mengakibatkan produk tidak dapat diakses sama sekali dalam jangka waktu 3×24 jam, yang akan kami tindaklanjuti secara manual.</p>
            </section>

            <section>
              <h2>4. Program Afiliasi & Referral</h2>
              <p>Program afiliasi FREEWITHRIDHO memberikan komisi tetap kepada pemegang kode referral. Ketentuan:</p>
              <ul>
                <li>Komisi diberikan secara instan saat pengguna baru memasukkan kode referral Anda di profil mereka.</li>
                <li>Saldo komisi dapat dicairkan bersama saldo partner melalui mekanisme penarikan dana.</li>
                <li>FREEWITHRIDHO berhak mengubah nominal komisi sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
                <li>Penyalahgunaan sistem referral (pembuatan akun fiktif, manipulasi data) akan berakibat <strong>BAN PERMANEN dan penghangusan seluruh komisi</strong>.</li>
              </ul>
            </section>

            <section>
              <h2>5. Pelepasan Tanggung Jawab (Disclaimer)</h2>
              <p>Seluruh source code dan aset digital yang tersedia di platform ini disediakan dalam kondisi <strong>"sebagaimana adanya" (AS IS)</strong> tanpa garansi tersurat maupun tersirat atas kelancaran operasional, kompatibilitas dengan sistem tertentu, atau kebebasan dari bug. <strong>Segala risiko yang timbul dari penggunaan produk sepenuhnya menjadi tanggung jawab pengguna.</strong> FREEWITHRIDHO tidak bertanggung jawab atas kerugian finansial, kerusakan data, atau masalah keamanan yang timbul dari penggunaan produk yang kami jual.</p>
            </section>

            <section>
              <h2>6. Perubahan Ketentuan</h2>
              <p>FREEWITHRIDHO berhak memperbarui Syarat & Ketentuan ini kapan saja. Perubahan signifikan akan diinformasikan melalui notifikasi platform atau email terdaftar. Kelanjutan penggunaan layanan setelah perubahan dipublikasikan merupakan penerimaan terhadap ketentuan yang diperbarui.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PrivacyPolicy, TermsOfService };
