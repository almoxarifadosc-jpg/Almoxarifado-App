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
  ChevronDown,
  MessageSquareText,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Operation } from '@/app/page';

// Helper to parse DD/MM/YYYY or ISO strings
const parseOpDate = (dateStr: string) => {
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

interface DashboardViewProps {
  operations: Operation[];
}

type Period = 'today' | 'week' | 'month' | 'all';

export function DashboardView({ operations }: DashboardViewProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const filteredData = useMemo(() => {
    // Helper to create a date at 00:00:00 in local time from YYYY-MM-DD
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseLocalDate(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = operations.filter(op => {
      const opDate = parseOpDate(op.date);
      if (isNaN(opDate.getTime())) return false;
      const isInRange = opDate >= start && opDate <= end;
      return isInRange;
    });

    return filtered;
  }, [operations, startDate, endDate]);

  const kpis = useMemo(() => {
    const totalOps = filteredData.length;
    const licitacoes = filteredData.filter(op => op.isLicitacao).length;
    const urgencias = filteredData.filter(op => op.isUrgente).length;
    
    // Calculate daily average (Mon-Fri only)
    const opsByDay: { [key: string]: number } = {};
    filteredData.forEach(op => {
      const d = parseOpDate(op.date);
      if (isNaN(d.getTime())) return;
      const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const key = d.toDateString();
        opsByDay[key] = (opsByDay[key] || 0) + 1;
      }
    });

    const workDaysCount = Object.keys(opsByDay).length;
    const dailyAverage = workDaysCount > 0 ? (totalOps / workDaysCount).toFixed(1) : '0';

    return [
      { 
        label: 'Média OP (Seg-Sex)', 
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
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    // Initialize all months of current year
    const monthsData = monthNames.map((name, index) => {
      const total = operations.filter(op => {
        const d = parseOpDate(op.date);
        if (isNaN(d.getTime())) return false;
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { name, total };
    });

    return monthsData;
  }, [operations]);

  const summaries = useMemo(() => {
    if (filteredData.length === 0) return null;

    // Weekly Analysis (By Day of Week)
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayCounts = new Array(7).fill(0);
    
    filteredData.forEach(op => {
      const d = parseOpDate(op.date);
      if (!isNaN(d.getTime())) {
        dayCounts[d.getDay()]++;
      }
    });

    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const weeklySummary = `Análise Semanal: O dia com maior volume de operações no período selecionado é ${dayNames[maxDayIdx]}, totalizando ${dayCounts[maxDayIdx]} OPs.`;

    // Monthly Analysis (By Week of Month)
    const getWeekOfMonth = (d: Date) => {
      const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const firstWeekday = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
      const offsetDate = d.getDate() + firstWeekday - 1;
      return Math.floor(offsetDate / 7) + 1;
    };

    const weekCounts: { [key: number]: number } = {};
    filteredData.forEach(op => {
      const d = parseOpDate(op.date);
      if (!isNaN(d.getTime())) {
        const weekNum = getWeekOfMonth(d);
        weekCounts[weekNum] = (weekCounts[weekNum] || 0) + 1;
      }
    });

    const sortedWeeks = Object.entries(weekCounts).sort((a, b) => b[1] - a[1]);
    let monthlySummary = "Análise Mensal: ";
    if (sortedWeeks.length > 0) {
      monthlySummary += `A semana com maior volume de produção foi a Semana ${sortedWeeks[0][0]} do mês, com ${sortedWeeks[0][1]} OPs registradas.`;
    } else {
      monthlySummary += "Não há dados suficientes para análise semanal detalhada.";
    }

    return { weekly: weeklySummary, monthly: monthlySummary };
  }, [filteredData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 pt-24 pb-32 md:px-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
            Dashboard Analítico
          </h2>
          <p className="text-on-surface-variant mt-1 font-medium">
            Visão geral do desempenho e status das operações
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/50 transition-all cursor-pointer"
            />
            <span className="text-on-surface-variant font-bold">à</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/50 transition-all cursor-pointer"
            />
          </div>
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

      {/* Summaries Section */}
      {summaries && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex gap-4 items-start"
          >
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm uppercase tracking-wider mb-1">Resumo Semanal</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{summaries.weekly}</p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-tertiary/5 border border-tertiary/10 p-6 rounded-2xl flex gap-4 items-start"
          >
            <div className="p-2 bg-tertiary/10 rounded-xl text-tertiary">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-tertiary text-sm uppercase tracking-wider mb-1">Resumo Mensal</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{summaries.monthly}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Volume de OPs por Mês ({new Date().getFullYear()})
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
                    fontWeight: 'bold',
                    color: 'var(--on-surface)'
                  }}
                  itemStyle={{
                    color: 'var(--primary)',
                    fontSize: '14px'
                  }}
                  labelStyle={{
                    color: 'var(--on-surface-variant)',
                    marginBottom: '4px'
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
