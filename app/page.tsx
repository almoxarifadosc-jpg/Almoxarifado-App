'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Header } from '@/components/Header';
import { BottomNav, View } from '@/components/BottomNav';
import { LaunchView } from '@/components/LaunchView';
import { OperationsView } from '@/components/OperationsView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { AuthView } from '@/components/AuthView';
import { AdminView } from '@/components/AdminView';
import { SupabaseSetupView } from '@/components/SupabaseSetupView';
import { Factory, Settings, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [currentView, setCurrentView] = useState<View>('OPERATIONS');
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [newsFilter, setNewsFilter] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [productionLines, setProductionLines] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('/app-logo.png?v=4');
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error.message, error.details, error.hint);
      setLoading(false);
      return;
    }

    if (profile && profile.status === 'APPROVED') {
      setCurrentUser(profile);
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  const checkUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      fetchProfile(session.user.id);
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const fetchData = useCallback(async () => {
    const [opsRes, newsRes, linesRes, settingsRes] = await Promise.all([
      supabase.from('operations').select('*').order('created_at', { ascending: false }),
      supabase.from('news_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('production_lines').select('name').order('name'),
      supabase.from('settings').select('*').eq('key', 'company_logo').single()
    ]);

    if (opsRes.data) {
      const mappedOps = opsRes.data.map((op: any) => ({
        ...op,
        iconType: op.icon_type,
        isCompleted: op.is_completed,
        isUrgente: op.is_urgente,
        isLicitacao: op.is_licitacao
      }));

      // Sort: Urgent and Licitacao first, then by date/id
      const sortedOps = mappedOps.sort((a: any, b: any) => {
        if (a.isUrgente && !b.isUrgente) return -1;
        if (!a.isUrgente && b.isUrgente) return 1;
        if (a.isLicitacao && !b.isLicitacao) return -1;
        if (!a.isLicitacao && b.isLicitacao) return 1;
        return 0; // Keep original order (created_at desc) for others
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
      setLogoUrl('/app-logo.png?v=4');
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkUser, fetchProfile]);

  useEffect(() => {
    if (currentUser && isSupabaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
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
      is_licitacao: newOp.isLicitacao
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
      is_licitacao: updatedOp.isLicitacao
    }).eq('id', updatedOp.id);
    if (!error) fetchData();
  };

  const deleteOperation = async (id: string) => {
    const { error } = await supabase.from('operations').delete().eq('id', id);
    if (!error) fetchData();
  };

  const toggleStep = async (opId: string, stepIndex: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const newSteps = [...op.steps];
    newSteps[stepIndex] = !newSteps[stepIndex];
    const activeCount = newSteps.filter(Boolean).length;
    const newProgress = activeCount * 25;
    
    const { error } = await supabase.from('operations').update({
      steps: newSteps,
      progress: newProgress,
      is_completed: newProgress === 100
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
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthView onAuthSuccess={checkUser} />
    );
  }

  return (
    <main className="min-h-screen">
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
        isAdmin={currentUser?.is_admin}
        logoUrl={logoUrl}
      />
      
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
            onAddOperation={addOperation}
            onUpdateOperation={updateOperation}
            onDeleteOperation={deleteOperation}
            isAdmin={currentUser?.is_admin}
            allowedGroups={currentUser?.allowed_groups}
          />
        )}
        {currentView === 'ANALYTICS' && (
          <AnalyticsView key="analytics" operations={operations} />
        )}
        {currentView === 'ADMIN_PANEL' && (
          <AdminView key="admin" />
        )}
      </AnimatePresence>

      <BottomNav 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isAdmin={currentUser?.is_admin}
      />
    </main>
  );
}
