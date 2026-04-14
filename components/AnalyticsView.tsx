'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Operation } from '@/app/page';
import { Factory, Calendar, CheckCircle2, Filter, Package, FileText, Layers, Fan } from 'lucide-react';

interface AnalyticsViewProps {
  operations: Operation[];
}

export function AnalyticsView({ operations }: AnalyticsViewProps) {
  // Helper to get YYYY-MM-DD in local time
  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  React.useEffect(() => {
    const today = formatToISODate(new Date());
    setStartDate(today);
    setEndDate(today);
  }, []);

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const parseISODate = (isoStr: string) => {
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredOps = operations.filter(op => {
    if (!startDate || !endDate) return true;
    const opDate = parseDate(op.date);
    const start = parseISODate(startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseISODate(endDate);
    end.setHours(23, 59, 59, 999);

    // Include OPs in range OR pending OPs from the past
    return (opDate >= start && opDate <= end) || (!op.isCompleted && opDate < start);
  }).sort((a, b) => {
    if (a.isUrgente && !b.isUrgente) return -1;
    if (!a.isUrgente && b.isUrgente) return 1;
    if (a.isLicitacao && !b.isLicitacao) return -1;
    if (!a.isLicitacao && b.isLicitacao) return 1;
    return 0;
  });

  const totalPendingOutsideFilter = operations.filter(op => {
    if (op.isCompleted || !endDate) return false;
    const opDate = parseDate(op.date);
    const end = parseISODate(endDate);
    end.setHours(23, 59, 59, 999);
    // Only future pending OPs are "outside" now, since past pending are included
    return opDate > end;
  }).length;

  const totalOps = filteredOps.length;
  const pendingOps = filteredOps.filter(op => !op.isCompleted).length;
  const averageProgress = totalOps > 0 
    ? Math.round(filteredOps.reduce((acc, op) => acc + op.progress, 0) / totalOps) 
    : 0;

  const getMotivationalPhrase = (progress: number) => {
    if (progress === 100) return "Meta alcançada!";
    if (progress >= 50) return "Estamos conseguindo";
    return "Vamos lá";
  };

  const displayOps = filteredOps.slice(0, 25); // Showing up to 25 (5x5)

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="pt-24 px-4 max-w-[1600px] mx-auto pb-32"
    >
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-body text-[10px] font-bold tracking-widest uppercase text-tertiary">Monitoramento em Tempo Real</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Painel de Separação</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40 bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-xl px-4 py-2 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm"
                title="Data Início"
              />
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            </div>
            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40 bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-xl px-4 py-2 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm"
                title="Data Fim"
              />
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Monitorado</span>
              <span className="text-xl font-black text-primary">{totalOps.toString().padStart(2, '0')}</span>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Progresso</span>
              <span className="text-xl font-black text-tertiary">{averageProgress}%</span>
              <span className="text-[8px] font-bold text-tertiary uppercase tracking-tighter mt-0.5">{getMotivationalPhrase(averageProgress)}</span>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Pendentes</span>
              <span className="text-xl font-black text-error">{pendingOps.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      {totalPendingOutsideFilter > 0 && (
        <div className="mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Filtro de Data Ativo</p>
              <p className="text-xs text-on-surface-variant">Existem <strong>{totalPendingOutsideFilter} OPs pendentes</strong> programadas para datas futuras.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const allDates = operations.map(op => parseDate(op.date));
              if (allDates.length > 0) {
                const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
                setStartDate(formatToISODate(minDate));
                setEndDate(formatToISODate(maxDate));
              }
            }}
            className="text-xs font-bold text-primary hover:underline"
          >
            Ver todas as datas
          </button>
        </div>
      )}

      {/* Group Legend */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">G1</p>
            <p className="text-xs font-bold text-on-surface">Motores, caixas...</p>
          </div>
        </div>
        <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">G2</p>
            <p className="text-xs font-bold text-on-surface">Manuais, etiquetas...</p>
          </div>
        </div>
        <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">G3</p>
            <p className="text-xs font-bold text-on-surface">Acabamentos, conjuntos</p>
          </div>
        </div>
        <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Fan className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">G4</p>
            <p className="text-xs font-bold text-on-surface">Peças plásticas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {displayOps.map((op) => (
          <div 
            key={op.id}
            className={cn(
              "bg-surface-container-lowest rounded-2xl p-5 border shadow-sm transition-all relative overflow-hidden",
              op.isUrgente ? "border-error shadow-error/10 bg-error/[0.02]" : 
              op.isLicitacao ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800" : 
              op.isCompleted ? "border-tertiary/20" : "border-outline-variant/10"
            )}
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03]",
              op.isUrgente ? "bg-error" :
              op.isLicitacao ? "bg-blue-600" :
              op.isCompleted ? "bg-tertiary" : "bg-primary"
            )} />

            {op.isUrgente && (
              <div className="absolute top-0 left-0 w-1 h-full bg-error" />
            )}
            {op.isLicitacao && !op.isUrgente && (
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" />
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-surface-container-low dark:bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-tighter">
                    OP {op.id}
                  </span>
                  {op.isUrgente && (
                    <span className="text-[8px] font-black bg-error text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Urgente</span>
                  )}
                  {op.isLicitacao && (
                    <span className="text-[8px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Licitação</span>
                  )}
                  {op.isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-tertiary" />
                  )}
                </div>
                <h3 className="font-headline font-bold text-on-surface text-sm line-clamp-1">{op.line}</h3>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-2xl font-black font-headline leading-none",
                  op.isCompleted ? "text-tertiary" : "text-primary"
                )}>
                  {op.progress}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-5 relative z-10">
              {op.steps.map((active, i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                    active 
                      ? "bg-tertiary text-white shadow-sm" 
                      : "bg-surface-container-low text-on-surface-variant/30"
                  )}
                >
                  G{i + 1}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5 relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-surface-container-low dark:bg-surface-container-high flex items-center justify-center">
                  <Factory className="w-3 h-3 text-on-surface-variant" />
                </div>
                <span className="text-[11px] font-bold text-on-surface-variant">Qtd: {op.quantity}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-medium">
                <Calendar className="w-3 h-3" />
                <span>{op.date}</span>
              </div>
            </div>

            {/* Progress Bar at the bottom */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-low">
              <div 
                className={cn("h-full transition-all duration-1000", op.isCompleted ? "bg-tertiary" : "bg-primary")}
                style={{ width: `${op.progress}%` }}
              />
            </div>
          </div>
        ))}

        {displayOps.length === 0 && (
          <div className="col-span-full py-20 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/20">
            <p className="text-on-surface-variant font-medium italic">Nenhuma operação ativa para exibição no painel.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
