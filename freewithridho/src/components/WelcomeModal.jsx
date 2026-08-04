import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Shield, Zap, Star, BookOpen, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import './WelcomeModal.css';

const WelcomeModal = ({ role = 'partner', storageKey, onClose }) => {
  const [step, setStep] = useState(1); // 1 = Fitur, 2 = Peraturan
  const [closing, setClosing] = useState(false);
  const [agreedPolicy, setAgreedPolicy] = useState(false);

  const handleClose = () => {
    if (step === 2 && !agreedPolicy) return; // Wajib setuju dulu
    setClosing(true);
    setTimeout(() => {
      localStorage.setItem(storageKey, 'true');
      onClose?.();
    }, 300);
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  // ─── Konten ADMIN ─────────────────────────────────────────
  const adminFeatures = [
    {
      icon: <Zap size={22} />,
      color: '#3b82f6',
      title: 'Manajemen Proyek Penuh',
      desc: 'Upload, edit, hapus, dan pantau semua proyek di marketplace. Anda dapat mengatur harga, Flash Sale, kategori, link demo, dan file unduhan setiap proyek secara real-time.',
    },
    {
      icon: <Shield size={22} />,
      color: '#8b5cf6',
      title: 'Kendali Partner & User',
      desc: 'Setujui pendaftaran partner, suspensi/ban akun yang melanggar, hapus akun dari Firebase Auth, dan monitor aktivitas seluruh pengguna secara real-time. Sistem lencana partner diperbarui otomatis berdasarkan pendapatan.',
    },
    {
      icon: <Star size={22} />,
      color: '#f59e0b',
      title: 'Manajemen Promo Code & Notifikasi',
      desc: 'Buat kode promo diskon persentase (%) atau nominal (Rp), atur batas pemakaian (limit). Setiap promo baru akan otomatis mengirim notifikasi ke seluruh pengguna secara real-time. Aktifkan/nonaktifkan promo kapan saja.',
    },
    {
      icon: <CheckCircle size={22} />,
      color: '#10b981',
      title: 'Pengaturan API Midtrans',
      desc: 'Ganti mode Sandbox ↔ Production tanpa harus edit kode. Backend akan otomatis menggunakan key yang sesuai berdasarkan pengaturan di sini. Selalu uji di mode Sandbox terlebih dahulu sebelum Production.',
    },
    {
      icon: <BookOpen size={22} />,
      color: '#6366f1',
      title: 'Analitik & Statistik Real-time',
      desc: 'Pantau total pendapatan, transaksi pending, proyek terjual, dan performa partner secara langsung. Data diperbarui otomatis via Firestore real-time listener. Pendapatan tertunda juga ditampilkan terpisah.',
    },
    {
      icon: <Info size={22} />,
      color: '#ef4444',
      title: 'Manajemen Penarikan Dana',
      desc: 'Tinjau dan proses permintaan penarikan dana dari partner. Tandai sebagai DIPROSES atau SELESAI setelah transfer dilakukan secara manual. Wajib diproses maksimal 3×24 jam kerja.',
    },
  ];

  const adminPolicies = [
    {
      type: 'danger',
      title: 'Akses Rahasia & Tanggung Jawab Absolut',
      desc: 'Akses Admin Panel bersifat RAHASIA dan eksklusif. Anda DILARANG KERAS membagikan kredensial atau mempersilakan orang lain mengoperasikan panel ini. Setiap tindakan tercatat secara permanen dan menjadi tanggung jawab hukum penuh Admin.',
    },
    {
      type: 'danger',
      title: 'Larangan Penyalahgunaan Kekuasaan',
      desc: 'Dilarang keras melakukan ban/suspensi partner tanpa alasan terdokumentasi. Dilarang mengubah, memanipulasi, atau menghapus data transaksi/statistik untuk kepentingan pribadi. Dilarang menghapus notifikasi resmi yang belum dibaca mayoritas pengguna tanpa persetujuan.',
    },
    {
      type: 'danger',
      title: 'Kerahasiaan Data Pengguna (Wajib)',
      desc: 'Data pribadi seluruh pengguna (email, nama, rekening bank, riwayat transaksi, kode referral, status notifikasi) bersifat RAHASIA MUTLAK. Dilarang keras membagikan, menjual, atau menggunakan data pengguna di luar kepentingan operasional platform.',
    },
    {
      type: 'warning',
      title: 'Kelola Notifikasi dengan Bijak',
      desc: 'Setiap pembuatan Promo Code akan otomatis mengirim notifikasi ke seluruh pengguna. Pastikan promo yang dibuat valid dan aktif sebelum dipublikasikan. Notifikasi yang salah/spam akan menurunkan kepercayaan pengguna terhadap platform.',
    },
    {
      type: 'warning',
      title: 'Proses Penarikan Dana Partner (Wajib Tepat Waktu)',
      desc: 'Permintaan penarikan dana dari partner WAJIB diproses maksimal 3×24 jam kerja setelah permintaan masuk. Admin wajib memverifikasi keaslian nomor rekening sebelum melakukan transfer. Kelalaian adalah pelanggaran tanggung jawab Admin.',
    },
    {
      type: 'info',
      title: 'Sistem Lencana Partner Otomatis',
      desc: 'Lencana partner diperbarui otomatis oleh sistem berdasarkan total pendapatan kumulatif (≥1Jt, ≥2Jt, ≥5Jt, ≥10Jt). Admin tidak perlu mengatur lencana secara manual. Pantau level badge partner melalui halaman manajemen partner di Admin Panel.',
    },
  ];

  // ─── Konten PARTNER ───────────────────────────────────────
  const partnerFeatures = [
    {
      icon: <Zap size={22} />,
      color: '#3b82f6',
      title: 'Upload & Jual Source Code',
      desc: 'Upload proyek dengan judul, deskripsi, kategori, harga, gambar galeri, link download, dan URL demo live. Proyek akan langsung tampil di marketplace setelah disubmit.',
    },
    {
      icon: <Star size={22} />,
      color: '#f59e0b',
      title: 'Flash Sale & Diskon Harga',
      desc: 'Ikutkan proyek Anda dalam Flash Sale dengan harga spesial. Aktifkan checkbox "Flash Sale" dan isi harga diskon. Proyek Anda akan tampil di banner Flash Sale Homepage.',
    },
    {
      icon: <CheckCircle size={22} />,
      color: '#10b981',
      title: 'Live Preview Demo',
      desc: 'Tambahkan URL demo aplikasi Anda agar pembeli bisa mencoba langsung sebelum membeli. Meningkatkan kepercayaan & konversi penjualan secara signifikan.',
    },
    {
      icon: <Shield size={22} />,
      color: '#8b5cf6',
      title: 'Sistem Lencana (Badge) Otomatis',
      desc: 'Semakin tinggi total pendapatan Anda, semakin tinggi lencana yang Anda raih: 🟢 Mitra Dasar (≥1Jt) → 🔵 Mitra Profesional (≥2Jt) → 🟣 Mitra Ahli (≥5Jt) → 💎 Mitra Elite (≥10Jt). Badge tampil otomatis di profil publik.',
    },
    {
      icon: <BookOpen size={22} />,
      color: '#6366f1',
      title: 'Penarikan Dana (Withdrawal)',
      desc: 'Ajukan penarikan saldo kapan saja ke rekening bank Anda. Isi form dengan jumlah, nama bank, dan nomor rekening. Admin akan memproses dalam 3×24 jam kerja.',
    },
    {
      icon: <Info size={22} />,
      color: '#ef4444',
      title: 'Referral & Komisi Afiliasi',
      desc: 'Bagikan kode referral unik Anda kepada teman. Setiap pengguna yang mendaftar menggunakan kode Anda akan memberikan komisi afiliasi langsung ke saldo Anda. Kode juga bisa diisi saat pendaftaran.',
    },
  ];

  const partnerPolicies = [
    {
      type: 'danger',
      title: 'Keaslian & Hak Cipta — Kewajiban Mutlak',
      desc: 'Anda WAJIB hanya mengunggah source code yang Anda buat sendiri atau yang Anda miliki lisensi resmi untuk dijual kembali. Mengunggah plagiarisme atau karya orang lain tanpa hak adalah PELANGGARAN BERAT yang berakibat BAN PERMANEN tanpa peringatan dan dapat berujung pada tuntutan hukum hak cipta.',
    },
    {
      type: 'danger',
      title: 'Konten Terlarang — Nol Toleransi',
      desc: 'Platform menerapkan kebijakan NOL TOLERANSI. DILARANG KERAS mengunggah source code yang mengandung: malware/virus/spyware, exploit hacking ilegal, konten pornografi/dewasa, konten SARA, atau konten yang melanggar hukum Negara Republik Indonesia. Sanksi: BAN PERMANEN seketika.',
    },
    {
      type: 'danger',
      title: 'Sanksi BAN PERMANEN & Hangusan Saldo',
      desc: 'Apabila akun Anda dibanned: (1) Seluruh proyek dihapus seketika. (2) Seluruh saldo dan komisi afiliasi yang belum dicairkan dihanguskan tanpa kompensasi. (3) Email dan IP Anda dimasukkan ke Daftar Hitam permanen. (4) Anda tidak dapat mendaftar kembali dalam bentuk apapun.',
    },
    {
      type: 'warning',
      title: 'Standar Kualitas Proyek (Wajib)',
      desc: 'Setiap source code HARUS dapat dijalankan sesuai deskripsi yang Anda cantumkan, dilengkapi README yang jelas, serta telah diuji dengan benar. Proyek yang terbukti tidak berfungsi atau mengandung deskripsi menyesatkan akan diturunkan dan saldo dapat ditahan selama investigasi.',
    },
    {
      type: 'info',
      title: 'Sistem Lencana Otomatis',
      desc: 'Buka dasbor Anda secara rutin agar sistem dapat memperbarui data total pendapatan Anda dan menampilkan lencana yang sesuai di profil publik. Lencana adalah cerminan reputasi Anda di mata pembeli.',
    },
    {
      type: 'info',
      title: 'Ketentuan Penarikan Dana (Withdrawal)',
      desc: 'Penarikan minimum Rp 100.000. Waktu proses 3×24 jam kerja. Pastikan data rekening bank BENAR, AKTIF, dan atas nama Anda sendiri. FREEWITHRIDHO tidak bertanggung jawab atas kegagalan transfer akibat kesalahan data rekening yang diinput Partner.',
    },
  ];

  const features = role === 'admin' ? adminFeatures : partnerFeatures;
  const policies = role === 'admin' ? adminPolicies : partnerPolicies;

  const policyIcon = (type) => {
    if (type === 'danger') return <XCircle size={18} className="policy-icon danger" />;
    if (type === 'warning') return <AlertTriangle size={18} className="policy-icon warning" />;
    return <Info size={18} className="policy-icon info" />;
  };

  return (
    <div className={`welcome-overlay ${closing ? 'closing' : ''}`}>
      <div className={`welcome-modal ${closing ? 'closing' : ''}`}>

        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-header-left">
            <div className={`welcome-step-badge ${step === 2 ? 'step-2' : ''}`}>
              {step === 1 ? '📋 Panduan Fitur' : '⚖️ Peraturan & Kebijakan'}
            </div>
            <h2 className="welcome-title">
              {step === 1
                ? `Selamat Datang di ${role === 'admin' ? 'Admin Panel' : 'Partner Dashboard'}!`
                : 'Baca & Pahami Kebijakan Ini'}
            </h2>
            <p className="welcome-subtitle">
              {step === 1
                ? `Kenali semua fitur yang tersedia di ${role === 'admin' ? 'panel administrasi' : 'dashboard mitra'} Anda.`
                : 'Anda wajib membaca dan menyetujui seluruh peraturan berikut sebelum menggunakan platform.'}
            </p>
          </div>
          <div className="welcome-step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
            <div className="step-line" />
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
          </div>
        </div>

        {/* Body */}
        <div className="welcome-body">
          {step === 1 && (
            <div className="features-grid">
              {features.map((f, i) => (
                <div key={i} className="feature-card" style={{ '--accent': f.color }}>
                  <div className="feature-card-icon" style={{ background: `${f.color}22`, color: f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="feature-card-title">{f.title}</h4>
                    <p className="feature-card-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="policies-list">
              {policies.map((p, i) => (
                <div key={i} className={`policy-item policy-${p.type}`}>
                  <div className="policy-item-header">
                    {policyIcon(p.type)}
                    <h4>{p.title}</h4>
                  </div>
                  <p>{p.desc}</p>
                </div>
              ))}

              <div className="agree-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={agreedPolicy}
                    onChange={(e) => setAgreedPolicy(e.target.checked)}
                  />
                  <span>
                    Saya telah membaca, memahami, dan <strong>menyetujui</strong> seluruh peraturan & kebijakan di atas.
                    Saya menyadari bahwa pelanggaran dapat berakibat <strong>suspensi atau BAN PERMANEN</strong>.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="welcome-footer">
          {step === 2 && (
            <button className="btn-back" onClick={handleBack}>
              <ChevronLeft size={16} /> Kembali
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 ? (
            <button className="btn-next" onClick={handleNext}>
              Lanjut ke Peraturan <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className={`btn-agree ${!agreedPolicy ? 'disabled' : ''}`}
              onClick={handleClose}
              disabled={!agreedPolicy}
            >
              <CheckCircle size={16} /> Saya Setuju & Mulai
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
