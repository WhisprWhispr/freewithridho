import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppFloat = () => {
  const [isHovered, setIsHovered] = useState(false);

  // Admin phone number
  const phoneNumber = '6282371326584'; 
  const message = 'Halo Admin FreeWithRidho, saya tertarik dengan layanan/produk Anda dan ingin berkonsultasi lebih lanjut. Terima kasih.';

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: 600,
        opacity: isHovered ? 1 : 0,
        transform: isHovered ? 'translateX(0)' : 'translateX(10px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        WhatsApp
      </div>
      
      <button
        onClick={handleWhatsAppClick}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#25D366',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 10px 15px -3px rgba(37, 211, 102, 0.4), 0 4px 6px -2px rgba(37, 211, 102, 0.2)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)'
        }}
        title="Hubungi Admin"
      >
        <MessageCircle size={32} />
      </button>
    </div>
  );
};

export default WhatsAppFloat;
