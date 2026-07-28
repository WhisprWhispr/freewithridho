import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Maximize, Minimize, AlertCircle, RefreshCw, Sun, Moon, Sunrise, Sunset, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import './PrayerTimes.css';

const PrayerTimes = () => {
  const [permission, setPermission] = useState('pending');
  const [times, setTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    // Assuming format "HH:mm" or "HH:mm (WIB)"
    const pureTime = timeStr.split(' ')[0];
    const [hours, minutes] = pureTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMins = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMins}`;
  };

  const handleGrantPermission = () => {
    // Attempt fullscreen on user interaction
    requestFullscreen();
    
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda.');
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
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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
      {permission === 'pending' || permission === 'denied' ? (
        <div className="permission-modal-container">
          <div className="permission-modal">
            <div className="modal-icon-wrapper">
              <MapPin size={48} className="modal-icon" />
            </div>
            <h2>Izin Lokasi Diperlukan</h2>
            <p>
              Untuk menampilkan jadwal sholat yang akurat sesuai dengan daerah Anda, 
              kami membutuhkan akses lokasi perangkat Anda (GPS).
            </p>
            {error && (
              <div className="error-alert">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            <button 
              className="grant-btn" 
              onClick={handleGrantPermission}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="spin" /> Memproses...
                </>
              ) : (
                'Berikan Izin Lokasi'
              )}
            </button>
            <p className="modal-note">
              Akses lokasi hanya digunakan untuk perhitungan jadwal sholat dan tidak disimpan di server kami.
            </p>
          </div>
        </div>
      ) : (
        <div className="prayer-dashboard">
          <div className="dashboard-header">
            <div className="header-left">
              <h2>Jadwal Sholat</h2>
              <div className="location-badge">
                <MapPin size={16} />
                <span>{locationName}</span>
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
                  {times.date} &bull; {times.hijri}
                </div>
              </div>

              <div className="prayer-cards-container">
                {Object.entries(times.timings).map(([name, time]) => (
                  <div className="prayer-card" key={name}>
                    <div className="prayer-card-icon">
                      {prayerIcons[name]}
                    </div>
                    <div className="prayer-name">{name}</div>
                    <div className="prayer-time">{time}</div>
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
              
              <div className="footer-note">
                Created by: Team SukaCoding.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PrayerTimes;
