import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Scale, Code, Users, Clock, Coffee, Mail, Info, BookOpen } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/FREEWITHRIDHO.jpeg" alt="FREEWITHRIDHO Logo" className="logo-img" />
            <span className="logo-text">FREEWITHRIDHO</span>
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
            <li>
              <Link to="/jadwal-sholat">
                <Clock size={14} /> Jadwal Sholat
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
            <li>
              <Link to="/dukung-kami">
                <Coffee size={14} /> Dukung Kami
              </Link>
            </li>
            <li>
              <Link to="/donasi-masjid">
                <BookOpen size={14} /> Donasi Masjid
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Bantuan & Info</h4>
          <ul>
            <li>
              <Link to="/hubungi-kami">
                <Mail size={14} /> Hubungi Kami
              </Link>
            </li>
            <li>
              <Link to="/sumber-data">
                <Info size={14} /> Sumber Data
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
