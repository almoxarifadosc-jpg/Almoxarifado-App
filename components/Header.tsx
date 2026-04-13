'use client';

import React, { useState } from 'react';
import { LayoutGrid, Key, LogOut, X, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  isAdmin?: boolean;
  isViewer?: boolean;
  logoUrl?: string;
}

export function Header({ currentView, onViewChange, onLogout, isAdmin, isViewer, logoUrl = '/app-logo.png?v=4' }: HeaderProps) {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

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

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 shadow-sm shadow-on-surface/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden rounded-lg">
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="font-headline font-bold tracking-tight text-xl text-primary">Almoxarifado</h1>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        {!isViewer && (
          <button 
            onClick={() => onViewChange('OPERATIONS')}
            className={`font-body text-sm font-semibold transition-colors ${currentView === 'OPERATIONS' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Operações
          </button>
        )}
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

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
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
