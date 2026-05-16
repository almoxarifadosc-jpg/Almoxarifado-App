'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Search,
  ArrowRight
} from 'lucide-react';

interface SeparationItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  location: string;
  status: 'pending' | 'completed' | 'urgent';
}

export default function SeparationDashboardView() {
  const [items, setItems] = useState<SeparationItem[]>([
    { id: '1', code: 'VNT-001', description: 'Hélice Ventisol 40cm', quantity: 50, location: 'A-22', status: 'pending' },
    { id: '2', code: 'VNT-002', description: 'Grade Protetora Branca', quantity: 30, location: 'B-05', status: 'urgent' },
    { id: '3', code: 'VNT-003', description: 'Motor Industrial 220V', quantity: 15, location: 'C-10', status: 'completed' },
  ]);

  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const announceText = (text: string) => {
    if (!isTtsEnabled || !window.speechSynthesis) return;
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleCompleteItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'completed' } : i));
      announceText(`Item ${item.description} separado com sucesso.`);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      {/* Header Info */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200">
            <Package className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Fluxo de Separação</h1>
            <p className="text-slate-500 font-medium tracking-tight">Otimização de Almoxarifado Ventisol</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl shadow-sm border border-slate-100">
          <div className="px-4 py-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status de Voz</span>
            <span className="text-sm font-bold text-blue-600">{isTtsEnabled ? 'ATIVADO' : 'DESATIVADO'}</span>
          </div>
          <button 
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
            className={`p-3 rounded-2xl transition-all ${isTtsEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}
          >
            <Volume2 size={24} />
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Pendentes</span>
            <span className="text-4xl font-black text-slate-900">{items.filter(i => i.status !== 'completed').length}</span>
          </div>
          <div className="absolute top-0 right-0 p-8 text-blue-50 group-hover:text-blue-100 transition-colors">
            <Search size={80} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Concluídos</span>
            <span className="text-4xl font-black text-green-600">{items.filter(i => i.status === 'completed').length}</span>
          </div>
          <div className="absolute top-0 right-0 p-8 text-green-50 group-hover:text-green-100 transition-colors">
            <CheckCircle size={80} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="w-full">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Filtrar por Local</span>
            <div className="flex gap-2 font-black text-xs">
              {['Ala A', 'Ala B', 'Ala C'].map(ala => (
                <button key={ala} className="bg-slate-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                  {ala}
                </button>
              ))}
            </div>
           </div>
        </div>
      </section>

      {/* Items List */}
      <main className="max-w-6xl mx-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all ${
                item.status === 'completed' ? 'border-green-100 bg-green-50/10' : 
                item.status === 'urgent' ? 'border-amber-100 shadow-xl shadow-amber-100/50' : 'border-transparent shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex gap-6 items-center">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
                    item.status === 'completed' ? 'bg-green-100 text-green-600' : 
                    item.status === 'urgent' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Package size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                        {item.location}
                      </span>
                      <h3 className="font-black text-xl text-slate-800 tracking-tighter">{item.code}</h3>
                      {item.status === 'urgent' && (
                        <span className="flex items-center gap-1 text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase italic">
                          <AlertTriangle size={12} /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 font-medium text-lg leading-tight">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-6 md:pt-0">
                  <div className="text-center md:text-right">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-1">Quantidade</span>
                    <span className="text-4xl font-black text-slate-800 leading-none">{item.quantity}</span>
                  </div>

                  <button
                    disabled={item.status === 'completed'}
                    onClick={() => handleCompleteItem(item.id)}
                    className={`h-16 px-10 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${
                      item.status === 'completed' 
                      ? 'bg-green-600 text-white cursor-default' 
                      : 'bg-slate-800 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-xl'
                    }`}
                  >
                    {item.status === 'completed' ? <CheckCircle size={20} /> : <ArrowRight size={20} />}
                    {item.status === 'completed' ? 'Finalizado' : 'Separar'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Voice Assistant Overlay */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 z-50 border border-white/10"
          >
             <div className="flex gap-1 items-end h-5">
              {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['40%', '100%', '40%'] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1.5 bg-blue-400 rounded-full"
                />
              ))}
            </div>
            <span className="text-sm font-black uppercase tracking-widest">Anunciando voz inteligente...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
