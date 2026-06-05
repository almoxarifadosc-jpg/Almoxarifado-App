'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number | null;
  location?: string;
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
  status: 'Pendente' | 'Separada' | 'Conferida' | 'Recusado' | 'Baixada';
  pdf_url?: string;
  created_at: string;
  type?: string;
  sequence?: number | null;
  source_type?: 'pdf' | 'excel';
  is_signed?: boolean;
}

interface SeparationSequenceViewProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  userCategory?: string;
  purchaseOrders: PurchaseOrder[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

export function SeparationSequenceView({
  isAdmin,
  isSuperAdmin,
  userCategory,
  purchaseOrders = [],
  startDate,
  endDate,
  onDateChange
}: SeparationSequenceViewProps) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING_PANEL' | 'PENDING_ALL' | 'ALL'>('PENDING_PANEL');
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
  const [editingSequenceValue, setEditingSequenceValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Regra de permissão para edição de sequência
  const canEditSequence = isAdmin || isSuperAdmin || userCategory === 'Ventisol' || userCategory === 'Conferente' || userCategory === 'Ventisol + Conferente';

  // Limpa mensagens temporárias
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Função auxiliar para calcular porcentagens de separação e conferência
  const calculatePercentages = (items: OrderItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0, totalPieces: 0 };
    const separatedCount = items.filter(i => i.quantity !== null && i.quantity >= 0).length;
    const conferredCount = items.filter(i => i.is_conferred).length;
    const totalPieces = items.reduce((acc, curr) => acc + (curr.planned_quantity || 0), 0);
    
    return {
      separation: Math.round((separatedCount / items.length) * 100),
      conference: Math.round((conferredCount / items.length) * 100),
      totalPieces
    };
  };

  const parseAnyDate = (rawDate: any): Date | null => {
    if (!rawDate) return null;
    let d: Date;
    
    try {
      if (typeof rawDate === 'object' && 'seconds' in rawDate) {
        d = (rawDate as any).toDate();
      } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/')) {
          const parts = rawDate.split(' ')[0].split('/');
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          d = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else if (rawDate.includes('-')) {
          const parts = rawDate.split('T')[0].split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          d = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          d = new Date(rawDate);
        }
      } else if (typeof rawDate === 'number') {
        d = new Date(rawDate);
      } else {
        d = new Date(rawDate);
      }
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtragem e busca das OPs baseadas no texto digitado e status de progresso
  const filteredOrders = useMemo(() => {
    // 1. Filtrar primeiro baseado no botão/filtro de status selecionado
    let base = purchaseOrders;
    
    if (statusFilter === 'PENDING_PANEL') {
      // Filtrar apenas as que constam no Painel de Separação (atribuídas/assinadas e não baixadas)
      base = purchaseOrders.filter(order => order.is_signed === true && order.status !== 'Baixada');
    } else if (statusFilter === 'PENDING_ALL') {
      // Todas pendentes/em processo no almoxarifado em geral (assinadas ou não) que não estejam baixadas
      base = purchaseOrders.filter(order => order.status !== 'Baixada');
    }

    // 2. Aplicar Filtro de Data dinâmico consistente com a aba de Operações/Separação
    const today = new Date();
    const todayStr = formatToISODate(today);
    const hasActiveDateFilter = !!startDate || !!endDate;

    base = base.filter(order => {
      let matchLogic = false;
      const d = parseAnyDate(order.date || order.created_at);
      if (d) {
        const orderDateStr = formatToISODate(d);
        const isFinished = order.status === 'Baixada';
        
        // Criterio de faixa selecionada
        const isInRange = (!startDate || orderDateStr >= startDate) && (!endDate || orderDateStr <= endDate);

        if (hasActiveDateFilter) {
          // Se há um filtro de data configurado pelo usuário, respeita estritamente o range
          matchLogic = isInRange;
        } else {
          // Sem filtro ativo: mostra se está no intervalo padrão (hoje) ou pendências de datas anteriores
          if (isInRange) {
            matchLogic = true;
          } else if (orderDateStr < todayStr && !isFinished) {
            // Fora do intervalo padrão, mas é uma pendência de dias anteriores não finalizada
            matchLogic = true;
          }
        }
      } else {
        // Sem data registrada: mostra apenas se não concluída
        matchLogic = order.status !== 'Baixada';
      }
      return matchLogic;
    });

    // 3. Aplicar filtro de busca por termos digitados
    const term = filterText.toLowerCase().trim();
    if (!term) return base;

    return base.filter(order => {
      const matchOP = order.order_number?.toLowerCase().includes(term);
      const matchLine = order.supplier_name?.toLowerCase().includes(term);
      const matchItems = order.items?.some(item => 
        item.description?.toLowerCase().includes(term) || 
        item.code?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term)
      );
      return matchOP || matchLine || matchItems;
    });
  }, [purchaseOrders, filterText, statusFilter, startDate, endDate]);

  // Ordenação de todas as OPs com base na sequência de separação (numérica ascendente)
  // Se não possuir sequência registrada, coloca automaticamente no final da lista
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const seqA = a.sequence === undefined || a.sequence === null ? Infinity : Number(a.sequence);
      const seqB = b.sequence === undefined || b.sequence === null ? Infinity : Number(b.sequence);
      if (seqA === seqB) {
        // Desempate por número de OP decrescente
        return b.order_number.localeCompare(a.order_number);
      }
      return seqA - seqB;
    });
    return list;
  }, [filteredOrders]);

  // Selecionar ou deselecionar todas as OPs visíveis na lista filtrada
  const toggleSelectAll = () => {
    const allSelected = sortedOrders.length > 0 && sortedOrders.every(o => selectedOrders[o.id]);
    const updated = { ...selectedOrders };
    
    sortedOrders.forEach(o => {
      if (allSelected) {
        delete updated[o.id];
      } else {
        updated[o.id] = true;
      }
    });

    setSelectedOrders(updated);
  };

  // Selecionar/Deselecionar uma única OP
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = { ...prev };
      if (next[orderId]) {
        delete next[orderId];
      } else {
        next[orderId] = true;
      }
      return next;
    });
  };

  // Abrir campo de edição rápida de sequência
  const startEditingSequence = (order: PurchaseOrder) => {
    if (!canEditSequence) return;
    setEditingSequenceId(order.id);
    setEditingSequenceValue(order.sequence !== undefined && order.sequence !== null ? String(order.sequence) : '');
  };

  // Salvar alteração rápida da sequência no Firestore
  const saveSequence = async (orderId: string) => {
    if (!canEditSequence) return;
    setIsUpdating(true);
    try {
      const cleanVal = editingSequenceValue.trim();
      const newSequence = cleanVal === '' ? null : Number(cleanVal);

      if (newSequence !== null && isNaN(newSequence)) {
        throw new Error('Insira um número válido para a sequência.');
      }

      await updateDoc(doc(db, 'purchase_orders', orderId), {
        sequence: newSequence,
        updated_at: serverTimestamp()
      });

      setSuccess('Sequência atualizada com sucesso!');
      setEditingSequenceId(null);
    } catch (err: any) {
      console.error('Erro ao atualizar sequência:', err);
      setError(err.message || 'Erro ao sincronizar com o banco.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Dispara a impressão das OPs selecionadas
  const handlePrint = () => {
    const toPrint = purchaseOrders.filter(o => selectedOrders[o.id]);
    if (toPrint.length === 0) {
      setError('Por favor, selecione ao menos uma OP para imprimir.');
      return;
    }
    
    // Dispara a função nativa de impressão
    window.print();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Estilos específicos para Impressão limpa via CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: portrait;
            margin: 0;
          }
          
          /* Oculta visualmente todo o restante da página */
          body * {
            visibility: hidden;
          }
          /* Torna visível apenas a área de impressão do almoxarifado */
          #print-area, #print-area * {
            visibility: visible;
          }
          /* Força exibição de display block para sobrepor a classe utility .hidden */
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
          
          html, body, main {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
        }
      `}} />

      {/* Alertas flutuantes */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-400/20"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold">{success}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-error text-white px-5 py-3.5 rounded-2xl shadow-xl border border-error-container/20"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabeçalho da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#E65100]">Visualização de Sequência</span>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-on-surface flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Sequência de Separação
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant font-medium mt-1">
            Agrupamento sistemático por linha de produção e ordens sequenciais de separação.
          </p>
        </div>

        {/* Ações de Lote no Topo */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={Object.keys(selectedOrders).length === 0}
            className={cn(
              "p-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md",
              Object.keys(selectedOrders).length > 0 
                ? "bg-primary text-white hover:opacity-90 shadow-primary/15" 
                : "bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed shadow-none border border-outline-variant/5"
            )}
            title="Imprimir OPs de Produção selecionadas"
          >
            <Printer className="w-4 h-4" />
            Imprimir OPs ({Object.keys(selectedOrders).length})
          </button>
        </div>
      </div>

      {/* Caixa de Ferramentas / Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 print:hidden">
        {/* Barra de Busca Avançada */}
        <div className="lg:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número da OP, material, local ou linha..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100] outline-none transition-all font-medium text-on-surface placeholder:text-on-surface-variant/45"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
          )}
        </div>

        {/* Seleção de Período de Datas */}
        <div className="lg:col-span-6 flex items-center gap-2 bg-surface-container-low border border-outline-variant/10 rounded-2xl px-4 py-2 hover:border-outline-variant/30 transition-all">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-bold text-on-surface-variant mr-1">Período:</span>
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="bg-transparent border-0 p-0 text-xs text-on-surface font-bold outline-none cursor-pointer focus:ring-0 w-full"
            />
            <span className="text-xs text-on-surface-variant font-bold">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="bg-transparent border-0 p-0 text-xs text-on-surface font-bold outline-none cursor-pointer focus:ring-0 w-full"
            />
          </div>
        </div>
      </div>

      {/* Abas de Filtragem de Status das OPs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-surface-container-low border border-outline-variant/10 rounded-2xl print:hidden">
        <button
          onClick={() => {
            setStatusFilter('PENDING_PANEL');
            setSelectedOrders({});
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            statusFilter === 'PENDING_PANEL'
              ? "bg-primary text-white shadow-md shadow-primary/10"
              : "text-on-surface-variant/80 hover:text-on-surface hover:bg-surface-container-high"
          )}
          title="Mostrar apenas as OPs que possuem equipe assinada e estão pendentes no Painel de Separação"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>No Painel de Separação</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[10px] font-black",
            statusFilter === 'PENDING_PANEL' ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant"
          )}>
            {purchaseOrders.filter(o => o.is_signed === true && o.status !== 'Baixada').length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('PENDING_ALL');
            setSelectedOrders({});
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            statusFilter === 'PENDING_ALL'
              ? "bg-primary text-white shadow-md shadow-primary/10"
              : "text-on-surface-variant/80 hover:text-on-surface hover:bg-surface-container-high"
          )}
          title="Mostrar todas as OPs ativas com ou sem equipe atribuída"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Todas as Ativas (Geral)</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[10px] font-black",
            statusFilter === 'PENDING_ALL' ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant"
          )}>
            {purchaseOrders.filter(o => o.status !== 'Baixada').length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('ALL');
            setSelectedOrders({});
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            statusFilter === 'ALL'
              ? "bg-primary text-white shadow-md shadow-primary/10"
              : "text-on-surface-variant/80 hover:text-on-surface hover:bg-surface-container-high"
          )}
          title="Histórico completo de OPs (incluindo as Baixadas)"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Histórico Geral</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[10px] font-black",
            statusFilter === 'ALL' ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant"
          )}>
            {purchaseOrders.length}
          </span>
        </button>
      </div>

      {/* Tabela Unificada e Lisa (Sem Agrupamento) */}
      <div className="space-y-6 print:hidden">
        {sortedOrders.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 opacity-50">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-headline font-black text-on-surface">Nenhuma Ordem de Produção</h3>
            <p className="text-sm text-on-surface-variant max-w-sm mt-1">
              Não encontramos OPs cadastradas no período selecionado ou compatíveis com a busca.
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden transition-all shadow-sm">
            {/* Cabeçalho informativo e de ações da lista unificada */}
            <div className="bg-surface-container px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Checkbox mestre para selecionar todas as OPs filtradas */}
                {(() => {
                  const allSelected = sortedOrders.length > 0 && sortedOrders.every(o => selectedOrders[o.id]);
                  const someSelected = sortedOrders.some(o => selectedOrders[o.id]) && !allSelected;
                  return (
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                        allSelected 
                          ? "bg-primary border-primary text-white" 
                          : someSelected 
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-outline-variant hover:border-primary bg-surface-container-lowest"
                      )}
                      title={allSelected ? "Deselecionar tudo" : "Selecionar tudo nesta lista"}
                    >
                      {allSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      {someSelected && <div className="w-2.5 h-0.5 bg-primary rounded" />}
                    </button>
                  );
                })()}

                <div>
                  <h2 className="text-sm md:text-base font-headline font-black text-on-surface flex items-center gap-1.5">
                    Lista de OPs Ordenadas por Sequência
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {sortedOrders.length} {sortedOrders.length === 1 ? 'Ordem' : 'Ordens'}
                    </span>
                  </h2>
                </div>
              </div>

              <span className="text-xs text-on-surface-variant/70 font-medium">
                Padrão de ordenação: Sequência Crescente
              </span>
            </div>

            {/* Tabela Única de OPs */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/30 border-b border-outline-variant/10 text-[10px] md:text-xs font-black uppercase tracking-widest text-on-surface-variant/70">
                    <th className="px-6 py-4 w-12 text-center">Sel.</th>
                    <th className="px-6 py-4 w-28">Seq. Separação</th>
                    <th className="px-6 py-4 w-32">Ordem de Produção</th>
                    <th className="px-6 py-4">Linha e Localização</th>
                    <th className="px-6 py-4 text-center w-28">Itens / Peças</th>
                    <th className="px-6 py-4 text-center w-28">Separação</th>
                    <th className="px-6 py-4 text-center w-28">Conferência</th>
                    <th className="px-6 py-4 w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {sortedOrders.map((order) => {
                    const isSelected = !!selectedOrders[order.id];
                    const isSeqEditing = editingSequenceId === order.id;
                    const { separation, conference, totalPieces } = calculatePercentages(order.items);

                    return (
                      <tr 
                        key={order.id}
                        className={cn(
                          "text-sm hover:bg-surface-container-high/40 transition-colors group",
                          isSelected && "bg-primary/[0.02]"
                        )}
                      >
                        {/* Checkbox Individual */}
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => toggleSelectOrder(order.id)}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer mx-auto",
                              isSelected 
                                ? "bg-primary border-primary text-white shadow-sm shadow-primary/10" 
                                : "border-outline-variant hover:border-primary bg-surface-container-lowest"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </button>
                        </td>

                        {/* Sequência de Separação */}
                        <td className="px-6 py-3.5">
                          {isSeqEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingSequenceValue}
                                onChange={(e) => setEditingSequenceValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveSequence(order.id);
                                  if (e.key === 'Escape') setEditingSequenceId(null);
                                }}
                                disabled={isUpdating}
                                autoFocus
                                placeholder="Ex: 1"
                                className="w-16 bg-surface-container-highest border border-primary/20 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs ring-2 ring-primary/10 focus:outline-none"
                              />
                              <button
                                onClick={() => saveSequence(order.id)}
                                disabled={isUpdating}
                                className="p-1 text-[#4CAF50] hover:bg-emerald-500/10 rounded-md transition-colors"
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5px]" />}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-black min-w-[38px] text-center",
                                order.sequence !== undefined && order.sequence !== null
                                  ? "bg-primary/10 text-primary border border-primary/10"
                                  : "bg-surface-container-highest text-on-surface-variant/40"
                              )}>
                                {order.sequence !== undefined && order.sequence !== null ? `#${order.sequence}` : 'FALTA'}
                              </span>
                              {canEditSequence && (
                                <button
                                  onClick={() => startEditingSequence(order)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container-highest transition-all"
                                  title="Editar sequência de separação"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Número da OP */}
                        <td className="px-6 py-3.5 font-headline font-black text-on-surface">
                          OP #{order.order_number}
                        </td>

                        {/* Linha/Tipo */}
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[#E65100] uppercase font-black tracking-wider leading-none">
                              {order.supplier_name || 'Sem Linha'}
                            </span>
                            <span className="font-semibold text-on-surface-variant text-xs mt-1.5">
                              {order.type || 'Padrão'} - Local: {order.product_location || 'Geral'}
                            </span>
                          </div>
                        </td>

                        {/* Itens / Peças */}
                        <td className="px-6 py-3.5 text-center font-mono">
                          <div className="flex flex-col">
                            <span className="font-black text-on-surface text-xs">{order.items?.length || 0} SKU</span>
                            <span className="text-[10px] text-on-surface-variant/60 font-bold">{totalPieces} Unidades</span>
                          </div>
                        </td>

                        {/* % Separação */}
                        <td className="px-6 py-3.5 text-center font-mono">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-black",
                            separation === 100 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : separation > 0 
                                ? "bg-amber-500/10 text-amber-500" 
                                : "bg-surface-container-highest text-on-surface-variant/40"
                          )}>
                            {separation}%
                          </span>
                        </td>

                        {/* % Conferência */}
                        <td className="px-6 py-3.5 text-center font-mono">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-black",
                            conference === 100 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : conference > 0 
                                ? "bg-amber-500/10 text-amber-500" 
                                : "bg-surface-container-highest text-on-surface-variant/40"
                          )}>
                            {conference}%
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            order.status === 'Conferida' ? 'bg-blue-500/10 text-blue-500' : 
                            order.status === 'Separada' ? 'bg-amber-500/10 text-amber-500' :
                            order.status === 'Baixada' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-surface-container-highest text-on-surface-variant/60'
                          )}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ÁREA DE IMPRESSÃO (Oculta na tela por padrão, exibida apenas no window.print()) */}
      <div id="print-area" className="hidden print:block p-4" style={{ fontFamily: 'monospace' }}>
        {/* Cabeçalho de Identificação */}
        <div className="border-b-2 border-black pb-3 mb-6 flex justify-between items-center">
          <div>
            <span className="text-sm uppercase font-extrabold tracking-wider block text-gray-800">Gerado via Almoxarifado.app</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">FILIAL SANTA CATARINA</span>
          </div>
          <div className="text-right">
            <h2 className="text-xs font-black uppercase text-gray-800 tracking-wider">LISTA DE SEPARAÇÃO - SEQUÊNCIA DE OPs</h2>
            <span className="text-[10px] text-gray-500 font-bold block mt-0.5">Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Tabela Única de OPs Consolidadas */}
        <table className="w-full border-collapse border-2 border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="border border-black p-3 font-black text-center w-36">SEQUENCIA DE SEPARAÇÃO</th>
              <th className="border border-black p-3 font-black text-center">ORDEM DE PRODUÇÃO</th>
              <th className="border border-black p-3 font-black text-center w-36">LOCAL</th>
              <th className="border border-black p-3 font-black text-center w-32">DATA DA OP</th>
              <th className="border border-black p-3 font-black text-center w-32">QUANTIDADE</th>
              <th className="border border-black p-3 font-black text-center w-32">TOTAL DE ITENS</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders
              .filter(o => selectedOrders[o.id])
              .sort((a, b) => {
                const sA = a.sequence === undefined || a.sequence === null ? Infinity : Number(a.sequence);
                const sB = b.sequence === undefined || b.sequence === null ? Infinity : Number(b.sequence);
                return sA - sB;
              })
              .map((order) => (
                <tr key={order.id} className="border-b border-black">
                  <td className="border border-black p-3 text-center font-extrabold text-base">
                    {order.sequence !== undefined && order.sequence !== null ? `#${order.sequence}` : '-'}
                  </td>
                  <td className="border border-black p-3 text-center font-black text-base">
                    {order.order_number}
                  </td>
                  <td className="border border-black p-3 text-center font-bold">
                    {order.product_location || '-'}
                  </td>
                  <td className="border border-black p-3 text-center">
                    {order.date || '-'}
                  </td>
                  <td className="border border-black p-3 text-center font-extrabold">
                    {order.total_amount || 0}
                  </td>
                  <td className="border border-black p-3 text-center font-extrabold">
                    {order.items?.length || 0} SKU(s)
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Rodapé institucional */}
        <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-4 border-t border-black/20 mt-8">
          <span>VENTISOL ALMOXARIFADO - SISTEMA DE GESTÃO AUTOMÁTICO</span>
          <span>IMPRESSO EM: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}
