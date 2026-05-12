'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from '@/components/Header';
import { Sidebar, View } from '@/components/Sidebar';
import { LaunchView } from '@/components/LaunchView';
import { OperationsView } from '@/components/OperationsView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { DashboardView } from '@/components/DashboardView';
import { ReceiptsView } from '@/components/ReceiptsView';
import { ReceiptsDashboardView } from '@/components/ReceiptsDashboardView';
import { AuthView } from '@/components/AuthView';
import { AdminView } from '@/components/AdminView';
import { SuppliersView } from '@/components/SuppliersView';
import { PurchaseOrdersView } from '@/components/PurchaseOrdersView';
import { SortingView } from '@/components/SortingView';
import { SeparationDashboardView } from '@/components/SeparationDashboardView';
import PerformanceView from '@/components/PerformanceView';
import { Factory, Settings, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export interface Operation {
  id: string;
  line: string;
  quantity: number;
  date: string;
  progress: number;
  steps: boolean[];
  iconType: 'factory' | 'settings' | 'check';
  isCompleted?: boolean;
  isUrgente?: boolean;
  isLicitacao?: boolean;
  isAtrasada?: boolean;
}

export interface NewsPost {
  id: string;
  imageUrl?: string;
  text: string;
  author: string;
  date: string;
}

export default function Page() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('SORTING');
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [newsFilter, setNewsFilter] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [productionLines, setProductionLines] = useState<any[]>([]);
  
  // Filtros Globais para reduzir leituras Firestore
  const [globalStartDate, setGlobalStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]; // Padrão: Hoje (para carregamentos)
  });
  const [globalEndDate, setGlobalEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [logoUrl, setLogoUrl] = useState<string>('/app-logo.png');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationsEnabledRef = useRef(false);
  const staticDataFetchedRef = useRef(false);
  const listenersStartedRef = useRef(false);

  // Helper for Long-Term Caching
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      // TTL de 12 horas para dados estáticos
      if (Date.now() - timestamp > 12 * 60 * 60 * 1000) return null;
      return data;
    } catch {
      return null;
    }
  };

  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Cache storage failed', e);
    }
  };
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // Request notification permission or toggle
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }

    // If already enabled, toggle off
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
      return;
    }

    // If not enabled, request permission and toggle on
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('notificationsEnabled', 'true');
      showLocalNotification('Notificações Ativadas', {
        body: 'Você receberá avisos sobre OPs Urgentes e Atrasadas.',
      });
    } else {
      console.warn('Notification permission denied');
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
    }
  };

  const showLocalNotification = async (title: string, options: any) => {
    if (!notificationsEnabledRef.current) return;

    const notificationOptions = {
      ...options,
      icon: logoUrl || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
    };

    // Try Service Worker first (Better for Android)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        registration.showNotification(title, notificationOptions);
        return;
      }
    }

    // Fallback to standard Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, notificationOptions);
    }
  };

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notificationsEnabled') === 'true';
    if ('Notification' in window && Notification.permission === 'granted' && savedNotifications) {
      setNotificationsEnabled(true);
    }

    // Register Service Worker for Android notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchProfile = useCallback(async (user: any) => {
    try {
      const userId = user.uid;
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        const isPrimaryAdmin = user.email?.toLowerCase() === 'almoxarifado.sc@ventisol.com.br' || user.email?.toLowerCase() === 'espinmais@gmail.com';
        
        if (isPrimaryAdmin) {
          // Auto-create missing profile for primary admin
          const newProfile = {
            id: userId,
            email: user.email,
            name: user.email?.split('@')[0] || 'Admin',
            status: 'APPROVED',
            is_admin: true,
            is_super_admin: true,
            created_at: serverTimestamp()
          };
          await setDoc(profileRef, newProfile);
          setCurrentUser(newProfile);
          setLoadError(null);
          setLoading(false);
          return;
        }

        setLoadError('Perfil não encontrado no sistema.');
        return;
      }

      const userProfile = profileSnap.data();
      if (userProfile && userProfile.status === 'APPROVED') {
        const isPrimaryAdmin = userProfile.email?.toLowerCase() === 'almoxarifado.sc@ventisol.com.br' || userProfile.email?.toLowerCase() === 'espinmais@gmail.com';
        if (isPrimaryAdmin && (!userProfile.is_super_admin || !userProfile.is_admin)) {
          userProfile.is_super_admin = true;
          userProfile.is_admin = true;
          await updateDoc(profileRef, { is_admin: true, is_super_admin: true, status: 'APPROVED' });
        }
        setCurrentUser({ id: userId, ...userProfile });
        setLoadError(null);
      } else if (userProfile) {
        setLoadError('Aguardando aprovação do cadastro.');
      } else {
        setLoadError('Perfil não encontrado no sistema.');
      }
    } catch (err: any) {
      console.error('Falha no fetchProfile:', err);
      setLoadError('Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUser = useCallback(() => {
    console.log('Executando checkUser...');
    setLoadError(null);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthSession(user);
        fetchProfile(user);
      } else {
        setAuthSession(null);
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [fetchProfile]);

  useEffect(() => {
    const unsubAuth = checkUser();
    
    const troubleshootTimer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 5000);

    return () => {
      unsubAuth();
      clearTimeout(troubleshootTimer);
    };
  }, [checkUser]);

  useEffect(() => {
    if (currentUser) {
      if (listenersStartedRef.current) return;
      listenersStartedRef.current = true;
      
      console.log('Setting up real-time subscriptions...');
      
      const unsubOps = onSnapshot(query(collection(db, 'operations'), orderBy('created_at', 'desc'), limit(30)), (snapshot) => {
        const mappedOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setOperations(mappedOps);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'operations'));

      const unsubNews = onSnapshot(query(collection(db, 'news_posts'), orderBy('created_at', 'desc'), limit(10)), (snap) => {
        setNewsPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
      });

      const unsubSettings = onSnapshot(doc(db, 'settings', 'company_logo'), (snap) => {
        if (snap.exists()) setLogoUrl(snap.data().value);
      });

      return () => {
        unsubOps();
        unsubNews();
        unsubSettings();
        listenersStartedRef.current = false;
      };
    }
  }, [currentUser]);

  // Listeners Globais Adicionais (Centralizados para economizar leituras)
  useEffect(() => {
    if (currentUser) {
      console.log('Setting up global shared listeners...');
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      // Query Unificada para OPs (Reduzindo para 40 documentos no tempo real)
      const ordersIncompleteQuery = query(
        collection(db, 'purchase_orders'),
        where('status', 'in', ['Pendente', 'Separada', 'Conferida', 'Recusado']),
        limit(40)
      );

      const opCache = new Map<string, any>();
      const unsubIncomplete = onSnapshot(ordersIncompleteQuery, (snap) => {
        snap.docChanges().forEach((change: any) => {
          if (change.type === 'removed') opCache.delete(change.doc.id);
          else opCache.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
        });
        const allOps = Array.from(opCache.values());
        allOps.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setPurchaseOrders(allOps);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'purchase_orders'));

      // 2. Recebimentos (Apenas HOJE por padrão para economizar)
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const receiptsQuery = query(
        collection(db, 'receipts'), 
        where('created_at', '>=', todayStart.toISOString()),
        orderBy('created_at', 'desc'), 
        limit(30)
      );

      const unsubReceipts = onSnapshot(receiptsQuery, (snap) => {
        setReceipts(snap.docs.map(doc => {
          const d = doc.data();
          let createdAt = d.created_at;
          if (createdAt && typeof createdAt.toDate === 'function') createdAt = createdAt.toDate().toISOString();
          return { id: doc.id, ...d, created_at: createdAt };
        }));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'receipts'));

      // 3. Coleções Estáticas com Cache de 12 Horas
      const fetchStaticData = async () => {
        if (staticDataFetchedRef.current) return;
        staticDataFetchedRef.current = true;

        // Tentar carregar do Cache Local primeiro
        const cachedSuppliers = getCachedData('suppliers');
        const cachedLoadTypes = getCachedData('load_types');
        const cachedProfiles = getCachedData('profiles');
        const cachedLines = getCachedData('production_lines');

        if (cachedSuppliers && cachedLoadTypes && cachedProfiles && cachedLines) {
          console.log('Using local cache for static collections');
          setSuppliers(cachedSuppliers);
          setLoadTypes(cachedLoadTypes);
          setProfiles(cachedProfiles);
          setProductionLines(cachedLines);
          return;
        }
        
        try {
          console.log('Fetching static data from Firestore (Cache expired/empty)');
          const [supSnap, loadSnap, profSnap, lineSnap] = await Promise.all([
            getDocs(query(collection(db, 'suppliers'), orderBy('name'), limit(150))),
            getDocs(query(collection(db, 'load_types'), orderBy('name'), limit(50))),
            getDocs(query(collection(db, 'profiles'), limit(80))),
            getDocs(collection(db, 'production_lines'))
          ]);
          
          const s = supSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const l = loadSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const p = profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const lines = lineSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          setSuppliers(s);
          setLoadTypes(l);
          setProfiles(p);
          setProductionLines(lines);

          setCachedData('suppliers', s);
          setCachedData('load_types', l);
          setCachedData('profiles', p);
          setCachedData('production_lines', lines);
        } catch (err) {
          console.error('Erro ao carregar dados estáticos:', err);
        }
      };

      fetchStaticData();

      return () => {
        unsubIncomplete();
        unsubReceipts();
      };
    }
  }, [currentUser]);

  const addNewsPost = async (post: NewsPost) => {
    try {
      await setDoc(doc(collection(db, 'news_posts')), {
        ...post,
        created_at: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'news_posts');
    }
  };

  const updateNewsPost = async (updatedPost: NewsPost) => {
    try {
      const { id, ...data } = updatedPost;
      await updateDoc(doc(db, 'news_posts', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `news_posts/${updatedPost.id}`);
    }
  };

  const deleteNewsPost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'news_posts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `news_posts/${id}`);
    }
  };

  const filteredNews = newsPosts.filter(post => 
    (post.text || '').toLowerCase().includes(newsFilter.toLowerCase()) ||
    (post.author || '').toLowerCase().includes(newsFilter.toLowerCase())
  );

  const addOperation = async (newOp: Operation) => {
    try {
      const { id, ...data } = newOp;
      await setDoc(doc(db, 'operations', id), {
        ...data,
        created_at: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'operations');
    }
  };

  const updateOperation = async (updatedOp: Operation) => {
    try {
      const { id, ...data } = updatedOp;
      await updateDoc(doc(db, 'operations', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `operations/${updatedOp.id}`);
    }
  };

  const deleteOperation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'operations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `operations/${id}`);
    }
  };
  
  const toggleOperationStatus = async (opId: string, statusKey: 'isUrgente' | 'isLicitacao' | 'isAtrasada') => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    try {
      await updateDoc(doc(db, 'operations', opId), {
        [statusKey]: !op[statusKey]
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `operations/${opId}`);
    }
  };

  const toggleStep = async (opId: string, stepIndex: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const newSteps = [...op.steps];
    newSteps[stepIndex] = !newSteps[stepIndex];
    const activeCount = newSteps.filter(Boolean).length;
    const newProgress = activeCount * 25;
    const isCompleted = newProgress === 100;
    
    try {
      await updateDoc(doc(db, 'operations', opId), {
        steps: newSteps,
        progress: newProgress,
        is_completed: isCompleted,
        is_atrasada: isCompleted ? false : (op.isAtrasada || false)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `operations/${opId}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAuthSession(null);
    setCurrentUser(null);
  };

  // Removed SupabaseSetupView check

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
        
        <AnimatePresence>
          {showTroubleshoot && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xs space-y-4"
            >
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/20 shadow-sm">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-on-surface uppercase tracking-tight">Conexão Lenta</h3>
                <p className="text-[10px] text-on-surface-variant mt-2 leading-relaxed">
                  {loadError || 'O sistema está tentando conectar ao banco de dados.'}
                  <br /><br />
                  <span className="font-bold">Dica:</span> Verifique sua conexão com a internet ou se o serviço está temporariamente indisponível.
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => checkUser()}
                  className="w-full py-3 bg-primary text-white text-xs font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  Tentar Novamente
                </button>
                {authSession && (
                  <button 
                    onClick={() => setLoading(false)}
                    className="w-full py-2 text-[10px] font-bold text-on-surface-variant underline"
                  >
                    Entrar mesmo assim (Pode haver erros)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!authSession) {
    return (
      <AuthView 
        onAuthSuccess={checkUser} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        logoUrl={logoUrl}
      />
    );
  }

  // Se tivermos sessão mas não perfil (ex: erro de rede)
  if (!currentUser && authSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-lg font-black text-on-surface mb-2">Falha na Autenticação</h2>
        <p className="text-sm text-on-surface-variant mb-6 max-w-sm">
          {loadError || "Não foi possível carregar seu perfil de acesso. Verifique sua conexão ou se seu cadastro foi aprovado."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => checkUser()}
            className="py-3 bg-primary text-white rounded-xl font-bold shadow-lg"
          >
            Tentar Reconectar
          </button>
          <button 
            onClick={handleLogout}
            className="py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface transition-colors duration-300">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        isAdmin={currentUser?.is_admin}
        isViewer={currentUser?.is_viewer}
        category={currentUser?.category}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onLogout={handleLogout}
          isAdmin={currentUser?.is_admin}
          isViewer={currentUser?.is_viewer}
          category={currentUser?.category}
          logoUrl={logoUrl}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          notificationsEnabled={notificationsEnabled}
          onRequestNotifications={requestNotificationPermission}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
          globalStartDate={globalStartDate}
          globalEndDate={globalEndDate}
          onDateChange={(start, end) => {
            setGlobalStartDate(start);
            setGlobalEndDate(end);
          }}
        />
        
        <div className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            {currentView === 'LAUNCH' && (
              <LaunchView 
                key="launch" 
                posts={filteredNews} 
                onAddPost={addNewsPost} 
                onUpdatePost={updateNewsPost}
                onDeletePost={deleteNewsPost}
                filter={newsFilter}
                onFilterChange={setNewsFilter}
              />
            )}
            {currentView === 'OPERATIONS' && (
              <OperationsView 
                key="operations" 
                operations={operations} 
                productionLines={productionLines.map(l => l.name)}
                onToggleStep={toggleStep}
                onToggleStatus={toggleOperationStatus}
                onAddOperation={addOperation}
                onUpdateOperation={updateOperation}
                onDeleteOperation={deleteOperation}
                isAdmin={currentUser?.is_admin}
                isViewer={currentUser?.is_viewer}
                allowedGroups={currentUser?.allowed_groups}
              />
            )}
            {currentView === 'ANALYTICS' && (
              <AnalyticsView key="analytics" operations={operations} />
            )}
            {currentView === 'DASHBOARD' && (
              <DashboardView key="dashboard" operations={operations} />
            )}
            {currentView === 'RECEIPTS' && !currentUser?.is_viewer && (
              <ReceiptsView 
                key="receipts" 
                isAdmin={currentUser?.is_admin} 
                isSuperAdmin={currentUser?.is_super_admin}
                currentUserId={currentUser?.id}
                userName={currentUser?.name} 
                userCategory={currentUser?.category}
                receipts={receipts}
                suppliers={suppliers}
                loadTypes={loadTypes}
                startDate={globalStartDate}
                endDate={globalEndDate}
                onDateChange={(start, end) => {
                  setGlobalStartDate(start);
                  setGlobalEndDate(end);
                }}
              />
            )}
            {currentView === 'RECEIPTS_DASHBOARD' && !currentUser?.is_viewer && (
              <ReceiptsDashboardView key="receipts-dashboard" receipts={receipts} />
            )}
            {currentView === 'SUPPLIERS' && !currentUser?.is_viewer && (
              <SuppliersView key="suppliers" isAdmin={currentUser?.is_admin} suppliers={suppliers} />
            )}
            {currentView === 'ORDERS' && (currentUser?.is_admin || currentUser?.category === 'Ventisol' || currentUser?.category === 'Conferente' || currentUser?.category === 'Ventisol + Conferente') && (
              <PurchaseOrdersView 
                key="orders" 
                isAdmin={currentUser?.is_admin} 
                isSuperAdmin={currentUser?.is_super_admin}
                userCategory={currentUser?.category}
                purchaseOrders={purchaseOrders}
                startDate={globalStartDate}
                endDate={globalEndDate}
                onDateChange={(start, end) => {
                  setGlobalStartDate(start);
                  setGlobalEndDate(end);
                }}
              />
            )}
            {currentView === 'SORTING' && (currentUser?.is_admin || currentUser?.category === 'Ventisol' || currentUser?.category === 'Conferente' || currentUser?.category === 'Ventisol + Conferente' || currentUser?.is_viewer) && (
              <SortingView 
                key="sorting" 
                isAdmin={currentUser?.is_admin} 
                isSuperAdmin={currentUser?.is_super_admin}
                currentUserId={currentUser?.id} 
                isConferente={currentUser?.is_conferente || currentUser?.category === 'Conferente'}
                currentUserName={currentUser?.name}
                userCategory={currentUser?.category}
                isViewer={currentUser?.is_viewer}
                allowedGroups={currentUser?.allowed_groups}
                purchaseOrders={purchaseOrders}
                profiles={profiles}
                startDate={globalStartDate}
                endDate={globalEndDate}
                onDateChange={(start, end) => {
                  setGlobalStartDate(start);
                  setGlobalEndDate(end);
                }}
              />
            )}
            {currentView === 'SEPARATION_DASHBOARD' && (currentUser?.is_admin || currentUser?.category === 'Ventisol' || currentUser?.category === 'Conferente' || currentUser?.category === 'Ventisol + Conferente' || currentUser?.is_viewer) && (
              <SeparationDashboardView 
                key="separation-dashboard" 
                isAdmin={currentUser?.is_admin}
                isSuperAdmin={currentUser?.is_super_admin}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                isViewer={currentUser?.is_viewer}
                allowedGroups={currentUser?.allowed_groups}
                purchaseOrders={purchaseOrders}
                startDate={globalStartDate}
                endDate={globalEndDate}
                onDateChange={(start, end) => {
                  setGlobalStartDate(start);
                  setGlobalEndDate(end);
                }}
              />
            )}
            {currentView === 'PERFORMANCE' && (currentUser?.is_admin || currentUser?.category === 'Ventisol' || currentUser?.category === 'Conferente' || currentUser?.category === 'Ventisol + Conferente' || currentUser?.is_viewer) && (
              <PerformanceView 
                key="performance" 
                purchaseOrders={purchaseOrders} 
                profiles={profiles} 
                startDate={globalStartDate}
                endDate={globalEndDate}
                onDateChange={(start, end) => {
                  setGlobalStartDate(start);
                  setGlobalEndDate(end);
                }}
              />
            )}
            {currentView === 'ADMIN_PANEL' && (
              <AdminView 
                key="admin" 
                currentIsSuperAdmin={currentUser?.is_super_admin} 
                currentUserEmail={currentUser?.email}
                profiles={profiles}
                logoUrl={logoUrl}
                productionLines={productionLines}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
