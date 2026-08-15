import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import './InstallPWA.css';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(ios);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Prompt not caught yet or browser doesn't support
      alert('Pemasangan aplikasi sedang diproses atau browser tidak mendukung fitur ini secara langsung. Silakan cek menu browser Anda dan cari opsi "Install App" / "Tambahkan ke Layar Utama".');
      return;
    }

    setInstalling(true);
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App Installed');
    }

    setInstalling(false);
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <>
      <li>
        <button 
          onClick={handleInstall} 
          disabled={installing}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#cbd5e1', 
            padding: 0, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            transition: 'color 0.2s', 
            width: '100%', 
            textAlign: 'left',
            fontFamily: 'inherit'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
        >
          <Download size={14} /> {isIOS ? 'Cara Install App' : 'Install Aplikasi'}
        </button>
      </li>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="pwa-ios-overlay" onClick={() => setShowIOSGuide(false)}>
          <div
            className="pwa-ios-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pwa-ios-close"
              onClick={() => setShowIOSGuide(false)}
            >
              ✕
            </button>
            <div className="pwa-ios-modal__icon">
              <img src="/FREEWITHRIDHO.png" alt="FreeWithRidho" />
            </div>
            <h3>Install FreeWithRidho di iPhone</h3>
            <p>Ikuti langkah berikut untuk menambahkan ke Home Screen:</p>
            <ol className="pwa-ios-steps">
              <li>
                <span className="pwa-ios-step-num">1</span>
                <div>
                  <strong>Tap tombol Share</strong>
                  <p>Tombol <span className="pwa-ios-icon">□↑</span> di bagian bawah Safari</p>
                </div>
              </li>
              <li>
                <span className="pwa-ios-step-num">2</span>
                <div>
                  <strong>Pilih "Add to Home Screen"</strong>
                  <p>Scroll ke bawah di menu Share</p>
                </div>
              </li>
              <li>
                <span className="pwa-ios-step-num">3</span>
                <div>
                  <strong>Tap "Add"</strong>
                  <p>App akan muncul di Home Screen kamu</p>
                </div>
              </li>
            </ol>
            <button
              className="pwa-ios-modal__cta"
              onClick={() => setShowIOSGuide(false)}
            >
              Mengerti!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
