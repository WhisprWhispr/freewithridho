import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import './KalenderHijriah.css';

const KalenderHijriah = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hijriData, setHijriData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const monthName = currentDate.toLocaleString('id-ID', { month: 'long' });

  useEffect(() => {
    fetchHijriCalendar(year, month);
  }, [year, month]);

  const fetchHijriCalendar = async (y, m) => {
    setLoading(true);
    setError(null);
    try {
      // Using Aladhan API to get full month gregorian to hijri mapping
      const res = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${m}/${y}`);
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data = await res.json();
      if (data.code === 200) {
        setHijriData(data.data);
      } else {
        setError("Gagal memuat data kalender.");
      }
    } catch (err) {
      console.error("Failed to fetch calendar", err);
      setError("Terjadi kesalahan jaringan atau API limit.");
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1)); // Month is 0-indexed in Date constructor (so month=currentMonth+1)
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const isFastingDay = (hijriDay, dayOfWeek) => {
    const day = parseInt(hijriDay);
    if (day === 13 || day === 14 || day === 15) {
      return { isFasting: true, type: 'ayyamul_bidh', title: 'Puasa Ayyamul Bidh' };
    }
    if (dayOfWeek === 'Monday') {
      return { isFasting: true, type: 'senin', title: 'Puasa Senin' };
    }
    if (dayOfWeek === 'Thursday') {
      return { isFasting: true, type: 'kamis', title: 'Puasa Kamis' };
    }
    return { isFasting: false };
  };

  // Generate calendar grid
  const renderCalendar = () => {
    if (!hijriData) return null;

    const firstDayStr = hijriData[0].gregorian.date; // "DD-MM-YYYY"
    const [d, mStr, yStr] = firstDayStr.split('-');
    const firstDayDate = new Date(`${yStr}-${mStr}-${d}`);
    let firstDayIndex = firstDayDate.getDay(); // 0(Sun) - 6(Sat)
    
    // Shift index so Monday is 0
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    // Weekdays header
    const headers = weekdays.map(day => (
      <div key={day} className="calendar-header-day">{day}</div>
    ));

    // Empty slots for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
    }

    // Days slots
    hijriData.forEach((dayData, index) => {
      const gDay = dayData.gregorian.day;
      const hDay = dayData.hijri.day;
      const hMonth = dayData.hijri.month.en;
      
      const fastingInfo = isFastingDay(hDay, dayData.gregorian.weekday.en);
      
      const isToday = new Date().toDateString() === new Date(`${year}-${month}-${gDay}`).toDateString();

      days.push(
        <div key={index} className={`calendar-cell ${isToday ? 'today' : ''} ${fastingInfo.isFasting ? `fasting fasting-${fastingInfo.type}` : ''}`}>
          <div className="gregorian-day">{gDay}</div>
          <div className="hijri-day">{hDay}</div>
          {fastingInfo.isFasting && (
            <div className={`fasting-indicator indicator-${fastingInfo.type}`} title={fastingInfo.title}></div>
          )}
          {gDay === "15" && <div className="hijri-month-label">{hMonth}</div>} {/* Show month name in middle of month approx */}
        </div>
      );
    });

    return (
      <div className="calendar-grid">
        {headers}
        {days}
      </div>
    );
  };

  return (
    <div className="hijri-page fade-in">
      <div className="hijri-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="hijri-header-section">
        <CalendarDays size={40} className="hijri-icon" />
        <h1>Kalender Hijriah</h1>
        <p>Jadwal penanggalan Islam dan panduan Puasa Sunnah</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-controls">
          <button onClick={prevMonth} className="month-nav-btn"><ChevronLeft size={24} /></button>
          <div className="current-month-display">
            <h2>{monthName} {year}</h2>
            {hijriData && hijriData[15] && (
              <span className="hijri-subtitle">
                {hijriData[0].hijri.month.en} - {hijriData[hijriData.length - 1].hijri.month.en} {hijriData[0].hijri.year} H
              </span>
            )}
          </div>
          <button onClick={nextMonth} className="month-nav-btn"><ChevronRight size={24} /></button>
        </div>

        {loading ? (
          <div className="loading-calendar">Memuat kalender...</div>
        ) : error ? (
          <div className="loading-calendar error-text">{error}</div>
        ) : (
          renderCalendar()
        )}
        
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color today-color"></div>
            <span>Hari Ini</span>
          </div>
          <div className="legend-item">
            <div className="legend-color fasting-color-senin"></div>
            <span>Puasa Senin-Kamis</span>
          </div>
          <div className="legend-item">
            <div className="legend-color fasting-color-ayyamul"></div>
            <span>Puasa Ayyamul Bidh (13, 14, 15)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KalenderHijriah;
