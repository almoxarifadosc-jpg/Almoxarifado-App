'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  ExternalLink,
  Building2,
  Trash2,
  Edit2,
  MessageSquareText,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Receipt {
  id: string;
  load_id: string;
  invoices: string[];
  invoice_count: number;
  driver: string;
  supplier_type: 'Intercompany' | 'Externo';
  supplier_name: string;
  status: 'Pendente' | 'Enviado' | 'Recebido';
  observation?: string;
  image_url?: string;
  created_at: string;
  updated_by_name?: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  is_driver?: boolean;
}

interface ReceiptsViewProps {
  isAdmin?: boolean;
  userName?: string;
}

const SUPPLIER_EXAMPLES = [
  "Ventisol Nordeste",
  "Fornecedor de Componentes China",
  "Transportadora TransRápido"
];

const STATUS_OPTIONS = ['Pendente', 'Enviado', 'Recebido'] as const;

export function ReceiptsView({ isAdmin, userName }: ReceiptsViewProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [observationModal, setObservationModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
  const [filterText, setFilterText] = useState('');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Intercompany' | 'Externo'>('All');
  
  const [formData, setFormData] = useState({
    invoices: [] as string[],
    driver: '',
    supplier_type: 'Intercompany' as 'Intercompany' | 'Externo',
    supplier_name: '',
    observation: '',
    image_url: ''
  });

  const [currentNF, setCurrentNF] = useState('');

  const addNF = () => {
    if (currentNF.trim() && !formData.invoices.includes(currentNF.trim())) {
      setFormData(prev => ({
        ...prev,
        invoices: [...prev.invoices, currentNF.trim()]
      }));
      setCurrentNF('');
    }
  };

  const removeNF = (nf: string) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.filter(item => item !== nf)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipt-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      console.error('Erro no upload:', error.message);
      alert('Erro ao fazer upload da imagem. Verifique se o bucket "receipts" existe no seu Supabase Storage.');
    } finally {
      setUploading(false);
    }
  };

  const fetchReceipts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setReceipts(data);
    }
    if (showLoading) setLoading(false);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name, cnpj, is_driver').order('name');
    if (data) setDbSuppliers(data);
  };

  useEffect(() => {
    fetchReceipts();
    fetchSuppliers();

    const channel = supabase
      .channel('receipts-realtime')
      .on('postgres_changes', { event: '*', table: 'receipts', schema: 'public' }, () => {
        fetchReceipts(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenModal = (receipt: Receipt | null = null) => {
    if (receipt) {
      setEditingReceipt(receipt);
      setFormData({
        invoices: receipt.invoices || [],
        driver: receipt.driver || '',
        supplier_type: receipt.supplier_type as any,
        supplier_name: receipt.supplier_name,
        observation: receipt.observation || '',
        image_url: receipt.image_url || ''
      });
    } else {
      setEditingReceipt(null);
      setFormData({
        invoices: [],
        driver: '',
        supplier_type: 'Intercompany',
        supplier_name: '',
        observation: '',
        image_url: ''
      });
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    
    try {
      let error;

      if (editingReceipt) {
        const { error: updateError } = await supabase
          .from('receipts')
          .update({ 
            ...formData, 
            invoice_count: formData.invoices.length,
            updated_by_name: userName 
          })
          .eq('id', editingReceipt.id);
        error = updateError;
      } else {
        // Generate sequential load_id
        const nextLoadNum = receipts.length > 0 
          ? Math.max(...receipts.map(r => {
              const num = parseInt(r.load_id || '0');
              return isNaN(num) ? 0 : num;
            })) + 1 
          : 1;
        const load_id = nextLoadNum.toString().padStart(4, '0');

        const { error: insertError } = await supabase.from('receipts').insert([
          { 
            ...formData, 
            load_id,
            invoice_count: formData.invoices.length,
            status: 'Pendente', 
            updated_by_name: userName 
          }
        ]);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      setEditingReceipt(null);
      setFormData({
        invoices: [],
        driver: '',
        supplier_type: 'Intercompany',
        supplier_name: '',
        observation: '',
        image_url: ''
      });
      fetchReceipts(false);
    } catch (err: any) {
      console.error('Erro ao salvar:', err.message);
      setFormError(err.message === 'new row violates row-level security policy for table "receipts"' 
        ? 'Erro de permissão: Você não tem autorização para realizar esta ação.' 
        : `Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Receipt['status']) => {
    // Optimistic update
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, updated_by_name: userName } : r));
    
    const { error } = await supabase
      .from('receipts')
      .update({ 
        status: newStatus,
        updated_by_name: userName 
      })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao atualizar status:', error.message);
      fetchReceipts(false);
    }
  };

  const deleteReceipt = async () => {
    if (!deleteModal.id) return;
    const { error } = await supabase.from('receipts').delete().eq('id', deleteModal.id);
    if (!error) {
      setDeleteModal({ isOpen: false, id: null });
      fetchReceipts(false);
    } else {
      console.error('Erro ao excluir:', error.message);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesText = (r.load_id || '').toLowerCase().includes(filterText.toLowerCase()) || 
                       r.supplier_name.toLowerCase().includes(filterText.toLowerCase()) ||
                       (r.driver || '').toLowerCase().includes(filterText.toLowerCase());
    const matchesType = typeFilter === 'All' || r.supplier_type === typeFilter;
    
    const receiptDate = new Date(r.created_at);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const matchesDate = receiptDate >= start && receiptDate <= end;
    
    return matchesText && matchesType && matchesDate;
  });

  const drivers = useMemo(() => dbSuppliers.filter(s => !!s.is_driver), [dbSuppliers]);
  const suppliersOnly = useMemo(() => dbSuppliers.filter(s => !s.is_driver), [dbSuppliers]);
  
  const kpis = useMemo(() => {
    return {
      pendente: filteredReceipts.filter(r => r.status === 'Pendente').length,
      enviado: filteredReceipts.filter(r => r.status === 'Enviado').length,
      recebido: filteredReceipts.filter(r => r.status === 'Recebido').length,
      total: filteredReceipts.length
    };
  }, [filteredReceipts]);

  const getStatusIndex = (status: Receipt['status']) => {
    return STATUS_OPTIONS.indexOf(status);
  };

  const getStatusColor = (status: Receipt['status']) => {
    switch (status) {
      case 'Pendente': return 'text-amber-500';
      case 'Enviado': return 'text-blue-500';
      case 'Recebido': return 'text-emerald-500';
      default: return 'text-primary';
    }
  };

  const getStatusBg = (status: Receipt['status']) => {
    switch (status) {
      case 'Pendente': return 'bg-amber-500';
      case 'Enviado': return 'bg-blue-500';
      case 'Recebido': return 'bg-emerald-500';
      default: return 'bg-primary';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-8 px-4 max-w-7xl mx-auto pb-32"
    >
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Cargas</h2>
            <p className="text-on-surface-variant mt-1 font-medium">Controle de entradas de cargas Intercompany e Externas.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10">
              <div className="relative flex-1 min-w-[200px]">
                <input 
                  type="text"
                  placeholder="Buscar Carga, Motorista ou Fornecedor..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full bg-transparent text-on-surface border-0 rounded-xl px-4 py-2 pl-10 focus:ring-0 outline-none text-sm"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              </div>
              
              <div className="flex items-center gap-2 px-2 border-l border-outline-variant/20">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface outline-none"
                />
                <span className="text-on-surface-variant text-xs">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface outline-none"
                />
              </div>

              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl border-0 outline-none cursor-pointer"
              >
                <option value="All">Todos</option>
                <option value="Intercompany">Intercompany</option>
                <option value="Externo">Externo</option>
              </select>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Carga
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pendente', value: kpis.pendente, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
          { label: 'Enviado', value: kpis.enviado, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Truck },
          { label: 'Recebido', value: kpis.recebido, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
          { label: 'Total', value: kpis.total, color: 'text-primary', bg: 'bg-primary/10', icon: Package },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{kpi.label}</p>
              <p className="text-xl font-headline font-black text-on-surface">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold animate-pulse">Carregando cargas...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant/30">
            <Truck className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Nenhuma carga encontrada</h3>
            <p className="text-on-surface-variant mt-1">Ajuste os filtros ou adicione uma nova carga.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReceipts.map((receipt) => (
            <motion.div 
              key={receipt.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch"
            >
              <div className="flex-1 flex flex-col">
                {/* Status Bar at the Top */}
                <div className="px-6 pt-10 pb-4 bg-surface-container-low/30 border-b border-outline-variant/5 relative">
                  {receipt.updated_by_name && (
                    <div className="absolute top-2 left-6 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                      <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                        Atualizado por: {receipt.updated_by_name}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <motion.div 
                        className={cn("h-full transition-colors duration-500", getStatusBg(receipt.status))}
                        initial={false}
                        animate={{ 
                          width: receipt.status === 'Pendente' ? '0%' : receipt.status === 'Enviado' ? '50%' : '100%' 
                        }}
                      />
                    </div>
                    
                    <div className="absolute top-0 left-0 w-full flex justify-between items-center -translate-y-1/2 px-0.5">
                      {STATUS_OPTIONS.map((status, idx) => {
                        const isReached = getStatusIndex(receipt.status) >= idx;
                        const isCurrent = receipt.status === status;
                        
                        return (
                          <div key={status} className="flex flex-col items-center gap-2 relative">
                            <div className={cn(
                              "w-3 h-3 rounded-full border-2 transition-all duration-500",
                              isReached ? cn(getStatusBg(status), "border-transparent scale-125") : "bg-surface border-outline-variant"
                            )} />
                            <span className={cn(
                              "absolute top-4 text-[9px] font-bold uppercase tracking-tighter transition-colors whitespace-nowrap",
                              isReached ? getStatusColor(status) : "text-on-surface-variant opacity-40"
                            )}>
                              {status}
                            </span>
                            
                            {isCurrent && (
                              <motion.div 
                                layoutId={`truck-${receipt.id}`}
                                className={cn("absolute -top-7 transition-colors duration-500", getStatusColor(status))}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              >
                                <Truck className="w-5 h-5 fill-current" />
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      receipt.supplier_type === 'Intercompany' ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                    )}>
                      {receipt.supplier_type === 'Intercompany' ? <Building2 className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline font-bold text-on-surface text-lg leading-tight">Carga #{receipt.load_id}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest",
                          receipt.supplier_type === 'Intercompany' ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                        )}>
                          {receipt.supplier_type}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Truck className="w-3 h-3 opacity-40" />
                          <span className="text-sm font-bold">Motorista: {receipt.driver}</span>
                        </div>
                    <div className="flex flex-center gap-2 text-on-surface-variant">
                          <Package className="w-3 h-3 opacity-40" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{receipt.invoice_count} Notas Fiscais</span>
                            {receipt.invoices && receipt.invoices.length > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedInvoices(receipt.invoices);
                                  setIsInvoiceListOpen(true);
                                }}
                                className="p-1 hover:bg-primary/10 text-primary rounded-md transition-colors"
                                title="Ver lista de NFs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Building2 className="w-3 h-3 opacity-40" />
                          <span className="text-sm font-bold">{receipt.supplier_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant/60">
                          <Clock className="w-3 h-3 opacity-40" />
                          <span className="text-[10px] font-bold">
                            {new Date(receipt.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {receipt.observation && (
                      <button 
                        onClick={() => setObservationModal({ isOpen: true, text: receipt.observation! })}
                        className="p-2 hover:bg-surface-container-high text-primary rounded-xl transition-colors"
                        title="Ver Observação"
                      >
                        <MessageSquareText className="w-5 h-5" />
                      </button>
                    )}
                    {receipt.image_url && (
                      <a 
                        href={receipt.image_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 hover:bg-surface-container-high text-primary rounded-xl transition-colors"
                        title="Ver Imagem"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </a>
                    )}
                    <button 
                      onClick={() => handleOpenModal(receipt)}
                      className="p-2 hover:bg-surface-container-high text-primary rounded-xl transition-colors"
                      title="Editar Carga"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(receipt.id, status)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          receipt.status === status 
                            ? cn(getStatusBg(status), "text-white shadow-md shadow-on-surface/10") 
                            : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                    {isAdmin && (
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, id: receipt.id })}
                        className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Receipt Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest p-8 rounded-[32px] shadow-2xl w-full max-w-lg border border-outline-variant/10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-extrabold text-on-surface">
                      {editingReceipt ? `Editar Carga #${editingReceipt.load_id}` : 'Nova Carga'}
                    </h3>
                    <p className="text-sm text-on-surface-variant">
                      {editingReceipt ? 'Atualize os dados da carga' : 'Preencha os dados da carga'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <AlertCircle className="w-6 h-6 text-on-surface-variant rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-error/10 text-error rounded-2xl flex items-center gap-3 border border-error/20"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold leading-tight">{formError}</p>
                  </motion.div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Motorista</label>
                    <select 
                      required
                      className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer" 
                      value={formData.driver}
                      onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    >
                      <option value="" disabled>Selecione um motorista</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                      {!drivers.length && (
                        <option value="" disabled>Nenhum motorista cadastrado</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Adicionar Notas Fiscais</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none" 
                      placeholder="Número da NF"
                      value={currentNF}
                      onChange={(e) => setCurrentNF(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNF())}
                    />
                    <button 
                      type="button"
                      onClick={addNF}
                      className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {formData.invoices.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-surface-container-low/50 rounded-2xl border border-outline-variant/10">
                      {formData.invoices.map(nf => (
                        <div key={nf} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold border border-primary/20">
                          {nf}
                          <button 
                            type="button" 
                            onClick={() => removeNF(nf)}
                            className="hover:text-error transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Tipo</label>
                    <select 
                      className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer" 
                      value={formData.supplier_type}
                      onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value as any })}
                    >
                      <option value="Intercompany">Intercompany</option>
                      <option value="Externo">Externo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Fornecedor</label>
                    <select 
                      required
                      className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer" 
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    >
                      <option value="" disabled>Selecione um fornecedor</option>
                      {suppliersOnly.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      {!suppliersOnly.length && SUPPLIER_EXAMPLES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Observação</label>
                  <textarea 
                    className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px] resize-none" 
                    placeholder="Detalhes adicionais..."
                    value={formData.observation}
                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Imagem da Carga</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 cursor-pointer transition-all active:scale-95">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                      <span className="text-sm font-bold">
                        {uploading ? 'Enviando...' : formData.image_url ? 'Trocar Imagem' : 'Adicionar Imagem'}
                      </span>
                    </label>
                    {formData.image_url && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/20 relative group">
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                          className="absolute inset-0 bg-error/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-surface-container-high text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container-highest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {saving ? 'Salvando...' : 'Salvar Carga'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice List Modal */}
      <AnimatePresence>
        {isInvoiceListOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Notas Fiscais da Carga</h3>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {selectedInvoices.map((nf, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-outline-variant/5">
                    <span className="text-sm font-bold text-on-surface">NF: {nf}</span>
                    <span className="text-[10px] font-black uppercase text-on-surface-variant/40">Item {idx + 1}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsInvoiceListOpen(false)}
                className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Observation Modal */}
      <AnimatePresence>
        {observationModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/10 relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Observação</h3>
              </div>
              
              <div className="p-4 bg-surface-container-low rounded-2xl text-on-surface-variant leading-relaxed text-sm">
                {observationModal.text}
              </div>

              <button 
                onClick={() => setObservationModal({ isOpen: false, text: '' })}
                className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-outline-variant/10 relative text-center"
            >
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Excluir Carga</h3>
              <p className="text-sm text-on-surface-variant mb-8">
                Tem certeza que deseja excluir permanentemente esta carga? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null })}
                  className="flex-1 bg-surface-container-high text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-highest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={deleteReceipt}
                  className="flex-1 bg-error text-white font-bold py-3 rounded-xl shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
