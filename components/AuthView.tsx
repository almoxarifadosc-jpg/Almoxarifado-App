'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Mail, UserPlus, LogIn, ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthMode = 'LOGIN' | 'REGISTER' | 'ADMIN_PANEL';

interface Profile {
  id: string;
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED';
  is_admin: boolean;
}

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);

  useEffect(() => {
    if (mode === 'ADMIN_PANEL') {
      fetchPendingUsers();
    }
  }, [mode]);

  const fetchPendingUsers = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'PENDING');
      
      if (error) throw error;
      if (data) setPendingUsers(data);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Configuração do Supabase ausente.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError('Perfil não encontrado. Entre em contato com o administrador.');
        await supabase.auth.signOut();
        return;
      }

      if (profile.status === 'PENDING') {
        await supabase.auth.signOut();
        setError('Seu cadastro ainda não foi aprovado pelo administrador.');
        return;
      }

      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Configuração do Supabase ausente.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              name: formData.name,
              status: 'PENDING',
              is_admin: formData.email === 'espinmais@gmail.com'
            }
          ]);

        if (profileError) throw profileError;

        setSuccess('Solicitação de cadastro enviada! Aguarde a aprovação do administrador.');
        setMode('LOGIN');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'APPROVED' })
      .eq('id', id);
    
    if (!error) fetchPendingUsers();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (!error) fetchPendingUsers();
  };

  if (mode === 'ADMIN_PANEL') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-lowest">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-outline-variant/10"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-headline font-extrabold flex items-center gap-3">
              <ShieldCheck className="text-primary w-8 h-8" />
              Painel Administrativo
            </h2>
            <button 
              onClick={() => setMode('LOGIN')}
              className="text-sm font-bold text-primary hover:underline"
            >
              Voltar ao Login
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Usuários Pendentes ({pendingUsers.length})</h3>
            {pendingUsers.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant/50 font-medium italic">Nenhum usuário aguardando aprovação.</p>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {pendingUsers.map(user => (
                  <div key={user.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-on-surface">{user.name}</p>
                      <p className="text-xs text-on-surface-variant">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="p-2 text-tertiary hover:bg-tertiary/10 rounded-xl transition-colors"
                        title="Aprovar"
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => handleReject(user.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
                        title="Rejeitar"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-lowest">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-primary w-10 h-10" />
          </div>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface">
            {mode === 'LOGIN' ? 'Bem-vindo' : 'Criar Conta'}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {mode === 'LOGIN' ? 'Acesse o sistema do Almoxarifado' : 'Solicite acesso ao sistema'}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-tertiary/10 text-tertiary p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form className="space-y-5" onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister}>
          {mode === 'REGISTER' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Nome Completo</label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pl-11 focus:ring-1 focus:ring-primary outline-none text-sm" 
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">E-mail</label>
            <div className="relative">
              <input 
                type="email"
                className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pl-11 focus:ring-1 focus:ring-primary outline-none text-sm" 
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Senha</label>
            <div className="relative">
              <input 
                type="password"
                className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pl-11 focus:ring-1 focus:ring-primary outline-none text-sm" 
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'LOGIN' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
            {mode === 'LOGIN' ? 'Entrar' : 'Solicitar Cadastro'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center space-y-4">
          {mode === 'LOGIN' ? (
            <p className="text-sm text-on-surface-variant">
              Não tem uma conta?{' '}
              <button onClick={() => setMode('REGISTER')} className="text-primary font-bold hover:underline">Cadastre-se</button>
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Já tem uma conta?{' '}
              <button onClick={() => setMode('LOGIN')} className="text-primary font-bold hover:underline">Faça Login</button>
            </p>
          )}

          {mode === 'LOGIN' && formData.email === 'espinmais@gmail.com' && (
            <button 
              onClick={() => setMode('ADMIN_PANEL')}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 hover:text-primary transition-colors"
            >
              Acesso Administrativo
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
