'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
  Building2,
  Trash2,
  Eye,
  ArrowLeft,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number; // Quantidade original do PDF
  quantity: number;         // Quantidade editada (separada)
  unitPrice?: number;
  totalPrice?: number;
  collector_name?: string;
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
  type?: string;
  sequence?: number | null;
}

export function PurchaseOrdersView({ isAdmin, isSuperAdmin }: { isAdmin?: boolean, isSuperAdmin?: boolean }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orderSequence, setOrderSequence] = useState<string>('');
  
  const [extractedData, setExtractedData] = useState<Partial<PurchaseOrder> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('sequence', { ascending: true, nullsFirst: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave API Gemini não configurada nas variáveis de ambiente da Vercel.');
      }

      const base64 = await fileToBase64(file);
      const base64Data = base64.split(',')[1];

      const ai = new GoogleGenAI({ apiKey });
      
      // Lógica de tentativa automática para lidar com 503 (Serviço Indisponível)
      const maxRetries = 2;
      let lastError: any = null;
      let result: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Tentativa ${attempt + 1} de extração...`);
            // Pequena pausa antes de tentar novamente (1.5s, 3s)
            await new Promise(resolve => setTimeout(resolve, attempt * 1500));
          }

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data
                  }
                },
                {
                  text: "Extraia os dados deste documento (Pedido de Compra ou Separação de OP). Se for Separação de OP, use o número da OP como order_number. O layout tem colunas: 'Cód.', 'Produto', 'Nome Coletor', 'Quantidade' e 'Separad'. Extraia: order_number (string), date (string YYYY-MM-DD), supplier_name (string - coloque aqui o nome do PRODUTO principal da primeira tabela), product_location (string - localize a informação 'Local' na primeira tabela), total_amount (number - a quantidade total da primeira tabela), e items (array de objetos). REGRAS IMPORTANTES PARA ITENS: 1. Mapeie o valor da coluna 'Quantidade' fisicamente presente no PDF para o campo 'planned_quantity'. 2. O campo 'quantity' deve ser SEMPRE 0 (ele será preenchido pelo usuário depois). 3. Extraia o 'code', 'description' e 'collector_name' normalmente. Retorne APENAS o JSON."
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  order_number: { type: Type.STRING },
                  date: { type: Type.STRING },
                  supplier_name: { type: Type.STRING, description: "Nome do produto principal" },
                  product_location: { type: Type.STRING, description: "Local informado na primeira tabela" },
                  total_amount: { type: Type.NUMBER, description: "Quantidade total somada ou informada no cabeçalho" },
                  type: { type: Type.STRING, description: "Tipo do documento: Pedido ou Separação" },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        code: { type: Type.STRING },
                        description: { type: Type.STRING },
                        planned_quantity: { type: Type.NUMBER, description: "Valor da coluna 'Quantidade'" },
                        quantity: { type: Type.NUMBER, description: "Valor da coluna 'Separad'" },
                        collector_name: { type: Type.STRING },
                        unitPrice: { type: Type.NUMBER },
                        totalPrice: { type: Type.NUMBER }
                      },
                      required: ["description", "planned_quantity"]
                    }
                  }
                },
                required: ["order_number", "date", "supplier_name", "items"]
              }
            }
          });

          const text = response.text;
          if (!text) throw new Error("A IA não retornou conteúdo.");
          result = JSON.parse(text);
          break; // Sucesso, sai do loop de retries
        } catch (err: any) {
          lastError = err;
          // Se não for um erro de sobrecarga (503/429), não vale a pena tentar novamente
          if (!err.message?.includes('503') && !err.message?.includes('demand') && !err.message?.includes('429')) {
            break;
          }
        }
      }

      if (!result) {
        if (lastError?.message?.includes('503') || lastError?.message?.includes('demand')) {
          throw new Error('O serviço de IA está temporariamente sobrecarregado. Por favor, aguarde alguns segundos e tente importar novamente.');
        }
        throw lastError || new Error("Falha ao processar PDF.");
      }
      
      // Garantir que 'quantity' (Separad) comece zerado para conferência
      if (result.items) {
        result.items = result.items.map((item: any) => ({
          ...item,
          quantity: 0
        }));
      }
      
      setExtractedData(result);
    } catch (err: any) {
      console.error('Erro no processamento AI:', err);
      setError(err.message || 'Erro inesperado ao processar o PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleItemQuantityChange = (idx: number, newQty: number) => {
    if (!extractedData?.items) return;
    
    const newItems = [...extractedData.items];
    const item = { ...newItems[idx], quantity: newQty };
    
    // Update total price if unit price exists
    if (item.unitPrice) {
      item.totalPrice = item.unitPrice * newQty;
    }
    
    newItems[idx] = item;
    
    // Update overall total amount
    const newTotal = newItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
    
    setExtractedData(prev => ({
      ...prev,
      items: newItems,
      total_amount: newTotal > 0 ? newTotal : prev?.total_amount
    }));
  };

  const handleEditItemQuantity = (idx: number, newQty: number) => {
    setEditingOrder(prev => {
      if (!prev) return null;
      
      const updatedItems = [...(prev.items || [])];
      const item = { ...updatedItems[idx] };
      
      // Forçar conversão e garantir que zero seja tratado corretamente
      const qtyValue = isNaN(newQty) ? 0 : newQty;
      item.quantity = qtyValue;
      
      if (item.unitPrice) {
        item.totalPrice = Number(item.unitPrice) * qtyValue;
      }
      
      updatedItems[idx] = item;
      const newTotal = updatedItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
      
      return {
        ...prev,
        items: updatedItems,
        total_amount: newTotal > 0 ? newTotal : prev.total_amount
      };
    });
  };

  const updateOrder = async () => {
    if (!editingOrder?.id) {
      console.warn('Tentativa de salvar sem ID válido');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // Limpeza profunda dos itens para garantir que o JSONB seja puro
      const itemsToSave = editingOrder.items.map(item => ({
        code: String(item.code || ''),
        description: String(item.description || ''),
        planned_quantity: Number(item.planned_quantity) || 0,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
        collector_name: String(item.collector_name || '')
      }));

      const payload = {
        items: itemsToSave,
        total_amount: Number(editingOrder.total_amount) || 0,
        status: 'Processado'
      };

      console.log('Enviando atualização para o Supabase:', {
        id: editingOrder.id,
        payload
      });

      const { data, error: dbError, status, statusText } = await supabase
        .from('purchase_orders')
        .update(payload)
        .eq('id', editingOrder.id)
        .select();

      if (dbError) throw dbError;

      // Se der status 200/204 mas data vier vazio, pode ser RLS restringindo o SELECT após a mudança de status.
      // Nestes casos, consideramos o sucesso se o status do HTTP for de sucesso.
      const isSuccessStatus = status >= 200 && status < 300;
      
      if (!isSuccessStatus) {
        throw new Error(`O servidor respondeu com status ${status}: ${statusText}`);
      }
      
      if (!data || data.length === 0) {
        console.warn('O update parece ter funcionado (status OK), mas não retornou dados. Isso pode ser devido a políticas de RLS.');
        // Não jogamos erro aqui, apenas logamos o aviso e prosseguimos.
      } else {
        console.log('Update confirmado pelo banco:', data[0]);
      }

      await fetchOrders();
      setIsEditModalOpen(false);
      setEditingOrder(null);
      
      setSuccess('Conferência salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erro de persistência:', err);
      // Mostrar erro detalhado para ajudar no diagnóstico
      setError(`Falha ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveOrder = async () => {
    if (!extractedData || !selectedFile) return;

    setIsProcessing(true);
    setError(null);
    try {
      // 1. Verificação de duplicidade por número de OP
      const { data: existingOP, error: checkError } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('order_number', extractedData.order_number)
        .maybeSingle();

      if (checkError) throw checkError;
      
      if (existingOP) {
        throw new Error(`A OP #${extractedData.order_number} já foi importada anteriormente.`);
      }

      // 2. Upload PDF to Storage
      // Normalize filename to remove accents and special characters
      const normalizedName = selectedFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
        
      const fileName = `${Date.now()}_${normalizedName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('orders')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('orders')
        .getPublicUrl(fileName);

      // 2. Save to Database
      const finalItems = extractedData.items?.map(item => ({
        ...item,
        quantity: 0 // Incializa quantidades como vazias (zero) para edição posterior
      })) || [];

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { error: dbError } = await supabase.from('purchase_orders').insert([{
        ...extractedData,
        date: dateStr, // Salva yyyy-mm-dd local
        items: finalItems,
        pdf_url: publicUrl,
        status: 'Pendente',
        sequence: orderSequence ? parseInt(orderSequence) : null
      }]);

      if (dbError) throw dbError;

      fetchOrders();
      setIsModalOpen(false);
      setExtractedData(null);
      setSelectedFile(null);
      setOrderSequence('');
    } catch (err: any) {
      setError(`Erro ao salvar pedido: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteOrder = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
      fetchOrders();
      setOrderToDelete(null);
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      setError(`Erro ao excluir: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(filterText.toLowerCase()) ||
    o.supplier_name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
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

      {error && !isModalOpen && !isEditModalOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-error/10 text-error rounded-2xl flex items-center justify-between gap-3 border border-error/20"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-error/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">Importação de OPs por PDF</h2>
          <p className="text-on-surface-variant font-medium">Importação de PDFs com processamento inteligente.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
        >
          <Upload className="w-5 h-5" />
          Importar PDF
        </button>
      </div>

      <div className="bg-surface-container-low p-2 rounded-2xl mb-8 border border-outline-variant/10 flex items-center gap-3">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Buscar por número ou produto..."
            className="w-full bg-transparent text-sm p-3 pl-10 outline-none"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-bold text-on-surface-variant">Carregando pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Nenhuma OP importada</h3>
          <p className="text-on-surface-variant mt-2 max-w-sm text-sm">Use o botão de importação acima para carregar seus arquivos PDF de OP.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              className={cn(
                "bg-surface-container-lowest p-6 rounded-[32px] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col relative overflow-hidden",
                order.status === 'Baixada' ? 'opacity-80' : ''
              )}
              onClick={() => {
                setEditingOrder(order);
                setIsEditModalOpen(true);
              }}
            >
              {/* Badge de Sequência em Destaque */}
              <div className={cn(
                "absolute top-0 right-0 px-6 py-2 rounded-bl-[20px] font-black italic tracking-tighter text-base shadow-sm z-10",
                order.sequence 
                  ? "bg-amber-500 text-white shadow-amber-500/20" 
                  : "bg-surface-container-highest text-on-surface-variant/20"
              )}>
                {order.sequence ? `SEQ ${order.sequence}` : 'S/ SEQ'}
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex gap-2 pr-12" onClick={(e) => e.stopPropagation()}>
                  {order.status !== 'Baixada' && (
                    <button 
                      onClick={() => {
                        setEditingOrder(order);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
                      title="Editar Quantidades"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  )}
                  {order.pdf_url && (
                    <a 
                      href={order.pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  {(isAdmin && (order.status !== 'Baixada' || isSuperAdmin)) && (
                    <button 
                      onClick={() => setOrderToDelete(order.id)}
                      className="p-2 hover:bg-error/10 text-error rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Pedido</h4>
                  <p className="text-lg font-headline font-black text-on-surface">#{order.order_number}</p>
                  {order.product_location && (
                    <p className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md mt-1 inline-block">
                      Local: {order.product_location}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Data</h4>
                    <p className="text-sm font-bold text-on-surface flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 opacity-40" />
                       {(() => {
                         const [y, m, d] = order.date.split('T')[0].split('-').map(Number);
                         return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                       })()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Qtd Total</h4>
                    <p className="text-sm font-bold text-primary flex items-center gap-1">
                       <Package className="w-3.5 h-3.5" />
                       {order.total_amount}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">Produto / Material</h4>
                  <p className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 opacity-40" />
                    {order.supplier_name || 'Produto não identificado'}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    order.status === 'Processado' ? 'bg-emerald-500/10 text-emerald-500' : 
                    order.status === 'Baixada' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                    'bg-amber-500/10 text-amber-500'
                  )}>
                    {order.status === 'Baixada' ? 'OP Baixada' : order.status}
                  </span>
                  <span className="text-[9px] font-bold text-on-surface-variant opacity-40 italic">
                    {order.items.length} itens extraídos
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-black text-on-surface">Importar Documento</h3>
                    <p className="text-sm text-on-surface-variant">O Gemini AI extrairá os dados e o layout automaticamente.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {error && (
                  <div className="p-4 bg-error/10 text-error rounded-2xl flex items-center gap-3 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold leading-tight">{error}</p>
                  </div>
                )}

                {!extractedData ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-outline-variant/30 rounded-[32px] bg-surface-container-low transition-colors hover:bg-surface-container-high/50 cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                    />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-16 h-16 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="font-black text-on-surface">Processando PDF com IA...</p>
                          <p className="text-sm text-on-surface-variant">Geralmente leva cerca de 10-15 segundos.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
                          <Plus className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-on-surface mb-2">Selecione o arquivo PDF</h4>
                        <p className="text-on-surface-variant text-sm text-center px-8">Clique ou arraste o arquivo do pedido padrão aqui para começar a extração inteligente.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Data Card (Simulated Layout) */}
                    <div className="bg-surface-container-high/30 p-8 rounded-[32px] border border-outline-variant/10 shadow-inner">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Separação de OP</p>
                          <h4 className="text-4xl font-headline font-black text-on-surface">#{extractedData.order_number}</h4>
                          {extractedData.product_location && (
                            <p className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mt-2 inline-block">
                              Local: {extractedData.product_location}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Status Previsão</p>
                          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Extraído com Sucesso</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">Produto Principal</p>
                          <p className="font-bold text-on-surface leading-tight text-lg">{extractedData.supplier_name || 'Não identificado'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">Data da OP</p>
                          <p className="font-bold text-on-surface text-lg">
                            {extractedData.date ? new Date(extractedData.date).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Itens da OP</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {extractedData.items?.map((item, idx) => (
                            <div key={idx} className="flex flex-col p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant text-xs font-black shrink-0">
                                  {item.planned_quantity || 0}
                                </div>
                                <div className="text-right">
                                  {item.collector_name ? (
                                    <p className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md inline-block">
                                      {item.collector_name}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-on-surface line-clamp-2 leading-tight">{item.description}</p>
                                {item.code && <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mt-1">Cód: {item.code}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t-2 border-dashed border-outline-variant/20 flex justify-between items-center">
                        <p className="text-lg font-black text-on-surface">Total Extraído</p>
                        <p className="text-3xl font-headline font-black text-primary flex items-center gap-1">
                          <Package className="w-6 h-6 shrink-0" />
                          {extractedData.total_amount}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 flex-1">
                        <h4 className="text-lg font-bold text-on-surface mb-4">Dados Adicionais</h4>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 ml-1">Sequência de Separação</label>
                            <div className="relative">
                              <input 
                                type="number"
                                value={orderSequence}
                                onChange={(e) => setOrderSequence(e.target.value)}
                                placeholder="Digite o número da sequência..."
                                name="sequence"
                                id="sequence-input"
                                className="w-full bg-surface-container-highest border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">
                                <Package className="w-5 h-5" />
                              </div>
                            </div>
                            <p className="text-[10px] text-amber-600 font-bold mt-1 ml-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Campo obrigatório para liberar a separação.
                            </p>
                          </div>

                          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-on-surface truncate">{selectedFile?.name}</p>
                              <p className="text-xs text-on-surface-variant">{((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB • PDF</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-6 leading-relaxed">
                          Os dados acima foram extraídos utilizando visão computacional. Verifique os valores antes de salvar para garantir a precisão.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => {
                            setExtractedData(null);
                            setOrderSequence('');
                          }}
                          className="w-full bg-surface-container-high text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container-highest transition-all"
                        >
                          Tentar outro arquivo
                        </button>
                        <button 
                          id="confirm-save-btn"
                          onClick={saveOrder}
                          disabled={isProcessing || !orderSequence}
                          className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                          Confirmar e Salvar Pedido
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
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
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-black text-on-surface">Ajustar Quantidades</h3>
                    <p className="text-sm text-on-surface-variant">Pedido #{editingOrder.order_number}</p>
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
                {/* Informações do Cabeçalho - Topo */}
                <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Produto</p>
                    <p className="font-bold text-on-surface flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      {editingOrder.supplier_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Data da OP</p>
                    <p className="font-bold text-on-surface flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {new Date(editingOrder.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Documento</p>
                    <p className="font-bold text-on-surface flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      #{editingOrder.order_number}
                    </p>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="bg-surface-container-high/30 overflow-hidden rounded-[32px] border border-outline-variant/10 shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Cód.</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Produto</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Nome Coletor</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Quantidade</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Separad</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {editingOrder.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant">
                              {item.code || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-on-surface truncate max-w-[200px]" title={item.description}>{item.description}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                                {item.collector_name || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-on-surface">
                              {item.planned_quantity || 0}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="number"
                                value={item.quantity || 0}
                                disabled={editingOrder.status === 'Baixada'}
                                onChange={(e) => handleEditItemQuantity(idx, Number(e.target.value))}
                                className="w-20 h-10 bg-surface-container-high rounded-xl text-on-surface text-center font-black outline-none focus:ring-2 focus:ring-primary/20 border-none mx-auto ring-1 ring-outline-variant/10 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-black",
                                ((item.planned_quantity || 0) - (item.quantity || 0)) === 0 
                                  ? "bg-emerald-500/10 text-emerald-500" 
                                  : "bg-error/10 text-error"
                              )}>
                                {(item.planned_quantity || 0) - (item.quantity || 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  {editingOrder.total_amount > 0 && (
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-black text-on-surface">Total Ajustado:</p>
                      <p className="text-3xl font-headline font-black text-primary flex items-center gap-1">
                        <Package className="w-6 h-6 shrink-0" />
                        {editingOrder.total_amount}
                      </p>
                    </div>
                  )}
                  
                  {editingOrder.status !== 'Baixada' ? (
                    <button 
                      onClick={updateOrder}
                      disabled={isProcessing}
                      className="w-full md:w-auto px-12 bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                      Salvar Alterações
                    </button>
                  ) : (
                    <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-xl font-bold border border-amber-200">
                      Esta OP já foi baixada e não permite edições.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-[32px] shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-error/10 text-error rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Excluir Pedido?</h3>
                <p className="text-on-surface-variant font-medium mb-8">
                  Esta ação é irreversível. Todas as quantidades e dados extraídos serão removidos permanentemente.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setOrderToDelete(null)}
                    className="p-4 bg-surface-container-high text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-highest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => deleteOrder(orderToDelete)}
                    disabled={isProcessing}
                    className="p-4 bg-error text-white font-bold rounded-2xl shadow-xl shadow-error/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
