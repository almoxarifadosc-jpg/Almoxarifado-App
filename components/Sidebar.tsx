'use client';

import React, { useState } from 'react';
import { 
  Rocket, 
  Network, 
  BarChart3, 
  ShieldCheck, 
  LayoutDashboard, 
  Truck,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type View = 'LAUNCH' | 'OPERATIONS' | 'ANALYTICS' | 'DASHBOARD' | 'ADMIN_PANEL' | 'RECEIPTS' | 'RECEIPTS_DASHBOARD' | 'SUPPLIERS' | 'ORDERS' | 'SORTING' | 'PERFORMANCE' | 'SEPARATION_DASHBOARD';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isAdmin?: boolean;
  isViewer?: boolean;
  category?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentView, onViewChange, isAdmin, isViewer, category, isMobileOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sections = [
    {
      title: 'Ventisol',
      items: [
        { id: 'OPERATIONS' as View, label: 'Ordens de Prod.', icon: Network },
        { id: 'ANALYTICS' as View, label: 'Painel de Ops', icon: BarChart3 },
        { id: 'DASHBOARD' as View, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'LAUNCH' as View, label: 'Portal', icon: Rocket },
      ].filter(item => {
        if (category === 'Recebimento') return false;
        if (category === 'Bemplas') return false;
        if (isViewer && (item.id === 'OPERATIONS' || item.id === 'LAUNCH')) return false;
        return true;
      })
    },
    {
      title: 'Intercompany',
      items: [
        { id: 'RECEIPTS' as View, label: 'Carregamentos', icon: Truck },
        { id: 'RECEIPTS_DASHBOARD' as View, label: 'Dash Rec.', icon: LayoutDashboard },
        { id: 'SUPPLIERS' as View, label: 'Fornecedores', icon: Users },
      ].filter(() => !isViewer)
    },
    {
      title: 'Em desenvolvimento',
      items: ((isAdmin && category !== 'Recebimento') || category === 'Ventisol') ? [
        { id: 'ORDERS' as View, label: 'Importar OP', icon: FileText },
        { id: 'SORTING' as View, label: 'Separação de OPs', icon: ClipboardList },
        { id: 'SEPARATION_DASHBOARD' as View, label: 'Painel de Separação', icon: LayoutDashboard },
        { id: 'PERFORMANCE' as View, label: 'Desempenho', icon: BarChart3 },
      ] : []
    },
    {
      title: 'Admin',
      items: isAdmin && category !== 'Bemplas' && category !== 'Recebimento' ? [
        { id: 'ADMIN_PANEL' as View, label: 'Admin', icon: ShieldCheck }
      ] : []
    }
  ];

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Header / Toggle */}
      <div className="p-6 flex items-center justify-between">
        {(!isCollapsed || isMobile) && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-headline font-bold text-primary tracking-tight text-lg overflow-hidden whitespace-nowrap"
          >
            Menu
          </motion.span>
        )}
        {isMobile ? (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant"
          >
            <X size={20} />
          </button>
        ) : (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant"
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto overflow-x-hidden pt-2">
        {sections.map((section, idx) => {
          if (section.items.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {(!isCollapsed || isMobile) && (
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3"
                >
                  {section.title}
                </motion.h3>
              )}
              {(isCollapsed && !isMobile) && (
                <div className="h-[1px] bg-outline-variant/10 mx-4 mb-4" />
              )}
              
              <div className="space-y-1">
                {section.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentView === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onViewChange(tab.id);
                        if (isMobile && onClose) onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-3 rounded-2xl transition-all group relative",
                        isActive 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center min-w-[24px]",
                        isActive ? "text-white" : "group-hover:scale-110 transition-transform text-primary/70 group-hover:text-primary"
                      )}>
                        <Icon size={20} />
                      </div>
                      
                      {(!isCollapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="font-body font-semibold text-sm whitespace-nowrap"
                        >
                          {tab.label}
                        </motion.span>
                      )}

                      {(isCollapsed && !isMobile) && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-on-surface text-surface text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {tab.label}
                        </div>
                      )}

                      {isActive && !isCollapsed && (
                        <motion.div 
                          layoutId="active-indicator"
                          className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-outline-variant/10">
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {category?.[0] || 'V'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">{category || 'Ventisol'}</p>
              <p className="text-[10px] text-on-surface-variant truncate">Sistema de Gestão</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {category?.[0] || 'V'}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? '80px' : '260px' }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-surface border-r border-outline-variant/10 z-40 transition-colors duration-300"
      >
        {sidebarContent(false)}
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[280px] bg-surface flex flex-col shadow-2xl"
            >
              {sidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
