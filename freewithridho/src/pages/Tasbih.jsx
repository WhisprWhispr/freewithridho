import { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Settings, ChevronDown, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Tasbih.css';

const dzikirTypes = [
  {
    id: 1,
    title: "Subhanallah",
    arabic: "سُبْحَانَ اللّٰهِ",
    translation: "Maha Suci Allah"
  },
  {
    id: 2,
    title: "Alhamdulillah",
    arabic: "اَلْحَمْدُ لِلّٰهِ",
    translation: "Segala puji bagi Allah"
  },
  {
    id: 3,
    title: "Allahu Akbar",
    arabic: "اَللّٰهُ اَكْبَرُ",
    translation: "Allah Maha Besar"
  },
  {
    id: 4,
    title: "Laa ilaaha illallah",
    arabic: "لَا اِلٰهَ اِلَّا اللّٰهُ",
    translation: "Tiada Tuhan selain Allah"
  },
  {
    id: 5,
    title: "Astaghfirullah",
    arabic: "اَسْتَغْفِرُ اللّٰهَ",
    translation: "Aku memohon ampun kepada Allah"
  },
  {
    id: 6,
    title: "Sholawat Nabi",
    arabic: "اَللّٰهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ",
    translation: "Ya Allah, limpahkanlah rahmat kepada Nabi Muhammad"
  }
];

const Tasbih = () => {
  const navigate = useNavigate();
  
  // Load saved state or default
  const [selectedDzikirId, setSelectedDzikirId] = useState(() => {
    const saved = localStorage.getItem('tasbih_dzikir_id');
    return saved ? parseInt(saved) : 1;
  });

  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('tasbih_count');
    return saved ? parseInt(saved) : 0;
  });
  
  const [totalCount, setTotalCount] = useState(() => {
    const saved = localStorage.getItem('tasbih_total');
    return saved ? parseInt(saved) : 0;
  });
  
  const [target, setTarget] = useState(() => {
    const saved = localStorage.getItem('tasbih_target');
    return saved ? parseInt(saved) : 33;
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDzikirSelectOpen, setIsDzikirSelectOpen] = useState(false);

  const activeDzikir = dzikirTypes.find(d => d.id === selectedDzikirId) || dzikirTypes[0];

  useEffect(() => {
    localStorage.setItem('tasbih_dzikir_id', selectedDzikirId.toString());
    localStorage.setItem('tasbih_count', count.toString());
    localStorage.setItem('tasbih_total', totalCount.toString());
    localStorage.setItem('tasbih_target', target.toString());
  }, [selectedDzikirId, count, totalCount, target]);

  const handleTap = () => {
    setCount(c => c + 1);
    setTotalCount(t => t + 1);
    
    // Trigger vibration
    if (window.navigator && window.navigator.vibrate) {
      // If hitting target, longer vibration
      if (count + 1 === target) {
        window.navigator.vibrate([200, 100, 200]);
      } else {
        window.navigator.vibrate(50);
      }
    }
  };

  const handleReset = () => {
    setCount(0);
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  };
  
  const handleResetTotal = () => {
    if (window.confirm("Apakah Anda yakin ingin mereset total dzikir?")) {
      setTotalCount(0);
    }
  };

  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 100;
  
  // Handle auto reset when reaching target if desired, but here we just let it continue
  // or user resets manually.

  return (
    <div className="tasbih-page fade-in">
      <div className="tasbih-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
        
        <div className="total-badge" onClick={handleResetTotal} title="Klik untuk mereset total">
          <Activity size={16} /> Total: {totalCount}
        </div>
      </div>

      <div className="tasbih-container">
        <div className="tasbih-header">
          <h1>Tasbih Digital</h1>
          
          <div className="dzikir-selector-container">
            <button 
              className="dzikir-select-btn" 
              onClick={() => {
                setIsDzikirSelectOpen(!isDzikirSelectOpen);
                setIsSettingsOpen(false);
              }}
            >
              <span>{activeDzikir.title}</span>
              <ChevronDown size={16} />
            </button>
            
            {isDzikirSelectOpen && (
              <div className="dzikir-dropdown">
                {dzikirTypes.map(dzikir => (
                  <button 
                    key={dzikir.id}
                    className={selectedDzikirId === dzikir.id ? 'active' : ''}
                    onClick={() => {
                      setSelectedDzikirId(dzikir.id);
                      setIsDzikirSelectOpen(false);
                      setCount(0); // Optional: Reset count when changing dzikir
                    }}
                  >
                    {dzikir.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="active-dzikir-display">
            <h2 className="dzikir-arabic">{activeDzikir.arabic}</h2>
            <p className="dzikir-translation">{activeDzikir.translation}</p>
          </div>
        </div>

        <div className="tasbih-counter-card">
          <div className="target-selector">
            <button 
              className="target-btn" 
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsDzikirSelectOpen(false);
              }}
            >
              <Settings size={16} /> Target: {target === 0 ? 'Tanpa Batas' : target} <ChevronDown size={16} />
            </button>
            
            {isSettingsOpen && (
              <div className="target-dropdown">
                <button onClick={() => { setTarget(33); setIsSettingsOpen(false); }}>33</button>
                <button onClick={() => { setTarget(99); setIsSettingsOpen(false); }}>99</button>
                <button onClick={() => { setTarget(100); setIsSettingsOpen(false); }}>100</button>
                <button onClick={() => { setTarget(1000); setIsSettingsOpen(false); }}>1000</button>
                <button onClick={() => { setTarget(0); setIsSettingsOpen(false); }}>Tanpa Batas</button>
              </div>
            )}
          </div>

          {/* Circular Progress Ring */}
          <div className="progress-ring-container">
            <svg className="progress-ring" width="280" height="280">
              <circle
                className="progress-ring__circle-bg"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                fill="transparent"
                r="120"
                cx="140"
                cy="140"
              />
              <circle
                className="progress-ring__circle"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="transparent"
                r="120"
                cx="140"
                cy="140"
                style={{
                  strokeDasharray: `${120 * 2 * Math.PI}`,
                  strokeDashoffset: `${120 * 2 * Math.PI - (progress / 100) * 120 * 2 * Math.PI}`,
                  transition: 'stroke-dashoffset 0.3s ease'
                }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="counter-display">
              <span>{count}</span>
            </div>
          </div>
        </div>

        <div className="tasbih-controls">
          <button className="tap-btn ripple" onClick={handleTap}>
            TAP
          </button>
          
          <button className="reset-btn" onClick={handleReset} title="Reset">
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tasbih;
