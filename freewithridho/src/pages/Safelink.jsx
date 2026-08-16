import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { Download, ArrowRight, Clock, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdSense from '../components/AdSense';
import './Safelink.css';

const Safelink = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(10);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await getProjectById(id);
        if (!data) {
          setError('Proyek tidak ditemukan.');
          return;
        }
        if (data.price > 0) {
          setError('Proyek ini berbayar. Harap beli melalui halaman proyek.');
          return;
        }
        if (!data.downloadUrl) {
          setError('Link unduhan belum tersedia untuk proyek ini.');
          return;
        }
        setProject(data);
      } catch (err) {
        setError('Gagal memuat detail proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (loading || error) return;
    
    setCanProceed(false);
    setCountdown(10); // 10 seconds per step
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [step, loading, error]);

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo(0, 0);
    } else if (step === 2) {
      if (project?.downloadUrl) {
        toast.success('Mengalihkan ke link unduhan...');
        setTimeout(() => {
          window.location.href = project.downloadUrl;
        }, 1000);
      }
    }
  };

  if (loading) {
    return (
      <div className="safelink-loading">
        <Loader2 className="spin" size={48} color="#8b5cf6" />
        <p>Menyiapkan tautan aman Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="safelink-error">
        <h2>Ups, Ada Masalah!</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="btn-back-home">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="safelink-page">
      <div className="safelink-header">
        <h1>{project?.title}</h1>
        <p>Anda sedang berada di halaman tunggu. Mohon bersabar.</p>
      </div>

      {/* Iklan Atas */}
      <AdSense slot="" />

      <div className="safelink-content">
        <div className="step-indicator">
          <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        <h2>Tahap {step} dari 2</h2>
        <p className="safelink-desc">
          Tautan unduhan sedang diproses. Mohon tunggu hitungan mundur selesai.
        </p>

        <div className="timer-box">
          {countdown > 0 ? (
            <>
              <Clock size={48} className="pulse-icon" color="#8b5cf6" />
              <div className="countdown-number">{countdown}</div>
              <p>detik</p>
            </>
          ) : (
            <>
              <ShieldCheck size={48} color="#10b981" />
              <h3 className="ready-text">Siap!</h3>
            </>
          )}
        </div>

        <button 
          className={`btn-proceed ${canProceed ? 'ready' : 'waiting'}`}
          onClick={handleNextStep}
          disabled={!canProceed}
        >
          {canProceed ? (
            step === 1 ? (
              <>Lanjut ke Tahap 2 <ArrowRight size={18} /></>
            ) : (
              <><Download size={18} /> Dapatkan Link Unduhan <ExternalLink size={16} style={{ marginLeft: 8 }} /></>
            )
          ) : (
            `Harap Tunggu ${countdown} Detik...`
          )}
        </button>
      </div>

      {/* Iklan Bawah */}
      <AdSense slot="" />
    </div>
  );
};

export default Safelink;
