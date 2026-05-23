'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  LayoutDashboard, 
  Search, 
  Calendar, 
  Package, 
  Users, 
  CheckCircle2, 
  ClipboardList, 
  Loader2,
  Building2,
  TrendingUp,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, onSnapshot, where, orderBy } from 'firebase/firestore';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number;
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
  status: string;
  created_at: string;
  conferred_by_name?: string;
  assigned_users?: string[];
}

interface Profile {
  id: string;
  name: string;
  email: string;
  is_super_admin?: boolean;
}

export default function PerformanceView({ 
  purchaseOrders = [], 
  profiles = [],
  startDate,
  endDate,
  onDateChange
}: { 
  purchaseOrders?: PurchaseOrder[], 
  profiles?: Profile[],
  startDate: string,
  endDate: string,
  onDateChange: (start: string, end: string) => void
}) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);
  const [loading, setLoading] = useState(false);
  const [filterOP, setFilterOP] = useState('');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const handleFetchData = async (start: string, end: string) => {
    if (!start || !end) return;
    setLoading(true);
    setError(null);
    try {
      const [sYear, sMonth, sDay] = start.split('-').map(Number);
      const startObj = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

      const [eYear, eMonth, eDay] = end.split('-').map(Number);
      const endObj = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

      const q = query(
        collection(db, 'purchase_orders'),
        where('created_at', '>=', startObj),
        where('created_at', '<=', endObj),
        orderBy('created_at', 'desc')
      );
      
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => {
        const data = doc.data();
        let dateStr = data.date;
        if (!dateStr && data.created_at) {
          const timestamp = data.created_at;
          if (timestamp && typeof timestamp.toDate === 'function') {
            dateStr = timestamp.toDate().toISOString().split('T')[0];
          }
        }
        return { 
          id: doc.id, 
          ...data,
          date: dateStr || new Date().toISOString().split('T')[0]
        } as PurchaseOrder;
      });

      setOrders(fetched);
      setHasSearched(true);
      onDateChange(start, end);
    } catch (err: any) {
      console.error("Erro ao buscar dados de desempenho:", err);
      try {
        const qFallback = query(collection(db, 'purchase_orders'));
        const snap = await getDocs(qFallback);
        const fetched = snap.docs.map(doc => {
          const data = doc.data();
          let dateStr = data.date;
          if (!dateStr && data.created_at) {
            const timestamp = data.created_at;
            if (timestamp && typeof timestamp.toDate === 'function') {
              dateStr = timestamp.toDate().toISOString().split('T')[0];
            }
          }
          return { 
            id: doc.id, 
            ...data,
            date: dateStr || new Date().toISOString().split('T')[0]
          } as PurchaseOrder;
        });

        const startSec = new Date(start).getTime();
        const endSec = new Date(end).getTime() + 86400000;
        const filteredLocally = fetched.filter(o => {
          const oTime = new Date(o.date).getTime();
          return oTime >= startSec && oTime <= endSec;
        });

        setOrders(filteredLocally);
        setHasSearched(true);
        onDateChange(start, end);
      } catch (fallbackErr) {
        console.error("Erro total no carregamento de desempenho:", fallbackErr);
        setError("Erro ao carregar dados do Firestore. Por favor, tente novamente.");
      }
    } finally {
      setLoading(false);
    }
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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.date);
      const start = new Date(localStartDate);
      const end = new Date(localEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const matchesDate = orderDate >= start && orderDate <= end;
      const matchesOP = order.order_number.toLowerCase().includes(filterOP.toLowerCase());
      
      return matchesDate && matchesOP;
    });
  }, [orders, localStartDate, localEndDate, filterOP]);

  const stats = useMemo(() => {
    if (filteredOrders.length === 0) return { avgSeparation: 0, avgConference: 0, totalOps: 0 };
    
    let totalSep = 0;
    let totalConf = 0;

    filteredOrders.forEach(order => {
      const { separation, conference } = calculatePercentages(order.items);
      totalSep += separation;
      totalConf += conference;
    });

    return {
      avgSeparation: Math.round(totalSep / filteredOrders.length),
      avgConference: Math.round(totalConf / filteredOrders.length),
      totalOps: filteredOrders.length
    };
  }, [filteredOrders]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const opsThisMonth = orders.filter(order => {
      const d = new Date(order.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return opsThisMonth;
  }, [orders]);

  const locationChartData = useMemo(() => {
    const locations: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      const loc = order.product_location || 'Não informado';
      locations[loc] = (locations[loc] || 0) + 1;
    });

    return Object.entries(locations).map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 font-bold text-on-surface-variant">Carregando painel de desempenho...</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-[1200px] mx-auto min-h-[70vh] flex flex-col justify-center items-center pb-32"
      >
        <div className="bg-surface-container-low border border-outline-variant/10 p-12 rounded-[48px] shadow-sm max-w-xl text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mb-8">
            <TrendingUp className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight mb-4">Painel de Desempenho</h2>
          <p className="text-on-surface-variant font-medium text-base mb-8 max-w-md">
            Selecione o intervalo no filtro de data abaixo para buscar os dados de desempenho no banco de dados.
          </p>

          <div className="w-full flex flex-col sm:flex-row items-center gap-4 bg-surface-container-high p-4 rounded-[32px] border border-outline-variant/15 shadow-sm mb-6 max-w-md">
            <div className="flex items-center gap-2 px-3 flex-1 justify-center">
              <Calendar className="w-4 h-4 text-primary" />
              <input 
                type="date" 
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
              />
              <span className="text-on-surface-variant opacity-30 mx-1">-</span>
              <input 
                type="date" 
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
              />
            </div>
          </div>

          {error && (
            <p className="text-error text-sm font-bold mb-4">{error}</p>
          )}

          <button
            onClick={() => handleFetchData(localStartDate, localEndDate)}
            className="w-full sm:w-auto bg-primary text-on-primary hover:bg-primary/95 font-bold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Gerar Relatório de Desempenho</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-[1600px] mx-auto pb-32"
    >
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter">Desempenho de Separação</h2>
          <p className="text-on-surface-variant font-medium text-lg">Acompanhe a eficiência da equipe e o status das OPs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-3 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-outline-variant/20">
            <Calendar className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
            />
            <span className="text-on-surface-variant opacity-30 mx-1">-</span>
            <input 
              type="date" 
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
            />
          </div>
          
          <button
            onClick={() => handleFetchData(localStartDate, localEndDate)}
            className="bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold px-4 py-2 rounded-full cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>

          <div className="flex items-center gap-3 pl-2 flex-grow sm:flex-grow-0 min-w-[200px]">
            <Search className="w-4 h-4 text-on-surface-variant opacity-40" />
            <input 
              type="text"
              placeholder="Filtrar por número de OP..."
              className="bg-transparent border-none text-sm font-bold flex-1 outline-none text-on-surface"
              value={filterOP}
              onChange={(e) => setFilterOP(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[40px] shadow-sm flex items-center justify-between group hover:bg-primary/10 transition-colors">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2">Média de Separação</p>
            <h3 className="text-5xl font-headline font-black text-primary">{stats.avgSeparation}%</h3>
          </div>
          <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center text-primary rotate-12 group-hover:rotate-0 transition-transform">
            <Package className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[40px] shadow-sm flex items-center justify-between group hover:bg-emerald-500/10 transition-colors">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 mb-2">Média de Conferência</p>
            <h3 className="text-5xl font-headline font-black text-emerald-600">{stats.avgConference}%</h3>
          </div>
          <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-600 -rotate-12 group-hover:rotate-0 transition-transform">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/10 p-8 rounded-[40px] shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 mb-2">OPs no Período</p>
            <h3 className="text-5xl font-headline font-black text-on-surface">{stats.totalOps}</h3>
          </div>
          <div className="w-16 h-16 bg-on-surface-variant/5 rounded-3xl flex items-center justify-center text-on-surface-variant opacity-30">
            <BarChart3 className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Graphs & Month Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Card do Mês */}
        <div className="lg:col-span-1 bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
            <Calendar className="w-10 h-10" />
          </div>
          <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 mb-2">OPs Carregadas do Mês</h3>
          <p className="text-6xl font-headline font-black text-on-surface mb-2">{currentMonthStats}</p>
          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>Mês Atual ({new Date().getFullYear()})</span>
          </div>
          <p className="mt-4 text-[10px] text-on-surface-variant opacity-40 leading-tight">
            * Baseado nas OPs atualmente carregadas no app (Incompletas + Filtro selecionado).
          </p>
        </div>

        {/* Localização */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-black text-on-surface mb-8 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Volume por Localização (Filtro Ativo)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 10, fontWeight: 800 }} />
                <Tooltip />
                <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={20}>
                  {locationChartData.map((_, i) => <Cell key={`loc-${i}`} fill="var(--primary)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Remoção do Grid de Cards de OPs conforme solicitado */}

      {/* Team Modal */}
      <AnimatePresence>
        {isTeamModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-black text-on-surface">Equipe Responsável</h3>
                  <p className="text-sm text-on-surface-variant">OP #{selectedOrder.order_number}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {selectedOrder.assigned_users && selectedOrder.assigned_users.length > 0 ? (
                  selectedOrder.assigned_users.map(uid => {
                    const user = localProfiles.find(p => p.id === uid);
                    return (
                      <div key={uid} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-[24px] border border-outline-variant/10">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {user?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{user?.name || 'Não identificado'}</p>
                          <p className="text-[10px] text-on-surface-variant opacity-50">{user?.email}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm font-bold text-on-surface-variant opacity-40 italic">Nenhum responsável atribuído a esta OP.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsTeamModalOpen(false)}
                className="w-full bg-on-surface text-surface p-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
