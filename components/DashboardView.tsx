'use client';

import React from 'react';
import { parseAnyDate } from '@/lib/utils';
import { Operation } from '@/app/page';

interface DashboardViewProps {
  operations: Operation[];
}

export default function DashboardView({ operations = [] }: DashboardViewProps) {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const end = new Date();

  const filtered = operations.filter(op => {
    const opDate = parseAnyDate(op.date);
    if (isNaN(opDate.getTime())) return false;
    const isInRange = opDate >= start && opDate <= end;
    return isInRange;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Resumo de Operações</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Total Filtrado</p>
          <p className="text-3xl font-black text-slate-900">{filtered.length}</p>
        </div>
      </div>
    </div>
  );
}
