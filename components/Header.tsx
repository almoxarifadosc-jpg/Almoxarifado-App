'use client';

import React from 'react';
import { Menu, LogOut, Bell } from 'lucide-react';
import { View } from './Sidebar';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  isAdmin?: boolean;
  category?: string;
  onMenuToggle: () => void;
}

export function Header({ currentView, onLogout, onMenuToggle, category }: HeaderProps) {
  const getViewTitle = () => {
    switch (currentView) {
      case 'SEPARATION_DASHBOARD': return 'Separação de Pedidos';
      case 'API_DASHBOARD': return 'Dashboard API';
      case 'ADMIN_PANEL': return 'Configurações de Admin';
      case 'DASHBOARD': return 'Visão Geral';
      default: return 'Almoxarifado Ventisol';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-50 rounded-xl text-slate-500"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{getViewTitle()}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{category || 'Operador'}</span>
          <span className="text-sm font-bold text-slate-700">Sistema Ventisol</span>
        </div>
        
        <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
        >
          <LogOut size={20} />
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
