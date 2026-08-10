import React from 'react';
import { Database, Link2 } from 'lucide-react';
import './InfoPages.css';

const DataSource = () => {
  return (
    <div className="info-page-container fade-in">
      <div className="info-page-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="info-icon-wrapper database" style={{ margin: '0' }}>
            <Database size={40} />
          </div>
        </div>
        <h1 className="info-title" style={{ textAlign: 'center' }}>Sumber Data & API</h1>
        <p className="info-desc" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          Platform ini mengintegrasikan berbagai sumber data terbuka (Open API) terpercaya dan rujukan literatur Islam yang otentik demi menjaga keakuratan informasi beribadah.
        </p>
        
        <div className="data-source-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="source-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📖 Al-Quran & Tafsir</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Seluruh teks ayat Al-Quran, terjemahan resmi (Kemenag RI), tafsir, dan audio Murottal diambil secara langsung dari <strong>EQuran.id API</strong> yang telah tersertifikasi keakuratannya.
            </p>
          </div>

          <div className="source-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🕌 Jadwal Sholat & Kalender Hijriah</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Kalkulasi jadwal waktu sholat 5 waktu yang dinamis berdasarkan lokasi dan konversi penanggalan Masehi ke Hijriah menggunakan <strong>Aladhan API (api.aladhan.com)</strong>.
            </p>
          </div>

          <div className="source-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📚 Kisah Nabi, Yasin & Artikel</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Teks Surah Yasin, bacaan Tahlil, Sholawat, Doa Harian, dan Kisah 25 Nabi disusun menggunakan literatur keislaman terpercaya (NU Online, Kemenag) yang diproses dan dikompilasi secara internal ke dalam basis data aplikasi.
            </p>
          </div>

          <div className="source-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ color: '#a855f7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💰 Kalkulator Zakat</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Perhitungan Nishab dan kadar zakat (Maal & Fitrah) disesuaikan dengan fatwa dan standar rujukan dari <strong>Badan Amil Zakat Nasional (BAZNAS)</strong>.
            </p>
          </div>

        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <p className="info-desc" style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            Seluruh sistem didesain semata-mata untuk kemudahan akses dan edukasi umat, tanpa mengubah sedikitpun substansi asli dari setiap literatur.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="https://aladhan.com" target="_blank" rel="noreferrer" className="info-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem 2rem' }}>
              <Link2 size={18} />
              Dokumentasi Aladhan API
            </a>
            <a href="https://equran.id" target="_blank" rel="noreferrer" className="info-btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem 2rem' }}>
              <Link2 size={18} />
              Dokumentasi EQuran.id
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSource;
