'use client';

import React from 'react';
import { parseAnyDate } from '@/lib/utils';
import { Operation } from '@/app/page';
import { motion } from 'motion/react';
import { Activity, Clock, CheckCircle2, AlertTriangle, Package } from 'lucide-react';

interface DashboardViewProps {
  operations: Operation[];
}

export default function DashboardView({ operations = [] }: DashboardViewProps) {
  const start = new Date();
  start.setDate(start.getDate() - 30); // Últimos 30 dias
  const end = new Date();

  const filtered = operations.filter(op => {
    const opDate = parseAnyDate(op.date);
    if (isNaN(opDate.getTime())) return false;
    return opDate >= start && opDate <= end;
  });

  const totals = {
    total: filtered.length,
    completed: filtered.filter(op => op.status === 'CONCLUIDO' || op.isCompleted).length,
    pending: filtered.filter(op => op.status === 'PENDENTE' || !op.isCompleted).length,
    urgent: filtered.filter(op => op.isUrgente).length
  };

  const cards = [
    { label: 'Operações Totais', value: totals.total, icon: Package, color: 'blue', delay: 0 },
    { label: 'Concluídas', value: totals.completed, icon: CheckCircle2, color: 'emerald', delay: 0.1 },
    { label: 'Pendentes', value: totals.pending, icon: Clock, color: 'amber', delay: 0.2 },
    { label: 'Urgentes', value: totals.urgent, icon: AlertTriangle, color: 'red', delay: 0.3 },
  ];

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2"
      >
        <div>
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <Activity size={20} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Monitoramento Mensal</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Resumo Executivo</h1>
          <p className="text-slate-500 font-medium">Visão consolidada das operações do almoxarifado</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: card.delay }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-blue-200 transition-all hover:-translate-y-1"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors bg-${card.color}-50 text-${card.color}-600 group-hover:bg-${card.color}-600 group-hover:text-white`}>
              <card.icon size={28} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter italic-no">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900 rounded-[3.5rem] p-8 md:p-12 text-white overflow-hidden relative shadow-2xl shadow-blue-900/20"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Package size={300} />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-4 tracking-tight">Performance de Separação</h3>
          <p className="text-slate-400 max-w-lg font-medium leading-relaxed mb-8">
            Os dados indicam que {(totals.completed / (totals.total || 1) * 100).toFixed(1)}% das operações foram finalizadas dentro do prazo. Continue monitorando as urgências.
          </p>
          <div className="bg-white/10 h-3 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(totals.completed / (totals.total || 1) * 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
