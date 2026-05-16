'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Package, LogIn, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Credenciais inválidas ou erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100"
      >
        <div className="bg-blue-600 p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Package size={150} />
          </div>
          <div className="relative z-10">
            <div className="bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20 text-blue-600">
              <Package size={40} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Ventisol</h1>
            <p className="text-blue-100 font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Logística e Almoxarifado</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@ventisol.com.br"
                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sua Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center italic">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-3"
            >
              <LogIn size={20} />
              {loading ? 'Entrando...' : 'Acessar Painel'}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative px-4 bg-white text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Ou use o Google</span>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full h-16 bg-white text-slate-800 border-2 border-slate-100 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Chrome size={20} className="text-blue-600" />
            Login com Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}
