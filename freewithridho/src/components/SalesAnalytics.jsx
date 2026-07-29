import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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

    const fetchSalesData = async () => {
      setLoading(true);
      try {
        // Find all transactions that belong to this partner's projects
        // Since we don't store partnerId directly in transaction (we store projectId),
        // we first need to fetch projects owned by partner, then transactions.
        const projectsSnap = await getDocs(query(collection(db, 'projects'), where('ownerId', '==', partnerId)));
        const myProjectIds = projectsSnap.docs.map(d => d.id);

        if (myProjectIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // We can't query 'in' with more than 10 items in Firestore, 
        // so we'll fetch all SUCCESS transactions and filter locally (ok for small scale).
        // Or if 'transactions' has a projectOwnerId we could use that. Let's fetch all PAID tx.
        const txSnap = await getDocs(query(collection(db, 'transactions'), where('status', '==', 'SUCCESS')));
        
        let salesData = [];
        let total = 0;

        txSnap.docs.forEach(doc => {
          const tx = doc.data();
          if (myProjectIds.includes(tx.projectId)) {
            const dateStr = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : 'Unknown';
            // Partner share is typically 80% (assuming 20% platform fee)
            // if platform fee is configurable, we should fetch from settings, but for simple charts we can just show total sales amount.
            // Or calculate net earnings if we know the fee.
            // In freewithridho, it seems partner gets 80%. Let's plot gross amount for now.
            salesData.push({
              date: dateStr,
              timestamp: tx.createdAt?.toMillis ? tx.createdAt.toMillis() : 0,
              amount: tx.amount,
              net: tx.amount * 0.8,
              projectTitle: tx.projectTitle
            });
            total += (tx.amount * 0.8);
          }
        });

        // Group by date
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
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [partnerId]);

  if (loading) {
    return (
      <div className="analytics-loading">
        <Loader2 size={32} className="spin-icon" />
        <p>Memuat grafik analitik...</p>
      </div>
    );
  }

  if (data.length === 0) {
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
      <div className="analytics-summary">
        <h4>Total Estimasi Pendapatan</h4>
        <p className="total-sales">Rp {totalSales.toLocaleString('id-ID')}</p>
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
