'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED';
  is_admin: boolean;
}

export function AdminView() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'PENDING');
      
      if (error) throw error;
      if (data) setPendingUsers(data);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 bg-surface-container-lowest">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-primary w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-extrabold text-on-surface">Painel Administrativo</h2>
              <p className="text-on-surface-variant text-sm">Gerencie as solicitações de acesso ao sistema</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários Pendentes ({pendingUsers.length})
              </h3>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                <p className="text-on-surface-variant/50 font-medium italic">Nenhum usuário aguardando aprovação no momento.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingUsers.map(user => (
                  <motion.div 
                    key={user.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between border border-outline-variant/5"
                  >
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
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
