'use client';

import React, { useState } from 'react';
import { LayoutGrid, Key, LogOut, X, Loader2, CheckCircle, Moon, Sun, Bell, BellOff, Menu as MenuIcon } from 'lucide-react';
import Image from 'next/image';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  isAdmin?: boolean;
  isViewer?: boolean;
  category?: string;
  logoUrl?: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  notificationsEnabled?: boolean;
  onRequestNotifications?: () => void;
  onMenuToggle?: () => void;
  globalStartDate: string;
  globalEndDate: string;
  onDateChange: (start: string, end: string) => void;
}

export function Header({ 
  currentView, 
  onViewChange, 
  onLogout, 
  isAdmin, 
  isViewer, 
  category,
  logoUrl = '/app-logo.png',
  isDarkMode,
  onToggleDarkMode,
  notificationsEnabled,
  onRequestNotifications,
  onMenuToggle,
  globalStartDate,
  globalEndDate,
  onDateChange
}: HeaderProps) {
  const [showLogout, setShowLogout] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado.');
      
      await updatePassword(user, newPassword);

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  };

  const isBemplas = category === 'Bemplas';

  return (
    <header className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 py-2 md:py-4 shadow-sm shadow-on-surface/5">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="p-2 -ml-2 hover:bg-surface-container-high rounded-xl transition-colors text-primary md:hidden"
        >
          <MenuIcon size={24} />
        </button>
        <h1 className="font-headline font-bold tracking-tight text-xl text-primary">Almoxarifado</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Global Date Filter UI */}
        <div className="hidden md:flex items-center gap-2 bg-surface-container-high/50 px-3 py-1.5 rounded-xl border border-outline-variant/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant opacity-50">De</span>
            <input 
              type="date" 
              value={globalStartDate}
              onChange={(e) => onDateChange(e.target.value, globalEndDate)}
              className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer hover:text-primary transition-colors"
            />
          </div>
          <div className="w-px h-3 bg-outline-variant/20 mx-1" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant opacity-50">Até</span>
            <input 
              type="date" 
              value={globalEndDate}
              onChange={(e) => onDateChange(globalStartDate, e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer hover:text-primary transition-colors"
            />
          </div>
        </div>

        <button 
          onClick={onRequestNotifications}
          className={`p-2 rounded-xl transition-colors border border-outline-variant/15 ${
            notificationsEnabled 
              ? 'bg-tertiary/10 text-tertiary' 
              : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
          }`}
          title={notificationsEnabled ? "Notificações Ativas" : "Ativar Notificações"}
        >
          {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>

        <button 
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors border border-outline-variant/15"
          title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowLogout(!showLogout)}
            className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/15 active:scale-95 transition-transform"
          >
            <div className="w-full h-full p-1 flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt="Perfil do Usuário"
                className="w-full h-full object-contain"
              />
            </div>
          </button>

          {showLogout && (
            <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-outline-variant/10 p-2 z-[60]">
              <button 
                onClick={() => {
                  setShowPasswordModal(true);
                  setShowLogout(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-2 mb-1"
              >
                <Key className="w-4 h-4 text-primary" />
                Alterar Minha Senha
              </button>
              <div className="h-px bg-outline-variant/10 my-1" />
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm font-bold text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-headline font-extrabold text-on-surface">Alterar Senha</h2>
                <p className="text-sm text-on-surface-variant mt-1">Defina uma nova senha para sua conta</p>
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {message.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Nova Senha</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar Senha'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
