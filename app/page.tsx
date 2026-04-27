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
import { SupabaseSetupView } from '@/components/SupabaseSetupView';
import { Factory, Settings, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const [currentView, setCurrentView] = useState<View>('OPERATIONS');
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [newsFilter, setNewsFilter] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [productionLines, setProductionLines] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('/app-logo.png');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationsEnabledRef = useRef(false);

  // Sync ref with state
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

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        if (retryCount < 3) {
          const delay = (retryCount + 1) * 2000;
          console.log(`Retrying profile fetch in ${delay}ms... (Attempt ${retryCount + 1})`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), delay);
          return;
        }
        setLoadError('Erro de conexão com o banco de dados.');
        return;
      }

      const userProfile = profile;
      if (userProfile && userProfile.status === 'APPROVED') {
        if (userProfile.email?.toLowerCase() === 'almoxarifado.sc@ventisol.com.br') {
          userProfile.is_super_admin = true;
          userProfile.is_admin = true;
        }
        setCurrentUser(userProfile);
        setLoadError(null);
      } else if (userProfile) {
        setLoadError('Aguardando aprovação do cadastro.');
      } else {
        setLoadError('Perfil não encontrado no sistema.');
      }
    } catch (err: any) {
      console.error('Falha no fetchProfile:', err);
      if (retryCount < 3) {
        const delay = (retryCount + 1) * 2000;
        setTimeout(() => fetchProfile(userId, retryCount + 1), delay);
      } else {
        setLoadError('Erro de rede ao carregar perfil.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUser = useCallback(async () => {
    console.log('Executando checkUser...');
    setLoadError(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Erro na sessão:', error.message);
        setLoadError('Erro ao carregar sessão.');
        setLoading(false);
        return;
      }

      if (session?.user) {
        setAuthSession(session);
        // Don't await here to avoid blocking and potential timeout flicker
        fetchProfile(session.user.id);
      } else {
        setAuthSession(null);
        setCurrentUser(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Falha no checkUser:', err.message);
      setLoadError('Servidor inacessível. Verifique sua rede.');
      setLoading(false);
    }
  }, [fetchProfile]);

  const fetchData = useCallback(async () => {
    try {
      const [opsRes, newsRes, linesRes, settingsRes] = await Promise.all([
        supabase.from('operations').select('*').order('created_at', { ascending: false }),
        supabase.from('news_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('production_lines').select('name').order('name'),
        supabase.from('settings').select('*').eq('key', 'company_logo').single()
      ]);

      if (opsRes.error && (opsRes.error.message.includes('JWT') || opsRes.error.message.includes('token'))) {
        await supabase.auth.signOut({ scope: 'local' });
        setCurrentUser(null);
        return;
      }

      if (opsRes.data) {
        const mappedOps = opsRes.data.map((op: any) => ({
          ...op,
          iconType: op.icon_type,
          isCompleted: op.is_completed,
          isUrgente: op.is_urgente,
          isLicitacao: op.is_licitacao,
          isAtrasada: op.is_atrasada
        }));

        // Sort: Atrasada first, then Urgent, then Licitacao, then by ID alphabetical
        const sortedOps = mappedOps.sort((a: any, b: any) => {
          if (a.isAtrasada && !b.isAtrasada) return -1;
          if (!a.isAtrasada && b.isAtrasada) return 1;
          if (a.isUrgente && !b.isUrgente) return -1;
          if (!a.isUrgente && b.isUrgente) return 1;
          if (a.isLicitacao && !b.isLicitacao) return -1;
          if (!a.isLicitacao && b.isLicitacao) return 1;
          return a.id.localeCompare(b.id);
        });

        setOperations(sortedOps);
      }
      if (newsRes.data) {
        setNewsPosts(newsRes.data.map((post: any) => ({
          ...post,
          imageUrl: post.image_url
        })));
      }
      if (linesRes.data && linesRes.data.length > 0) {
        setProductionLines(linesRes.data.map((line: any) => line.name));
      } else {
        // Fallback to default lines if table is empty or doesn't exist
        setProductionLines([
          "Linha de Montagem A2",
          "Unidade de Processamento",
          "Controle de Qualidade B1",
          "Logística Interna",
          "Linha de Pintura",
          "Embalagem Final"
        ]);
      }
      if (settingsRes.data && settingsRes.data.value) {
        setLogoUrl(settingsRes.data.value);
      } else {
        setLogoUrl('/app-logo.png');
      }
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    checkUser();
    
    const troubleshootTimer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 10000);

    // Escuta mudanças no estado de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      setAuthSession(session);
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setCurrentUser(null);
        setAuthSession(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setCurrentUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      clearTimeout(troubleshootTimer);
    };
  }, [checkUser, fetchProfile]);

  useEffect(() => {
    if (currentUser && isSupabaseConfigured) {
      fetchData();

      // Set up real-time subscriptions
      console.log('Setting up real-time subscriptions...');
      
      const operationsChannel = supabase
        .channel('realtime-operations')
        .on('postgres_changes', { event: 'UPDATE', table: 'operations', schema: 'public' }, (payload: any) => {
          console.log('Realtime update received for operations:', payload);
          
          // Check for urgent or delayed status changes
          const oldData = payload.old;
          const newData = payload.new;
          
          if (notificationsEnabledRef.current && Notification.permission === 'granted') {
            let title = '';
            let body = '';
            
            if (newData.is_urgente && !oldData.is_urgente) {
              title = `🚨 OP ${newData.id} URGENTE!`;
              body = `A OP ${newData.id} foi marcada como URGENTE.`;
            } else if (newData.is_atrasada && !oldData.is_atrasada) {
              title = `⏰ OP ${newData.id} ATRASADA!`;
              body = `A OP ${newData.id} foi marcada como ATRASADA.`;
            }

            if (title) {
              showLocalNotification(title, {
                body,
                tag: `op-${newData.id}-status`
              });
            }
          }
          
          fetchData();
        })
        .on('postgres_changes', { event: 'INSERT', table: 'operations', schema: 'public' }, (payload: any) => {
          const newData = payload.new;
          if (notificationsEnabledRef.current && Notification.permission === 'granted' && (newData.is_urgente || newData.is_atrasada)) {
            const status = newData.is_urgente ? 'URGENTE' : 'ATRASADA';
            showLocalNotification(`🆕 Nova OP ${status}`, {
              body: `Uma nova OP (${newData.id}) foi criada com status ${status}.`,
            });
          }
          fetchData();
        })
        .on('postgres_changes', { event: 'DELETE', table: 'operations', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe((status: string) => {
          console.log('Operations subscription status:', status);
        });

      const newsChannel = supabase
        .channel('realtime-news')
        .on('postgres_changes', { event: '*', table: 'news_posts', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      const linesChannel = supabase
        .channel('realtime-lines')
        .on('postgres_changes', { event: '*', table: 'production_lines', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      const settingsChannel = supabase
        .channel('realtime-settings')
        .on('postgres_changes', { event: '*', table: 'settings', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(operationsChannel);
        supabase.removeChannel(newsChannel);
        supabase.removeChannel(linesChannel);
        supabase.removeChannel(settingsChannel);
      };
    }
  }, [currentUser, fetchData]);

  const addNewsPost = async (post: NewsPost) => {
    const { error } = await supabase.from('news_posts').insert([{
      image_url: post.imageUrl,
      text: post.text,
      author: post.author,
      date: post.date
    }]);
    if (!error) fetchData();
  };

  const updateNewsPost = async (updatedPost: NewsPost) => {
    const { error } = await supabase.from('news_posts').update({
      image_url: updatedPost.imageUrl,
      text: updatedPost.text,
      author: updatedPost.author,
      date: updatedPost.date
    }).eq('id', updatedPost.id);
    if (!error) fetchData();
  };

  const deleteNewsPost = async (id: string) => {
    const { error } = await supabase.from('news_posts').delete().eq('id', id);
    if (!error) fetchData();
  };

  const filteredNews = newsPosts.filter(post => 
    post.text.toLowerCase().includes(newsFilter.toLowerCase()) ||
    post.author.toLowerCase().includes(newsFilter.toLowerCase())
  );

  const addOperation = async (newOp: Operation) => {
    const { error } = await supabase.from('operations').insert([{
      id: newOp.id,
      line: newOp.line,
      quantity: newOp.quantity,
      date: newOp.date,
      progress: newOp.progress,
      steps: newOp.steps,
      icon_type: newOp.iconType,
      is_completed: newOp.isCompleted,
      is_urgente: newOp.isUrgente,
      is_licitacao: newOp.isLicitacao,
      is_atrasada: newOp.isAtrasada
    }]);
    if (!error) fetchData();
  };

  const updateOperation = async (updatedOp: Operation) => {
    const { error } = await supabase.from('operations').update({
      line: updatedOp.line,
      quantity: updatedOp.quantity,
      date: updatedOp.date,
      progress: updatedOp.progress,
      steps: updatedOp.steps,
      icon_type: updatedOp.iconType,
      is_completed: updatedOp.isCompleted,
      is_urgente: updatedOp.isUrgente,
      is_licitacao: updatedOp.isLicitacao,
      is_atrasada: updatedOp.isAtrasada
    }).eq('id', updatedOp.id);
    if (!error) fetchData();
  };

  const deleteOperation = async (id: string) => {
    const { error } = await supabase.from('operations').delete().eq('id', id);
    if (!error) fetchData();
  };
  
  const toggleOperationStatus = async (opId: string, statusKey: 'isUrgente' | 'isLicitacao' | 'isAtrasada') => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const dbKey = statusKey === 'isUrgente' ? 'is_urgente' : statusKey === 'isLicitacao' ? 'is_licitacao' : 'is_atrasada';
    
    const { error } = await supabase.from('operations').update({
      [dbKey]: !op[statusKey]
    }).eq('id', opId);

    if (!error) fetchData();
  };

  const toggleStep = async (opId: string, stepIndex: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const newSteps = [...op.steps];
    newSteps[stepIndex] = !newSteps[stepIndex];
    const activeCount = newSteps.filter(Boolean).length;
    const newProgress = activeCount * 25;
    const isCompleted = newProgress === 100;
    
    const { error } = await supabase.from('operations').update({
      steps: newSteps,
      progress: newProgress,
      is_completed: isCompleted,
      is_atrasada: isCompleted ? false : op.isAtrasada
    }).eq('id', opId);

    if (!error) fetchData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (!isSupabaseConfigured) {
    return <SupabaseSetupView />;
  }

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
                productionLines={productionLines}
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
              />
            )}
            {currentView === 'RECEIPTS_DASHBOARD' && !currentUser?.is_viewer && (
              <ReceiptsDashboardView key="receipts-dashboard" />
            )}
            {currentView === 'SUPPLIERS' && !currentUser?.is_viewer && (
              <SuppliersView key="suppliers" isAdmin={currentUser?.is_admin} />
            )}
            {currentView === 'ORDERS' && currentUser?.is_admin && (
              <PurchaseOrdersView 
                key="orders" 
                isAdmin={currentUser?.is_admin} 
                isSuperAdmin={currentUser?.is_super_admin}
              />
            )}
            {currentView === 'SORTING' && (currentUser?.is_admin || currentUser?.category === 'Ventisol') && (
              <SortingView 
                key="sorting" 
                isAdmin={currentUser?.is_admin} 
                isSuperAdmin={currentUser?.is_super_admin}
                currentUserId={currentUser?.id} 
                isConferente={currentUser?.is_conferente}
                currentUserName={currentUser?.name}
                userCategory={currentUser?.category}
              />
            )}
            {currentView === 'SEPARATION_DASHBOARD' && (currentUser?.is_admin || currentUser?.category === 'Ventisol') && (
              <SeparationDashboardView key="separation-dashboard" />
            )}
            {currentView === 'PERFORMANCE' && (currentUser?.is_admin || currentUser?.category === 'Ventisol') && (
              <PerformanceView key="performance" />
            )}
            {currentView === 'ADMIN_PANEL' && (
              <AdminView 
                key="admin" 
                currentIsSuperAdmin={currentUser?.is_super_admin} 
                currentUserEmail={currentUser?.email}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
