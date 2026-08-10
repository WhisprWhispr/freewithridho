import { useState } from 'react';
import { ArrowLeft, Calculator, Wallet, Briefcase, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ZakatCalculator.css';

const ZakatCalculator = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('maal');
  
  // Maal State
  const [tabungan, setTabungan] = useState('');
  const [hargaEmas, setHargaEmas] = useState('1000000');
  
  // Penghasilan State
  const [penghasilan, setPenghasilan] = useState('');
  const [bonus, setBonus] = useState('');
  const [hargaBeras, setHargaBeras] = useState('15000'); // Harga beras per kg
  
  // Fitrah State
  const [jumlahOrang, setJumlahOrang] = useState('1');

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  // Kalkulasi Maal
  const calcMaal = () => {
    const total = parseFloat(tabungan) || 0;
    const nishab = 85 * (parseFloat(hargaEmas) || 0);
    return {
      wajib: total >= nishab,
      zakat: total >= nishab ? total * 0.025 : 0,
      nishab: nishab
    };
  };

  // Kalkulasi Penghasilan (Profesi)
  const calcPenghasilan = () => {
    const total = (parseFloat(penghasilan) || 0) + (parseFloat(bonus) || 0);
    // Nishab Zakat Penghasilan setara dengan 522 kg beras
    const nishab = 522 * (parseFloat(hargaBeras) || 0);
    return {
      wajib: total >= nishab,
      zakat: total >= nishab ? total * 0.025 : 0,
      nishab: nishab
    };
  };

  // Kalkulasi Fitrah
  const calcFitrah = () => {
    const org = parseInt(jumlahOrang) || 0;
    // Zakat fitrah 2.5 kg atau 3.5 liter beras per jiwa
    const beras = 2.5; 
    const uang = beras * (parseFloat(hargaBeras) || 0);
    return {
      zakatUang: org * uang,
      zakatBeras: org * beras,
      orang: org
    };
  };

  return (
    <div className="zakat-page fade-in">
      <div className="zakat-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="zakat-header">
        <h1>Kalkulator Zakat</h1>
        <p>Hitung kewajiban zakat Anda dengan mudah dan akurat</p>
      </div>

      <div className="zakat-tabs">
        <button 
          className={`tab-btn ${activeTab === 'maal' ? 'active' : ''}`}
          onClick={() => setActiveTab('maal')}
        >
          <Wallet size={18} /> Zakat Maal
        </button>
        <button 
          className={`tab-btn ${activeTab === 'penghasilan' ? 'active' : ''}`}
          onClick={() => setActiveTab('penghasilan')}
        >
          <Briefcase size={18} /> Profesi
        </button>
        <button 
          className={`tab-btn ${activeTab === 'fitrah' ? 'active' : ''}`}
          onClick={() => setActiveTab('fitrah')}
        >
          <Users size={18} /> Fitrah
        </button>
      </div>

      <div className="zakat-card">
        {activeTab === 'maal' && (
          <div className="tab-content fade-in">
            <h3>Kalkulator Zakat Maal (Tabungan)</h3>
            <p className="tab-desc">Zakat yang dikenakan atas harta (uang/emas) yang disimpan selama 1 tahun (haul).</p>
            
            <div className="zakat-form">
              <div className="form-group">
                <label>Total Saldo Tabungan (Rupiah)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={tabungan} onChange={(e) => setTabungan(e.target.value)} placeholder="Contoh: 100000000" />
                </div>
              </div>
              <div className="form-group">
                <label>Harga Emas Saat Ini (Per Gram)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={hargaEmas} onChange={(e) => setHargaEmas(e.target.value)} />
                </div>
                <small className="zakat-note">*Nishab adalah senilai 85 gram emas.</small>
              </div>
            </div>
            
            {tabungan && (
              <div className={`zakat-result ${calcMaal().wajib ? 'wajib' : 'tidak-wajib'}`}>
                <div className="result-details">
                  <div className="detail-item">
                    <span>Batas Nishab (85g Emas):</span>
                    <strong>{formatRupiah(calcMaal().nishab)}</strong>
                  </div>
                </div>
                {calcMaal().wajib ? (
                  <div className="result-alert success">
                    <p>Alhamdulillah, harta Anda mencapai nishab. Anda <strong>WAJIB</strong> zakat 2,5%.</p>
                    <div className="zakat-amount">
                      <span className="label">Zakat yang dikeluarkan:</span>
                      <span className="amount">{formatRupiah(calcMaal().zakat)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="result-alert info">
                    <p>Harta Anda <strong>BELUM MENCAPAI NISHAB</strong>. Anda belum diwajibkan bayar zakat maal.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'penghasilan' && (
          <div className="tab-content fade-in">
            <h3>Kalkulator Zakat Profesi (Penghasilan)</h3>
            <p className="tab-desc">Zakat yang dikeluarkan dari penghasilan rutin (gaji) pada saat diterima.</p>
            
            <div className="zakat-form">
              <div className="form-group">
                <label>Penghasilan / Gaji (Per Bulan)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={penghasilan} onChange={(e) => setPenghasilan(e.target.value)} placeholder="Contoh: 10000000" />
                </div>
              </div>
              <div className="form-group">
                <label>Pendapatan Lain / Bonus (Per Bulan)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="Contoh: 2000000" />
                </div>
              </div>
              <div className="form-group">
                <label>Harga Beras (Per Kg)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={hargaBeras} onChange={(e) => setHargaBeras(e.target.value)} />
                </div>
                <small className="zakat-note">*Nishab zakat profesi adalah senilai 522 kg beras.</small>
              </div>
            </div>

            {(penghasilan || bonus) && (
              <div className={`zakat-result ${calcPenghasilan().wajib ? 'wajib' : 'tidak-wajib'}`}>
                <div className="result-details">
                  <div className="detail-item">
                    <span>Batas Nishab (522 kg Beras):</span>
                    <strong>{formatRupiah(calcPenghasilan().nishab)}</strong>
                  </div>
                </div>
                {calcPenghasilan().wajib ? (
                  <div className="result-alert success">
                    <p>Alhamdulillah, penghasilan Anda mencapai nishab. Anda <strong>WAJIB</strong> zakat 2,5%.</p>
                    <div className="zakat-amount">
                      <span className="label">Zakat yang dikeluarkan:</span>
                      <span className="amount">{formatRupiah(calcPenghasilan().zakat)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="result-alert info">
                    <p>Penghasilan Anda <strong>BELUM MENCAPAI NISHAB</strong>. Anda tidak wajib zakat profesi.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fitrah' && (
          <div className="tab-content fade-in">
            <h3>Kalkulator Zakat Fitrah</h3>
            <p className="tab-desc">Zakat yang wajib dikeluarkan setiap jiwa menjelang Idul Fitri (2.5 kg beras).</p>
            
            <div className="zakat-form">
              <div className="form-group">
                <label>Jumlah Orang / Jiwa</label>
                <div className="input-with-icon">
                  <span className="currency"><Users size={16}/></span>
                  <input type="number" value={jumlahOrang} onChange={(e) => setJumlahOrang(e.target.value)} min="1" />
                </div>
              </div>
              <div className="form-group">
                <label>Harga Beras Kualitas Biasa Dikonsumsi (Per Kg)</label>
                <div className="input-with-icon">
                  <span className="currency">Rp</span>
                  <input type="number" value={hargaBeras} onChange={(e) => setHargaBeras(e.target.value)} />
                </div>
              </div>
            </div>

            {jumlahOrang && (
              <div className="zakat-result wajib">
                <div className="result-alert success">
                  <p>Kewajiban Zakat Fitrah untuk <strong>{calcFitrah().orang} Jiwa</strong></p>
                  <div className="zakat-amount-group">
                    <div className="zakat-amount-small">
                      <span className="label">Berupa Beras:</span>
                      <span className="amount text-blue">{calcFitrah().zakatBeras} Kg</span>
                    </div>
                    <div className="divider">ATAU</div>
                    <div className="zakat-amount">
                      <span className="label">Berupa Uang:</span>
                      <span className="amount">{formatRupiah(calcFitrah().zakatUang)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZakatCalculator;
