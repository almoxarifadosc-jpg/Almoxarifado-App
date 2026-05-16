'use client';

import React from 'react';
import { 
  Factory, 
  Settings, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Package
} from 'lucide-react';
import { Operation } from '@/app/page';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface OperationsViewProps {
  operations: Operation[];
  onToggleStep?: (opId: string, stepIndex: number) => void;
  onToggleStatus?: (opId: string) => void;
  isAdmin?: boolean;
}

export default function OperationsView({ operations = [], onToggleStatus }: OperationsViewProps) {
  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <Package size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão Operacional</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Operações</h1>
          <p className="text-slate-500 font-medium">Controle em tempo real da linha de separação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {operations.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Clock size={48} className="mb-4 opacity-20" />
            <p className="font-bold">Nenhuma operação ativa</p>
          </div>
        ) : (
          operations.map((op, idx) => (
            <motion.div
              key={op.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                    op.iconType === 'factory' ? "bg-amber-500" : op.iconType === 'settings' ? "bg-blue-500" : "bg-emerald-500"
                  )}>
                    {op.iconType === 'factory' ? <Factory size={24} /> : op.iconType === 'settings' ? <Settings size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900">{op.description}</h3>
                      {op.isUrgente && <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Urgente</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Local: {op.location} • Qtd: {op.quantity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                    op.status === 'CONCLUIDO' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {op.status}
                  </div>
                  <button 
                    onClick={() => onToggleStatus && onToggleStatus(op.id)}
                    className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
