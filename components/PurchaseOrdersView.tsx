'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Upload, 
  Search, 
  Clock, 
  Filter,
  MoreVertical,
  ArrowUpDown
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  order_number: string;
  product_location: string;
  date: string;
  total_amount: number;
  supplier_name: string;
  status: 'pending' | 'processing' | 'completed';
  items: unknown[];
}

export default function PurchaseOrdersView() {
  const [orders] = useState<PurchaseOrder[]>([]);
  const [filter, setFilter] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => 
      order.order_number.toLowerCase().includes(filter.toLowerCase()) ||
      order.product_location.toLowerCase().includes(filter.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [orders, filter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        console.log('Dados importados:', data);
        
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <FileText size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Compras</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">Ordens de Compra</h1>
          <p className="text-slate-500 font-medium">Controle de entradas e importação de planilhas</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
            <Upload size={18} />
            <span className="font-bold text-sm uppercase tracking-widest">Importar Planilha</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por OP, local ou produto..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
              <Filter size={18} />
            </button>
            <button className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowUpDown size={14} /> Ordenar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordem</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <FileText size={64} className="mb-4" />
                      <p className="font-black uppercase tracking-[0.2em] text-xs">Nenhum dado encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors group">
                    <td className="p-6">
                      <p className="font-black text-slate-900 leading-tight">#{order.order_number}</p>
                      <p className="text-xs text-slate-400 font-medium">{order.supplier_name}</p>
                    </td>
                    <td className="p-6">
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                        {order.product_location}
                      </span>
                    </td>
                    <td className="p-6 text-sm font-medium text-slate-500">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-6 font-black text-slate-900">
                      {order.total_amount}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-600">
                         <Clock size={14} /> {order.status}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
