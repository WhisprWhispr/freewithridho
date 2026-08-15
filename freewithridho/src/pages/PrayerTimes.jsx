import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Maximize, Minimize, AlertCircle, RefreshCw, Sun, Moon, Sunrise, Sunset, BookOpen, Menu, X, Heart, Calculator, List, CalendarDays, Star, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './PrayerTimes.css';

const PrayerTimes = () => {
  const [permission, setPermission] = useState('default');
  const [times, setTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // New States for Advanced Features
  const [activePrayer, setActivePrayer] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [countdown, setCountdown] = useState('');

  const [showLocationModal, setShowLocationModal] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Check fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Fetch a daily quote
    fetchQuote();
    
    // Handle location logic
    const prompted = localStorage.getItem('prayerLocPrompted');
    if (!prompted) {
      setShowLocationModal(true);
    } else {
      // Default load Jakarta (-6.2088, 106.8456)
      if (!times && permission === 'default') {
        setLoading(true);
        fetchPrayerTimes(-6.2088, 106.8456);
      }
    }

    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const fetchQuote = async () => {
    try {
      // Mengambil dari API JSON lokal yang telah dibuat khusus untuk quotes Islami & jodoh
      const res = await fetch('/quotes-islami.json');
      const quotes = await res.json();
      
      // Mengganti quote setiap hari berdasarkan perhitungan hari dalam setahun (Day of Year)
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      // Memilih quote berdasarkan sisa bagi agar terus berputar secara harian
      const dailyQuote = quotes[dayOfYear % quotes.length];
      
      setQuote({ text: dailyQuote.text, author: dailyQuote.author });
    } catch (err) {
      console.error('Failed to fetch quote:', err);
      setQuote({ 
        text: "Jodoh itu cerminan diri. Perbaikilah dirimu, maka Allah akan memperbaiki jodohmu.", 
        author: "Umar bin Khattab" 
      });
    }
  };

  const requestFullscreen = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen request failed or was denied:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log('Exit fullscreen failed:', err);
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  };

  const addMinutesToTime = (timeStr, minutesToAdd) => {
    if (!timeStr) return timeStr;
    const pureTime = timeStr.split(' ')[0];
    const [hours, minutes] = pureTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMins = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMins}`;
  };

  const parseTime = (timeStr) => {
    if (!timeStr) return new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  useEffect(() => {
    if (!times) return;

    const calculatePrayerStatus = () => {
      const now = new Date();
      const schedule = [
         { name: 'Imsak', time: parseTime(times.timings.Imsak) },
         { name: 'Subuh', time: parseTime(times.timings.Subuh) },
         { name: 'Terbit', time: parseTime(times.timings.Terbit) },
         { name: 'Dzuhur', time: parseTime(times.timings.Dzuhur) },
         { name: 'Ashar', time: parseTime(times.timings.Ashar) },
         { name: 'Maghrib', time: parseTime(times.timings.Maghrib) },
         { name: 'Isya', time: parseTime(times.timings.Isya) },
      ];

      let currentActive = null;
      let upcoming = null;

      for (let i = 0; i < schedule.length; i++) {
         if (now >= schedule[i].time) {
            currentActive = schedule[i].name;
         }
         if (now < schedule[i].time && !upcoming) {
            upcoming = schedule[i];
         }
      }

      if (!upcoming) {
         const tomorrowImsak = new Date(schedule[0].time);
         tomorrowImsak.setDate(tomorrowImsak.getDate() + 1);
         upcoming = { name: 'Imsak', time: tomorrowImsak };
         currentActive = 'Isya';
      }

      setActivePrayer(currentActive);
      setNextPrayer(upcoming.name);

      const diff = upcoming.time - now;
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hStr = h > 0 ? `${h} Jam ` : '';
        const mStr = m > 0 ? `${m} Menit ` : '';
        const sStr = `${String(s).padStart(2, '0')} Detik`;
        setCountdown(`${hStr}${mStr}${sStr}`);
      }
    };

    calculatePrayerStatus();
    const interval = setInterval(calculatePrayerStatus, 1000);
    return () => clearInterval(interval);
  }, [times]);

  const handleGrantPermission = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda.');
      toast.error('Geolocation tidak didukung oleh browser Anda.');
      setPermission('denied');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setPermission('granted');
        const { latitude, longitude } = position.coords;
        await fetchPrayerTimes(latitude, longitude);
      },
      (err) => {
        setPermission('denied');
        setError('Akses lokasi ditolak atau gagal. Mohon izinkan akses lokasi di pengaturan browser Anda.');
        toast.error('Akses lokasi ditolak atau gagal.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleModalAllow = () => {
    localStorage.setItem('prayerLocPrompted', 'true');
    setShowLocationModal(false);
    handleGrantPermission();
  };

  const handleModalDeny = () => {
    localStorage.setItem('prayerLocPrompted', 'true');
    setShowLocationModal(false);
    setLoading(true);
    fetchPrayerTimes(-6.2088, 106.8456); // Load Jakarta
  };

  const fetchPrayerTimes = async (lat, lng) => {
    try {
      // Fetch city name
      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const geoData = await geoRes.json();
        setLocationName(geoData.city || geoData.locality || "Lokasi Anda");
      } catch (e) {
        setLocationName("Lokasi Anda");
      }

      // Fetch Prayer Times - Method 11 (Majlis Ugama Islam Singapura)
      const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=11`);
      const data = await res.json();

      if (data.code === 200) {
        const timings = data.data.timings;
        
        // Add 3 minutes to each prayer time as requested
        const adjustedTimings = {
          Imsak: addMinutesToTime(timings.Imsak, 3),
          Subuh: addMinutesToTime(timings.Fajr, 3),
          Terbit: addMinutesToTime(timings.Sunrise, 3),
          Dzuhur: addMinutesToTime(timings.Dhuhr, 3),
          Ashar: addMinutesToTime(timings.Asr, 3),
          Maghrib: addMinutesToTime(timings.Maghrib, 3),
          Isya: addMinutesToTime(timings.Isha, 3),
        };
        
        setTimes({
          timings: adjustedTimings,
          date: data.data.date.readable,
          hijri: `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year}`
        });
        toast.success('Jadwal sholat berhasil dimuat!');
      } else {
        throw new Error('Gagal memuat data jadwal sholat');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat mengambil jadwal sholat.');
      toast.error('Gagal mengambil jadwal sholat');
    } finally {
      setLoading(false);
    }
  };

  const prayerIcons = {
    Imsak: <Clock size={24} />,
    Subuh: <Moon size={24} />,
    Terbit: <Sunrise size={24} />,
    Dzuhur: <Sun size={24} />,
    Ashar: <Sun size={24} />,
    Maghrib: <Sunset size={24} />,
    Isya: <Moon size={24} />
  };

  return (
    <div className="prayer-times-wrapper" ref={containerRef}>
        {showLocationModal && (
          <div className="location-modal-overlay">
            <div className="location-modal">
              <div className="location-modal-icon">
                <MapPin size={36} color="#8b5cf6" />
              </div>
              <h3>Izin Akses Lokasi</h3>
              <p>Untuk menampilkan jadwal sholat yang paling akurat, kami membutuhkan izin untuk mengakses lokasi perangkat Anda.</p>
              <div className="location-modal-actions">
                <button className="btn-deny" onClick={handleModalDeny}>Lain Kali</button>
                <button className="btn-allow" onClick={handleModalAllow}>Izinkan Lokasi</button>
              </div>
            </div>
          </div>
        )}

        {/* Islamic Dashboard Internal Menu */}
        <div className={`islamic-menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
        <div className={`islamic-side-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="side-menu-header">
            <h3>Fitur Islami</h3>
            <button className="close-menu-btn" onClick={() => setIsMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="side-menu-links">
            <Link to="/quran" className="side-menu-item">
              <BookOpen size={20} /> Al-Quran Digital
            </Link>
            <Link to="/yasin-tahlil" className="side-menu-item">
              <BookOpen size={20} /> Yasin & Tahlil
            </Link>
            <Link to="/kalender-hijriah" className="side-menu-item">
              <CalendarDays size={20} /> Kalender Hijriah
            </Link>
            <Link to="/sholawat" className="side-menu-item">
              <Star size={20} /> Kumpulan Sholawat
            </Link>
            <Link to="/kisah-nabi" className="side-menu-item">
              <Library size={20} /> Kisah 25 Nabi
            </Link>
            <Link to="/artikel-islami" className="side-menu-item">
              <BookOpen size={20} /> Artikel Islami
            </Link>
            <Link to="/tasbih" className="side-menu-item">
              <List size={20} /> Tasbih Digital
            </Link>
            <Link to="/asmaul-husna" className="side-menu-item">
              <Heart size={20} /> Asmaul Husna
            </Link>
            <Link to="/doa-harian" className="side-menu-item">
              <Clock size={20} /> Doa Harian
            </Link>
            <Link to="/kalkulator-zakat" className="side-menu-item">
              <Calculator size={20} /> Kalkulator Zakat
            </Link>
          </div>
        </div>

        <div className="prayer-dashboard">
          


          <div className="dashboard-header">
            <div className="header-left">
              <div className="header-title-row">
                <button className="icon-btn hamburger-menu-btn" onClick={() => setIsMenuOpen(true)} title="Menu Islami">
                  <Menu size={24} />
                </button>
                <h2>Dashboard Islami</h2>
              </div>
              <div className="header-action-row">
                <div className="location-badge">
                  <MapPin size={16} />
                  <span>{locationName}</span>
                </div>
                <button className="use-location-btn" onClick={handleGrantPermission} disabled={loading} title="Gunakan Lokasi Saat Ini">
                  {loading && permission === 'granted' ? <RefreshCw size={14} className="spin" /> : <MapPin size={14} />} 
                  Gunakan Lokasi Saya
                </button>
              </div>
            </div>
            <div className="header-right">
              <button className="icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>

          {loading || !times ? (
            <div className="loading-state">
              <RefreshCw size={40} className="spin text-primary" />
              <p>Menghitung jadwal sholat yang akurat...</p>
            </div>
          ) : (
            <>
              <div className="time-display">
                <div className="current-time">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="current-date">
                  <span className="gregorian-date">{times.date}</span>
                  <span className="hijri-badge">{times.hijri}</span>
                </div>
                
                {countdown && (
                  <div className="countdown-container">
                    <span className="countdown-label">Menuju {nextPrayer}:</span>
                    <span className="countdown-timer">{countdown}</span>
                  </div>
                )}
              </div>

              <div className="prayer-cards-container">
                {Object.entries(times.timings).map(([name, time]) => (
                  <div className={`prayer-card ${activePrayer === name ? 'active-prayer' : ''}`} key={name}>
                    <div className="prayer-card-icon">
                      {prayerIcons[name]}
                    </div>
                    <div className="prayer-name">{name}</div>
                    <div className="prayer-time">{time}</div>
                    {activePrayer === name && <div className="active-indicator">Sekarang</div>}
                  </div>
                ))}
              </div>

              {quote && (
                <div className="quote-container">
                  <BookOpen size={24} className="quote-icon" />
                  <blockquote className="quote-text">
                    "{quote.text}"
                  </blockquote>
                  <cite className="quote-author">- {quote.author}</cite>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
};

export default PrayerTimes;
