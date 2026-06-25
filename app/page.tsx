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
import { SeparationSequenceView } from '@/components/SeparationSequenceView';
import { InfoView } from '@/components/InfoView';
import { TransfersView, triggerSystemNotification } from '@/components/TransfersView';
import { Factory, Settings, CheckCircle2, Loader2, AlertCircle, RefreshCw, Eraser, Smartphone, ShieldAlert, Battery, Check, X } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot, getDocs, where, Timestamp, setDoc, updateDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showAndroidBgModal, setShowAndroidBgModal] = useState(false);

  // Initialize and Sync Theme & Notifications
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    if (typeof window !== 'undefined') {
      // Garantir ID único do dispositivo para evitar silenciar notificações quando usar a mesma conta em múltiplos aparelhos
      if (!localStorage.getItem('ventisol_device_session_id')) {
        localStorage.setItem('ventisol_device_session_id', 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now());
      }

      const saved = localStorage.getItem('ventisol_notifications_enabled');
      if (saved === null) {
        // Se nunca configurou, assume true se tiver permissão concedida, senão false
        const isGranted = 'Notification' in window && Notification.permission === 'granted';
        setNotificationsEnabled(isGranted);
        localStorage.setItem('ventisol_notifications_enabled', String(isGranted));
      } else {
        setNotificationsEnabled(saved === 'true');
      }
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações de sistema.');
      return;
    }

    // Se as notificações estiverem bloqueadas pelo navegador
    if (Notification.permission === 'denied') {
      alert('As permissões de notificação estão bloqueadas no seu navegador. Por favor, ative-as nas configurações do site (ícone de cadeado/opções na barra de endereços).');
      return;
    }

    // Se ainda não foi solicitada permissão
    if (Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      if (res !== 'granted') {
        setNotificationsEnabled(false);
        localStorage.setItem('ventisol_notifications_enabled', 'false');
        return;
      }
    }

    const nextValue = !notificationsEnabled;
    setNotificationsEnabled(nextValue);
    localStorage.setItem('ventisol_notifications_enabled', String(nextValue));

    // Dar um feedback sonoro, tátil e visual ao usuário
    if (nextValue) {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch (e) {
          console.warn(e);
        }
      }
      
      // Tocar som de teste
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (e) {
        console.warn('Erro ao tocar som de teste:', e);
      }

      // Notificação teste robusta
      triggerSystemNotification(
        'Notificações Ativadas! 🔔',
        'Você agora receberá alertas neste dispositivo para novas transferências!'
      );

      // Registrar Sinc de Segundo Plano e Sinc Periódica para fazer o Android registrar as permissões de segundo plano
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(async (registration) => {
          try {
            // Registrar Background Sync
            if ('sync' in registration) {
              await (registration as any).sync.register('ventisol-bg-sync');
              console.log('Background Sync registrado via ativação.');
            }

            // Consultar e registrar Periodic Background Sync
            if ('periodicSync' in registration) {
              const status = await (navigator as any).permissions.query({
                name: 'periodic-background-sync',
              });
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('ventisol-periodic-sync', {
                  minInterval: 12 * 60 * 60 * 1000,
                });
                console.log('Periodic Background Sync registrado via ativação.');
              }
            }
          } catch (err) {
            console.warn('Erro ao habilitar sincs de segundo plano:', err);
          }
        });
      }

      // Abre automaticamente o modal de instrução de segundo plano no Android
      setShowAndroidBgModal(true);
    }
  };

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
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [debouncedStartDate, setDebouncedStartDate] = useState(startDate);
  const [debouncedEndDate, setDebouncedEndDate] = useState(endDate);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedStartDate(startDate);
      setDebouncedEndDate(endDate);
    }, 400);

    return () => clearTimeout(handler);
  }, [startDate, endDate]);

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

  // Fetch static lookup tables exactly ONCE on login to save millions of read operations
  useEffect(() => {
    if (!user || !profile) return;

    const fetchStaticLookups = async () => {
      try {
        const suppliersSnap = await getDocs(query(collection(db, 'suppliers'), orderBy('name', 'asc')));
        setSuppliers(suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const loadTypesSnap = await getDocs(query(collection(db, 'load_types'), orderBy('name', 'asc')));
        setLoadTypes(loadTypesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const profilesSnap = await getDocs(query(collection(db, 'profiles'), orderBy('name', 'asc')));
        setProfiles(profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const linesSnap = await getDocs(query(collection(db, 'production_lines'), orderBy('name', 'asc')));
        setProductionLines(linesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const logoSnap = await getDoc(doc(db, 'settings', 'company_logo'));
        if (logoSnap.exists()) {
          setLogoUrl(logoSnap.data().value);
        }
      } catch (err) {
        console.error("Erro ao buscar tabelas de consulta estáticas:", err);
      }
    };

    fetchStaticLookups();
  }, [user?.uid, profile?.uid]);

  // Operations real-time listener: established exactly ONCE on login (does not depend on date filters)
  useEffect(() => {
    if (!user || !profile) return;

    const qOps = query(
      collection(db, 'operations'),
      orderBy('date', 'desc'),
      limit(200)
    );
    const unsubOps = onSnapshot(qOps, (snapshot) => {
      const ops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(ops);
    });

    return () => unsubOps();
  }, [user?.uid, profile?.uid]);

  // Global Transfers Listener for Push/System Notifications
  useEffect(() => {
    if (!user || !profile) return;

    const isEnabled = typeof window !== 'undefined' && localStorage.getItem('ventisol_notifications_enabled') !== 'false';
    if (!isEnabled) return;

    const qTransfers = query(collection(db, 'transfers'), orderBy('created_at', 'desc'), limit(10));
    let isFirst = true;

    const unsubTransfers = onSnapshot(qTransfers, (snapshot) => {
      if (!isFirst) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdBy = data.created_by_name || '';
            const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || '';
            const transferDeviceId = data.device_id || '';
            const myDeviceId = typeof window !== 'undefined' ? localStorage.getItem('ventisol_device_session_id') || '' : '';
            
            // Só notifica se não tiver sido criada por este mesmo aparelho (aparelhos diferentes com o mesmo usuário recebem a notificação)
            let shouldNotify = false;
            if (transferDeviceId && myDeviceId) {
              shouldNotify = transferDeviceId !== myDeviceId;
            } else {
              // Fallback para transferências antigas ou legadas
              shouldNotify = createdBy !== currentUserName;
            }

            if (shouldNotify) {
              const transferNumber = data.transfer_number || 'Sem Número';
              const origin = data.origin || 'N/A';
              const dest = data.destination || 'N/A';
              triggerSystemNotification(
                'Nova Transferência Recebida', 
                `Transferência #${transferNumber} de ${origin} para ${dest} foi registrada.`
              );
            }
          }
        });
      } else {
        isFirst = false;
      }
    }, (err) => {
      console.error("Erro na escuta global de transferências para notificações:", err);
    });

    return () => unsubTransfers();
  }, [user?.uid, profile?.uid, notificationsEnabled]);

  // Dynamic collections (Purchase Orders & Receipts): Conditional on view and debounced date parameters
  useEffect(() => {
    if (!user || !profile) return;

    let unsubPOs = () => {};
    let unsubReceipts = () => {};

    // Only subscribe to Purchase Orders when on views that display them
    const needsPOs = ['DASHBOARD', 'ORDERS', 'SORTING', 'SEPARATION_SEQUENCE', 'SEPARATION_DASHBOARD', 'PERFORMANCE'].includes(currentView);
    // Only subscribe to Receipts when on views that display them
    const needsReceipts = ['RECEIPTS', 'RECEIPTS_DASHBOARD'].includes(currentView);

    // Parse the debounced date range to query Firestore efficiently
    const [sYear, sMonth, sDay] = debouncedStartDate.split('-').map(Number);
    const startObj = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

    const [eYear, eMonth, eDay] = debouncedEndDate.split('-').map(Number);
    const endObj = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

    // Apply a 120-day lookback to also capture any pending items from past days
    const lookbackDate = new Date(startObj);
    lookbackDate.setDate(lookbackDate.getDate() - 120);

    if (needsPOs) {
      const qPOs = query(
        collection(db, 'purchase_orders'),
        where('created_at', '>=', lookbackDate),
        where('created_at', '<=', endObj),
        orderBy('created_at', 'desc'),
        limit(300)
      );
      unsubPOs = onSnapshot(qPOs, (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    if (needsReceipts) {
      const qReceipts = query(
        collection(db, 'receipts'),
        where('created_at', '>=', lookbackDate),
        where('created_at', '<=', endObj),
        orderBy('created_at', 'desc'),
        limit(300)
      );
      unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
        setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubPOs();
      unsubReceipts();
    };
  }, [user?.uid, profile?.uid, debouncedStartDate, debouncedEndDate, currentView]);

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
          notificationsEnabled={notificationsEnabled}
          onRequestNotifications={handleToggleNotifications}
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
              <ReceiptsDashboardView receipts={receipts} key="receipts-dash" />
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
            {currentView === 'SEPARATION_SEQUENCE' && (
              <SeparationSequenceView 
                key="sep-seq"
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
            {currentView === 'TRANSFERS' && (
              <TransfersView 
                key="transfers"
                isAdmin={profile?.is_admin}
                userCategory={profile?.category}
              />
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

      {/* Modal de Configuração de Segundo Plano para Android */}
      <AnimatePresence>
        {showAndroidBgModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-zinc-100 dark:border-zinc-800 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowAndroidBgModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Funcionamento em Segundo Plano
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                  Ative as permissões no Android para garantir o recebimento de alertas em tempo real.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Por que isso é necessário?</p>
                    O Android suspende aplicativos em segundo plano para poupar bateria. Ao habilitar o 
                    <strong> Sincronismo de Segundo Plano</strong> e marcar o app como <strong>Sem Restrições</strong>, 
                    você garante que o coletor ou celular receberá avisos de novas transferências instantaneamente, mesmo fechado.
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                    Como liberar a permissão no Android:
                  </p>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/20">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">Ative o Sincronismo do PWA</p>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          O app já solicitou a permissão ao navegador Chrome. Toque em <strong>Permitir</strong> caso apareça um pop-up na tela solicitando sincronismo periódico.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/20">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">Configurações do Aplicativo no Android</p>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Vá nas <strong>Configurações</strong> do Android &rarr; <strong>Aplicativos</strong> &rarr; procure por <strong>Almoxarifado</strong> (ou Google Chrome, se estiver rodando via navegador).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/20">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Battery className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Uso de Bateria &rarr; Sem Restrições
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Toque em <strong>Bateria</strong> (ou Otimização de Bateria) e mude para <strong>Sem Restrições</strong> (Unrestricted). Isso habilita a execução contínua em segundo plano.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAndroidBgModal(false)}
                    className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Entendi, Configurado!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
