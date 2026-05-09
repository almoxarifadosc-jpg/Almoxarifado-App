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
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';

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
  profiles = [] 
}: { 
  purchaseOrders?: PurchaseOrder[], 
  profiles?: Profile[] 
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(purchaseOrders);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);
  const [loading, setLoading] = useState(false);
  const [filterOP, setFilterOP] = useState('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersSnap = await getDocs(collection(db, 'purchase_orders'));
      const profilesSnap = await getDocs(collection(db, 'profiles'));

      const ordersData = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseOrder[];
      const profilesData = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Profile[];

      setOrders(ordersData);
      setProfiles(profilesData);
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrders(purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

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
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const matchesDate = orderDate >= start && orderDate <= end;
      const matchesOP = order.order_number.toLowerCase().includes(filterOP.toLowerCase());
      
      return matchesDate && matchesOP;
    });
  }, [orders, startDate, endDate, filterOP]);

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

  const monthChartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    const data = months.map((name, index) => {
      const count = orders.filter(order => {
        const d = new Date(order.date);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { name, total: count };
    });
    return data;
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
            />
            <span className="text-on-surface-variant opacity-30 mx-1">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-sm font-black p-1 outline-none text-on-surface"
            />
          </div>
          <div className="flex items-center gap-3 pl-2 flex-grow sm:flex-grow-0 min-w-[200px]">
            <Search className="w-4 h-4 text-on-surface-variant opacity-40" />
            <input 
              type="text"
              placeholder="Filtrar por número de OP..."
              className="bg-transparent border-none text-sm font-bold flex-1 outline-none"
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

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-black text-on-surface mb-8 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            OPs por Mês ({new Date().getFullYear()})
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={32}>
                  {monthChartData.map((_, i) => <Cell key={`month-${i}`} fill="var(--primary)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-black text-on-surface mb-8 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Volume por Localização
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

      {/* Grid of 5 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredOrders.map((order) => {
          const { separation, conference } = calculatePercentages(order.items);
          return (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-5 rounded-[32px] border border-outline-variant/10 shadow-sm flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">OP</h4>
                  <p className="text-base font-headline font-black text-on-surface tracking-tight">#{order.order_number}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-1">Local / Total</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-on-surface truncate pr-2">{order.product_location || '-'}</p>
                    <p className="text-xs font-black text-primary">R$ {order.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Micro Progress Bars */}
                <div className="space-y-2 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                      <span className="text-primary opacity-60">Sep.</span>
                      <span className="text-on-surface">{separation}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${separation}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                      <span className="text-blue-400 opacity-60">Conf.</span>
                      <span className="text-on-surface">{conference}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${conference}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/10">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-1">Conferente</h4>
                  <p className="text-[10px] font-bold text-on-surface-variant italic truncate">
                    {order.conferred_by_name || 'Aguardando conferência'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedOrder(order);
                  setIsTeamModalOpen(true);
                }}
                className="mt-2 w-full bg-surface-container-high text-on-surface-variant py-2.5 rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 group"
              >
                <Users className="w-3.5 h-3.5 group-hover:animate-bounce" />
                Equipe de Separação
              </button>
            </motion.div>
          );
        })}
      </div>

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
