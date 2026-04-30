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
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Receipt {
  id: string;
  load_id: string;
  invoices: string[];
  invoice_count: number;
  driver: string;
  supplier_name: string;
  load_type?: string;
  load_type_color?: string;
  status: 'Pendente' | 'Enviado' | 'Recebido' | 'Divergente' | 'Concluído';
  observation?: string;
  image_url?: string;
  divergence_observation?: string;
  divergence_photo_url?: string;
  author_id?: string;
  created_at: string;
  updated_at?: string;
  updated_by_name?: string;
  status_history?: Record<string, { at: string; by: string; by_id?: string }>;
}

interface LoadType {
  id: string;
  name: string;
  color?: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  is_driver?: boolean;
}

interface ReceiptsViewProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  currentUserId?: string;
  userName?: string;
  userCategory?: string;
}

const SUPPLIER_EXAMPLES = [
  "Ventisol Nordeste",
  "Fornecedor de Componentes China",
  "Transportadora TransRápido"
];

const STATUS_OPTIONS = ['Pendente', 'Enviado', 'Recebido', 'Divergente', 'Concluído'] as const;

export function ReceiptsView({ isAdmin, isSuperAdmin, currentUserId, userName, userCategory }: ReceiptsViewProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [loadTypes, setLoadTypes] = useState<LoadType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadTypeModalOpen, setIsLoadTypeModalOpen] = useState(false);
  const [newLoadType, setNewLoadType] = useState('');
  const [newLoadTypeColor, setNewLoadTypeColor] = useState('#3b82f6');
  const [savingLoadType, setSavingLoadType] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [observationModal, setObservationModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
  const [filterText, setFilterText] = useState('');
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedLoadType, setSelectedLoadType] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; receipt: Receipt | null }>({ isOpen: false, receipt: null });
  const [divergenceModal, setDivergenceModal] = useState<{ 
    isOpen: boolean; 
    receiptId: string | null;
    observation: string;
    photoUrl: string;
  }>({ 
    isOpen: false, 
    receiptId: null,
    observation: '',
    photoUrl: ''
  });
  const [uploadingDivergence, setUploadingDivergence] = useState(false);
  
  const [formData, setFormData] = useState({
    invoices: [] as string[],
    driver: '',
    supplier_name: '',
    load_type: '',
    load_type_color: '',
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
      const storage = getStorage();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipt-images/${fileName}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      console.error('Erro no upload:', error.message);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleDivergencePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDivergence(true);
      const storage = getStorage();
      const fileExt = file.name.split('.').pop();
      const fileName = `div-${Math.random()}.${fileExt}`;
      const filePath = `divergence-images/${fileName}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);

      setDivergenceModal(prev => ({ ...prev, photoUrl: publicUrl }));
    } catch (error: any) {
      console.error('Erro no upload da divergência:', error.message);
      alert('Erro ao fazer upload da imagem de divergência.');
    } finally {
      setUploadingDivergence(false);
    }
  };

  const fetchReceipts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const q = query(collection(db, 'receipts'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Receipt[];
      setReceipts(data);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const q = query(collection(db, 'suppliers'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supplier[];
      setDbSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchLoadTypes = async () => {
    try {
      const q = query(collection(db, 'load_types'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoadType[];
      setLoadTypes(data);
    } catch (err) {
      console.error('Error fetching load types:', err);
    }
  };

  const saveLoadType = async () => {
    if (!newLoadType.trim()) return;
    setSavingLoadType(true);
    try {
      await addDoc(collection(db, 'load_types'), { 
        name: newLoadType.trim(),
        color: newLoadTypeColor,
        created_at: serverTimestamp()
      });
      setNewLoadType('');
      setNewLoadTypeColor('#3b82f6');
      setIsLoadTypeModalOpen(false);
      fetchLoadTypes();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'load_types');
    } finally {
      setSavingLoadType(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
    fetchSuppliers();
    fetchLoadTypes();

    const unsubReceipts = onSnapshot(collection(db, 'receipts'), () => {
      fetchReceipts(false);
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), () => {
      fetchSuppliers();
    });

    const unsubLoadTypes = onSnapshot(collection(db, 'load_types'), () => {
      fetchLoadTypes();
    });

    return () => {
      unsubReceipts();
      unsubSuppliers();
      unsubLoadTypes();
    };
  }, []);

  const handleOpenModal = (receipt: Receipt | null = null) => {
    if (receipt) {
      setEditingReceipt(receipt);
      setFormData({
        invoices: receipt.invoices || [],
        driver: receipt.driver || '',
        supplier_name: receipt.supplier_name,
        load_type: receipt.load_type || '',
        load_type_color: receipt.load_type_color || '',
        observation: receipt.observation || '',
        image_url: receipt.image_url || ''
      });
    } else {
      setEditingReceipt(null);
      setFormData({
        invoices: [],
        driver: '',
        supplier_name: '',
        load_type: '',
        load_type_color: '',
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
      if (formData.invoices.length === 0) {
        throw new Error('Adicione pelo menos uma Nota Fiscal.');
      }
      if (!formData.load_type) {
        throw new Error('Selecione o Tipo de Carga.');
      }
      if (!formData.driver) {
        throw new Error('Selecione um Motorista.');
      }
      if (!formData.supplier_name) {
        throw new Error('Selecione um Fornecedor.');
      }

      if (editingReceipt) {
        const docRef = doc(db, 'receipts', editingReceipt.id);
        await updateDoc(docRef, { 
          ...formData, 
          invoice_count: formData.invoices.length,
          updated_by_name: userName || 'Usuário',
          updated_at: serverTimestamp()
        });
      } else {
        // Generate sequential load_id
        const nextLoadNum = receipts.length > 0 
          ? Math.max(...receipts.map(r => {
              const num = parseInt(r.load_id || '0');
              return isNaN(num) ? 0 : num;
            })) + 1 
          : 1;
        const load_id = nextLoadNum.toString().padStart(4, '0');

        await addDoc(collection(db, 'receipts'), { 
          ...formData, 
          load_id,
          invoice_number: formData.invoices[0] || 'S/N',
          supplier_type: 'Externo', // Default value
          invoice_count: formData.invoices.length,
          status: 'Pendente', 
          author_id: currentUserId,
          updated_by_name: userName || 'Usuário',
          created_at: serverTimestamp(),
          status_history: {
            'Pendente': { 
              at: new Date().toISOString(), 
              by: userName || 'Usuário',
              by_id: currentUserId
            }
          }
        });
      }

      setIsModalOpen(false);
      setEditingReceipt(null);
      setFormData({
        invoices: [],
        driver: '',
        supplier_name: '',
        load_type: '',
        load_type_color: '',
        observation: '',
        image_url: ''
      });
      fetchReceipts(false);
    } catch (err: any) {
      handleFirestoreError(err, editingReceipt ? OperationType.UPDATE : OperationType.CREATE, `receipts/${editingReceipt?.id || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Receipt['status']) => {
    if (newStatus === 'Divergente') {
      setDivergenceModal({
        isOpen: true,
        receiptId: id,
        observation: '',
        photoUrl: ''
      });
      return;
    }

    const now = new Date().toISOString();
    const currentOrder = receipts.find(r => r.id === id);
    
    // Regra de Retroceder Status
    const currentIndex = getStatusIndex(currentOrder?.status || 'Pendente');
    const targetIndex = getStatusIndex(newStatus);
    const isRetroceding = targetIndex < currentIndex;

    if (!isSuperAdmin && isRetroceding && userCategory === 'Recebimento') {
      const lastUpdate = currentOrder?.status_history?.[currentOrder.status];
      if (lastUpdate && lastUpdate.by_id !== currentUserId) {
        alert('Você só pode retroceder o status se foi você quem realizou a última atualização.');
        return;
      }
    }

    const newHistory = {
      ...(currentOrder?.status_history || {}),
      [newStatus]: { at: now, by: userName || 'Usuário', by_id: currentUserId }
    };
    
    try {
      const docRef = doc(db, 'receipts', id);
      await updateDoc(docRef, { 
        status: newStatus,
        updated_by_name: userName || 'Usuário',
        updated_at: serverTimestamp(),
        status_history: newHistory
      });
      fetchReceipts(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `receipts/${id}`);
    }
  };

  const handleDivergenceSubmit = async () => {
    if (!divergenceModal.observation.trim() || !divergenceModal.receiptId) {
      alert('A observação é obrigatória para registrar uma divergência.');
      return;
    }

    const id = divergenceModal.receiptId;
    const now = new Date().toISOString();
    const currentOrder = receipts.find(r => r.id === id);
    const newStatus = 'Divergente';

    const newHistory = {
      ...(currentOrder?.status_history || {}),
      [newStatus]: { at: now, by: userName || 'Usuário', by_id: currentUserId }
    };

    setSaving(true);
    try {
      const docRef = doc(db, 'receipts', id);
      await updateDoc(docRef, {
        status: newStatus,
        divergence_observation: divergenceModal.observation,
        divergence_photo_url: divergenceModal.photoUrl,
        updated_by_name: userName || 'Usuário',
        updated_at: serverTimestamp(),
        status_history: newHistory
      });

      setDivergenceModal({ isOpen: false, receiptId: null, observation: '', photoUrl: '' });
      fetchReceipts(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `receipts/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteReceipt = async () => {
    if (!deleteModal.id) return;
    try {
      const docRef = doc(db, 'receipts', deleteModal.id);
      await deleteDoc(docRef);
      setDeleteModal({ isOpen: false, id: null });
      fetchReceipts(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `receipts/${deleteModal.id}`);
    }
  };

  const canEditReceipt = (receipt: Receipt) => {
    // Super admin pode tudo
    if (isSuperAdmin) return true;
    
    // Status Enviado ou Recebido não podem ser editados por usuários comuns
    if (receipt.status === 'Enviado' || receipt.status === 'Recebido') return false;
    
    // Status Pendente só pode ser alterado por quem criou
    return receipt.author_id === currentUserId;
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesText = (r.load_id || '').toLowerCase().includes(filterText.toLowerCase()) || 
                       r.supplier_name.toLowerCase().includes(filterText.toLowerCase()) ||
                       (r.driver || '').toLowerCase().includes(filterText.toLowerCase()) ||
                       (r.invoices || []).some(nf => nf.toLowerCase().includes(filterText.toLowerCase()));
    
    const matchesLoadType = !selectedLoadType || r.load_type === selectedLoadType;
    
    const receiptDate = new Date(r.created_at);
    
    // Parse dates manually to avoid timezone shifts
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
    
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    
    const matchesDate = receiptDate >= start && receiptDate <= end;
    
    return matchesText && matchesDate && matchesLoadType;
  });

  const drivers = useMemo(() => dbSuppliers.filter(s => !!s.is_driver), [dbSuppliers]);
  const suppliersOnly = useMemo(() => dbSuppliers.filter(s => !s.is_driver), [dbSuppliers]);
  
  const kpis = useMemo(() => {
    return {
      pendente: filteredReceipts.filter(r => r.status === 'Pendente').length,
      enviado: filteredReceipts.filter(r => r.status === 'Enviado').length,
      recebido: filteredReceipts.filter(r => r.status === 'Recebido').length,
      divergente: filteredReceipts.filter(r => r.status === 'Divergente').length,
      concluido: filteredReceipts.filter(r => r.status === 'Concluído').length,
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
      case 'Divergente': return 'text-rose-500';
      case 'Concluído': return 'text-indigo-500';
      default: return 'text-primary';
    }
  };

  const getStatusBg = (status: Receipt['status']) => {
    switch (status) {
      case 'Pendente': return 'bg-amber-500';
      case 'Enviado': return 'bg-blue-500';
      case 'Recebido': return 'bg-emerald-500';
      case 'Divergente': return 'bg-rose-500';
      case 'Concluído': return 'bg-indigo-500';
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
      <section className="mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Cargas</h2>
            <p className="text-on-surface-variant mt-1 font-medium">Controle de entradas de cargas Intercompany.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10">
              <div className="relative flex-1 min-w-[200px]">
                <input 
                  type="text"
                  placeholder="Buscar Carga, Motorista, Fornecedor ou NF..."
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

        {/* Load Type Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedLoadType(null)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
              selectedLoadType === null 
                ? "bg-primary text-white border-primary shadow-md" 
                : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:border-primary/30"
            )}
          >
            Todos os Tipos
          </button>
          {loadTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedLoadType(type.name)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                selectedLoadType === type.name 
                  ? "shadow-md bg-opacity-100 text-white" 
                  : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:border-primary/30"
              )}
              style={{ 
                backgroundColor: selectedLoadType === type.name ? (type.color || '#3b82f6') : undefined,
                borderColor: selectedLoadType === type.name ? 'transparent' : undefined
              }}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: type.color || '#3b82f6' }}
              />
              {type.name}
            </button>
          ))}
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pendente', value: kpis.pendente, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
          { label: 'Enviado', value: kpis.enviado, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Truck },
          { label: 'Recebido', value: kpis.recebido, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
          { label: 'Divergente', value: kpis.divergente, color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle },
          { label: 'Concluído', value: kpis.concluido, color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Package },
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
              className="glass-card rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch relative"
            >
              {/* Load Type Visual Signal */}
              {receipt.load_type_color && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5 z-10" 
                  style={{ backgroundColor: receipt.load_type_color }}
                />
              )}
              <div className="flex-1 flex flex-col">
                {/* Status Bar at the Top */}
                <div className="px-6 pt-10 pb-6 bg-surface-container-low/30 border-b border-outline-variant/5 relative">
                  <div className="relative">
                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <motion.div 
                        className={cn("h-full transition-colors duration-500", getStatusBg(receipt.status))}
                        initial={false}
                        animate={{ 
                          width: receipt.status === 'Pendente' ? '0%' : 
                                 receipt.status === 'Enviado' ? '25%' : 
                                 receipt.status === 'Recebido' ? '50%' : 
                                 receipt.status === 'Divergente' ? '75%' : '100%' 
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
                              <motion.button 
                                onClick={() => setDetailsModal({ isOpen: true, receipt })}
                                layoutId={`truck-${receipt.id}`}
                                className={cn(
                                  "absolute -top-7 transition-all duration-500 z-10 p-1.5 rounded-full bg-surface shadow-md border border-outline-variant hover:scale-110 active:scale-95 group cursor-pointer", 
                                  getStatusColor(status)
                                )}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              >
                                <Truck className="w-5 h-5 fill-current" />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-outline-variant">
                                  Ver Histórico
                                </div>
                              </motion.button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline font-bold text-on-surface text-lg leading-tight">Carga #{receipt.load_id}</h4>
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
                        {receipt.load_type && (
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Filter className="w-3 h-3 opacity-40" />
                            <span className="text-sm font-bold flex items-center gap-2">
                              Tipo: 
                              <span 
                                className="px-2 py-0.5 rounded text-[10px] text-white font-black uppercase tracking-widest"
                                style={{ backgroundColor: receipt.load_type_color || '#3b82f6' }}
                              >
                                {receipt.load_type}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Building2 className="w-3 h-3 opacity-40" />
                          <span className="text-sm font-bold">{receipt.supplier_name}</span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-on-surface-variant/60">
                            <Clock className="w-3 h-3 opacity-40" />
                            <span className="text-[10px] font-bold">
                              Criado em: {new Date(receipt.created_at).toLocaleDateString('pt-BR')} {new Date(receipt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {receipt.updated_at && receipt.status !== 'Pendente' && (
                            <div className="flex items-center gap-2 text-primary/60">
                              <CheckCircle2 className="w-3 h-3 opacity-40" />
                              <span className="text-[10px] font-bold">
                                Status atualizado: {new Date(receipt.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {receipt.divergence_observation && (
                      <button 
                        onClick={() => setObservationModal({ isOpen: true, text: `DIVERGÊNCIA: ${receipt.divergence_observation}` })}
                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors"
                        title="Ver Divergência"
                      >
                        <AlertCircle className="w-5 h-5" />
                      </button>
                    )}
                    {receipt.divergence_photo_url && (
                      <a 
                        href={receipt.divergence_photo_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors"
                        title="Ver Foto da Divergência"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </a>
                    )}
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
                    {STATUS_OPTIONS.map((status) => {
                      const targetIdx = getStatusIndex(status);
                      const currentIdx = getStatusIndex(receipt.status);
                      const isRetroceding = targetIdx < currentIdx;
                      
                      let isDisabled = !isSuperAdmin;
                      
                      if (isSuperAdmin) {
                        isDisabled = false;
                      } else if (userCategory === 'Recebimento') {
                        // Regra nova: Divergente e Concluído só se o atual for Recebido
                        if ((status === 'Divergente' || status === 'Concluído')) {
                          isDisabled = receipt.status !== 'Recebido';
                        } else if (isRetroceding) {
                          const lastUpdate = receipt.status_history?.[receipt.status];
                          isDisabled = lastUpdate?.by_id !== currentUserId;
                        } else {
                          // Bloqueia ir para estágios avançados se não for via Recebido p/ Divergente/Concluído
                          // Ex: Não pode pular de Enviado direto para Divergente
                          if (currentIdx < getStatusIndex('Recebido') && targetIdx > getStatusIndex('Recebido')) {
                            isDisabled = true;
                          } else {
                            isDisabled = false;
                          }
                        }
                      } else {
                        // Original rules for others
                        isDisabled = (receipt.status === 'Enviado' || receipt.status === 'Recebido' || receipt.status === 'Divergente' || receipt.status === 'Concluído') ||
                                     (receipt.status === 'Pendente' && receipt.author_id !== currentUserId);
                      }
                      
                      return (
                        <button
                          key={status}
                          disabled={isDisabled}
                          onClick={() => updateStatus(receipt.id, status)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                            receipt.status === status 
                              ? cn(getStatusBg(status), "text-white shadow-md shadow-on-surface/10") 
                              : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {status}
                        </button>
                      );
                    })}
                    {canEditReceipt(receipt) && (
                      <button 
                        onClick={() => handleOpenModal(receipt)}
                        className="p-2 hover:bg-surface-container-high text-primary rounded-xl transition-colors ml-2"
                        title="Editar Carga"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, id: receipt.id })}
                        className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl transition-colors"
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
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Motorista *</label>
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
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Adicionar Notas Fiscais *</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Fornecedor *</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Tipo de Carga *</label>
                  <div className="flex gap-2">
                    <select 
                      required
                      className="flex-1 bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer" 
                      value={formData.load_type}
                      onChange={(e) => {
                        const selectedType = loadTypes.find(lt => lt.name === e.target.value);
                        setFormData({ 
                          ...formData, 
                          load_type: e.target.value,
                          load_type_color: selectedType?.color || '#3b82f6'
                        });
                      }}
                    >
                      <option value="" disabled>Selecione o tipo de carga</option>
                      {loadTypes.map(lt => (
                        <option key={lt.id} value={lt.name}>{lt.name}</option>
                      ))}
                    </select>
                    {isSuperAdmin && (
                      <button 
                        type="button"
                        onClick={() => setIsLoadTypeModalOpen(true)}
                        className="w-12 h-12 flex items-center justify-center bg-surface-container-high text-primary rounded-2xl border border-outline-variant/10 hover:bg-primary/10 transition-colors"
                        title="Adicionar Novo Tipo de Carga"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
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

      {/* New Load Type Modal */}
      <AnimatePresence>
        {isLoadTypeModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-outline-variant/10 relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Novo Tipo de Carga</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Nome do Tipo</label>
                  <input 
                    type="text"
                    value={newLoadType}
                    onChange={(e) => setNewLoadType(e.target.value)}
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                    placeholder="Ex: Refugo, Devolução..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Cor de Sinalização</label>
                  <div className="flex flex-wrap gap-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLoadTypeColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newLoadTypeColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color"
                      value={newLoadTypeColor}
                      onChange={(e) => setNewLoadTypeColor(e.target.value)}
                      className="w-8 h-8 rounded-full overflow-hidden border-0 p-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsLoadTypeModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveLoadType}
                    disabled={savingLoadType || !newLoadType.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {savingLoadType ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes (Histórico) */}
      <AnimatePresence>
        {detailsModal.isOpen && detailsModal.receipt && (
          <div 
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailsModal({ isOpen: false, receipt: null })}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface-container-high w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-outline-variant"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-on-surface uppercase tracking-tight">Histórico da Carga</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase">ID: {detailsModal.receipt.load_id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailsModal({ isOpen: false, receipt: null })}
                  className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8">
                <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/30">
                  {STATUS_OPTIONS.map((status) => {
                    const history = detailsModal.receipt?.status_history?.[status];
                    const isReached = !!history;
                    
                    return (
                      <div key={status} className="relative flex gap-6 items-start group">
                        <div className={cn(
                          "z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-sm",
                          isReached 
                            ? cn("border-transparent text-white", getStatusBg(status))
                            : "bg-surface border-outline-variant text-outline-variant"
                        )}>
                          {isReached ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                        </div>
                        
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={cn(
                              "text-sm font-black uppercase tracking-tight",
                              isReached ? getStatusColor(status) : "text-on-surface-variant/40"
                            )}>
                              {status}
                            </h4>
                            {isReached && (
                              <span className="text-[10px] font-bold text-on-surface-variant/50 bg-surface-container-highest px-2 py-0.5 rounded-full">
                                Concluído
                              </span>
                            )}
                          </div>
                          
                          {isReached ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-on-surface">
                                Atualizado por: <span className="text-primary">{history.by}</span>
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-on-surface-variant/60">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(history.at).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-on-surface-variant/30 italic">Aguardando esta etapa...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 px-8 bg-surface-container-highest/20 border-t border-outline-variant/30">
                <button 
                  onClick={() => setDetailsModal({ isOpen: false, receipt: null })}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  FECHAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Divergência */}
      <AnimatePresence>
        {divergenceModal.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container-high w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-outline-variant"
            >
              <div className="p-6 border-b border-outline-variant/30 bg-rose-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-headline font-bold text-on-surface">Registrar Divergência</h3>
                </div>
                <button onClick={() => setDivergenceModal({ ...divergenceModal, isOpen: false })}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Observação da Divergência *</label>
                  <textarea 
                    required
                    value={divergenceModal.observation}
                    onChange={(e) => setDivergenceModal({ ...divergenceModal, observation: e.target.value })}
                    className="w-full bg-surface-container-highest/30 border border-outline-variant/20 rounded-2xl p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
                    placeholder="Descreva detalhadamente a divergência encontrada..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Foto da Divergência (Opcional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleDivergencePhotoUpload}
                        disabled={uploadingDivergence}
                      />
                      {uploadingDivergence ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                      <span className="text-sm font-bold">
                        {uploadingDivergence ? 'Enviando...' : divergenceModal.photoUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                      </span>
                    </label>
                    {divergenceModal.photoUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/20 relative group">
                        <img src={divergenceModal.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setDivergenceModal(prev => ({ ...prev, photoUrl: '' }))}
                          className="absolute inset-0 bg-error/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setDivergenceModal({ ...divergenceModal, isOpen: false })}
                    className="flex-1 py-4 rounded-2xl bg-surface-container-highest text-on-surface font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDivergenceSubmit}
                    disabled={saving || !divergenceModal.observation.trim()}
                    className="flex-[2] py-4 rounded-2xl bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-500/20 disabled:opacity-50"
                  >
                    {saving ? 'Registrando...' : 'Confirmar Divergência'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
