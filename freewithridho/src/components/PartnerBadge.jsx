import { useState } from 'react';
import { ShieldCheck, Star, Crown, X, Award } from 'lucide-react';
import './PartnerBadge.css';

/**
 * Determines badge tier from totalEarnings (all-time)
 * Tier 0 = no badge
 * Tier 1 = Green (Rp 500.000+)  — "Mitra Berprestasi"
 * Tier 2 = Blue (Rp 1.000.000+) — "Mitra Terverifikasi"
 * Special = "Administrator"
 */
export function getBadgeTier(totalEarnings) {
  if ((totalEarnings || 0) >= 1_000_000) return 2;
  if ((totalEarnings || 0) >= 500_000) return 1;
  return 0;
}

const BADGE_CONFIG = {
  admin: {
    label: 'Administrator',
    icon: Crown,
    className: 'badge-admin',
    popupTitle: '👑 Administrator Platform',
    popupDesc:
      'Akun ini adalah Administrator resmi platform FREEWITHRIDHO. Bertanggung jawab penuh atas pengelolaan, keamanan, dan kualitas seluruh konten di platform.',
    popupColor: '#a78bfa',
  },
  2: {
    label: 'Mitra Terverifikasi',
    icon: ShieldCheck,
    className: 'badge-verified',
    popupTitle: '🔵 Mitra Terverifikasi',
    popupDesc:
      'Lencana Biru diberikan kepada partner yang telah berhasil mencapai total pendapatan kumulatif Rp 1.000.000. Mencerminkan kepercayaan tinggi dari komunitas dan konsistensi karya berkualitas.',
    popupColor: '#3b82f6',
  },
  1: {
    label: 'Mitra Berprestasi',
    icon: Award,
    className: 'badge-achieved',
    popupTitle: '🟢 Mitra Berprestasi',
    popupDesc:
      'Lencana Hijau diberikan kepada partner yang telah berhasil meraih total pendapatan kumulatif Rp 500.000. Tanda pengakuan atas dedikasi dan kontribusi nyata di platform.',
    popupColor: '#10b981',
  },
};

/**
 * PartnerBadge component
 * @param {'admin'|number} tier  — use 'admin' for admin, or getBadgeTier() result for partner
 * @param {string} size  — 'sm' | 'md' (default 'md')
 */
const PartnerBadge = ({ tier, size = 'md' }) => {
  const [showPopup, setShowPopup] = useState(false);

  const config = tier === 'admin' ? BADGE_CONFIG.admin : BADGE_CONFIG[tier];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <>
      <button
        className={`partner-badge ${config.className} badge-${size}`}
        onClick={() => setShowPopup(true)}
        title={`Klik untuk info lencana: ${config.label}`}
        type="button"
      >
        <Icon size={size === 'sm' ? 12 : 14} />
        <span>{config.label}</span>
      </button>

      {showPopup && (
        <div className="badge-popup-overlay" onClick={() => setShowPopup(false)}>
          <div
            className="badge-popup"
            style={{ borderColor: config.popupColor + '40' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="badge-popup-close" onClick={() => setShowPopup(false)}>
              <X size={16} />
            </button>
            <div className="badge-popup-icon" style={{ background: config.popupColor + '20', color: config.popupColor }}>
              <Icon size={32} />
            </div>
            <h3 className="badge-popup-title" style={{ color: config.popupColor }}>
              {config.popupTitle}
            </h3>
            <p className="badge-popup-desc">{config.popupDesc}</p>
            <div className="badge-popup-footer" style={{ borderColor: config.popupColor + '30', color: config.popupColor }}>
              FREEWITHRIDHO Achievement System
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PartnerBadge;
