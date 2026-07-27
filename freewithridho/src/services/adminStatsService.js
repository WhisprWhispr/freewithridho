// Firestore service layer for all analytics and transactional stats
import {
  collection,
  getDocs,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Fetch dashboard stats for admin panel
 */
export async function getAdminStats() {
  try {
    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
    
    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalProjects = projects.length;
    const paidTransactions = transactions.filter(t => t.status === 'PAID');
    const pendingTransactions = transactions.filter(t => t.status === 'PENDING');
    
    const totalEarnings = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalRevenuePending = pendingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalProjects,
      totalTransactions: transactions.length,
      paidTransactionsCount: paidTransactions.length,
      pendingTransactionsCount: pendingTransactions.length,
      totalEarnings,
      totalRevenuePending
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalProjects: 0,
      totalTransactions: 0,
      paidTransactionsCount: 0,
      pendingTransactionsCount: 0,
      totalEarnings: 0,
      totalRevenuePending: 0
    };
  }
}
