import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Scale, Code, Users } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/FREEWITHRIDHO.jpeg" alt="FREEWITHRIDHO Logo" className="logo-img" />
          </Link>
          <p className="footer-desc">
            Penyedia source code gratis dan premium berkualitas untuk membantu mewujudkan ide digital Anda lebih cepat.
          </p>
        </div>

          <div className="footer-links">
          <h4>Platform</h4>
          <ul>
            <li>
              <Link to="/about">
                <Code size={14} /> Tentang Kami
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Komunitas</h4>
          <ul>
            <li>
              <Link to="/become-partner">
                <Users size={14} /> Jadi Partner
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Hukum & Privasi</h4>
          <ul>
            <li>
              <Link to="/privacy-policy">
                <Shield size={14} /> Kebijakan Privasi
              </Link>
            </li>
            <li>
              <Link to="/terms-of-service">
                <Scale size={14} /> Syarat & Ketentuan
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} FREEWITHRIDHO - All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
