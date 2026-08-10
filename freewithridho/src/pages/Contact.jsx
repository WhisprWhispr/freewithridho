import React from 'react';
import { Send, Mail, MessageCircle } from 'lucide-react';
import './InfoPages.css';

const Contact = () => {
  return (
    <div className="info-page-container">
      <div className="info-page-content">
        <div className="info-icon-wrapper send">
          <Send size={40} />
        </div>
        <h1 className="info-title">Hubungi Kami</h1>
        <p className="info-desc">
          Apakah Anda memiliki pertanyaan, saran fitur baru, atau ingin melaporkan kendala teknis (bug)? Tim kami selalu siap mendengar dan membantu Anda.
        </p>
        
        <ul className="info-list">
          <li>
            <strong>Email:</strong> <em>support@freewithridho.com</em>
          </li>
          <li>
            <strong>WhatsApp:</strong> <em>+62 812-3456-7890</em>
          </li>
          <li>
            <strong>Jam Operasional:</strong> <em>Senin - Jumat (09:00 - 17:00 WIB)</em>
          </li>
        </ul>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:support@freewithridho.com" className="info-btn" style={{ background: '#ef4444' }}>
            <Mail size={20} />
            Kirim Email
          </a>
          <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="info-btn" style={{ background: '#10b981' }}>
            <MessageCircle size={20} />
            Chat WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
