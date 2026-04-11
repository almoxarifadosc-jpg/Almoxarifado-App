'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

export function Header({ currentView, onViewChange, onLogout, isAdmin }: HeaderProps) {
  const [showLogout, setShowLogout] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 shadow-sm shadow-on-surface/5">
      <div className="flex items-center gap-3">
        <LayoutGrid className="text-primary w-6 h-6" />
        <h1 className="font-headline font-bold tracking-tight text-xl text-primary">Almoxarifado</h1>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <button 
          onClick={() => onViewChange('OPERATIONS')}
          className={`font-body text-sm font-semibold transition-colors ${currentView === 'OPERATIONS' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
        >
          Operações
        </button>
        <button 
          onClick={() => onViewChange('ANALYTICS')}
          className={`font-body text-sm font-semibold transition-colors ${currentView === 'ANALYTICS' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
        >
          Painel de Separação
        </button>
        <button 
          onClick={() => onViewChange('LAUNCH')}
          className={`font-body text-sm font-semibold transition-colors ${currentView === 'LAUNCH' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
        >
          Portal
        </button>
        {isAdmin && (
          <button 
            onClick={() => onViewChange('ADMIN_PANEL')}
            className={`font-body text-sm font-semibold transition-colors ${currentView === 'ADMIN_PANEL' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Admin
          </button>
        )}
      </nav>

      <div className="relative">
        <button 
          onClick={() => setShowLogout(!showLogout)}
          className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/15 active:scale-95 transition-transform"
        >
          <Image
            src="https://picsum.photos/seed/manager/100/100"
            alt="Perfil do Usuário"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </button>

        {showLogout && (
          <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-xl border border-outline-variant/10 p-2 z-[60]">
            <button 
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm font-bold text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2"
            >
              Sair do Sistema
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
