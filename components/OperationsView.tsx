'use client';

import React, { useState } from 'react';
import { Filter, Plus, Activity, Factory, Settings, CheckCircle2, Pencil, Trash2, X, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Operation } from '@/app/page';

interface OPRowProps {
  op: Operation;
  onToggleStep: (stepIndex: number) => void;
  onEdit: (op: Operation) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
  allowedGroups?: string[];
}

function OPRow({ op, onToggleStep, onEdit, onDelete, isAdmin, allowedGroups }: OPRowProps) {
  const Icon = op.iconType === 'factory' ? Factory : op.iconType === 'settings' ? Settings : CheckCircle2;

  const isStepAllowed = (index: number) => {
    if (isAdmin) return true;
    if (!allowedGroups || allowedGroups.length === 0) return false;
    const groupName = `G${index + 1}`;
    return allowedGroups.includes(groupName);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 md:px-6 md:py-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="col-span-3 flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            op.isCompleted ? "bg-tertiary-container/30 text-tertiary" : "bg-surface-container-low text-primary"
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-headline font-bold text-on-surface">OP {op.id}</h4>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-xs text-on-surface-variant font-medium">{op.line}</p>
                <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant font-bold">Qtd: {op.quantity}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-medium">
                <Calendar className="w-3 h-3" />
                <span>{op.date}</span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 md:hidden">
              <button onClick={() => onEdit(op)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(op.id)} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="col-span-5 grid grid-cols-4 gap-2 md:gap-4">
          {op.steps.map((active, i) => {
            const allowed = isStepAllowed(i);
            return (
              <button 
                key={i}
                onClick={() => allowed && onToggleStep(i)}
                disabled={!allowed}
                className={cn(
                  "aspect-square md:aspect-auto h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer active:scale-90",
                  active 
                    ? "bg-tertiary text-white shadow-lg shadow-tertiary/20" 
                    : "bg-surface-container-low text-on-surface-variant/40 hover:bg-surface-container-high",
                  !allowed && "opacity-30 cursor-not-allowed active:scale-100"
                )}
              >
                G{i + 1}
              </button>
            );
          })}
        </div>
        <div className="col-span-3 flex flex-col items-end gap-2">
          <div className="flex items-end gap-1">
            <span className={cn("text-2xl font-headline font-extrabold", op.isCompleted ? "text-tertiary" : "text-primary")}>
              {op.progress}%
            </span>
            <span className={cn("text-[10px] font-bold uppercase mb-1", op.isCompleted ? "text-tertiary" : "text-on-surface-variant")}>
              {op.isCompleted ? 'Finalizado' : 'Completo'}
            </span>
          </div>
          <div className={cn("w-full h-2 rounded-full overflow-hidden", op.isCompleted ? "bg-tertiary-container/20" : "bg-surface-container-low")}>
            <div 
              className={cn("h-full rounded-full transition-all duration-500", op.isCompleted ? "bg-tertiary" : "bg-gradient-to-r from-primary to-primary-container")} 
              style={{ width: `${op.progress}%` }}
            />
          </div>
        </div>
        <div className="col-span-1 hidden md:flex items-center justify-end gap-1">
          {isAdmin && (
            <>
              <button onClick={() => onEdit(op)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(op.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface OperationsViewProps {
  operations: Operation[];
  productionLines: string[];
  onToggleStep: (opId: string, stepIndex: number) => void;
  onAddOperation: (op: Operation) => void;
  onUpdateOperation: (op: Operation) => void;
  onDeleteOperation: (id: string) => void;
  isAdmin?: boolean;
  allowedGroups?: string[];
}

export function OperationsView({ 
  operations, 
  productionLines, 
  onToggleStep, 
  onAddOperation, 
  onUpdateOperation, 
  onDeleteOperation, 
  isAdmin,
  allowedGroups
}: OperationsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [opToDelete, setOpToDelete] = useState<string | null>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [formData, setFormData] = useState({ id: '', line: '', quantity: 0 });
  
  // Helper to get YYYY-MM-DD in local time
  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(formatToISODate(new Date()));
  const [endDate, setEndDate] = useState(formatToISODate(new Date()));
  const [filterOP, setFilterOP] = useState('');

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const parseISODate = (isoStr: string) => {
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const openModal = (op?: Operation) => {
    if (op) {
      setEditingOp(op);
      setFormData({ id: op.id, line: op.line, quantity: op.quantity });
    } else {
      setEditingOp(null);
      setFormData({ id: '', line: productionLines[0] || '', quantity: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOp) {
      onUpdateOperation({ ...editingOp, ...formData });
    } else {
      onAddOperation({
        ...formData,
        date: new Date().toLocaleDateString('pt-BR'),
        progress: 0,
        steps: [false, false, false, false],
        iconType: 'factory'
      });
    }
    setIsModalOpen(false);
  };

  const filteredOperations = operations.filter(op => {
    const matchesOP = op.id.toLowerCase().includes(filterOP.toLowerCase());
    
    const opDate = parseDate(op.date);
    const start = parseISODate(startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseISODate(endDate);
    end.setHours(23, 59, 59, 999);

    const matchesDate = opDate >= start && opDate <= end;
    return matchesOP && matchesDate;
  });

  const opsInSelectedRange = operations.filter(op => {
    const opDate = parseDate(op.date);
    const start = parseISODate(startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseISODate(endDate);
    end.setHours(23, 59, 59, 999);
    return opDate >= start && opDate <= end;
  }).length;

  const confirmDelete = (id: string) => {
    setOpToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = () => {
    if (opToDelete) {
      onDeleteOperation(opToDelete);
      setOpToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const averageProgress = filteredOperations.length > 0 
    ? Math.round(filteredOperations.reduce((acc, op) => acc + op.progress, 0) / filteredOperations.length) 
    : 0;

  const inSeparationCount = filteredOperations.filter(op => !op.isCompleted).length;

  const totalPendingOutsideFilter = operations.filter(op => {
    if (op.isCompleted) return false;
    const opDate = parseDate(op.date);
    const start = parseISODate(startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseISODate(endDate);
    end.setHours(23, 59, 59, 999);
    return opDate < start || opDate > end;
  }).length;

  const getMotivationalPhrase = (progress: number) => {
    if (progress === 100) return "Meta alcançada!";
    if (progress >= 50) return "Estamos conseguindo";
    return "Vamos lá";
  };

  const alertsCount = filteredOperations.filter(op => {
    if (op.isCompleted) return false;
    const opDate = parseDate(op.date);
    return opDate < today;
  }).length;
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-24 px-4 max-w-7xl mx-auto pb-32"
    >
      <section className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Gestão de OPs</h2>
              <p className="text-on-surface-variant mt-1 font-medium">Controle de fluxo de separações em tempo real.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-40 bg-white border border-outline-variant/20 rounded-xl px-4 py-2 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm"
                      title="Data Início"
                    />
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  </div>
                  <div className="relative">
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-40 bg-white border border-outline-variant/20 rounded-xl px-4 py-2 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm"
                      title="Data Fim"
                    />
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Filtrar por OP..."
                    value={filterOP}
                    onChange={(e) => setFilterOP(e.target.value)}
                    className="w-full sm:w-36 bg-white border border-outline-variant/20 rounded-xl px-4 py-2 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                </div>
                <div className="px-3 py-2 bg-primary/10 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary whitespace-nowrap">Total Período:</span>
                  <span className="text-sm font-extrabold text-primary">{opsInSelectedRange.toString().padStart(2, '0')}</span>
                </div>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => openModal()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nova OP
                </button>
              )}
            </div>
          </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-outline-variant/15 flex flex-col gap-2">
          <span className="text-primary font-bold text-xs uppercase tracking-widest font-body">Em Separação</span>
          <span className="text-4xl font-headline font-extrabold">{inSeparationCount}</span>
          <div className="mt-4 flex items-center gap-2 text-tertiary font-bold text-xs">
            <Activity className="w-4 h-4" />
            <span>{getMotivationalPhrase(averageProgress)}</span>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-outline-variant/15 flex flex-col gap-2">
          <span className="text-on-surface-variant font-bold text-xs uppercase tracking-widest font-body">Média de Progresso</span>
          <span className="text-4xl font-headline font-extrabold">
            {averageProgress}%
          </span>
          <div className="mt-4 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-container rounded-full" 
              style={{ width: `${averageProgress}%` }}
            ></div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-outline-variant/15 flex flex-col gap-2 relative overflow-hidden">
          <span className="text-on-surface-variant font-bold text-xs uppercase tracking-widest font-body">Alertas</span>
          <span className="text-4xl font-headline font-extrabold text-error">{alertsCount.toString().padStart(2, '0')}</span>
          <div className="mt-4 flex items-center gap-2 text-error font-bold text-xs">
            <Activity className="w-4 h-4" />
            <span>Ação necessária imediata</span>
          </div>
        </div>
      </section>

      {totalPendingOutsideFilter > 0 && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Filtro de Data Ativo</p>
              <p className="text-xs text-on-surface-variant">Existem <strong>{totalPendingOutsideFilter} OPs pendentes</strong> fora deste período de datas.</p>
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

      <section className="space-y-4">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-on-surface-variant font-bold text-xs uppercase tracking-widest">
          <div className="col-span-3">Identificação da OP</div>
          <div className="col-span-5 grid grid-cols-4 text-center">
            <div>G1</div>
            <div>G2</div>
            <div>G3</div>
            <div>G4</div>
          </div>
          <div className="col-span-3 text-right">Progresso Total</div>
          <div className="col-span-1"></div>
        </div>

        {filteredOperations.map((op) => (
          <OPRow 
            key={op.id}
            op={op}
            onToggleStep={(stepIndex) => onToggleStep(op.id, stepIndex)}
            onEdit={openModal}
            onDelete={confirmDelete}
            isAdmin={isAdmin}
            allowedGroups={allowedGroups}
          />
        ))}
        {filteredOperations.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant/50 font-medium bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30">
            Nenhuma ordem de produção encontrada.
          </div>
        )}
      </section>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface rounded-2xl p-8 w-full max-w-md shadow-2xl border border-outline-variant/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-headline font-extrabold">{editingOp ? 'Editar OP' : 'Nova OP'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">ID da Operação (Número)</label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="ex: 20240001"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    disabled={!!editingOp}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Linha de Produção</label>
                  <select 
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer" 
                    value={formData.line}
                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecione uma linha...</option>
                    {productionLines.map(line => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Quantidade da OP</label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="0"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    required
                    min="1"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    {editingOp ? 'Salvar Alterações' : 'Criar Operação'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-outline-variant/20"
            >
              <h3 className="text-xl font-headline font-bold mb-2">Confirmar Exclusão</h3>
              <p className="text-on-surface-variant text-sm mb-6">
                Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-error text-white font-bold text-sm shadow-lg shadow-error/20 hover:opacity-90 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
