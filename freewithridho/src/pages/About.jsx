import { useEffect } from 'react';
import { ArrowLeft, Rocket, Heart, Sparkles, TerminalSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './About.css';

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page">
      {/* Background Elements */}
      <div className="about-bg-glow glow-1"></div>
      <div className="about-bg-glow glow-2"></div>
      <div className="about-bg-glow glow-3"></div>
      <div className="about-grid-overlay"></div>

      <div className="about-container">
        <button onClick={() => navigate(-1)} className="back-btn about-back-btn">
          <ArrowLeft size={18} /> Kembali
        </button>

        {/* Hero Section */}
        <section className="about-hero">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Bagian dari Ekosistem SukaCoding</span>
          </div>
          <h1 className="hero-title">
            Membangun Masa Depan <br />
            <span className="text-gradient">Digital Indonesia</span>
          </h1>
          <p className="hero-subtitle">
            FreeWithRidho adalah inisiatif resmi dari <strong>SukaCoding</strong> yang didedikasikan untuk mempercepat pertumbuhan ekosistem developer di Nusantara melalui penyediaan <em>source code</em> berkualitas tinggi.
          </p>
        </section>

        {/* Vision & Mission Cards */}
        <section className="about-cards-section">
          <div className="about-card glass-panel">
            <div className="card-icon-wrapper blue">
              <Rocket size={24} />
            </div>
            <h3>Visi Kami</h3>
            <p>
              Menjadi platform penyedia <em>source code</em> terdepan di Indonesia yang menjembatani kesenjangan teknologi, memungkinkan setiap individu untuk membangun inovasi tanpa harus memulai dari nol.
            </p>
          </div>

          <div className="about-card glass-panel">
            <div className="card-icon-wrapper purple">
              <TerminalSquare size={24} />
            </div>
            <h3>Misi SukaCoding</h3>
            <p>
              Menciptakan komunitas developer yang inklusif, berbagi pengetahuan secara transparan, dan menyediakan infrastruktur kode yang aman, modern, dan siap pakai untuk berbagai skala bisnis.
            </p>
          </div>
        </section>

        {/* SukaCoding Highlight */}
        <section className="sukacoding-highlight glass-panel">
          <div className="highlight-content">
            <div className="highlight-icon sukacoding-logo-wrap">
              <img
                src="/SukaCoding.jpeg"
                alt="SukaCoding Logo"
                className="sukacoding-logo-img"
              />
            </div>
            <h2>Program Eksklusif <span className="text-gradient">SukaCoding</span></h2>
            <p>
              Sebagai pilar utama dari <strong>SukaCoding</strong>, platform ini tidak hanya sekadar <em>marketplace</em> kode. Ini adalah bentuk nyata dedikasi kami untuk memberikan <em>impact</em> positif bagi programmer pemula maupun profesional. Kami melakukan kurasi ketat pada setiap baris kode untuk memastikan standar industri terpenuhi.
            </p>
            <div className="highlight-stats">
              <div className="h-stat">
                <h4>Premium</h4>
                <span>Kualitas Enterprise</span>
              </div>
              <div className="h-stat">
                <h4>100%</h4>
                <span>Transparan & Aman</span>
              </div>
              <div className="h-stat">
                <h4>Support</h4>
                <span>Komunitas Aktif</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer/CTA in About */}
        <div className="about-footer">
          <p className="made-with-love">
          Create by: Team SukaCoding
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
