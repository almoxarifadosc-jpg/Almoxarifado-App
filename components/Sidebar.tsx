'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShieldCheck, 
  Network
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type View = 'DASHBOARD' | 'SEPARATION_DASHBOARD' | 'API_DASHBOARD' | 'ADMIN_PANEL';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  category?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentView, onViewChange, category, isMobileOpen, onClose }: SidebarProps) {
  const menuGroups = [
    {
      title: 'Operacional',
      items: [
        { id: 'SEPARATION_DASHBOARD' as View, label: 'Separação', icon: Package },
        { id: 'DASHBOARD' as View, label: 'Dashboard Geral', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Admin',
      items: [
        { id: 'API_DASHBOARD' as View, label: 'API', icon: Network },
        { id: 'ADMIN_PANEL' as View, label: 'Configurações', icon: ShieldCheck }
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="bg-blue-600 p-2 rounded-xl">
          <Package className="text-white" size={24} />
        </div>
        <span className="text-xl font-black text-white tracking-tighter">VENTISOL</span>
      </div>

      <nav className="flex-1 space-y-8">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    onClose?.();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group",
                    currentView === item.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={cn(
                      currentView === item.id ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                    )} />
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </div>
                  {currentView === item.id && (
                    <motion.div layoutId="active" className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-6 border-t border-slate-800 mt-auto">
        <div className="bg-slate-800/50 p-4 rounded-[1.5rem] flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            V
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Ventisol Almoxarifado</p>
            <p className="text-[10px] text-slate-500 truncate">{category || 'Operador'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
