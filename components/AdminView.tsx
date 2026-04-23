'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { ShieldCheck, CheckCircle, XCircle, Loader2, Users, Factory, Plus, Trash2, Pencil, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED';
  is_admin: boolean;
  is_super_admin: boolean;
  is_viewer: boolean;
  is_conferente: boolean;
  is_auto_assign: boolean;
  category?: string;
  allowed_groups?: string[];
}

interface ProductionLine {
  id: string;
  name: string;
}

export function AdminView({ currentIsSuperAdmin, currentUserEmail }: { currentIsSuperAdmin?: boolean, currentUserEmail?: string }) {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLineName, setNewLineName] = useState('');
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ 
    name: '', 
    is_admin: false, 
    is_super_admin: false,
    is_viewer: false, 
    is_conferente: false,
    is_auto_assign: false,
    category: 'Ventisol',
    allowed_groups: '' 
  });

  const categories = ['Ventisol', 'Bemplas', 'Recebimento'];

  const fetchPendingUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'PENDING')
        .order('name');
      
      if (error) throw error;
      if (data) setPendingUsers(data);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
    }
  }, []);

  const fetchApprovedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'APPROVED')
        .order('name');
      
      if (error) throw error;
      if (data) setApprovedUsers(data);
    } catch (err: any) {
      console.error('Error fetching approved users:', err);
    }
  }, []);

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      is_viewer: user.is_viewer,
      is_conferente: user.is_conferente,
      is_auto_assign: user.is_auto_assign || false,
      category: user.category || 'Ventisol',
      allowed_groups: user.allowed_groups?.join(', ') || ''
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const groupsArray = userFormData.allowed_groups.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
    
    const updateData: any = {
      name: userFormData.name,
      is_viewer: userFormData.is_viewer,
      is_conferente: userFormData.is_conferente,
      is_auto_assign: userFormData.is_auto_assign,
      category: userFormData.category,
      allowed_groups: groupsArray
    };

    // Only super admin can change admin flags
    // Per request: "somente esse email [almoxarifado.sc@ventisol.com.br] poderá transformar outros emails em super admin"
    const canManageAdminRoles = currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br';

    if (canManageAdminRoles) {
      updateData.is_admin = userFormData.is_admin;
      updateData.is_super_admin = userFormData.is_super_admin;
    }

    console.log('💾 Salvando perfil do usuário...', updateData);

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', editingUser.id);

    if (!error) {
      console.log('✅ Perfil atualizado com sucesso!');
      setIsUserModalOpen(false);
      fetchApprovedUsers();
      setTimeout(() => alert('Alterações salvas com sucesso!'), 500);
    } else {
      console.error('❌ Erro completo do Supabase:', error);
      alert(`Erro ao salvar: ${error.message}${error.details ? ' - ' + error.details : ''}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (!error) fetchApprovedUsers();
  };

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

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'company_logo')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setLogoUrl(data.value);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingUsers(),
      fetchApprovedUsers(),
      fetchProductionLines(),
      fetchSettings()
    ]);
    setLoading(false);
  }, [fetchPendingUsers, fetchApprovedUsers, fetchProductionLines, fetchSettings]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const profilesChannel = supabase
      .channel('realtime-profiles')
      .on('postgres_changes', { event: '*', table: 'profiles', schema: 'public' }, () => {
        fetchPendingUsers();
        fetchApprovedUsers();
      })
      .subscribe();

    const linesChannel = supabase
      .channel('realtime-admin-lines')
      .on('postgres_changes', { event: '*', table: 'production_lines', schema: 'public' }, () => {
        fetchProductionLines();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('realtime-admin-settings')
      .on('postgres_changes', { event: '*', table: 'settings', schema: 'public' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(linesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchData, fetchPendingUsers, fetchApprovedUsers, fetchProductionLines, fetchSettings]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'APPROVED' })
      .eq('id', id);
    
    if (!error) {
      fetchPendingUsers();
      fetchApprovedUsers();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (!error) fetchPendingUsers();
  };

  const handleToggleAdmin = async (id: string, currentStatus: boolean) => {
    const canManageAdminRoles = currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br';
    if (!canManageAdminRoles) {
      alert('Você não tem permissão para alterar cargos administrativos.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      fetchApprovedUsers();
    } else {
      alert('Erro ao alterar admin: ' + error.message);
    }
  };

  const handleToggleSuperAdmin = async (id: string, currentStatus: boolean) => {
    const canManageAdminRoles = currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br';
    if (!canManageAdminRoles) {
      alert('Você não tem permissão para alterar cargos de Super Admin.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_super_admin: !currentStatus, is_admin: true })
      .eq('id', id);
    
    if (!error) {
      fetchApprovedUsers();
    } else {
      alert('Erro ao alterar super admin: ' + error.message);
    }
  };

  const handleToggleViewer = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_viewer: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchApprovedUsers();
  };

  const handleUpdateGroups = async (id: string, groups: string) => {
    const groupsArray = groups.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
    const { error } = await supabase
      .from('profiles')
      .update({ allowed_groups: groupsArray })
      .eq('id', id);
    
    if (!error) fetchApprovedUsers();
  };

  const handleSaveLogo = async () => {
    setSavingLogo(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'company_logo', value: logoUrl }, { onConflict: 'key' });
      
      if (error) throw error;
      alert('Logo atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error saving logo:', err);
      alert('Erro ao salvar logo.');
    } finally {
      setSavingLogo(false);
    }
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

  const handleToggleAutoAssign = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_auto_assign: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchApprovedUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-32 px-4 bg-surface transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl border border-outline-variant/10">
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
            {/* Configurações da Empresa */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Configurações da Empresa
                </h3>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">URL da Logo da Empresa</label>
                  <div className="flex gap-2">
                  <input 
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="flex-1 bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
                    <button 
                      onClick={handleSaveLogo}
                      disabled={savingLogo}
                      className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingLogo ? 'Salvando...' : 'Salvar Logo'}
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">Insira o link direto para a imagem da logo (PNG, JPG ou SVG).</p>
                </div>
                {logoUrl && (
                  <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                    <span className="text-xs font-bold text-on-surface-variant">Prévia:</span>
                    <div className="w-12 h-12 bg-surface-container-lowest rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="Prévia da Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </section>

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

            {/* Usuários Cadastrados */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuários Cadastrados ({approvedUsers.length})
                </h3>
              </div>

              <div className="grid gap-4">
                {approvedUsers.map(user => (
                  <div 
                    key={user.id}
                    className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between border border-outline-variant/5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-on-surface">{user.name}</p>
                        <button 
                          onClick={() => handleToggleAutoAssign(user.id, user.is_auto_assign)}
                          className={cn(
                            "p-1 hover:scale-110 transition-transform",
                            user.is_auto_assign ? "text-amber-500 fill-amber-500" : "text-on-surface-variant/20 hover:text-amber-500/50"
                          )}
                          title={user.is_auto_assign ? "Atribuição automática ativa" : "Ativar atribuição automática"}
                        >
                          <Star size={14} />
                        </button>
                        {user.is_super_admin && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">Super Admin</span>
                        )}
                        {user.is_admin && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Admin</span>
                        )}
                        {user.is_viewer && (
                          <span className="text-[10px] bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full font-bold ml-1">Visualizador</span>
                        )}
                        {user.is_conferente && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold ml-1">Conferente</span>
                        )}
                        {user.category && (
                          <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-bold ml-1">{user.category}</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">{user.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Acessos:</span>
                        <input 
                          type="text"
                          defaultValue={user.allowed_groups?.join(', ') || ''}
                          onBlur={(e) => handleUpdateGroups(user.id, e.target.value)}
                          placeholder="Ex: G1, G2"
                          className="text-[10px] bg-surface-container-low text-on-surface border border-outline-variant/20 rounded px-2 py-0.5 focus:ring-1 focus:ring-primary outline-none w-24"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        title="Editar Usuário"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                  className="flex-1 bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-sm"
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

      {/* User Edit Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-surface-container-low p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
            >
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-on-surface-variant" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-headline font-extrabold text-on-surface">Editar Usuário</h2>
                <p className="text-sm text-on-surface-variant mt-1">{editingUser?.email}</p>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Nome</label>
                  <input 
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Categoria / Empresa</label>
                  <select 
                    value={userFormData.category}
                    onChange={(e) => setUserFormData({ ...userFormData, category: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm appearance-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Grupos Permitidos (Separados por vírgula)</label>
                  <input 
                    type="text"
                    value={userFormData.allowed_groups}
                    onChange={(e) => setUserFormData({ ...userFormData, allowed_groups: e.target.value })}
                    placeholder="Ex: G1, G2"
                    className="w-full bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={!(currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br')}
                    onClick={() => setUserFormData({ ...userFormData, is_super_admin: !userFormData.is_super_admin, is_admin: true })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-[8px] uppercase tracking-widest leading-none",
                      userFormData.is_super_admin 
                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20" 
                        : "bg-surface-container-low border-transparent text-on-surface-variant hover:border-purple-300",
                      !(currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br') && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Super Admin
                  </button>
                  <button
                    type="button"
                    disabled={!(currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br')}
                    onClick={() => setUserFormData({ ...userFormData, is_admin: !userFormData.is_admin })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-[8px] uppercase tracking-widest leading-none",
                      userFormData.is_admin 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-surface-container-low border-transparent text-on-surface-variant hover:border-primary/30",
                      !(currentIsSuperAdmin || currentUserEmail === 'almoxarifado.sc@ventisol.com.br') && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Administrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, is_viewer: !userFormData.is_viewer })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-[8px] uppercase tracking-widest leading-none",
                      userFormData.is_viewer 
                        ? "bg-tertiary border-tertiary text-white shadow-lg shadow-tertiary/20" 
                        : "bg-surface-container-low border-transparent text-on-surface-variant hover:border-tertiary/30"
                    )}
                  >
                    Visualizador
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, is_conferente: !userFormData.is_conferente })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-[8px] uppercase tracking-widest leading-none",
                      userFormData.is_conferente
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-surface-container-low border-transparent text-on-surface-variant hover:border-emerald-500/30"
                    )}
                  >
                    Conferente
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, is_auto_assign: !userFormData.is_auto_assign })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-[8px] uppercase tracking-widest leading-none",
                      userFormData.is_auto_assign
                        ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                        : "bg-surface-container-low border-transparent text-on-surface-variant hover:border-amber-500/30"
                    )}
                  >
                    <Star size={10} className={userFormData.is_auto_assign ? "fill-white" : ""} />
                    Auto Atribuir
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
