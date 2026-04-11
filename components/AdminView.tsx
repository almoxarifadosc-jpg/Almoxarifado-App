'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle, XCircle, Loader2, Users, Factory, Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED';
  is_admin: boolean;
}

interface ProductionLine {
  id: string;
  name: string;
}

export function AdminView() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLineName, setNewLineName] = useState('');
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);

  const fetchPendingUsers = useCallback(async () => {
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
  }, []);

  const fetchProductionLines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('production_lines')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Supabase Error Details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      if (data) setProductionLines(data);
    } catch (err: any) {
      console.error('Error fetching production lines:', err.message || err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingUsers(),
      fetchProductionLines()
    ]);
    setLoading(false);
  }, [fetchPendingUsers, fetchProductionLines]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineName.trim()) return;

    try {
      if (editingLine) {
        const { error } = await supabase
          .from('production_lines')
          .update({ name: newLineName.trim() })
          .eq('id', editingLine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('production_lines')
          .insert([{ name: newLineName.trim() }]);
        if (error) throw error;
      }
      
      setNewLineName('');
      setEditingLine(null);
      fetchProductionLines();
    } catch (err: any) {
      console.error('Error saving production line:', err);
    }
  };

  const handleEditLine = (line: ProductionLine) => {
    setEditingLine(line);
    setNewLineName(line.name);
  };

  const handleDeleteLine = async (id: string) => {
    try {
      const { error } = await supabase
        .from('production_lines')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchProductionLines();
    } catch (err: any) {
      console.error('Error deleting production line:', err);
    }
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

          <div className="space-y-12">
            <section className="space-y-6">
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
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  Linhas de Produção ({productionLines.length})
                </h3>
              </div>

              <form onSubmit={handleAddLine} className="flex gap-2">
                <input 
                  type="text"
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  placeholder="Nome da nova linha..."
                  className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-sm"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  {editingLine ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingLine ? 'Salvar' : 'Adicionar'}
                </button>
                {editingLine && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingLine(null);
                      setNewLineName('');
                    }}
                    className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </form>

              <div className="grid gap-3">
                {productionLines.length === 0 ? (
                  <div className="text-center py-8 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                    <p className="text-on-surface-variant/50 font-medium italic text-sm">Nenhuma linha cadastrada.</p>
                  </div>
                ) : (
                  productionLines.map(line => (
                    <div key={line.id} className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-outline-variant/5">
                      <span className="font-medium text-sm text-on-surface">{line.name}</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditLine(line)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLine(line.id)}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
