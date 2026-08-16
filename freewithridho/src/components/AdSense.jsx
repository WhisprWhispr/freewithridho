import { useEffect } from 'react';

const AdSense = ({ slot }) => {
  useEffect(() => {
    try {
      // Menjalankan script AdSense setelah komponen di-render
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      textAlign: 'center', 
      margin: '20px 0',
      minHeight: '100px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px dashed rgba(255,255,255,0.1)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Teks fallback jika iklan diblokir atau belum muncul */}
      <span style={{ position: 'absolute', color: 'rgba(255,255,255,0.3)', fontSize: '12px', zIndex: 0 }}>
        Ruang Iklan AdSense
      </span>

      <ins
        className="adsbygoogle"
        style={{ display: 'block', zIndex: 1, width: '100%' }}
        data-ad-client="ca-pub-5434492393431534"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdSense;
