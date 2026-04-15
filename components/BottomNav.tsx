'use client';

import React from 'react';
import { Rocket, Network, BarChart3, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export type View = 'LAUNCH' | 'OPERATIONS' | 'ANALYTICS' | 'DASHBOARD' | 'ADMIN_PANEL';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isAdmin?: boolean;
  isViewer?: boolean;
}

export function BottomNav({ currentView, onViewChange, isAdmin, isViewer }: BottomNavProps) {
  let tabs = [
    { id: 'OPERATIONS' as View, label: 'Operações', icon: Network },
    { id: 'ANALYTICS' as View, label: 'Painel de Separação', icon: BarChart3 },
    { id: 'DASHBOARD' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'LAUNCH' as View, label: 'Portal', icon: Rocket },
  ];

  if (isViewer) {
    // Painel de Separação and Dashboard for viewers
    tabs = tabs.filter(tab => tab.id === 'ANALYTICS' || tab.id === 'DASHBOARD');
  }

  if (isAdmin) {
    tabs.push({ id: 'ADMIN_PANEL' as View, label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface-container-lowest flex justify-around items-center px-4 py-3 pb-6 z-50 rounded-t-2xl border-t border-outline-variant/15 shadow-[0_-4px_24px_rgba(43,52,55,0.06)] md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center px-6 py-2 transition-all duration-300 ease-out rounded-xl",
              isActive 
                ? "bg-gradient-to-br from-surface-container-low to-surface-container-high text-primary" 
                : "text-on-surface/50 hover:text-primary"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
            <span className="font-body text-[11px] font-semibold tracking-wider uppercase mt-1">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
