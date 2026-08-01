import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import './SalesAnalytics.css';

const SalesAnalytics = ({ partnerId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    if (!partnerId) return;

    let myProjectIds = [];
    let unsubProjects;
    let unsubTransactions;

    // Step 1: Listen realtime to partner's projects
    const projectsQ = query(collection(db, 'projects'), where('ownerId', '==', partnerId));
    unsubProjects = onSnapshot(projectsQ, (projectsSnap) => {
      myProjectIds = projectsSnap.docs.map(d => d.id);

      if (myProjectIds.length === 0) {
        setData([]);
        setTotalSales(0);
        setLoading(false);
        return;
      }

      // Step 2: Listen realtime to transactions
      if (unsubTransactions) unsubTransactions();
      const txQ = query(collection(db, 'transactions'), where('status', 'in', ['PAID', 'SUCCESS', 'PENDING']));
      unsubTransactions = onSnapshot(txQ, (txSnap) => {
        let salesData = [];
        let total = 0;
        let totalPending = 0;

        txSnap.docs.forEach(docSnap => {
          const tx = docSnap.data();
          if (myProjectIds.includes(tx.projectId)) {
            const isPaid = tx.status === 'PAID' || tx.status === 'SUCCESS';
            const netAmount = tx.amount * 0.8;
            
            if (isPaid) {
              const dateStr = tx.createdAt?.toDate
                ? tx.createdAt.toDate().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
                : 'Unknown';
              salesData.push({
                date: dateStr,
                timestamp: tx.createdAt?.toMillis ? tx.createdAt.toMillis() : 0,
                amount: tx.amount,
                net: netAmount,
                projectTitle: tx.projectTitle
              });
              total += netAmount;
            } else if (tx.status === 'PENDING') {
              totalPending += netAmount;
            }
          }
        });

        const grouped = salesData.reduce((acc, curr) => {
          if (!acc[curr.date]) {
            acc[curr.date] = { date: curr.date, timestamp: curr.timestamp, Pendapatan: 0, Transaksi: 0 };
          }
          acc[curr.date].Pendapatan += curr.net;
          acc[curr.date].Transaksi += 1;
          return acc;
        }, {});

        const chartData = Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
        setData(chartData);
        setTotalSales(total);
        if (typeof setPendingSales === 'function') setPendingSales(totalPending);
        setLoading(false);
      }, (err) => {
        console.error('Error listening transactions:', err);
        setLoading(false);
      });
    }, (err) => {
      console.error('Error listening projects:', err);
      setLoading(false);
    });

    return () => {
      if (unsubProjects) unsubProjects();
      if (unsubTransactions) unsubTransactions();
    };
  }, [partnerId]);

  const [pendingSales, setPendingSales] = useState(0);

  if (loading) {
    return (
      <div className="analytics-loading">
        <Loader2 size={32} className="spin-icon" />
        <p>Memuat grafik analitik...</p>
      </div>
    );
  }

  if (data.length === 0 && pendingSales === 0) {
    return (
      <div className="analytics-empty">
        <TrendingUp size={48} className="empty-icon" />
        <h3>Belum Ada Data Penjualan</h3>
        <p>Grafik akan muncul setelah ada transaksi berhasil untuk proyek Anda.</p>
      </div>
    );
  }

  return (
    <div className="sales-analytics-container">
      <div className="analytics-summary-grid">
        <div className="analytics-summary">
          <h4>Total Estimasi Pendapatan (Lunas)</h4>
          <p className="total-sales">Rp {totalSales.toLocaleString('id-ID')}</p>
        </div>
        <div className="analytics-summary pending-summary">
          <h4>Pendapatan Tertunda (Belum Dibayar)</h4>
          <p className="total-sales pending-text" style={{ color: '#f59e0b' }}>Rp {pendingSales.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h3 className="chart-title">Grafik Pendapatan Harian</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(value) => `Rp${(value/1000)}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#10b981' }}
              formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan Bersih']}
            />
            <Legend />
            <Line type="monotone" dataKey="Pendapatan" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-wrapper">
        <h3 className="chart-title">Jumlah Transaksi Harian</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="Transaksi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesAnalytics;
