'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, View } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import SeparationDashboardView from '@/components/SeparationDashboardView';
import ApiView from '@/components/ApiView';
import DashboardView from '@/components/DashboardView';
import OperationsView from '@/components/OperationsView';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export interface Operation {
  id: string;
  type: string;
  status: string;
  description: string;
  quantity: number;
  location: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestamp: any;
  date: string | Date;
  isAtrasada?: boolean;
  isUrgente?: boolean;
  isLicitacao?: boolean;
  isCompleted?: boolean;
  userEmail?: string;
  iconType?: 'factory' | 'settings' | 'check';
}

export interface NewsPost {
  id: string;
  title?: string;
  text: string;
  author: string;
  date: string;
  imageUrl?: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('SEPARATION_DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Sistema...</p>
      </div>
    );
  }

  // Se não houver AuthView, vamos apenas mostrar o SeparationDashboardView para o demo funcionar
  // Mas vamos tentar importar AuthView se existir
  
  const renderView = () => {
    switch (currentView) {
      case 'SEPARATION_DASHBOARD':
        return <SeparationDashboardView />;
      case 'API_DASHBOARD':
        return <ApiView />;
      case 'DASHBOARD':
        return <DashboardView operations={[]} />; // Idealmente passar as operações do Firebase aqui
      case 'REPORTS':
        return <OperationsView operations={[]} />;
      case 'ADMIN_PANEL':
        return <div className="p-8 text-slate-500 font-bold uppercase tracking-widest text-xs">Configurações em Breve...</div>;
      default:
        return <SeparationDashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans italic-no">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          isAdmin={true}
          onMenuToggle={() => setIsSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
