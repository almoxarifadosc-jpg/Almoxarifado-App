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
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';

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
  status: 'Pendente' | 'Processado' | 'Recusado' | 'Baixada';
  created_at: string;
}

export function SeparationDashboardView() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  // Helper to get YYYY-MM-DD in local time
  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(() => {
    return formatToISODate(new Date());
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return formatToISODate(new Date());
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_orders'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const unsubscribe = onSnapshot(collection(db, 'purchase_orders'), () => {
      fetchOrders();
    });

    return unsubscribe;
  }, []);

  const calculatePercentages = (items: OrderItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0 };
    const separatedCount = items.filter(i => (i.quantity || 0) > 0).length;
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
    return orders.filter(order => {
      const orderDate = parseAnyDate(order.date || order.created_at);
      if (!orderDate) return false;
      
      const start = parseISODate(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = parseISODate(endDate);
      end.setHours(23, 59, 59, 999);
      
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, startDate, endDate]);

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
      {/* Header & Filter */}
      <section className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">Painel de Separação</h2>
          <p className="text-on-surface-variant font-medium">Monitoramento em tempo real da separação de OPs.</p>
        </div>

        <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface outline-none"
            />
            <span className="text-on-surface-variant text-xs font-bold px-1">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface outline-none"
            />
          </div>
          <button 
            onClick={fetchOrders}
            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </section>

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
                  "bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all relative overflow-hidden flex flex-col gap-4",
                  isFullyComplete && "border-l-4 border-l-emerald-500"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">OP Nº</span>
                    <h4 className="text-lg font-headline font-black text-on-surface">#{order.order_number}</h4>
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
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
