import { useState } from 'react';
import { ShieldCheck, Star, Crown, X, Award, Trophy } from 'lucide-react';
import './PartnerBadge.css';

/**
 * Determines badge tier from totalEarnings (all-time)
 * Tier 0 = no badge
 * Tier 1 = Bronze (Rp 1.000.000+)  — "Mitra Dasar"
 * Tier 2 = Silver/Green (Rp 2.000.000+) — "Mitra Profesional"
 * Tier 3 = Gold (Rp 5.000.000+) — "Mitra Elite"
 * Tier 4 = Blue (Rp 10.000.000+) — "Mitra Terverifikasi"
 * Special = "Administrator"
 */
export function getBadgeTier(totalEarnings) {
  if ((totalEarnings || 0) >= 10_000_000) return 4;
  if ((totalEarnings || 0) >= 5_000_000) return 3;
  if ((totalEarnings || 0) >= 2_000_000) return 2;
  if ((totalEarnings || 0) >= 1_000_000) return 1;
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
  4: {
    label: 'Mitra Terverifikasi',
    icon: ShieldCheck,
    className: 'badge-verified',
    popupTitle: '🔵 Mitra Terverifikasi',
    popupDesc:
      'Lencana Spesial Biru diberikan kepada partner yang telah mencapai total pendapatan kumulatif Rp 10.000.000. Mencerminkan level tertinggi, kepercayaan penuh dari komunitas, dan konsistensi karya luar biasa.',
    popupColor: '#3b82f6',
  },
  3: {
    label: 'Mitra Elite',
    icon: Trophy,
    className: 'badge-elite',
    popupTitle: '🟡 Mitra Elite',
    popupDesc:
      'Lencana Emas diberikan kepada partner yang telah meraih total pendapatan kumulatif Rp 5.000.000. Tanda pengakuan atas dedikasi kelas atas di platform.',
    popupColor: '#eab308',
  },
  2: {
    label: 'Mitra Profesional',
    icon: Award,
    className: 'badge-achieved',
    popupTitle: '🟢 Mitra Profesional',
    popupDesc:
      'Lencana Hijau diberikan kepada partner yang telah meraih total pendapatan kumulatif Rp 2.000.000. Menunjukkan profesionalisme dan penjualan yang konsisten.',
    popupColor: '#10b981',
  },
  1: {
    label: 'Mitra Dasar',
    icon: Star,
    className: 'badge-basic',
    popupTitle: '⚪ Mitra Dasar',
    popupDesc:
      'Lencana Dasar diberikan kepada partner yang telah meraih pendapatan pertama Rp 1.000.000. Awal dari perjalanan sukses di platform.',
    popupColor: '#94a3b8',
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
