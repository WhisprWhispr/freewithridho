// Firestore service layer for all analytics and transactional stats
import {
  collection,
  getDocs,
  onSnapshot,
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

    return calculateStats(projects, transactions);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return getEmptyStats();
  }
}

/**
 * Listen to dashboard stats in real-time
 */
export function listenToAdminStats(callback) {
  let projects = [];
  let transactions = [];
  let projectsLoaded = false;
  let transactionsLoaded = false;

  const emitStats = () => {
    if (projectsLoaded && transactionsLoaded) {
      callback(calculateStats(projects, transactions));
    }
  };

  const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
    projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    projectsLoaded = true;
    emitStats();
  }, (err) => {
    console.error("Error listening to projects:", err);
    callback(getEmptyStats());
  });

  const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
    transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    transactionsLoaded = true;
    emitStats();
  }, (err) => {
    console.error("Error listening to transactions:", err);
    callback(getEmptyStats());
  });

  return () => {
    unsubProjects();
    unsubTransactions();
  };
}

function calculateStats(projects, transactions) {
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
}

function getEmptyStats() {
  return {
    totalProjects: 0,
    totalTransactions: 0,
    paidTransactionsCount: 0,
    pendingTransactionsCount: 0,
    totalEarnings: 0,
    totalRevenuePending: 0
  };
}
