'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, View } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AuthView } from '@/components/AuthView';
import NewsView from '@/components/NewsView';
import { OperationsView } from '@/components/OperationsView';
import { DashboardView } from '@/components/DashboardView';
import { ReceiptsView } from '@/components/ReceiptsView';
import { ReceiptsDashboardView } from '@/components/ReceiptsDashboardView';
import { SuppliersView } from '@/components/SuppliersView';
import { AdminView } from '@/components/AdminView';
import { PurchaseOrdersView } from '@/components/PurchaseOrdersView';
import { SortingView } from '@/components/SortingView';
import PerformanceView from '@/components/PerformanceView';
import { SeparationDashboardView } from '@/components/SeparationDashboardView';
import { InfoView } from '@/components/InfoView';
import { Factory, Settings, CheckCircle2, Loader2, AlertCircle, RefreshCw, Eraser } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot, getDocs, where, Timestamp, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export interface Operation {
  id: string;
  line: string;
  date: string;
  progress: number;
  steps: boolean[];
  isCompleted?: boolean;
  isUrgente?: boolean;
  isLicitacao?: boolean;
  isAtrasada?: boolean;
  iconType?: 'factory' | 'settings' | 'check';
  quantity: number;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Initialize and Sync Theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // Global Data States
  const [operations, setOperations] = useState<Operation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [productionLines, setProductionLines] = useState<any[]>([]);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          setProfile(profileData);
          
          if (profileData.category === 'Recebimento') {
            setCurrentView('RECEIPTS');
          } else if (profileData.category === 'Ventisol' || profileData.category === 'Conferente' || profileData.category === 'Ventisol + Conferente') {
            setCurrentView('SORTING');
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor Global Data
  useEffect(() => {
    if (!user || !profile) return;

    // Operations
    const qOps = query(collection(db, 'operations'), orderBy('date', 'desc'));
    const unsubOps = onSnapshot(qOps, (snapshot) => {
      const ops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(ops);
    });

    // Purchase Orders
    const qPOs = query(collection(db, 'purchase_orders'), orderBy('created_at', 'desc'));
    const unsubPOs = onSnapshot(qPOs, (snapshot) => {
      setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Receipts
    const qReceipts = query(collection(db, 'receipts'), orderBy('created_at', 'desc'));
    const unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Suppliers
    const qSuppliers = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load Types
    const qLoadTypes = query(collection(db, 'load_types'), orderBy('name', 'asc'));
    const unsubLoadTypes = onSnapshot(qLoadTypes, (snapshot) => {
      setLoadTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Profiles
    const qProfiles = query(collection(db, 'profiles'), orderBy('name', 'asc'));
    const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
      setProfiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Production Lines
    const qLines = query(collection(db, 'production_lines'), orderBy('name', 'asc'));
    const unsubLines = onSnapshot(qLines, (snapshot) => {
      setProductionLines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Logo
    const unsubLogo = onSnapshot(doc(db, 'settings', 'company_logo'), (doc) => {
      if (doc.exists()) setLogoUrl(doc.data().value);
    });

    return () => {
      unsubOps();
      unsubPOs();
      unsubReceipts();
      unsubSuppliers();
      unsubLoadTypes();
      unsubProfiles();
      unsubLines();
      unsubLogo();
    };
  }, [user, profile]);

  const handleToggleStep = async (opId: string, stepIndex: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const newSteps = [...op.steps];
    newSteps[stepIndex] = !newSteps[stepIndex];
    
    const completedCount = newSteps.filter(s => s).length;
    const progress = Math.round((completedCount / newSteps.length) * 100);
    const isCompleted = completedCount === newSteps.length;

    await updateDoc(doc(db, 'operations', opId), {
      steps: newSteps,
      progress,
      isCompleted,
      updated_at: serverTimestamp()
    });
  };

  const handleToggleStatus = async (opId: string, statusKey: 'isUrgente' | 'isLicitacao' | 'isAtrasada') => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;
    await updateDoc(doc(db, 'operations', opId), {
      [statusKey]: !op[statusKey],
      updated_at: serverTimestamp()
    });
  };

  const handleAddOperation = async (op: Operation) => {
    await setDoc(doc(db, 'operations', op.id), {
      ...op,
      created_at: serverTimestamp()
    });
  };

  const handleUpdateOperation = async (op: Operation) => {
    await updateDoc(doc(db, 'operations', op.id), {
      ...op,
      updated_at: serverTimestamp()
    });
  };

  const handleDeleteOperation = async (id: string) => {
    await deleteDoc(doc(db, 'operations', id));
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary animate-pulse">
            <Factory className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando sistema...
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthView 
        onAuthSuccess={() => {}} 
        isDarkMode={isDarkMode} 
        onToggleDarkMode={toggleDarkMode}
        logoUrl="/app-logo.png"
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-surface transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isAdmin={profile?.is_admin}
        isViewer={profile?.is_viewer}
        category={profile?.category}
        subcategory={profile?.subcategory}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header 
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          isAdmin={profile?.is_admin}
          isViewer={profile?.is_viewer}
          category={profile?.category}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
        />
        
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentView === 'DASHBOARD' && (
              <DashboardView 
                key="dashboard" 
                isAdmin={profile?.is_admin} 
                userCategory={profile?.category}
                purchaseOrders={purchaseOrders} 
                operations={operations}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'OPERATIONS' && (
              <OperationsView 
                key="ops" 
                operations={operations}
                productionLines={productionLines}
                onToggleStep={handleToggleStep}
                onToggleStatus={handleToggleStatus}
                onAddOperation={handleAddOperation}
                onUpdateOperation={handleUpdateOperation}
                onDeleteOperation={handleDeleteOperation}
                isAdmin={profile?.is_admin}
                isViewer={profile?.is_viewer}
                allowedGroups={profile?.allowed_groups}
              />
            )}
            {currentView === 'RECEIPTS' && (
              <ReceiptsView 
                key="receipts" 
                isAdmin={profile?.is_admin} 
                isSuperAdmin={profile?.is_super_admin}
                currentUserId={user.uid}
                userName={profile?.name}
                userCategory={profile?.category}
                receipts={receipts}
                suppliers={suppliers}
                loadTypes={loadTypes}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'RECEIPTS_DASHBOARD' && (
              <ReceiptsDashboardView key="receipts-dash" />
            )}
            {currentView === 'SUPPLIERS' && (
              <SuppliersView 
                key="suppliers" 
                isAdmin={profile?.is_admin} 
                suppliers={suppliers}
              />
            )}
            {currentView === 'ORDERS' && (
              <PurchaseOrdersView 
                key="orders" 
                isAdmin={profile?.is_admin} 
                isSuperAdmin={profile?.is_super_admin}
                userCategory={profile?.category}
                purchaseOrders={purchaseOrders}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'SORTING' && (
              <SortingView 
                key="sorting" 
                isAdmin={profile?.is_admin} 
                isSuperAdmin={profile?.is_super_admin}
                currentUserId={user.uid} 
                currentUserName={profile?.name} 
                userCategory={profile?.category}
                userSubcategory={profile?.subcategory}
                isViewer={profile?.is_viewer}
                allowedGroups={profile?.allowed_groups}
                purchaseOrders={purchaseOrders}
                profiles={profiles}
                startDate={startDate}
                endDate={endDate}
                isDarkMode={isDarkMode}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'SEPARATION_DASHBOARD' && (
              <SeparationDashboardView 
                key="sep-dash" 
                isAdmin={profile?.is_admin} 
                isSuperAdmin={profile?.is_super_admin}
                currentUserId={user.uid}
                currentUserName={profile?.name}
                isViewer={profile?.is_viewer}
                allowedGroups={profile?.allowed_groups}
                purchaseOrders={purchaseOrders}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'PERFORMANCE' && (
              <PerformanceView 
                key="perf" 
                purchaseOrders={purchaseOrders}
                profiles={profiles}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            )}
            {currentView === 'INFO' && (
              <InfoView key="info" />
            )}
            {currentView === 'NEWS_PORTAL' && (
              <NewsView 
                key="news" 
                isAdmin={profile?.is_admin} 
                currentUserEmail={user?.email || ''} 
              />
            )}
            {currentView === 'ADMIN_PANEL' && (
              <AdminView 
                key="admin" 
                currentIsSuperAdmin={profile?.is_super_admin} 
                currentUserEmail={user.email} 
                profiles={profiles}
                logoUrl={logoUrl}
                productionLines={productionLines}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
