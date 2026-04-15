'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Hash, 
  FileText, 
  AlertCircle, 
  Calendar,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Operation } from '@/app/page';

interface DashboardViewProps {
  operations: Operation[];
}

type Period = 'today' | 'week' | 'month' | 'all';

export function DashboardView({ operations }: DashboardViewProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredData = useMemo(() => {
    const now = new Date();
    return operations.filter(op => {
      const opDate = new Date(op.date);
      if (period === 'today') {
        return opDate.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return opDate >= weekAgo;
      }
      if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return opDate >= monthAgo;
      }
      return true;
    });
  }, [operations, period]);

  const kpis = useMemo(() => {
    const totalOps = filteredData.length;
    const licitacoes = filteredData.filter(op => op.isLicitacao).length;
    const urgencias = filteredData.filter(op => op.isUrgente).length;
    
    // Calculate daily average
    const uniqueDays = new Set(filteredData.map(op => new Date(op.date).toDateString())).size;
    const dailyAverage = uniqueDays > 0 ? (totalOps / uniqueDays).toFixed(1) : '0';

    return [
      { 
        label: 'Média OP Diária', 
        value: dailyAverage, 
        icon: TrendingUp, 
        color: 'text-primary',
        bg: 'bg-primary/10'
      },
      { 
        label: 'Número de OP', 
        value: totalOps.toString(), 
        icon: Hash, 
        color: 'text-tertiary',
        bg: 'bg-tertiary/10'
      },
      { 
        label: 'Licitações', 
        value: licitacoes.toString(), 
        icon: FileText, 
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
      },
      { 
        label: 'Urgências', 
        value: urgencias.toString(), 
        icon: AlertCircle, 
        color: 'text-error',
        bg: 'bg-error/10'
      }
    ];
  }, [filteredData]);

  const chartData = useMemo(() => {
    const months: { [key: string]: number } = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Get last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`;
      months[key] = 0;
    }

    operations.forEach(op => {
      const d = new Date(op.date);
      const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`;
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([name, total]) => ({ name, total }));
  }, [operations]);

  const periodLabels = {
    today: 'Hoje',
    week: 'Última Semana',
    month: 'Último Mês',
    all: 'Todo o Período'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 pt-24 pb-32 md:px-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
            Dashboard Analítico
          </h2>
          <p className="text-on-surface-variant mt-1 font-medium">
            Visão geral do desempenho e status das operações
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-sm hover:bg-surface-container-low transition-all text-sm font-bold text-on-surface"
          >
            <Calendar className="w-4 h-4 text-primary" />
            {periodLabels[period]}
            <ChevronDown className={cn("w-4 h-4 transition-transform", isFilterOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-xl z-50 p-1 overflow-hidden"
              >
                {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setIsFilterOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm font-bold rounded-lg transition-colors",
                      period === p 
                        ? "bg-primary/10 text-primary" 
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="text-3xl font-headline font-black text-on-surface">
                {kpi.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Volume de OPs por Mês
            </h3>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-container-low)', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: 'var(--surface-container-lowest)', 
                    borderColor: 'var(--outline-variant)',
                    borderRadius: '12px',
                    borderWidth: '1px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill="var(--primary)" 
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
