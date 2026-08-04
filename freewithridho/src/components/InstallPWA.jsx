import { useState, useEffect } from 'react';
import './InstallPWA.css';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Cek apakah sudah diinstall (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Cek apakah user sudah dismiss sebelumnya
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Detect iOS
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS tidak support beforeinstallprompt, tampilkan panduan manual
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android / Desktop: tangkap event beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listener saat app berhasil diinstall
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
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

    if (!deferredPrompt) return;

    setInstalling(true);
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }

    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className={`pwa-banner ${showBanner ? 'pwa-banner--visible' : ''}`}>
        <div className="pwa-banner__icon">
          <img src="/FREEWITHRIDHO.png" alt="FreeWithRidho" />
        </div>
        <div className="pwa-banner__content">
          <p className="pwa-banner__title">Install FreeWithRidho</p>
          <p className="pwa-banner__desc">
            {isIOS
              ? 'Tambahkan ke Home Screen untuk akses lebih cepat!'
              : 'Install app untuk akses offline & notifikasi!'}
          </p>
        </div>
        <div className="pwa-banner__actions">
          <button
            className="pwa-banner__btn pwa-banner__btn--install"
            onClick={handleInstall}
            disabled={installing}
            id="pwa-install-btn"
          >
            {installing ? (
              <span className="pwa-spinner" />
            ) : isIOS ? (
              '📲 Cara Install'
            ) : (
              '⚡ Install'
            )}
          </button>
          <button
            className="pwa-banner__btn pwa-banner__btn--dismiss"
            onClick={handleDismiss}
            id="pwa-dismiss-btn"
          >
            ✕
          </button>
        </div>
      </div>

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
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
            >
              Mengerti!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
