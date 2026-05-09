'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Filter,
  TrendingUp,
  Building2,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Receipt {
  id: string;
  load_id: string;
  supplier_type: 'Intercompany' | 'Externo';
  supplier_name: string;
  status: 'Pendente' | 'Enviado' | 'Recebido' | 'Divergente' | 'Concluído';
  created_at: string;
}

export function ReceiptsDashboardView({ receipts: globalReceipts = [] }: { receipts?: Receipt[] }) {
  const [receipts, setReceipts] = useState<Receipt[]>(globalReceipts);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const parseAnyDate = (dateVal: any) => {
    if (!dateVal) return new Date(NaN);
    if (typeof dateVal === 'object' && dateVal.seconds) return dateVal.toDate();
    if (typeof dateVal === 'string') {
      if (dateVal.includes('/')) {
        const [day, month, year] = dateVal.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateVal);
    }
    return new Date(dateVal);
  };

  useEffect(() => {
    setReceipts(globalReceipts);
  }, [globalReceipts]);

  const filteredData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return receipts.filter(r => {
      const d = parseAnyDate(r.created_at);
      return d >= start && d <= end;
    });
  }, [receipts, startDate, endDate]);

  const kpis = useMemo(() => {
    return {
      total: filteredData.length,
      pendente: filteredData.filter(r => r.status === 'Pendente').length,
      enviado: filteredData.filter(r => r.status === 'Enviado').length,
      recebido: filteredData.filter(r => r.status === 'Recebido').length,
      divergente: filteredData.filter(r => r.status === 'Divergente').length,
      concluido: filteredData.filter(r => r.status === 'Concluído').length,
    };
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; intercompany: number; externo: number }> = {};
    
    filteredData.forEach(r => {
      const date = parseAnyDate(r.created_at);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!months[key]) {
        months[key] = { month: label, intercompany: 0, externo: 0 };
      }
      
      if (r.supplier_type === 'Intercompany') {
        months[key].intercompany++;
      } else {
        months[key].externo++;
      }
    });

    return Object.values(months);
  }, [filteredData]);

  const topSuppliers = useMemo(() => {
    const suppliers: Record<string, number> = {};
    filteredData.filter(r => r.status === 'Recebido' || r.status === 'Concluído').forEach(r => {
      suppliers[r.supplier_name] = (suppliers[r.supplier_name] || 0) + 1;
    });

    return Object.entries(suppliers)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="pt-8 flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-bold animate-pulse">Carregando Dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-8 px-4 max-w-7xl mx-auto pb-32"
    >
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Dashboard de Cargas</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Análise de volumes e performance de cargas.</p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
          <Calendar className="w-4 h-4 text-on-surface-variant ml-2" />
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
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total', value: kpis.total, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Pendentes', value: kpis.pendente, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Enviados', value: kpis.enviado, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Recebidos', value: kpis.recebido, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Divergentes', value: kpis.divergente, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Concluídos', value: kpis.concluido, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", kpi.bg, kpi.color)}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{kpi.label}</p>
            <p className="text-3xl font-headline font-black text-on-surface mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Volume Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Volume Mensal</h3>
              <p className="text-sm text-on-surface-variant">Comparativo Intercompany vs Externo</p>
            </div>
            <TrendingUp className="w-6 h-6 text-primary opacity-20" />
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--outline-variant), 0.1)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--surface-container-lowest)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(var(--outline-variant), 0.1)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="intercompany" name="Intercompany" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="externo" name="Externo" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers Chart */}
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Top Fornecedores</h3>
              <p className="text-sm text-on-surface-variant">Maiores volumes recebidos</p>
            </div>
            <Building2 className="w-6 h-6 text-primary opacity-20" />
          </div>

          <div className="space-y-6">
            {topSuppliers.length > 0 ? topSuppliers.map((s, idx) => (
              <div key={s.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-on-surface">{s.name}</span>
                  <span className="text-xs font-black text-primary">{s.count} Cargas</span>
                </div>
                <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / topSuppliers[0].count) * 100}%` }}
                    className="h-full bg-primary rounded-full"
                    transition={{ duration: 1, delay: idx * 0.1 }}
                  />
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <Users className="w-12 h-12 mb-4" />
                <p className="text-sm font-bold">Sem dados para o período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
