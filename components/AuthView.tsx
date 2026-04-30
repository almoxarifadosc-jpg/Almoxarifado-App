'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { User, Lock, Mail, UserPlus, LogIn, ShieldCheck, CheckCircle, XCircle, Loader2, Sun, Moon } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export type AuthMode = 'LOGIN' | 'REGISTER' | 'ADMIN_PANEL';

interface Profile {
  id: string;
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED';
  is_admin: boolean;
  is_super_admin?: boolean;
}

interface AuthViewProps {
  onAuthSuccess: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  logoUrl?: string;
}

export function AuthView({ onAuthSuccess, isDarkMode, onToggleDarkMode, logoUrl }: AuthViewProps) {
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
    try {
      const q = query(collection(db, 'profiles'), where('status', '==', 'PENDING'));
      const querySnapshot = await getDocs(q);
      const users: Profile[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as Profile);
      });
      setPendingUsers(users);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      let profile = profileSnap.data();
      
      if (!profileSnap.exists()) {
        const email = user.email?.toLowerCase();
        const isPrimaryAdmin = email === 'almoxarifado.sc@ventisol.com.br' || email === 'espinmais@gmail.com';
        // Create profile for new Google users
        const newProfile = {
          id: user.uid,
          email: user.email,
          name: user.displayName || '',
          status: isPrimaryAdmin ? 'APPROVED' : 'PENDING',
          is_admin: isPrimaryAdmin,
          is_super_admin: isPrimaryAdmin,
          created_at: serverTimestamp()
        };
        await setDoc(doc(db, 'profiles', user.uid), newProfile);
        profile = newProfile;

        if (!isPrimaryAdmin) {
          setError('Conta criada! Aguarde a aprovação do administrador.');
          await signOut(auth);
          return;
        }
      }

      if (profile && profile.status === 'PENDING') {
        setError('Seu cadastro ainda não foi aprovado pelo administrador.');
        await signOut(auth);
        return;
      }

      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      let profile = profileSnap.data();

      if (!profile) {
        const email = user.email?.toLowerCase();
        const isPrimaryAdmin = email === 'almoxarifado.sc@ventisol.com.br' || email === 'espinmais@gmail.com';
        
        if (isPrimaryAdmin) {
          // Auto-create missing profile for primary admin during login
          const newProfile = {
            id: user.uid,
            email: user.email,
            name: user.email?.split('@')[0] || 'Admin',
            status: 'APPROVED',
            is_admin: true,
            is_super_admin: true,
            created_at: serverTimestamp()
          };
          await setDoc(doc(db, 'profiles', user.uid), newProfile);
          profile = newProfile;
        } else {
          setError('Perfil não encontrado. Entre em contato com o administrador.');
          await signOut(auth);
          return;
        }
      }

      // Ensure primary admins always have their permissions up to date
      const email = user.email?.toLowerCase();
      const isPrimaryAdmin = email === 'almoxarifado.sc@ventisol.com.br' || email === 'espinmais@gmail.com';
      if (isPrimaryAdmin && (!profile.is_super_admin || !profile.is_admin || profile.status !== 'APPROVED')) {
        profile.is_admin = true;
        profile.is_super_admin = true;
        profile.status = 'APPROVED';
        await updateDoc(doc(db, 'profiles', user.uid), {
          is_admin: true,
          is_super_admin: true,
          status: 'APPROVED'
        });
      }

      if (profile.status === 'PENDING') {
        await signOut(auth);
        setError('Seu cadastro ainda não foi aprovado pelo administrador.');
        return;
      }

      onAuthSuccess();
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!passwordRegex.test(formData.password)) {
      setError('A senha deve conter letras maiúsculas, minúsculas, números e pelo menos um caractere especial.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const email = formData.email?.toLowerCase();
      const isPrimaryAdmin = email === 'espinmais@gmail.com' || email === 'almoxarifado.sc@ventisol.com.br';

      await setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        email: formData.email,
        name: formData.name,
        status: isPrimaryAdmin ? 'APPROVED' : 'PENDING',
        is_admin: isPrimaryAdmin,
        is_super_admin: isPrimaryAdmin,
        created_at: serverTimestamp()
      });

      if (isPrimaryAdmin) {
        setSuccess('Conta de administrador criada com sucesso! Faça login para continuar.');
      } else {
        setSuccess('Solicitação de cadastro enviada! Aguarde a aprovação do administrador.');
      }
      setMode('LOGIN');
      await signOut(auth);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'profiles', id), { status: 'APPROVED' });
      fetchPendingUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${id}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'profiles', id));
      fetchPendingUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `profiles/${id}`);
    }
  };

  if (mode === 'ADMIN_PANEL') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-outline-variant/10 relative"
        >
          <button 
            onClick={onToggleDarkMode}
            className="absolute top-8 right-8 p-2 hover:bg-surface-container-high rounded-full transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-on-surface-variant" />}
          </button>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
      >
        <button 
          onClick={onToggleDarkMode}
          className="absolute top-8 right-8 p-2 hover:bg-surface-container-high rounded-full transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-on-surface-variant" />}
        </button>
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <User className="w-10 h-10 text-primary" />
            )}
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
            {mode === 'REGISTER' && (
              <p className="text-[9px] text-on-surface-variant/50 px-1 leading-tight">
                Mínimo 8 caracteres, com maiúsculas, minúsculas, números e símbolos (!@#$...).
              </p>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'LOGIN' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
            {mode === 'LOGIN' ? 'Entrar' : 'Solicitar Cadastro'}
          </button>

          {mode === 'LOGIN' && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-container-lowest px-2 text-on-surface-variant/50 font-bold">Ou continue com</span>
              </div>
            </div>
          )}

          {mode === 'LOGIN' && (
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-surface-container-high text-on-surface font-bold py-4 rounded-xl border border-outline-variant/10 hover:bg-surface-container-highest active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          )}
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

          {mode === 'LOGIN' && (formData.email === 'espinmais@gmail.com' || formData.email === 'almoxarifado.sc@ventisol.com.br') && (
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
