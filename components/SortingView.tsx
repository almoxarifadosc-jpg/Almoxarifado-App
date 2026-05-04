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
  Pen,
  Camera,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
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
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SignatureCanvas from 'react-signature-canvas';
import { sendGoogleChatNotification } from '@/lib/notifications';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number | null;
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
  status: 'Pendente' | 'Processado' | 'Recusado' | 'Baixada';
  pdf_url?: string;
  created_at: string;
  assigned_users?: string[]; // IDs dos usuários responsáveis
  conferred_by_id?: string;
  conferred_by_name?: string;
  conferred_at?: string;
  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
  signature_url?: string;
  sequence?: number | null;
  pis?: string[];
  observation?: string;
  photos?: string[];
}

interface Profile {
  id: string;
  name: string;
  email: string;
  is_super_admin?: boolean;
}

export function SortingView({ isAdmin, isSuperAdmin, currentUserId, isConferente, currentUserName, userCategory }: { 
  isAdmin?: boolean, 
  isSuperAdmin?: boolean,
  currentUserId?: string,
  isConferente?: boolean,
  currentUserName?: string,
  userCategory?: string
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [opFilter, setOpFilter] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'EDIT' | 'SIGN' | 'REVIEW'>('EDIT');
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const handleOpenOrder = (order: PurchaseOrder) => {
    const preparedOrder = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        quantity: item.quantity === 0 ? null : item.quantity
      }))
    };
    setEditingOrder(preparedOrder);
  };
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<PurchaseOrder | null>(null);
  const [currentPI, setCurrentPI] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [isConferConfirming, setIsConferConfirming] = useState(false);
  const [isBaixarConfirming, setIsBaixarConfirming] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_orders'), orderBy('sequence', 'asc'));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const q = query(collection(db, 'profiles'), where('status', '==', 'APPROVED'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const profilesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Profile[];
      setProfiles(profilesData);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProfiles();
    setError(null);
    setSuccess(null);

    // Firebase onSnapshot subscriptions
    const unsubOrders = onSnapshot(collection(db, 'purchase_orders'), () => {
      fetchOrders();
    });

    const unsubProfiles = onSnapshot(collection(db, 'profiles'), () => {
      fetchProfiles();
    });

    return () => {
      unsubOrders();
      unsubProfiles();
    };
  }, []);

  useEffect(() => {
    if (isEditModalOpen) {
      setError(null);
    }
  }, [isEditModalOpen]);

  const handleEditItemQuantity = (idx: number, newQty: number) => {
    setEditingOrder(prev => {
      if (!prev) return null;
      const updatedItems = [...(prev.items || [])];
      const item = { ...updatedItems[idx] };
      const qtyValue = isNaN(newQty) ? null : newQty;
      
      // Permitimos digitar qualquer valor para não travar a UX (ex: digitar 1 para chegar em 10)
      // A validação rigorosa será feita no momento de Salvar ou Conferir.
      item.quantity = qtyValue;
      updatedItems[idx] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddPI = () => {
    if (!currentPI.trim() || !editingOrder) return;
    const newPIs = [...(editingOrder.pis || []), currentPI.trim()];
    setEditingOrder({ ...editingOrder, pis: newPIs });
    setCurrentPI('');
  };

  const handleRemovePI = (piToRemove: string) => {
    if (!editingOrder) return;
    const newPIs = (editingOrder.pis || []).filter(pi => pi !== piToRemove);
    setEditingOrder({ ...editingOrder, pis: newPIs });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingOrder) return;

    setUploadingPhotos(true);
    try {
      const storage = getStorage();
      const newUploads = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `orders/${editingOrder.id}/${Date.now()}_${i}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const publicUrl = await getDownloadURL(storageRef);
        newUploads.push(publicUrl);
      }
      
      const existingPhotos = editingOrder.photos || [];
      setEditingOrder({ ...editingOrder, photos: [...existingPhotos, ...newUploads] });
    } catch (err: any) {
      setError(`Erro ao carregar fotos: ${err.message}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    if (!editingOrder) return;
    const newPhotos = (editingOrder.photos || []).filter(url => url !== urlToRemove);
    setEditingOrder({ ...editingOrder, photos: newPhotos });
  };

  const validateQuantities = () => {
    if (!editingOrder) return true;

    const itemsWithLowerQty = editingOrder.items?.filter(item => 
      item.quantity !== null && (item.quantity as number) < item.planned_quantity
    );

    if (itemsWithLowerQty && itemsWithLowerQty.length > 0) {
      setError(`Não é possível lançar quantidade menor que o planejado. Verifique os valores na coluna "Planejado" antes de confirmar.`);
      return false;
    }
    return true;
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
    if (!validateQuantities()) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      let signatureUrl = editingOrder.signature_url;

      // 1. Upload Signature if drawn
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const canvas = sigCanvas.current.getCanvas();
        const signatureDataUrl = canvas.toDataURL('image/png');
        try {
          const blob = await (await fetch(signatureDataUrl)).blob();
          const fileName = `signatures/signature_${editingOrder.id}_${Date.now()}.png`;
          const storage = getStorage();
          const storageRef = ref(storage, fileName);
          
          await uploadBytes(storageRef, blob);
          signatureUrl = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn('Fallback to Base64 signature due to storage error:', storageErr);
          signatureUrl = signatureDataUrl;
        }
      }

      // 2. Update Firestore
      const orderRef = doc(db, 'purchase_orders', editingOrder.id);
      await updateDoc(orderRef, {
        items: editingOrder.items,
        status: 'Pendente',
        signature_url: signatureUrl || '',
        pis: editingOrder.pis || [],
        observation: editingOrder.observation || '',
        photos: editingOrder.photos || [],
        updated_at: serverTimestamp()
      });

      fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setSuccess('Separação salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${editingOrder.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const conferOrder = async () => {
    if (!editingOrder?.id) return;
    if (!validateQuantities()) return;
    
    if (!currentUserId || !currentUserName) {
      setError("Erro de autenticação: usuário não identificado.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    try {
      const orderRef = doc(db, 'purchase_orders', editingOrder.id);
      await updateDoc(orderRef, {
        items: editingOrder.items,
        conferred_by_id: currentUserId,
        conferred_by_name: currentUserName,
        conferred_at: new Date().toISOString(),
        status: 'Processado',
        pis: editingOrder.pis || [],
        observation: editingOrder.observation || '',
        photos: editingOrder.photos || [],
        updated_at: serverTimestamp()
      });

      fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setIsConferConfirming(false);
      setSuccess('OP Conferida com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${editingOrder.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const signOrder = async () => {
    const currentUserProfile = profiles.find(p => p.id === currentUserId);
    const effectiveUserName = currentUserName || currentUserProfile?.name || currentUserProfile?.email;

    if (!editingOrder?.id) return;
    if (!effectiveUserName) {
      setError("Erro: Usuário não identificado. Por favor, recarregue a página.");
      return;
    }
    
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError("Por favor, realize a assinatura antes de salvar.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const canvas = sigCanvas.current.getCanvas();
      const signatureDataUrl = canvas.toDataURL('image/png');
      let signatureUrl = signatureDataUrl;

      try {
        const blob = await (await fetch(signatureDataUrl)).blob();
        const fileName = `signatures/signature_${editingOrder.id}_${Date.now()}.png`;
        const storage = getStorage();
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, blob);
        signatureUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Signature storage error, using base64 fallback:', storageErr);
      }

      const orderRef = doc(db, 'purchase_orders', editingOrder.id);
      await updateDoc(orderRef, {
        signature_url: signatureUrl,
        is_signed: true,
        signed_at: new Date().toISOString(),
        signed_by_name: effectiveUserName,
        updated_at: serverTimestamp()
      });
      
      fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setSuccess('Assinatura salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${editingOrder.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const baixarOrder = async (orderId: string) => {
    if (!isAdmin) return;
    
    setIsProcessing(true);
    try {
      const orderToClose = orders.find(o => o.id === orderId);

      const orderRef = doc(db, 'purchase_orders', orderId);
      await updateDoc(orderRef, { 
        status: 'Baixada',
        updated_at: serverTimestamp()
      });

      // Enviar notificação para o Google Chat
      if (orderToClose) {
        const message = `🚀 *OP Baixada (Concluída)*\n\n` +
          `*Número:* #${orderToClose.order_number}\n` +
          `*Fornecedor:* ${orderToClose.supplier_name}\n` +
          `*Executor:* ${currentUserName || 'Sistema'}\n` +
          `*Data:* ${new Date().toLocaleString('pt-BR')}`;
        await sendGoogleChatNotification(message);
      }

      fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setIsBaixarConfirming(false);
      setSuccess('OP Baixada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${orderId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const assignUsers = async (userIds: string[]) => {
    if (!assigningOrder?.id) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'purchase_orders', assigningOrder.id);
      await updateDoc(orderRef, { 
        assigned_users: userIds,
        updated_at: serverTimestamp()
      });
      fetchOrders();
      setIsAssignModalOpen(false);
      setAssigningOrder(null);
      setSuccess('Usuários atribuídos com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${assigningOrder.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const revertOrder = async (orderId: string) => {
    if (!isAdmin) {
      setError('Apenas administradores podem reverter OPs.');
      return;
    }
    
    try {
      const orderToRevert = orders.find(o => o.id === orderId);
      if (!orderToRevert) {
        throw new Error('OP não encontrada no estado local.');
      }

      if (orderToRevert.status === 'Baixada') {
        throw new Error('Não é possível reverter uma OP com status "Baixada".');
      }

      const resetItems = (orderToRevert.items || []).map(item => ({
        ...item,
        is_conferred: false
      }));

      const orderRef = doc(db, 'purchase_orders', orderId);
      await updateDoc(orderRef, {
        status: 'Pendente',
        items: resetItems,
        conferred_by_id: null,
        conferred_by_name: null,
        conferred_at: null,
        signature_url: null,
        updated_at: serverTimestamp()
      });

      fetchOrders();
      setSuccess('OP retornada para Pendente com sucesso!');
      setRevertingId(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${orderId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    // 1. Filtro por permissão de visualização
    const isAssigned = o.assigned_users?.includes(currentUserId || '');
    
    // 1. Super Admins e Admins vêem tudo
    // Usuários da categoria Ventisol que NÃO são admins vêem apenas as atribuições
    let canSee = false;
    
    if (isSuperAdmin || isAdmin || userCategory === 'Ventisol' || userCategory === 'Conferente') {
      canSee = true;
    } else {
      canSee = !!isAssigned;
    }

    if (!canSee) return false;

    // 2. Filtro por busca de texto (Produto/Fornecedor)
    const matchText = filterText === '' || 
      o.supplier_name.toLowerCase().includes(filterText.toLowerCase()) ||
      o.items?.some(item => item.description?.toLowerCase().includes(filterText.toLowerCase()));

    // 3. Filtro específico de OP
    const matchOP = opFilter === '' || o.order_number.toLowerCase().includes(opFilter.toLowerCase());

    // 4. Filtro de data
    let matchDate = true;
    if (o.date) {
      const orderDate = o.date.split('T')[0];
      matchDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
    } else {
      // Se não tem data, mostramos se os filtros estão vazios ou se a data inicial/final não restringe
      matchDate = !startDate && !endDate;
    }

    return matchText && matchOP && matchDate;
  });

  return (
    <div className="px-2 py-3 md:py-8 md:p-8 max-w-[1600px] mx-auto">
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 md:mb-8 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center gap-3 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-headline font-black text-on-surface tracking-tight">Separação de OPs</h2>
        <p className="text-on-surface-variant font-medium text-sm md:text-base">Gerencie a separação física dos materiais importados.</p>
      </div>

      <div className="bg-surface-container-low p-5 rounded-3xl mb-8 border border-outline-variant/10 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="relative md:col-span-5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block ml-1 text-opacity-70">Buscar Item ou Fornecedor</label>
            <div className="relative group">
              <input 
                type="text"
                placeholder="Ex: Descrição, material..."
                className="w-full bg-surface-container-high/50 rounded-2xl text-sm p-3.5 pl-11 outline-none border border-outline-variant/20 focus:border-primary/50 transition-all font-medium placeholder:text-on-surface-variant/40"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="relative md:col-span-3">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block ml-1 text-opacity-70">Número da OP</label>
            <div className="relative group">
              <input 
                type="text"
                placeholder="Ex: 56789"
                className="w-full bg-surface-container-high/50 rounded-2xl text-sm p-3.5 pl-11 outline-none border border-outline-variant/20 focus:border-primary/50 transition-all font-medium placeholder:text-on-surface-variant/40"
                value={opFilter}
                onChange={(e) => setOpFilter(e.target.value)}
              />
              <FileText className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="md:col-span-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block ml-1 text-opacity-70">Data Inicial</label>
              <div className="relative group">
                <input 
                  type="date"
                  className="w-full bg-surface-container-high/50 rounded-2xl text-sm p-3.5 pl-11 outline-none border border-outline-variant/20 focus:border-primary/50 transition-all font-medium"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block ml-1 text-opacity-70">Data Final</label>
              <div className="relative group">
                <input 
                  type="date"
                  className="w-full bg-surface-container-high/50 rounded-2xl text-sm p-3.5 pl-11 outline-none border border-outline-variant/20 focus:border-primary/50 transition-all font-medium"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
              </div>
            </div>
            
            {(filterText || opFilter || startDate || endDate) && (
              <button 
                onClick={() => {
                  setFilterText('');
                  setOpFilter('');
                  const today = new Date();
                  const y = today.getFullYear();
                  const m = String(today.getMonth() + 1).padStart(2, '0');
                  const d = String(today.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  setStartDate(dateStr);
                  setEndDate(dateStr);
                }}
                className="p-3.5 bg-surface-container-high hover:bg-surface-container-highest text-error rounded-2xl transition-colors border border-outline-variant/20 shadow-sm active:scale-95"
                title="Limpar Filtros"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "bg-surface-container-lowest p-6 rounded-[40px] border border-outline-variant/10 shadow-sm hover:shadow-xl transition-all group flex flex-col gap-6 relative overflow-hidden",
                order.status === 'Baixada' ? 'opacity-80' : ''
              )}
              onClick={() => {
                handleOpenOrder(order);
                if (order.status === 'Baixada') {
                  setModalMode('REVIEW');
                } else {
                  setModalMode('EDIT');
                }
                setIsEditModalOpen(true);
              }}
            >
              {/* Badge de Sequência em Destaque */}
              <div className={cn(
                "absolute top-0 right-0 px-6 py-2 rounded-bl-[24px] font-black italic tracking-tighter text-lg shadow-sm z-20",
                order.sequence 
                  ? "bg-amber-500 text-white shadow-amber-500/10" 
                  : "bg-error text-white shadow-error/10"
              )}>
                {order.sequence ? `SEQ ${order.sequence}` : 'FALTA SEQ'}
              </div>
              
              {/* Cabeçalho do Card */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">OP</h4>
                    <p className="text-xl font-headline font-black text-on-surface leading-none">#{order.order_number}</p>
                  </div>
                </div>

                {/* Responsáveis Topo Direito */}
                <div className="flex -space-x-2 mr-20">
                  {order.assigned_users && order.assigned_users.length > 0 ? (
                    <>
                      {order.assigned_users.slice(0, 3).map(uid => {
                        const user = profiles.find(p => p.id === uid);
                        return (
                          <div key={uid} className="w-8 h-8 rounded-full border-2 border-surface bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" title={user?.name}>
                            {user?.name?.[0] || '?'}
                          </div>
                        );
                      })}
                      {order.assigned_users.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                          +{order.assigned_users.length - 3}
                        </div>
                      )}
                      {isAdmin && order.status !== 'Baixada' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningOrder(order);
                            setIsAssignModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors z-10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    isAdmin && order.status !== 'Baixada' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningOrder(order);
                          setIsAssignModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:border-primary transition-colors"
                        title="Atribuir Responsáveis"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Informações Secundárias */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Localização</h4>
                    <p className="text-sm font-bold text-on-surface truncate">{order.product_location || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Data</h4>
                    <p className="text-sm font-bold text-on-surface">
                      {(() => {
                        const [y, m, d] = order.date.split('T')[0].split('-').map(Number);
                        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Barras de Progresso */}
                <div className="space-y-3 bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/10">
                  {(() => {
                    const { separation, conference } = calculatePercentages(order.items);
                    return (
                      <>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-primary truncate mr-1">Separação</span>
                            <span className="text-on-surface">{separation}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${separation}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                              style={{ minWidth: separation > 0 ? '4px' : '0' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-blue-400 truncate mr-1">Conferência</span>
                            <span className="text-on-surface">{conference}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${conference}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                              className="h-full bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.3)]"
                              style={{ minWidth: conference > 0 ? '4px' : '0' }}
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {(() => {
                      const { separation, conference } = calculatePercentages(order.items);
                      const isSeparated = separation === 100;
                      const isConferred = order.conferred_by_name != null;
                      const isSigned = order.is_signed === true;
                      const isBaixada = order.status === 'Baixada';

                      return (
                        <>
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            isSeparated 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                              : "bg-surface-container-high text-on-surface-variant/40 border-outline-variant/10 opacity-50"
                          )}>
                            Separada
                          </span>
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            isConferred 
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                              : "bg-surface-container-high text-on-surface-variant/40 border-outline-variant/10 opacity-50"
                          )}>
                            Conferida
                          </span>
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            isSigned 
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20" 
                              : "bg-surface-container-high text-on-surface-variant/40 border-outline-variant/10 opacity-50"
                          )}>
                            Assinada
                          </span>
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            isBaixada 
                              ? "bg-amber-500 text-white border-amber-600 font-bold" 
                              : "bg-surface-container-high text-on-surface-variant/40 border-outline-variant/10 opacity-50"
                          )}>
                            Baixada
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    order.status === 'Processado' ? 'bg-emerald-500/10 text-emerald-500' : 
                    order.status === 'Baixada' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 animate-pulse' :
                    'bg-amber-500/10 text-amber-500'
                  )}>
                    {order.status}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-40">
                    {order.items?.length || 0} Materiais
                  </span>
                </div>

                {/* Botão de Ação Inferior */}
                <div className="mt-auto space-y-2">
                  {order.status === 'Processado' || order.status === 'Baixada' ? (
                    <>
                      <div className={cn(
                        "w-full flex flex-col items-center gap-0.5 px-6 py-3 rounded-2xl border shadow-lg transition-all",
                        order.conferred_by_name 
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10" 
                          : "bg-amber-500 text-white border-amber-600 shadow-amber-500/10"
                      )}>
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 fill-white/20" />
                           <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                             {order.status === 'Baixada' ? 'OP BAIXADA' : order.conferred_by_name ? 'Conferido' : 'Separação Salva'}
                           </span>
                        </div>
                        {order.conferred_by_name && (
                          <span className="text-[10px] font-bold opacity-90 truncate w-full text-center">por {order.conferred_by_name}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {/* Botão Assinar - Apenas se não estiver assinada */}
                        {order.status === 'Processado' && !order.is_signed && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOrder(order);
                              setModalMode('SIGN');
                              setIsEditModalOpen(true);
                            }}
                            className="w-full bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-purple-500/20"
                          >
                            <Pen className="w-4 h-4" />
                            Assinar OP
                          </button>
                        )}

                        {/* Botão Baixar - Abre o modo de revisão para confirmar a baixa */}
                        {isAdmin && order.status === 'Processado' && order.is_signed && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOrder(order);
                              setModalMode('REVIEW');
                              setIsEditModalOpen(true);
                            }}
                            className="w-full bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-amber-500/20"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Baixar OP
                          </button>
                        )}

                        {isAdmin && (
                          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-outline-variant/10">
                            {order.status === 'Baixada' ? (
                              <div className="w-full flex items-center justify-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest text-white bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                OP Baixada
                              </div>
                            ) : (
                              revertingId === order.id ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevertingId(null);
                                  }}
                                  className="flex-1 p-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-high rounded-xl border border-outline-variant/20"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revertOrder(order.id);
                                  }}
                                  disabled={isProcessing}
                                  className="flex-[2] p-3 text-[10px] font-black uppercase tracking-widest text-white bg-error rounded-xl shadow-lg shadow-error/20 flex items-center justify-center gap-2"
                                >
                                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                                  Confirmar Reversão
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevertingId(order.id);
                                }}
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-error transition-all hover:bg-error/5 rounded-xl border border-dashed border-outline-variant/20"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                Reverter para Pendente
                              </button>
                            )
                          )}
                        </div>
                      )}

                        {/* Visualizar Assinatura - Sempre o último da ordem (se existir assinatura) */}
                        {order.is_signed && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOrder(order);
                              setModalMode('SIGN');
                              setIsEditModalOpen(true);
                            }}
                            className="w-full mt-2 bg-surface-container-highest text-primary p-3 rounded-xl hover:bg-primary/10 transition-all flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-widest border border-primary/20"
                          >
                            <Eye className="w-4 h-4" />
                            Visualizar assinatura
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => {
                          if (!order.sequence) return;
                          handleOpenOrder(order);
                          setModalMode('EDIT');
                          setIsEditModalOpen(true);
                        }}
                        disabled={!order.sequence}
                        className={cn(
                          "w-full p-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg",
                          order.sequence 
                            ? "bg-primary text-white hover:opacity-90 shadow-primary/20" 
                            : "bg-surface-container-highest text-on-surface-variant/30 cursor-not-allowed grayscale"
                        )}
                        title={order.sequence ? "Realizar Separação" : "Sequência não informada"}
                      >
                        <Edit3 className="w-5 h-5" />
                        <span className="text-sm">Separar Materiais</span>
                      </button>
                      
                      {!order.sequence && (
                        <p className="text-[10px] font-bold text-error text-center bg-error/5 py-1 rounded-lg animate-pulse">
                          Aguardando definição da Sequência para iniciar
                        </p>
                      )}
                      
                      {isConferente && (
                        <button 
                          onClick={() => {
                            handleOpenOrder(order);
                            setModalMode('EDIT');
                            setIsEditModalOpen(true);
                          }}
                          className="w-full bg-surface-container-high text-on-surface-variant p-4 rounded-2xl hover:bg-emerald-500 hover:text-white border border-outline-variant/10 transition-all flex items-center justify-center gap-2 font-bold group/conf"
                        >
                          <UserCheck className="w-5 h-5 group-hover/conf:scale-110 transition-transform" />
                          <span className="text-sm">Conferir OP</span>
                        </button>
                      )}
                    </div>
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
              className="bg-surface-container-lowest w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] rounded-2xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 md:p-8 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center text-primary">
                    <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-2xl font-headline font-black text-on-surface">
                      {modalMode === 'SIGN' ? 'Assinatura Eletrônica' : modalMode === 'REVIEW' ? 'Revisão da OP' : 'Lançar Separação'}
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant">OP #{editingOrder.order_number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 md:p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-error/10 text-error p-4 rounded-2xl flex items-center gap-3 mb-6 border border-error/20"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold leading-tight">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-error/10 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {modalMode === 'EDIT' && (
                  <>
                    {/* Campo PI */}
                    <div className="mb-4 md:mb-6 p-4 md:p-6 bg-surface-container-low rounded-[24px] md:rounded-[32px] border border-outline-variant/10">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-2 md:mb-3 block ml-1">Processos Industriais (PI)</label>
                      <div className="flex gap-2 mb-3 md:mb-4">
                        <input 
                          type="text"
                          value={currentPI}
                          onChange={(e) => setCurrentPI(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPI()}
                          placeholder="Digite o número da PI..."
                          className="flex-1 bg-surface-container-highest border-0 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                        />
                        <button 
                          onClick={handleAddPI}
                          className="w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all outline-none"
                        >
                          <Plus className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {editingOrder.pis?.map(pi => (
                          <div key={pi} className="bg-primary/10 text-primary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-primary/20">
                            {pi}
                            <button onClick={() => handleRemovePI(pi)} className="hover:text-error transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!editingOrder.pis || editingOrder.pis.length === 0) && (
                          <p className="text-[10px] text-on-surface-variant italic ml-1">Nenhuma PI adicionada.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-surface-container-high/30 overflow-hidden rounded-2xl md:rounded-[32px] border border-outline-variant/10 shadow-inner">
                    {/* Cabeçalho Desktop */}
                    <div className="hidden md:grid grid-cols-[1fr,100px,100px,80px] bg-surface-container-high px-6 py-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Material / Código</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Planejado</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Separado</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Dif.</div>
                    </div>

                    <div className="divide-y divide-outline-variant/10">
                      {editingOrder.items?.map((item, idx) => (
                        <div key={idx} className="p-3 md:p-4 md:px-6 md:py-3 hover:bg-surface-container-low/50 transition-colors grid grid-cols-1 md:grid-cols-[1fr,100px,100px,80px,50px] items-center gap-3 md:gap-0">
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
                                disabled={editingOrder.status !== 'Pendente'}
                                className={cn(
                                  "w-14 md:w-16 bg-surface-container-high md:bg-surface-container-low text-center font-black p-2 rounded-xl outline-none focus:ring-2 ring-primary/30 text-sm disabled:opacity-50",
                                  item.quantity !== null && (item.quantity as number) < item.planned_quantity && "ring-2 ring-error/50 text-error bg-error/5"
                                )}
                                value={item.quantity === null ? '' : item.quantity}
                                onChange={(e) => handleEditItemQuantity(idx, parseInt(e.target.value))}
                              />
                            </div>

                            <div className="flex flex-col items-center md:items-center">
                              <span className="md:hidden text-[9px] font-black uppercase text-on-surface-variant/40 mb-1">Dif.</span>
                              <span className={cn(
                                "text-sm md:text-xs font-black px-2 py-0.5 rounded-md",
                                (item.planned_quantity - (item.quantity ?? 0)) === 0 
                                  ? "bg-emerald-500/10 text-emerald-500" 
                                  : "bg-amber-500/10 text-amber-500"
                              )}>
                                {item.planned_quantity - (item.quantity ?? 0)}
                              </span>
                            </div>
                          </div>

                          {/* Conferido Check Column */}
                          <div className="flex justify-center">
                            <button 
                              onClick={() => handleToggleItemConferred(idx)}
                              disabled={!isConferente || editingOrder.status !== 'Pendente'}
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

                  {/* Observações e Fotos */}
                  <div className="mt-8 space-y-6">
                      <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-3 block ml-1">Observação da Separação</label>
                        <textarea 
                          value={editingOrder.observation || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, observation: e.target.value })}
                          placeholder="Alguma observação sobre esta separação?"
                          className="w-full bg-surface-container-highest border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-sm min-h-[100px] resize-none"
                        />
                      </div>

                      <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 ml-1">Fotos da Separação</label>
                          <label className="cursor-pointer bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/10">
                            <Camera className="w-3 h-3" />
                            Adicionar Fotos
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              capture="environment"
                              className="hidden" 
                              onChange={handlePhotoUpload} 
                              disabled={uploadingPhotos}
                            />
                          </label>
                        </div>

                        {uploadingPhotos && (
                          <div className="flex items-center gap-2 text-primary font-bold text-xs mb-4 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando fotos...
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {editingOrder.photos?.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/20 group">
                              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleRemovePhoto(url)}
                                className="absolute top-2 right-2 p-1.5 bg-error text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-1.5 bg-surface-container-lowest text-on-surface rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <Eye className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                          {(!editingOrder.photos || editingOrder.photos.length === 0) && (
                            <div className="col-span-full py-8 border-2 border-dashed border-outline-variant/20 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant/40">
                              <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma foto anexada</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {modalMode === 'REVIEW' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Tabela Cabeçalho */}
                    <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                      <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Dados do Cabeçalho</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Fornecedor</p>
                          <p className="font-bold text-on-surface">{editingOrder.supplier_name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Localização</p>
                          <p className="font-bold text-on-surface">{editingOrder.product_location || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Data da OP</p>
                          <p className="font-bold text-on-surface">{new Date(editingOrder.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Conferido Por</p>
                          <p className="font-bold text-emerald-500">{editingOrder.conferred_by_name || 'PENDENTE'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Assinado Por</p>
                          <p className="font-bold text-purple-500">{editingOrder.signed_by_name || 'PENDENTE'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Status Atual</p>
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            editingOrder.status === 'Baixada' ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"
                          )}>
                            {editingOrder.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabela Itens Detalhada */}
                    <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                      <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Itens da Operação</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low/50">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Cód/Material</th>
                              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Plan.</th>
                              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Sep.</th>
                              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Dif.</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Conf.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {editingOrder.items?.map((item, idx) => (
                              <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-black text-on-surface whitespace-nowrap">{item.code || '-'}</p>
                                  <p className="text-[11px] font-medium text-on-surface-variant leading-tight">{item.description}</p>
                                </td>
                                <td className="px-4 py-4 text-center text-sm font-bold text-on-surface">{item.planned_quantity}</td>
                                <td className="px-4 py-4 text-center text-sm font-black text-primary">{item.quantity ?? 0}</td>
                                <td className="px-4 py-4 text-center">
                                  <span className={cn(
                                    "text-[11px] font-black px-2 py-0.5 rounded-md",
                                    (item.planned_quantity - (item.quantity ?? 0)) === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                  )}>
                                    {item.planned_quantity - (item.quantity ?? 0)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {item.is_conferred ? (
                                    <div className="flex justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                                  ) : (
                                    <div className="flex justify-center"><AlertCircle className="w-4 h-4 text-amber-500 opacity-50" /></div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* PIs e Observações no Review */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {editingOrder.pis && editingOrder.pis.length > 0 && (
                        <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-3">PIs Vinculadas</p>
                          <div className="flex flex-wrap gap-2">
                            {editingOrder.pis.map(pi => (
                              <span key={pi} className="bg-primary/5 text-primary px-3 py-1.5 rounded-xl text-xs font-bold border border-primary/10">
                                PI #{pi}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {editingOrder.observation && (
                        <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-3">Observação</p>
                          <p className="text-sm text-on-surface font-medium leading-relaxed italic">"{editingOrder.observation}"</p>
                        </div>
                      )}
                    </div>

                    {/* Fotos no Review */}
                    {editingOrder.photos && editingOrder.photos.length > 0 && (
                      <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-4">Fotos da Separação</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          {editingOrder.photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-outline-variant/10 hover:ring-2 ring-primary transition-all">
                              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exibição da Assinatura no Review se existir */}
                    {editingOrder.is_signed && (
                       <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6 flex flex-col items-center gap-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Assinatura Eletrônica Registrada</p>
                          <img src={editingOrder.signature_url} alt="Assinatura" className="h-32 object-contain" />
                          <div className="text-center">
                            <p className="text-sm font-bold text-on-surface italic">Assinado por: {editingOrder.signed_by_name}</p>
                            <p className="text-[10px] font-mono text-on-surface-variant opacity-50 uppercase">{editingOrder.signed_at && new Date(editingOrder.signed_at).toLocaleString()}</p>
                          </div>
                       </div>
                    )}
                  </div>
                )}
                {/* Área de Assinatura Eletrônica Manuscrita - Oculta no modo EDIT conforme solicitado */}
                {modalMode === 'SIGN' && (
                  <div className="pt-6 border-t border-outline-variant/10 mt-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Pen className="w-4 h-4 text-primary" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Assinatura Eletrônica Manuscrita</h4>
                        </div>
                        <p className="text-[10px] text-on-surface-variant opacity-60 font-medium">Validado eletronicamente conforme diretrizes de conferência.</p>
                      </div>
                      {!editingOrder.is_signed && (
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
                      {editingOrder.is_signed ? (
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
                             <p className="text-[12px] text-on-surface font-bold uppercase tracking-widest mb-1 text-center italic">
                               Assinado por: {editingOrder.signed_by_name}
                             </p>
                             <p className="text-[9px] text-on-surface-variant font-mono opacity-50 uppercase tracking-tighter">
                               HASH: {editingOrder.id.substring(0, 12).toUpperCase()} / DT: {editingOrder.signed_at ? new Date(editingOrder.signed_at).toLocaleString() : new Date().toLocaleString()}
                             </p>
                          </div>
                        </div>
                      ) : (
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
                      )}
                    </div>
                    
                    <div className="mt-4 px-2">
                      <p className="text-[9px] leading-relaxed text-on-surface-variant opacity-40 text-center font-medium">
                        Ao assinar este documento, você confirma a integridade dos itens conferidos e aceita os termos de responsabilidade técnica pela separação dos materiais descritos nesta Ordem de Produção.
                      </p>
                    </div>
                  </div>
                )}
              </div>

                  <div className="p-4 md:p-8 border-t border-outline-variant/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  {modalMode === 'EDIT' && (
                    editingOrder.conferred_by_name ? (
                      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 animate-in fade-in zoom-in duration-300">
                        <UserCheck className="w-5 h-5" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Conferido por</p>
                          <p className="text-sm font-bold">{editingOrder.conferred_by_name}</p>
                        </div>
                      </div>
                    ) : (
                      isConferente && (() => {
                        const { separation, conference } = calculatePercentages(editingOrder.items);
                        const canConfer = separation === 100 && conference === 100;
                        
                        return (
                          <div className="flex flex-col gap-1">
                            {isConferente && editingOrder.status === 'Pendente' && (
                              isConferConfirming ? (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <button 
                                    onClick={() => setIsConferConfirming(false)}
                                    className="px-4 py-3 rounded-2xl font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest transition-colors w-full sm:w-auto"
                                  >
                                    Voltar
                                  </button>
                                  <button 
                                    onClick={conferOrder}
                                    disabled={isProcessing}
                                    className="px-6 py-3 rounded-2xl font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors w-full sm:w-auto"
                                  >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Confirmar Conferência
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setIsConferConfirming(true)}
                                  disabled={isProcessing || !canConfer}
                                  className={cn(
                                    "px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg",
                                    canConfer 
                                      ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:opacity-90" 
                                      : "bg-surface-container-high text-on-surface-variant/40 shadow-none grayscale cursor-not-allowed"
                                  )}
                                >
                                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                  Marcar como Conferido
                                </button>
                              )
                            )}
                            {!canConfer && editingOrder.status === 'Pendente' && (
                              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest animate-pulse pl-1 text-center">
                                * Separação e Conferência devem estar 100%
                              </p>
                            )}
                          </div>
                        );
                      })()
                    )
                  )}

                  {modalMode === 'SIGN' && !editingOrder.is_signed && (
                    <button 
                      onClick={signOrder}
                      disabled={isProcessing}
                      className="px-8 py-3 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 w-full md:w-auto"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pen className="w-5 h-5" />}
                      Salvar Assinatura
                    </button>
                  )}
                  {modalMode === 'REVIEW' && isAdmin && editingOrder.status !== 'Baixada' && (
                    isBaixarConfirming ? (
                      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => setIsBaixarConfirming(false)}
                          className="px-6 py-3 rounded-2xl font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest transition-colors w-full sm:w-auto"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => baixarOrder(editingOrder.id)}
                          disabled={isProcessing}
                          className="px-8 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-xl shadow-amber-500/20 w-full sm:w-auto"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                          Confirmar Agora
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsBaixarConfirming(true)}
                        disabled={isProcessing}
                        className="px-12 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 animate-in fade-in zoom-in duration-500 w-full md:w-auto"
                      >
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                        Confirmar Baixa de OP
                      </button>
                    )
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  {modalMode === 'EDIT' && editingOrder.status === 'Pendente' && (
                    <button 
                      onClick={updateOrder}
                      disabled={isProcessing}
                      className="px-8 py-3 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 w-full md:w-auto"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                      Salvar Separação
                    </button>
                  )}
                  {editingOrder.status === 'Baixada' && (
                    <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-xl font-bold border border-amber-200 text-sm flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5" />
                       Esta OP está baixada e não permite alterações.
                    </div>
                  )}
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-4 md:py-3 rounded-2xl font-bold text-on-surface-variant hover:bg-surface-container-high w-full md:w-auto"
                  >
                    Fechar
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
                {profiles
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(profile => {
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
