'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeftRight, 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Calendar,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  Ban,
  Printer,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { sendGoogleChatNotification } from '@/lib/notifications';

interface TransferItem {
  code: string;
  description: string;
  quantity: number;
  transferred_quantity?: number;
  location?: string;
  checked?: boolean;
}

interface Transfer {
  id: string;
  transfer_number: string;
  date: string;
  origin: string;
  destination: string;
  carrier?: string;
  status: 'Pendente' | 'Conferida' | 'Cancelada';
  items: TransferItem[];
  pdf_url?: string;
  created_at: any;
  updated_at: any;
  created_by_name?: string;
  conferred_by_name?: string;
  conferred_at?: any;
}

export function TransfersView({ 
  isAdmin, 
  userCategory 
}: { 
  isAdmin?: boolean; 
  userCategory?: string;
}) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  
  // Creation form state
  const [newTransfer, setNewTransfer] = useState<{
    transfer_number: string;
    date: string;
    origin: string;
    destination: string;
    carrier: string;
    items: TransferItem[];
  }>({
    transfer_number: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    destination: '',
    carrier: '',
    items: []
  });

  // Manual item input state
  const [manualItem, setManualItem] = useState<{
    code: string;
    description: string;
    quantity: number;
    location: string;
  }>({
    code: '',
    description: '',
    quantity: 1,
    location: ''
  });

  // UI feedback states
  const [filterText, setFilterText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationItems, setVerificationItems] = useState<TransferItem[]>([]);

  // Fetch transfers on mount
  useEffect(() => {
    const q = query(collection(db, 'transfers'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Transfer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({ id: docSnap.id, ...data } as Transfer);
      });
      setTransfers(list);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao escutar transferências:", err);
      handleFirestoreError(err, OperationType.GET, 'transfers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    const text = filterText.toLowerCase().trim();
    if (!text) return transfers;
    return transfers.filter(t => 
      t.transfer_number.toLowerCase().includes(text) ||
      t.origin.toLowerCase().includes(text) ||
      t.destination.toLowerCase().includes(text) ||
      (t.carrier && t.carrier.toLowerCase().includes(text)) ||
      t.items.some(item => item.description.toLowerCase().includes(text) || item.code.toLowerCase().includes(text))
    );
  }, [transfers, filterText]);

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Handle PDF Parsing via Gemini
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF de transferência.');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setError(null);
    setProcessingStatus('Enviando PDF ao Gemini para extrair os dados da transferência...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const response = await fetch('/api/gemini/parse-transfer-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64String })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Erro ao comunicar com o parsing de PDF.');
          }

          const resData = await response.json();
          const parsed = JSON.parse(resData.text);

          setNewTransfer({
            transfer_number: parsed.transfer_number || '',
            date: parsed.date || new Date().toISOString().split('T')[0],
            origin: parsed.origin || '',
            destination: parsed.destination || '',
            carrier: parsed.carrier || '',
            items: (parsed.items || []).map((item: any) => ({
              code: item.code || '',
              description: item.description || '',
              quantity: Number(item.quantity) || 0,
              transferred_quantity: 0,
              location: item.location || ''
            }))
          });

          setSuccess('Dados extraídos com sucesso! Por favor, revise e confirme os itens abaixo.');
          setIsProcessing(false);
          setProcessingStatus(null);
        } catch (innerErr: any) {
          console.error(innerErr);
          setError(innerErr.message || 'Erro ao processar PDF com a inteligência artificial.');
          setIsProcessing(false);
          setProcessingStatus(null);
        }
      };
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar o arquivo PDF.');
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Add item manually to form
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItem.description.trim()) {
      setError('A descrição do produto é obrigatória.');
      return;
    }
    if (manualItem.quantity <= 0) {
      setError('A quantidade deve ser maior que 0.');
      return;
    }

    const newItem: TransferItem = {
      code: manualItem.code.toUpperCase().trim(),
      description: manualItem.description.trim(),
      quantity: manualItem.quantity,
      transferred_quantity: 0,
      location: manualItem.location.trim()
    };

    setNewTransfer(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset manual item form
    setManualItem({
      code: '',
      description: '',
      quantity: 1,
      location: ''
    });
    setError(null);
  };

  // Remove item from creation list
  const handleRemoveItem = (index: number) => {
    setNewTransfer(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  // Save Transfer to Firestore
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { transfer_number, date, origin, destination, items } = newTransfer;

    if (!transfer_number.trim()) {
      setError('O número da transferência é obrigatório.');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setError('Os locais de origem e destino são obrigatórios.');
      return;
    }
    if (items.length === 0) {
      setError('É necessário adicionar ao menos um item na transferência.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Salvando transferência no banco de dados...');

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const transferDoc = {
        transfer_number: transfer_number.trim(),
        date,
        origin: origin.trim(),
        destination: destination.trim(),
        carrier: newTransfer.carrier.trim() || 'Não especificado',
        status: 'Pendente',
        items: items.map(it => ({
          ...it,
          transferred_quantity: 0,
          checked: false
        })),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by_name: currentUserName
      };

      const docRef = await addDoc(collection(db, 'transfers'), transferDoc);

      // Trigger Push Notification to Google Chat Webhook
      const chatMessage = `🔄 *Nova Transferência Registrada*\n\n` +
        `*Documento:* #${transferDoc.transfer_number}\n` +
        `*Origem:* ${transferDoc.origin}\n` +
        `*Destino:* ${transferDoc.destination}\n` +
        `*Responsável:* ${transferDoc.carrier}\n` +
        `*Cadastrado por:* ${currentUserName}\n` +
        `*Itens:* ${transferDoc.items.length} produtos\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      // Dispatch Browser Local Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nova Transferência', {
          body: `Transferência #${transferDoc.transfer_number} enviada de ${transferDoc.origin} para ${transferDoc.destination}`,
          icon: '/app-logo.png'
        });
      }

      setSuccess('Transferência registrada com sucesso e notificações enviadas!');
      setIsModalOpen(false);
      setSelectedFile(null);
      setNewTransfer({
        transfer_number: '',
        date: new Date().toISOString().split('T')[0],
        origin: '',
        destination: '',
        carrier: '',
        items: []
      });
    } catch (err: any) {
      console.error(err);
      const detailedError = err.message || String(err);
      setError(`Erro ao salvar transferência no Firestore: ${detailedError}`);
      handleFirestoreError(err, OperationType.CREATE, 'transfers');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Open Details Modal
  const handleOpenDetail = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setVerificationItems(JSON.parse(JSON.stringify(transfer.items))); // Deep clone items for editing/conferring
    setIsVerifying(false);
    setIsDetailOpen(true);
  };

  // Toggle checklist for item in verification
  const handleToggleItemCheck = (index: number) => {
    const updated = [...verificationItems];
    const item = updated[index];
    item.checked = !item.checked;
    
    // Automatically fill fully transferred if checked, or clear it if unchecked
    if (item.checked) {
      item.transferred_quantity = item.quantity;
    } else {
      item.transferred_quantity = 0;
    }
    setVerificationItems(updated);
  };

  // Handle specific manual transferred quantity change
  const handleTransferredQtyChange = (index: number, val: number) => {
    const updated = [...verificationItems];
    const item = updated[index];
    const qty = Math.max(0, val);
    item.transferred_quantity = qty;
    
    // Auto toggle check if transferred qty equals planned quantity
    item.checked = qty >= item.quantity;
    setVerificationItems(updated);
  };

  // Complete Transfer Verification Workflow
  const handleCompleteVerification = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const updatedTransfer = {
        ...selectedTransfer,
        status: 'Conferida' as const,
        items: verificationItems,
        updated_at: serverTimestamp(),
        conferred_by_name: currentUserName,
        conferred_at: serverTimestamp()
      };

      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        status: 'Conferida',
        items: verificationItems,
        updated_at: serverTimestamp(),
        conferred_by_name: currentUserName,
        conferred_at: serverTimestamp()
      });

      // Send update chat notification
      const chatMessage = `✅ *Transferência Conferida e Finalizada*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Conferido por:* ${currentUserName}\n` +
        `*Resultado:* Itens conferidos no estoque de destino!\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess('Conferência finalizada com sucesso e atualizada no sistema!');
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar conferência no banco de dados.');
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Transfer
  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        status: 'Cancelada',
        updated_at: serverTimestamp()
      });

      // Send update chat notification
      const chatMessage = `🚫 *Transferência Cancelada*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess('Transferência cancelada com sucesso.');
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao cancelar a transferência.');
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Print using the System's standard #print-area mechanism
  const handlePrint = () => {
    if (!selectedTransfer) return;
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" id="transfers-container">
      {/* Dynamic Style Injection for Print - No-Omission Rule Guarantee */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 1.5cm !important;
            box-sizing: border-box !important;
          }
        }
      `}} />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Painel de Transferências</h2>
          <p className="text-sm text-on-surface-variant">Gerencie transferências de estoque entre depósitos, revise itens e registre conferências de entrada.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all text-sm cursor-pointer"
        >
          <Plus size={20} />
          Nova Transferência
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3 text-error"
          >
            <AlertCircle className="shrink-0" size={20} />
            <span className="text-sm font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 rounded-lg hover:bg-error/10">
              <X size={16} />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-success/10 border border-success/20 flex items-center gap-3 text-success animate-pulse-once"
          >
            <CheckCircle2 className="shrink-0" size={20} />
            <span className="text-sm font-semibold">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto p-1 rounded-lg hover:bg-success/10">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por número da transferência, depósito, transportadora ou produtos..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/15 rounded-2xl text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>
      </div>

      {/* Grid of Transfers */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p className="text-sm font-medium text-on-surface-variant">Carregando transferências...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/20 p-8">
          <ArrowLeftRight size={48} className="text-on-surface-variant/45 mb-4" />
          <h3 className="text-base font-bold text-on-surface">Nenhuma transferência encontrada</h3>
          <p className="text-sm text-on-surface-variant max-w-md mt-1">Nenhuma transferência de estoque foi localizada. Crie uma nova transferência manualmente ou envie um arquivo PDF para carregar automaticamente.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTransfers.map((t) => {
            const pending = t.status === 'Pendente';
            const conferred = t.status === 'Conferida';
            const cancelled = t.status === 'Cancelada';

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-5 rounded-3xl border flex flex-col justify-between transition-all bg-surface hover:shadow-md cursor-pointer",
                  conferred ? "border-success/25 hover:border-success/40" : 
                  cancelled ? "border-outline-variant/20 bg-surface-container-lowest" : "border-outline-variant/20 hover:border-primary/30"
                )}
                onClick={() => handleOpenDetail(t)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-bold text-sm text-primary">#{t.transfer_number}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide",
                      conferred ? "bg-success/12 text-success" : 
                      cancelled ? "bg-outline-variant/15 text-on-surface-variant/80" : "bg-warning/12 text-warning"
                    )}>
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
                    <Calendar size={14} />
                    <span>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0" />
                      <div className="text-xs">
                        <span className="text-on-surface-variant block font-medium">Origem</span>
                        <span className="font-bold text-on-surface">{t.origin}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-tertiary shrink-0" />
                      <div className="text-xs">
                        <span className="text-on-surface-variant block font-medium">Destino</span>
                        <span className="font-bold text-on-surface">{t.destination}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Package size={14} />
                    <span className="font-semibold">{t.items.length} {t.items.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span>Ver Detalhes</span>
                    <Eye size={14} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface w-full max-w-2xl rounded-3xl shadow-xl border border-outline-variant/10 overflow-hidden flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="text-primary" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Nova Transferência</h3>
                    <p className="text-xs text-on-surface-variant">Carregue por PDF para preenchimento rápido ou insira manualmente.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Scroll Area */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* PDF Drag / Drop area */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-on-surface uppercase tracking-wider">Passo 1: Carregar PDF de Transferência (Opcional)</span>
                  <div className="relative border border-dashed border-primary/20 rounded-2xl bg-primary/5 p-6 text-center hover:bg-primary/8 transition-colors">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="text-primary" size={28} />
                      <span className="text-sm font-bold text-primary">Selecione ou Arraste o arquivo PDF aqui</span>
                      <span className="text-xs text-on-surface-variant">Gemini lerá o número, depósitos e itens para você</span>
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-surface-container-high border border-outline-variant/10 rounded-xl flex items-center gap-2.5">
                      <FileText size={18} className="text-primary" />
                      <span className="text-xs font-bold text-on-surface truncate flex-1">{selectedFile.name}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">PDF</span>
                    </div>
                  )}
                  {isProcessing && (
                    <div className="flex items-center gap-2.5 p-3 bg-primary/5 text-primary border border-primary/10 rounded-xl">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-xs font-semibold">{processingStatus}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-outline-variant/10" />

                {/* Form Inputs */}
                <form onSubmit={handleSaveTransfer} className="space-y-5">
                  <span className="block text-xs font-bold text-on-surface uppercase tracking-wider">Passo 2: Dados Principais da Transferência</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Número do Documento</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: TR-2026-987"
                        value={newTransfer.transfer_number}
                        onChange={(e) => setNewTransfer({...newTransfer, transfer_number: e.target.value})}
                        className="w-full px-3 py-2.5 bg-surface border border-outline-variant/15 rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Data da Transferência</label>
                      <input 
                        type="date" 
                        required
                        value={newTransfer.date}
                        onChange={(e) => setNewTransfer({...newTransfer, date: e.target.value})}
                        className="w-full px-3 py-2.5 bg-surface border border-outline-variant/15 rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Depósito de Origem</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Almoxarifado Matriz"
                        value={newTransfer.origin}
                        onChange={(e) => setNewTransfer({...newTransfer, origin: e.target.value})}
                        className="w-full px-3 py-2.5 bg-surface border border-outline-variant/15 rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Depósito de Destino</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Bemplas"
                        value={newTransfer.destination}
                        onChange={(e) => setNewTransfer({...newTransfer, destination: e.target.value})}
                        className="w-full px-3 py-2.5 bg-surface border border-outline-variant/15 rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Transportador / Motorista / Responsável</label>
                      <input 
                        type="text" 
                        placeholder="Ex: João da Silva (Placa ABC-1234)"
                        value={newTransfer.carrier}
                        onChange={(e) => setNewTransfer({...newTransfer, carrier: e.target.value})}
                        className="w-full px-3 py-2.5 bg-surface border border-outline-variant/15 rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>
                </form>

                <div className="h-px bg-outline-variant/10" />

                {/* Items addition manually */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-on-surface uppercase tracking-wider">Passo 3: Adicionar Produtos</span>
                  
                  <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">Cód. Produto</label>
                        <input 
                          type="text" 
                          placeholder="Ex: P1020"
                          value={manualItem.code}
                          onChange={(e) => setManualItem({...manualItem, code: e.target.value})}
                          className="w-full px-2.5 py-2 bg-surface border border-outline-variant/15 rounded-lg text-xs uppercase text-on-surface"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">Descrição / Produto</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Ventilador de Coluna 40cm"
                          value={manualItem.description}
                          onChange={(e) => setManualItem({...manualItem, description: e.target.value})}
                          className="w-full px-2.5 py-2 bg-surface border border-outline-variant/15 rounded-lg text-xs text-on-surface"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">Qtd. Solicitada</label>
                        <input 
                          type="number" 
                          min={1}
                          value={manualItem.quantity}
                          onChange={(e) => setManualItem({...manualItem, quantity: Number(e.target.value)})}
                          className="w-full px-2.5 py-2 bg-surface border border-outline-variant/15 rounded-lg text-xs text-on-surface"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">Endereço / Localização (Opcional)</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Rua 4, Prateleira B"
                          value={manualItem.location}
                          onChange={(e) => setManualItem({...manualItem, location: e.target.value})}
                          className="w-full px-2.5 py-2 bg-surface border border-outline-variant/15 rounded-lg text-xs text-on-surface"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddManualItem}
                      className="w-full py-2 bg-primary/10 text-primary font-bold hover:bg-primary/15 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus size={16} />
                      Adicionar Produto à Lista
                    </button>
                  </div>
                </div>

                {/* Items Preview List */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-on-surface-variant">Produtos na Transferência ({newTransfer.items.length})</span>
                  {newTransfer.items.length === 0 ? (
                    <div className="p-6 bg-surface-container-low text-center rounded-2xl border border-dashed border-outline-variant/20 text-xs text-on-surface-variant">
                      Nenhum produto adicionado à transferência ainda.
                    </div>
                  ) : (
                    <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                      {newTransfer.items.map((it, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-container-lowest transition-colors text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {it.code && <span className="font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface-variant">{it.code}</span>}
                              <span className="font-bold text-on-surface truncate block">{it.description}</span>
                            </div>
                            {it.location && <span className="text-[10px] text-on-surface-variant">Loc: {it.location}</span>}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-on-surface text-sm">{it.quantity} un</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-error/70 hover:text-error hover:bg-error/10 p-1 rounded-lg"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={newTransfer.items.length === 0 || isProcessing}
                  onClick={handleSaveTransfer}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Registrar Transferência
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details & Verification Drawer */}
      <AnimatePresence>
        {isDetailOpen && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}>
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-surface w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="text-primary" size={24} />
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Transferência #{selectedTransfer.transfer_number}</h3>
                    <p className="text-xs text-on-surface-variant">Detalhes e conferência física de entrada</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Status and info */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low border border-outline-variant/10 rounded-2xl">
                  <div className="space-y-1 text-xs">
                    <span className="text-on-surface-variant block">Status Atual</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide",
                      selectedTransfer.status === 'Conferida' ? "bg-success/12 text-success" : 
                      selectedTransfer.status === 'Cancelada' ? "bg-outline-variant/15 text-on-surface-variant/80" : "bg-warning/12 text-warning"
                    )}>
                      {selectedTransfer.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-right">
                    <span className="text-on-surface-variant block">Data do Envio</span>
                    <span className="font-bold text-on-surface">{new Date(selectedTransfer.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Warehouse Route */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rota de Logística</span>
                  <div className="grid grid-cols-2 gap-4 p-4 border border-outline-variant/10 rounded-2xl bg-surface">
                    <div className="border-r border-outline-variant/10 pr-3">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Origem</span>
                      <span className="text-xs font-bold text-on-surface mt-1 block">{selectedTransfer.origin}</span>
                    </div>
                    <div className="pl-3">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Destino</span>
                      <span className="text-xs font-bold text-on-surface mt-1 block">{selectedTransfer.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Carrier details */}
                <div className="space-y-2 text-xs">
                  <div className="p-4 border border-outline-variant/10 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <User size={15} />
                      <span className="font-semibold">Responsável:</span>
                      <span className="font-bold text-on-surface">{selectedTransfer.carrier || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Clock size={15} />
                      <span className="font-semibold">Criado por:</span>
                      <span className="font-bold text-on-surface">{selectedTransfer.created_by_name || 'Sistema'}</span>
                    </div>
                    {selectedTransfer.conferred_by_name && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={15} />
                        <span className="font-semibold">Conferido por:</span>
                        <span className="font-bold">{selectedTransfer.conferred_by_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification/Items Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lista de Produtos ({selectedTransfer.items.length})</span>
                    {selectedTransfer.status === 'Pendente' && !isVerifying && (
                      <button 
                        onClick={() => setIsVerifying(true)}
                        className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-primary/15"
                      >
                        <Check size={14} />
                        Iniciar Conferência
                      </button>
                    )}
                  </div>

                  {/* Standard Display Items List */}
                  {!isVerifying ? (
                    <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                      {selectedTransfer.items.map((it, idx) => {
                        const verifiedOk = selectedTransfer.status === 'Conferida' && it.transferred_quantity === it.quantity;
                        const verifiedDivergent = selectedTransfer.status === 'Conferida' && it.transferred_quantity !== it.quantity;

                        return (
                          <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {it.code && <span className="font-mono bg-surface-container-high px-1 rounded text-[9px] font-bold text-on-surface-variant">{it.code}</span>}
                                <span className="font-bold text-on-surface truncate">{it.description}</span>
                              </div>
                              {it.location && <span className="text-[10px] text-on-surface-variant mt-0.5 block">Loc: {it.location}</span>}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-on-surface font-mono">
                                {selectedTransfer.status === 'Conferida' ? (
                                  <span className={cn(verifiedDivergent ? "text-error" : "text-success")}>
                                    {it.transferred_quantity} / {it.quantity} un
                                  </span>
                                ) : (
                                  <span>{it.quantity} un</span>
                                )}
                              </div>
                              {verifiedDivergent && (
                                <span className="text-[9px] text-error font-semibold uppercase">Divergência</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Verification Mode Interactive List */
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/5 text-primary rounded-xl text-[11px] font-semibold flex items-center gap-2 border border-primary/10">
                        <AlertCircle size={15} />
                        Defina a quantidade de produtos conferidos fisicamente ou clique na caixa para atestar integralmente.
                      </div>
                      
                      <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                        {verificationItems.map((it, idx) => (
                          <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-lowest transition-colors text-xs">
                            <div className="min-w-0 flex-1 flex items-center gap-2.5">
                              {/* Custom Checkbox Toggle */}
                              <button 
                                type="button"
                                onClick={() => handleToggleItemCheck(idx)}
                                className={cn(
                                  "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                                  it.checked ? "bg-success border-success text-white" : "border-outline-variant/40 hover:border-primary/50"
                                )}
                              >
                                {it.checked && <Check size={14} />}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-on-surface truncate block">{it.description}</span>
                                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                                  {it.code && <span className="font-mono bg-surface-container-high px-1 rounded">{it.code}</span>}
                                  <span>Meta: {it.quantity} un</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Manual quantity input */}
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs font-semibold text-on-surface-variant">Recebido:</span>
                              <input 
                                type="number" 
                                min={0}
                                max={it.quantity * 2} // Allow extra/divergent receipt if physically loaded
                                value={it.transferred_quantity}
                                onChange={(e) => handleTransferredQtyChange(idx, Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-surface border border-outline-variant/20 rounded-lg text-center font-mono font-bold text-on-surface text-xs focus:outline-none focus:border-primary"
                              />
                              <span className="font-mono text-[10px] text-on-surface-variant/70">un</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Printable sheet container wrapper inside dynamic view (hidden from view, shown on print via @media) */}
              <div id="print-area" className="hidden p-8" style={{ fontFamily: 'monospace' }}>
                <div style={{ borderBottom: '2px double black', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>ALMOXARIFADO VENTISOL</h1>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>DOCUMENTO DE TRANSFERÊNCIA DE ESTOQUE</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '12px' }}>
                  <div>
                    <p><strong>Número:</strong> #{selectedTransfer.transfer_number}</p>
                    <p><strong>Origem:</strong> {selectedTransfer.origin}</p>
                    <p><strong>Destino:</strong> {selectedTransfer.destination}</p>
                  </div>
                  <div>
                    <p><strong>Data:</strong> {new Date(selectedTransfer.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    <p><strong>Responsável:</strong> {selectedTransfer.carrier || 'Não informado'}</p>
                    <p><strong>Status:</strong> {selectedTransfer.status}</p>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid black', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0' }}>Código</th>
                      <th style={{ padding: '6px 0' }}>Descrição / Produto</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Qtd. Solicitada</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Qtd. Conferida</th>
                      <th style={{ padding: '6px 0' }}>Localização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                        <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{it.code || '-'}</td>
                        <td style={{ padding: '8px 0' }}>{it.description}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{it.quantity}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{selectedTransfer.status === 'Conferida' ? it.transferred_quantity : '______'}</td>
                        <td style={{ padding: '8px 0' }}>{it.location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ borderTop: '1px solid black', paddingTop: '8px' }}>
                    <p>Assinatura Expedição (Origem)</p>
                    <p style={{ fontSize: '9px', color: '#666' }}>Data: ___/___/______</p>
                  </div>
                  <div style={{ borderTop: '1px solid black', paddingTop: '8px' }}>
                    <p>Assinatura Recebimento (Destino)</p>
                    <p style={{ fontSize: '9px', color: '#666' }}>Data: ___/___/______</p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest space-y-3">
                {isVerifying ? (
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsVerifying(false)}
                      className="flex-1 py-2.5 bg-surface border border-outline-variant/20 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-all"
                    >
                      Voltar ao Detalhe
                    </button>
                    <button 
                      type="button"
                      onClick={handleCompleteVerification}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-success text-white rounded-xl font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Finalizar Conferência
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handlePrint}
                        className="flex-1 py-2.5 bg-surface-container-high hover:bg-outline-variant/15 border border-outline-variant/15 text-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Printer size={15} />
                        Imprimir Ficha
                      </button>
                      
                      {selectedTransfer.status === 'Pendente' && (
                        <button 
                          onClick={handleCancelTransfer}
                          disabled={isProcessing}
                          className="flex-1 py-2.5 bg-error/10 hover:bg-error/15 border border-error/20 text-error font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Ban size={15} />
                          Cancelar TR
                        </button>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => setIsDetailOpen(false)}
                      className="w-full py-2 text-center text-xs text-on-surface-variant font-bold hover:underline"
                    >
                      Fechar Painel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
