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
            <strong>Email:</strong> <em>ridhosandhika18022022@gmail.com</em>
          </li>
          <li>
            <strong>WhatsApp:</strong> <em>+62 823-7132-6584</em>
          </li>
          <li>
            <strong>Jam Operasional:</strong> <em>Senin - Jumat (09:00 - 17:00 WIB)</em>
          </li>
        </ul>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:ridhosandhika18022022@gmail.com?subject=Pertanyaan/Dukungan%20Layanan%20FreeWithRidho&body=Halo%20Tim%20FreeWithRidho,%0A%0ASaya%20menghubungi%20Anda%20terkait%20layanan%20yang%20diberikan.%20Berikut%20adalah%20detail%20pesan%20saya:%0A%0A[Silakan%20tulis%20pesan%20Anda%20di%20sini]%0A%0ATerima%20kasih." className="info-btn" style={{ background: '#ef4444' }}>
            <Mail size={20} />
            Kirim Email
          </a>
          <a href="https://wa.me/6282371326584?text=Halo%20Tim%20FreeWithRidho,%20perkenalkan%20saya%20[Nama%20Anda].%20Saya%20ingin%20berkonsultasi%20atau%20bertanya%20seputar%20layanan%20Anda.%20Terima%20kasih." target="_blank" rel="noreferrer" className="info-btn" style={{ background: '#10b981' }}>
            <MessageCircle size={20} />
            Chat WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
