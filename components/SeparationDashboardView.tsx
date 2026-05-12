'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Package,
  Calendar,
  AlertCircle,
  Truck,
  Eye,
  Filter,
  CloudSun,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { sendGoogleChatNotification } from '@/lib/notifications';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number | null;
  unitPrice?: number;
  totalPrice?: number;
  collector_name?: string;
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
  is_signed?: boolean;
  signature_url?: string;
  signed_by_name?: string;
  signed_at?: string;
  pis?: string[];
  created_at: string;
  sequence?: number | null;
}

export function SeparationDashboardView({ 
  isAdmin, 
  isSuperAdmin, 
  currentUserId, 
  currentUserName, 
  isViewer, 
  allowedGroups,
  purchaseOrders: globalOrders = [],
  startDate,
  endDate,
  onDateChange
}: { 
  isAdmin?: boolean, 
  isSuperAdmin?: boolean,
  currentUserId?: string, 
  currentUserName?: string, 
  isViewer?: boolean,
  allowedGroups?: string[],
  purchaseOrders?: PurchaseOrder[],
  startDate: string,
  endDate: string,
  onDateChange: (start: string, end: string) => void
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(globalOrders);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [searchOP, setSearchOP] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [weather, setWeather] = useState<{ temp: number } | null>(null);
  const [dollarRate, setDollarRate] = useState<string | null>(null);

  useEffect(() => {
    const fetchExternalData = async () => {
      try {
        // Palhoça Weather
        const wRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.64&longitude=-48.67&current_weather=true');
        const wData = await wRes.json();
        if (wData.current_weather) {
          setWeather({ temp: Math.round(wData.current_weather.temperature) });
        }

        // Dollar Rate
        const dRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        const dData = await dRes.json();
        if (dData.USDBRL) {
          setDollarRate(Number(dData.USDBRL.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } catch (e) {
        console.error('Failed to fetch external weather/dollar data', e);
      }
    };

    fetchExternalData();
    const interval = setInterval(fetchExternalData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isOrderRestricted = (order: PurchaseOrder) => {
    if (isAdmin || isSuperAdmin || !allowedGroups || allowedGroups.length === 0) return false;
    if (!order.items || order.items.length === 0) return false;
    return !order.items.some(item => {
      const itemLoc = (item.location || '').toUpperCase();
      return allowedGroups.some(group => itemLoc.includes(group.toUpperCase()));
    });
  };

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const baixarOrder = async (order: PurchaseOrder) => {
    if (!isAdmin || isViewer) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'purchase_orders', order.id);
      await updateDoc(orderRef, { 
        status: 'Baixada',
        updated_at: serverTimestamp()
      });

      // Enviar notificação para o Google Chat
      const message = `🚀 *OP Baixada via Painel*\n\n` +
        `*Número:* #${order.order_number}\n` +
        `*Executor:* ${currentUserName || 'Sistema'}\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(message);

      setSuccess('OP Baixada com sucesso!');
      setConfirmingId(null);
      setIsReviewModalOpen(false);
      setSelectedOrder(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Erro ao baixar OP:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${order.id}`);
      } catch (e) {}
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to get YYYY-MM-DD in local time
  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setOrders(globalOrders);
  }, [globalOrders]);

  const calculatePercentages = (items: OrderItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0 };
    // Consideramos separado se a quantidade não for nula e maior ou igual a zero
    const separatedCount = items.filter(i => i.quantity !== null && i.quantity >= 0).length;
    const conferredCount = items.filter(i => i.is_conferred).length;
    
    return {
      separation: Math.round((separatedCount / items.length) * 100),
      conference: Math.round((conferredCount / items.length) * 100)
    };
  };

  const parseAnyDate = (rawDate: any): Date | null => {
    if (!rawDate) return null;
    let d: Date;
    
    try {
      if (typeof rawDate === 'object' && 'seconds' in rawDate) {
        // Handle Firestore Timestamp
        d = (rawDate as any).toDate();
      } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/')) {
          // Robust DD/MM/YYYY parsing
          const parts = rawDate.split(' ')[0].split('/');
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          d = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else if (rawDate.includes('-')) {
          // Robust YYYY-MM-DD parsing
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

  const parseISODate = (isoStr: string) => {
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = formatToISODate(today);

    return orders.filter(order => {
      // Regra de Grupos Permitidos
      if (isOrderRestricted(order)) return false;

      // Filtro de Busca por OP
      if (searchOP.trim() && !order.order_number.toLowerCase().includes(searchOP.toLowerCase())) {
        return false;
      }

      const orderDate = parseAnyDate(order.date || order.created_at);
      if (!orderDate) return false;
      
      const { separation, conference } = calculatePercentages(order.items);
      const isFullyFinished = order.status === 'Baixada';

      // Se não estiver finalizada, aparece independente do filtro
      if (!isFullyFinished) return true;

      const start = parseISODate(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = parseISODate(endDate);
      end.setHours(23, 59, 59, 999);
      
      return orderDate >= start && orderDate <= end;
    }).sort((a, b) => {
      const dA = parseAnyDate(a.date || a.created_at);
      const dB = parseAnyDate(b.date || b.created_at);
      const dateAStr = dA ? formatToISODate(dA) : '';
      const dateBStr = dB ? formatToISODate(dB) : '';

      const { separation: sepA, conference: confA } = calculatePercentages(a.items);
      const { separation: sepB, conference: confB } = calculatePercentages(b.items);
      
      const finishedA = a.status === 'Baixada' || (sepA === 100 && confA === 100);
      const finishedB = b.status === 'Baixada' || (sepB === 100 && confB === 100);

      const lateAndNotFinishedA = dateAStr < todayISO && !finishedA;
      const lateAndNotFinishedB = dateBStr < todayISO && !finishedB;

      if (lateAndNotFinishedA && !lateAndNotFinishedB) return -1;
      if (!lateAndNotFinishedA && lateAndNotFinishedB) return 1;

      // Secundário: Sequência
      if (a.sequence !== undefined && b.sequence !== undefined && a.sequence !== null && b.sequence !== null) {
        return a.sequence - b.sequence;
      }
      if (a.sequence !== null && a.sequence !== undefined) return -1;
      if (b.sequence !== null && b.sequence !== undefined) return 1;

      // Terciário: Data descendente
      return (dB?.getTime() || 0) - (dA?.getTime() || 0);
    });
  }, [orders, startDate, endDate, searchOP]);

  const kpis = useMemo(() => {
    const total = filteredOrders.length;
    let pendenteSeparacao = 0;
    let pendenteConferencia = 0;
    let pendenteGeral = 0;

    filteredOrders.forEach(order => {
      const { separation, conference } = calculatePercentages(order.items);
      if (separation < 100) pendenteSeparacao++;
      if (conference < 100) pendenteConferencia++;
      if (separation < 100 || conference < 100) pendenteGeral++;
    });

    return { total, pendenteSeparacao, pendenteConferencia, pendenteGeral };
  }, [filteredOrders]);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto min-h-screen pb-32">
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Filter */}
      <section className={cn(
        "mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 overflow-hidden",
        !showFilters && "md:h-0 md:mb-0 md:opacity-0 md:pointer-events-none"
      )}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div>
            <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">Painel de Separação</h2>
            <p className="text-on-surface-variant font-medium">Monitoramento em tempo real da separação de OPs.</p>
          </div>

          {/* Weather & Dollar Widgets */}
          <div className="flex items-center gap-4">
            {weather !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 rounded-2xl border border-sky-500/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
                <CloudSun className="w-5 h-5 text-sky-600" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-sky-600/70 leading-none">Palhoça</span>
                  <span className="text-sm font-black text-sky-700 leading-tight">{weather.temp}°C</span>
                </div>
              </div>
            )}
            {dollarRate && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-1000">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70 leading-none">Dólar Hoje</span>
                  <span className="text-sm font-black text-emerald-700 leading-tight">R$ {dollarRate}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          {/* Busca por OP */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant transition-colors group-focus-within:text-primary" />
            <input 
              type="text"
              placeholder="Buscar por OP..."
              value={searchOP}
              onChange={(e) => setSearchOP(e.target.value)}
              className="w-full md:w-64 pl-11 pr-4 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none font-bold text-on-surface text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-primary" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="bg-transparent text-xs font-bold text-on-surface outline-none"
              />
              <span className="text-on-surface-variant text-xs font-bold px-1">até</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="bg-transparent text-xs font-bold text-on-surface outline-none"
              />
            </div>
            <button 
              onClick={() => {}}
              className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Botão de Esconder/Mostrar - Somente Desktop */}
      <div className="hidden md:flex justify-end mb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant rounded-xl border border-outline-variant/10 transition-all text-xs font-bold"
        >
          {showFilters ? (
            <>
              <Eye className="w-4 h-4" />
              Esconder Filtros
            </>
          ) : (
            <>
              <Filter className="w-4 h-4" />
              Mostrar Filtros
            </>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total de OPs', value: kpis.total, color: 'text-primary', bg: 'bg-primary/5', icon: Package },
          { label: 'Pendente Separação', value: kpis.pendenteSeparacao, color: 'text-amber-500', bg: 'bg-amber-500/5', icon: Truck },
          { label: 'Pendente Conferência', value: kpis.pendenteConferencia, color: 'text-blue-500', bg: 'bg-blue-500/5', icon: ClipboardList },
          { label: 'Total Pendente', value: kpis.pendenteGeral, color: 'text-error', bg: 'bg-error/5', icon: AlertCircle },
        ].map((kpi) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-6 rounded-[32px] border border-outline-variant/10 bg-surface-container-lowest shadow-sm flex items-center gap-5")}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{kpi.label}</p>
              <h3 className={cn("text-3xl font-headline font-black", kpi.color)}>{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 font-bold text-on-surface-variant">Carregando dados do painel...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface-container-low p-20 rounded-[48px] border-2 border-dashed border-outline-variant/20 flex flex-col items-center text-center">
          <ClipboardList className="w-16 h-16 text-on-surface-variant opacity-10 mb-6" />
          <h3 className="text-2xl font-bold text-on-surface">Nenhuma OP encontrada no período</h3>
          <p className="text-on-surface-variant mt-2 max-w-sm">Ajuste o filtro de datas ou importe novas OPs para visualizar os dados aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredOrders.map((order, idx) => {
            const { separation, conference } = calculatePercentages(order.items);
            const isFullyComplete = separation === 100 && conference === 100;
            
            return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "bg-surface-container-lowest p-5 pl-7 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all relative overflow-hidden flex flex-col gap-4",
                  order.is_signed 
                    ? "border-l-4 border-l-emerald-500" 
                    : isFullyComplete 
                      ? "border-l-4 border-l-amber-400" 
                      : "border-l-4 border-l-transparent"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">OP Nº</span>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-headline font-black text-on-surface">#{order.order_number}</h4>
                      {order.sequence !== undefined && order.sequence !== null && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-sm">
                          SEQ: {order.sequence}
                        </span>
                      )}
                    </div>
                  </div>
                  {isFullyComplete && (
                    <div className="w-7 h-7 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 block mb-1">Local</span>
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <Eye className="w-3 h-3 text-primary" />
                      <span className="text-xs font-bold truncate">{order.product_location || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 block mb-1">Data Upload</span>
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span className="text-xs font-bold">
                        {(() => {
                          const d = parseAnyDate(order.date || order.created_at);
                          if (!d) return 'N/A';
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-on-surface-variant">Separação</span>
                      <span className={cn(separation === 100 ? "text-emerald-500" : "text-primary")}>{separation}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", separation === 100 ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${separation}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-on-surface-variant">Conferência</span>
                      <span className={cn(conference === 100 ? "text-emerald-500" : "text-blue-500")}>{conference}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", conference === 100 ? "bg-emerald-500" : "bg-blue-500")}
                        style={{ width: `${conference}%` }}
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && !isViewer && order.is_signed && order.status !== 'Baixada' && (
                  <div className="mt-2">
                    <motion.button 
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsReviewModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Baixar OP
                    </motion.button>
                  </div>
                )}
                
                {order.status === 'Baixada' && (
                  <div className="mt-2 py-2.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OP Concluída
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedOrder && (
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
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Revisão da OP</h5>
                    <h1 className="text-4xl md:text-5xl font-headline font-black text-primary leading-none tracking-tighter">#{selectedOrder.order_number}</h1>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <Eye className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-8">
                  {/* Dados Gerais */}
                  <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                    <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Dados Gerais</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Fornecedor</p>
                        <p className="font-bold text-on-surface">{selectedOrder.supplier_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Localização</p>
                        <p className="font-bold text-on-surface">{selectedOrder.product_location || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Data da OP</p>
                        <p className="font-bold text-on-surface">
                          {(() => {
                            const d = parseAnyDate(selectedOrder.date || selectedOrder.created_at);
                            return d ? d.toLocaleDateString('pt-BR') : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PIs Adicionadas */}
                  {selectedOrder.pis && selectedOrder.pis.length > 0 && (
                    <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                      <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Pedidos de Industrialização (PIs)</h4>
                      </div>
                      <div className="p-6 flex flex-wrap gap-3">
                        {selectedOrder.pis.map((pi, idx) => (
                          <div 
                            key={idx}
                            className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                          >
                            <Package className="w-3.5 h-3.5" />
                            {pi}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exibição da Assinatura no Review se existir */}
                  {selectedOrder.is_signed && (
                        <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6 flex flex-col items-center gap-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Assinatura Eletrônica Registrada</p>
                          <div className="bg-white p-4 rounded-2xl w-full flex justify-center shadow-inner">
                            <img src={selectedOrder.signature_url} alt="Assinatura" className="h-32 object-contain" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-on-surface italic">Assinado por: {selectedOrder.signed_by_name}</p>
                            <p className="text-[10px] font-mono text-on-surface-variant opacity-50 uppercase">{selectedOrder.signed_at && new Date(selectedOrder.signed_at).toLocaleString()}</p>
                          </div>
                        </div>
                  )}

                  {/* Itens */}
                  <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                    <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Itens da Operação</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 border-b border-outline-variant/10">Material</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Local</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Planejado</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Separado</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Dif.</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors">
                              <td className="px-6 py-4 uppercase">
                                <p className="text-sm font-bold text-on-surface leading-tight">{item.description}</p>
                                <p className="text-[10px] font-black text-on-surface-variant opacity-50 mt-0.5">{item.code || 'S/ RED'}</p>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md">
                                  {item.location || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center font-bold text-on-surface">{item.planned_quantity}</td>
                              <td className="px-4 py-4 text-center font-bold text-primary">{item.quantity ?? '-'}</td>
                              <td className="px-4 py-4 text-center">
                                <span className={cn(
                                  "text-[11px] font-black px-2 py-0.5 rounded-md",
                                  ((item.quantity ?? 0) - item.planned_quantity) >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                  {(item.quantity ?? 0) - item.planned_quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {item.is_conferred ? (
                                  <div className="flex items-center justify-center gap-1 text-emerald-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 opacity-60">PENDENTE</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Total Planejado</p>
                      <p className="text-xl font-headline font-black text-on-surface">
                        {selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Total Separado</p>
                      <p className="text-xl font-headline font-black text-primary">
                        {selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Diferença Total</p>
                      <p className={cn(
                        "text-xl font-headline font-black",
                        (selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0) || 0) - (selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0) || 0) >= 0 
                          ? "text-emerald-500" 
                          : "text-amber-500"
                      )}>
                        {(selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0) || 0) - (selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low/30 flex justify-end gap-4">
                <button 
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="px-8 py-4 bg-surface-container-high text-on-surface font-black uppercase tracking-widest rounded-2xl hover:bg-surface-container-highest transition-all"
                >
                  Fechar
                </button>
                {isAdmin && !isViewer && (
                  <button 
                    onClick={() => baixarOrder(selectedOrder)}
                    disabled={isProcessing}
                    className="px-8 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Confirmar Baixa de OP
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
