'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Calendar,
  Building2,
  Eye,
  ArrowLeft,
  X,
  Users,
  ClipboardList,
  Edit3,
  Plus,
  UserCheck,
  Eraser,
  Pen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import SignatureCanvas from 'react-signature-canvas';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  collector_name?: string;
  is_conferred?: boolean;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  product_location?: string;
  date: string;
  total_amount: number;
  items: OrderItem[];
  status: 'Pendente' | 'Processado' | 'Recusado';
  pdf_url?: string;
  created_at: string;
  assigned_users?: string[]; // IDs dos usuários responsáveis
  conferred_by_id?: string;
  conferred_by_name?: string;
  conferred_at?: string;
  signature_url?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export function SortingView({ isAdmin, currentUserId, isConferente, currentUserName }: { 
  isAdmin?: boolean, 
  currentUserId?: string,
  isConferente?: boolean,
  currentUserName?: string
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<PurchaseOrder | null>(null);
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('status', 'APPROVED');

    if (!error && data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProfiles();
  }, []);

  const handleEditItemQuantity = (idx: number, newQty: number) => {
    setEditingOrder(prev => {
      if (!prev) return null;
      const updatedItems = [...(prev.items || [])];
      const item = { ...updatedItems[idx] };
      const qtyValue = isNaN(newQty) ? 0 : newQty;
      item.quantity = qtyValue;
      updatedItems[idx] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const handleToggleItemConferred = (index: number) => {
    if (!editingOrder || !isConferente) return;
    setEditingOrder(prev => {
      if (!prev) return null;
      const newItems = [...(prev.items || [])];
      newItems[index] = { 
        ...newItems[index], 
        is_conferred: !newItems[index].is_conferred 
      };
      return { ...prev, items: newItems };
    });
  };

  const calculatePercentages = (items: OrderItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0 };
    const separatedCount = items.filter(i => (i.quantity || 0) > 0).length;
    const conferredCount = items.filter(i => i.is_conferred).length;
    
    return {
      separation: Math.round((separatedCount / items.length) * 100),
      conference: Math.round((conferredCount / items.length) * 100)
    };
  };

  const updateOrder = async () => {
    if (!editingOrder?.id) return;
    setIsProcessing(true);
    setError(null);
    try {
      let signatureUrl = editingOrder.signature_url;

      // 1. Upload Signature if drawn
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const blob = await (await fetch(signatureDataUrl)).blob();
        const fileName = `signature_${editingOrder.id}_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('orders')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('orders')
          .getPublicUrl(fileName);
        
        signatureUrl = publicUrl;
      }

      // 2. Update Database
      const { error: dbError } = await supabase
        .from('purchase_orders')
        .update({
          items: editingOrder.items,
          status: 'Processado',
          signature_url: signatureUrl
        })
        .eq('id', editingOrder.id);

      if (dbError) throw dbError;
      await fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setSuccess('Separação salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Falha ao salvar: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const conferOrder = async () => {
    if (!editingOrder?.id || !currentUserId || !currentUserName) return;
    setIsProcessing(true);
    setError(null);
    try {
      let signatureUrl = editingOrder.signature_url;

      // 1. Upload Signature if drawn (Conferente also signs to validate)
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const blob = await (await fetch(signatureDataUrl)).blob();
        const fileName = `signature_conferente_${editingOrder.id}_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('orders')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('orders')
          .getPublicUrl(fileName);
        
        signatureUrl = publicUrl;
      }

      // 2. Update Database
      const { error: dbError } = await supabase
        .from('purchase_orders')
        .update({
          items: editingOrder.items,
          conferred_by_id: currentUserId,
          conferred_by_name: currentUserName,
          conferred_at: new Date().toISOString(),
          status: 'Processado',
          signature_url: signatureUrl
        })
        .eq('id', editingOrder.id);

      if (dbError) throw dbError;
      await fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setSuccess('Conferência com Assinatura registrada!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Erro na conferência: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const assignUsers = async (userIds: string[]) => {
    if (!assigningOrder?.id) return;
    setIsProcessing(true);
    try {
      const { error: dbError } = await supabase
        .from('purchase_orders')
        .update({ assigned_users: userIds })
        .eq('id', assigningOrder.id);

      if (dbError) throw dbError;
      await fetchOrders();
      setIsAssignModalOpen(false);
      setAssigningOrder(null);
      setSuccess('Usuários atribuídos com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Erro ao atribuir usuários: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    // 1. Filtro por permissão de visualização
    const isAssigned = o.assigned_users?.includes(currentUserId || '');
    const canSee = isAdmin || isAssigned;
    if (!canSee) return false;

    // 2. Filtro por busca de texto
    return (
      o.order_number.toLowerCase().includes(filterText.toLowerCase()) ||
      o.supplier_name.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  return (
    <div className="px-2 py-6 md:p-8 max-w-[1600px] mx-auto">
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center gap-3 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">Separação de OPs</h2>
        <p className="text-on-surface-variant font-medium">Gerencie a separação física dos materiais importados.</p>
      </div>

      <div className="bg-surface-container-low p-2 rounded-2xl mb-8 border border-outline-variant/10 flex items-center gap-3">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Buscar por OP ou Produto..."
            className="w-full bg-transparent text-sm p-3 pl-10 outline-none"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 font-bold text-on-surface-variant">Carregando OPs para separação...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center text-center">
          <ClipboardList className="w-12 h-12 text-on-surface-variant opacity-20 mb-4" />
          <h3 className="text-xl font-bold text-on-surface">Nenhuma OP disponível</h3>
          <p className="text-on-surface-variant mt-2 text-sm">Importe arquivos via PDF na tela de importação para vê-los aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              className="bg-surface-container-lowest p-4 md:p-6 rounded-[32px] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center gap-6 lg:gap-10 group"
            >
              {/* OP / Info Principal */}
              <div className="flex items-center gap-6 min-w-[200px]">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">OP</h4>
                  <p className="text-xl font-headline font-black text-on-surface leading-none">#{order.order_number}</p>
                  {order.product_location && (
                    <p className="text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {order.product_location}
                    </p>
                  )}
                </div>
              </div>

              {/* Detalhes Médios */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 w-full">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Localização</h4>
                  <p className="text-sm font-bold text-on-surface truncate">{order.product_location || '-'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Items</h4>
                  <p className="text-sm font-bold text-on-surface">{order.items?.length || 0}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Data</h4>
                  <p className="text-sm font-bold text-on-surface">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Porcentagens */}
                <div className="col-span-2 flex flex-col sm:flex-row items-center gap-4 md:gap-6 md:border-l border-outline-variant/10 md:pl-6">
                  {(() => {
                    const { separation, conference } = calculatePercentages(order.items);
                    return (
                      <>
                        <div className="flex flex-col gap-1.5 flex-1 w-full min-w-[80px]">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-secondary">Separação</span>
                            <span className="text-on-surface">{separation}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${separation}%` }}
                              className="h-full bg-secondary rounded-full"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 w-full min-w-[80px]">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-emerald-500">Conferência</span>
                            <span className="text-on-surface">{conference}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${conference}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Status</h4>
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-center",
                      order.status === 'Processado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsáveis */}
              <div className="min-w-[150px] flex flex-col items-center md:items-start">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-2">Responsáveis</h4>
                <div className="flex -space-x-2">
                  {order.assigned_users && order.assigned_users.length > 0 ? (
                    <>
                      {order.assigned_users.map(uid => {
                        const user = profiles.find(p => p.id === uid);
                        return (
                          <div key={uid} className="w-8 h-8 rounded-full border-2 border-surface bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" title={user?.name}>
                            {user?.name?.[0] || '?'}
                          </div>
                        );
                      })}
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            setAssigningOrder(order);
                            setIsAssignModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors z-10"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    isAdmin ? (
                      <button 
                        onClick={() => {
                          setAssigningOrder(order);
                          setIsAssignModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:border-primary transition-colors"
                        title="Atribuir Responsáveis"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <p className="text-[10px] font-bold text-on-surface-variant italic opacity-40">Ninguém atribuído</p>
                    )
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col xl:flex-row items-center gap-3 ml-auto">
                <button 
                  onClick={() => {
                    setEditingOrder(order);
                    setIsEditModalOpen(true);
                  }}
                  className="w-full xl:w-auto bg-primary/10 text-primary p-4 rounded-2xl hover:bg-primary/20 transition-all flex items-center justify-center gap-2 font-bold"
                  title="Realizar Separação"
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="text-sm">Separar</span>
                </button>

                {order.conferred_by_name ? (
                  <div className="w-full xl:w-auto flex flex-col items-center xl:items-end gap-0.5 px-6 py-3 bg-emerald-500 text-white rounded-2xl border border-emerald-600 shadow-lg shadow-emerald-500/10 min-w-[180px] animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 fill-white/20" />
                       <span className="text-[11px] font-black uppercase tracking-[0.15em]">Conferido</span>
                    </div>
                    <span className="text-[10px] font-bold opacity-90 truncate max-w-[150px]">por {order.conferred_by_name}</span>
                  </div>
                ) : (
                  isConferente && (
                    <button 
                      onClick={() => {
                        setEditingOrder(order);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full xl:w-auto bg-surface-container-high text-on-surface-variant p-4 rounded-2xl hover:bg-emerald-500 hover:text-white hover:border-emerald-400 border border-outline-variant/10 shadow-sm transition-all flex items-center justify-center gap-2 font-bold group/conf shadow-emerald-500/0 hover:shadow-emerald-500/20"
                    >
                      <UserCheck className="w-5 h-5 group-hover/conf:scale-110 transition-transform" />
                      <span className="text-sm">Conferir</span>
                    </button>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Quantities Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-black text-on-surface">Lançar Separação</h3>
                    <p className="text-sm text-on-surface-variant">OP #{editingOrder.order_number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="bg-surface-container-high/30 overflow-hidden rounded-[32px] border border-outline-variant/10 shadow-inner">
                  {/* Cabeçalho Desktop */}
                  <div className="hidden md:grid grid-cols-[1fr,100px,100px,80px] bg-surface-container-high px-6 py-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Material / Código</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Planejado</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Separado</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Dif.</div>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {editingOrder.items?.map((item, idx) => (
                      <div key={idx} className="p-4 md:px-6 md:py-3 hover:bg-surface-container-low/50 transition-colors grid grid-cols-1 md:grid-cols-[1fr,100px,100px,80px,50px] items-center gap-4 md:gap-0">
                        {/* Material Info */}
                        <div className="min-w-0">
                          {/* Desktop: Descrição > Código */}
                          <div className="hidden md:block">
                            <p className="text-sm font-bold text-on-surface truncate pr-4">{item.description}</p>
                            <p className="text-[10px] text-on-surface-variant font-bold uppercase opacity-60">{item.code || 'S/ COD'}</p>
                          </div>
                          {/* Mobile: Código (Ênfase) > Descrição */}
                          <div className="md:hidden">
                            <p className="text-lg font-black text-primary leading-tight mb-0.5">{item.code || 'SEM CÓDIGO'}</p>
                            <p className="text-[11px] font-medium text-on-surface-variant line-clamp-2 leading-relaxed italic">{item.description}</p>
                          </div>
                        </div>

                        {/* Colunas de Quantidade (Responsivas) */}
                        <div className="grid grid-cols-3 md:contents items-center bg-surface-container-low md:bg-transparent p-3 md:p-0 rounded-2xl md:rounded-none border border-outline-variant/5 md:border-none">
                          <div className="flex flex-col items-center md:items-center">
                            <span className="md:hidden text-[9px] font-black uppercase text-on-surface-variant/40 mb-1">Plan.</span>
                            <p className="font-bold text-on-surface text-sm md:text-base">{item.planned_quantity}</p>
                          </div>
                          
                          <div className="flex flex-col items-center md:items-center">
                            <span className="md:hidden text-[9px] font-black uppercase text-on-surface-variant/40 mb-1">Sep.</span>
                            <input 
                              type="number"
                              className="w-14 md:w-16 bg-surface-container-high md:bg-surface-container-low text-center font-black p-2 rounded-xl outline-none focus:ring-2 ring-primary/30 text-sm"
                              value={item.quantity}
                              onChange={(e) => handleEditItemQuantity(idx, parseInt(e.target.value))}
                            />
                          </div>

                          <div className="flex flex-col items-center md:items-center">
                            <span className="md:hidden text-[9px] font-black uppercase text-on-surface-variant/40 mb-1">Dif.</span>
                            <span className={cn(
                              "text-sm md:text-xs font-black px-2 py-0.5 rounded-md",
                              (item.planned_quantity - item.quantity) === 0 
                                ? "bg-emerald-500/10 text-emerald-500" 
                                : "bg-amber-500/10 text-amber-500"
                            )}>
                              {item.planned_quantity - item.quantity}
                            </span>
                          </div>
                        </div>

                        {/* Conferido Check Column */}
                        <div className="flex justify-center">
                          <button 
                            onClick={() => handleToggleItemConferred(idx)}
                            disabled={!isConferente}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              item.is_conferred 
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                : "bg-surface-container-high text-on-surface-variant/30 hover:bg-emerald-500/10 hover:text-emerald-500 border border-outline-variant/10"
                            )}
                            title={isConferente ? "Alternar Conferência" : "Apenas conferentes"}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Área de Assinatura Eletrônica Manuscrita */}
                <div className="mt-8 pt-6 border-t border-outline-variant/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Pen className="w-4 h-4 text-primary" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Assinatura Eletrônica Manuscrita</h4>
                      </div>
                      <p className="text-[10px] text-on-surface-variant opacity-60 font-medium">Validado eletronicamente conforme diretrizes de conferência.</p>
                    </div>
                    {isConferente && !editingOrder.signature_url && (
                      <button 
                        type="button"
                        onClick={() => sigCanvas.current?.clear()}
                        className="text-[10px] font-black uppercase tracking-widest text-error flex items-center gap-2 hover:bg-error/5 px-4 py-2 rounded-xl transition-colors self-start md:self-center"
                      >
                        <Eraser className="w-4 h-4" />
                        Limpar Área
                      </button>
                    )}
                  </div>

                  <div className="bg-surface-container-high rounded-[40px] border border-outline-variant/20 p-6 shadow-inner overflow-hidden">
                    {editingOrder.signature_url ? (
                      <div className="w-full flex flex-col items-center justify-center py-6 bg-white/40 rounded-3xl relative group border border-outline-variant/5">
                        <img 
                          src={editingOrder.signature_url} 
                          alt="Assinatura Manuscrita" 
                          className="max-h-40 object-contain drop-shadow-sm"
                        />
                        <div className="mt-4 flex flex-col items-center">
                           <div className="flex items-center gap-2 text-emerald-500 mb-1">
                             <CheckCircle2 className="w-4 h-4" />
                             <span className="text-[11px] font-black uppercase tracking-widest">Documento Assinado</span>
                           </div>
                           <p className="text-[9px] text-on-surface-variant font-mono opacity-50 uppercase tracking-tighter">HASH: {editingOrder.id.substring(0, 12).toUpperCase()} / DT: {editingOrder.conferred_at ? new Date(editingOrder.conferred_at).toLocaleString() : new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    ) : isConferente ? (
                      <div className="w-full bg-white rounded-3xl border-2 border-dashed border-outline-variant/30 overflow-hidden touch-none relative">
                        <SignatureCanvas 
                          ref={sigCanvas}
                          penColor="#000"
                          canvasProps={{
                            className: "signature-canvas w-full h-48 cursor-crosshair",
                          }}
                        />
                        <div className="absolute inset-0 pointer-events-none border-[12px] border-white/50 opacity-10"></div>
                        <div className="bg-surface-container-low p-3 text-center border-t border-outline-variant/10">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] flex items-center justify-center gap-2">
                            <Pen className="w-3 h-3" />
                            Assine no campo acima utilizando o dedo ou caneta stylus
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center py-12 bg-surface-container-low/50 rounded-3xl border-2 border-dashed border-outline-variant/10 opacity-40">
                        <Pen className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Aguardando assinatura do conferente</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 px-2">
                    <p className="text-[9px] leading-relaxed text-on-surface-variant opacity-40 text-center font-medium">
                      Ao assinar este documento, você confirma a integridade dos itens conferidos e aceita os termos de responsabilidade técnica pela separação dos materiais descritos nesta Ordem de Produção.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {editingOrder.conferred_by_name ? (
                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 animate-in fade-in zoom-in duration-300">
                      <UserCheck className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Conferido por</p>
                        <p className="text-sm font-bold">{editingOrder.conferred_by_name}</p>
                      </div>
                    </div>
                  ) : (
                    isConferente && (
                      <button 
                        onClick={conferOrder}
                        disabled={isProcessing}
                        className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                        Marcar como Conferido
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 rounded-2xl font-bold text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={updateOrder}
                    disabled={isProcessing}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Salvar Separação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Users Modal */}
      <AnimatePresence>
        {isAssignModalOpen && assigningOrder && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-headline font-black text-on-surface">Atribuir Equipe</h3>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)}>
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-2 max-h-[400px] overflow-y-auto">
                {profiles.map(profile => {
                  const isAssigned = assigningOrder.assigned_users?.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const current = assigningOrder.assigned_users || [];
                        const next = isAssigned 
                          ? current.filter(id => id !== profile.id)
                          : [...current, profile.id];
                        setAssigningOrder({ ...assigningOrder, assigned_users: next });
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                        isAssigned 
                          ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20" 
                          : "bg-surface-container-low border-transparent hover:border-outline-variant"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {profile.name[0]}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-on-surface">{profile.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{profile.email}</p>
                        </div>
                      </div>
                      {isAssigned && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-8 pt-0">
                <button 
                  onClick={() => assignUsers(assigningOrder.assigned_users || [])}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Confirmar Equipe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
