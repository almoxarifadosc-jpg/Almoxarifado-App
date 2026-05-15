'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Search,
  Bell,
  Mic
} from 'lucide-react';
import { sendGoogleChatNotification } from '@/lib/notifications';

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
  const [isPremiumTts, setIsPremiumTts] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const announceText = async (text: string) => {
    if (!isTtsEnabled) return;

    if (isPremiumTts) {
      try {
        setIsSpeaking(true);
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('Erro ao gerar voz premium');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (error) {
        console.error('Premium TTS Error, falling back to Native:', error);
        // Fallback para fala nativa do navegador
        fallbackToNative(text);
      }
    } else {
      fallbackToNative(text);
    }
  };

  const fallbackToNative = (text: string) => {
    if (!window.speechSynthesis) return;
    
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
      sendGoogleChatNotification(`✅ Item ${item.code} - ${item.description} foi separado.`);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Almoxarifado Ventisol
          </h1>
          <p className="text-slate-500">Painel de Separação de Pedidos</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button 
            id="toggle-tts"
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
            className={`p-2 rounded-xl transition-colors ${isTtsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
            title="Ativar/Desativar Notificações por Voz"
          >
            {isTtsEnabled ? <Volume2 size={24} /> : <Volume2 className="opacity-40" size={24} />}
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium AI Voice</span>
            <button
              id="toggle-premium-tts"
              onClick={() => setIsPremiumTts(!isPremiumTts)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${isPremiumTts ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPremiumTts ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Stats e Search */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <span className="text-sm text-slate-500 mb-1 block">Pendentes</span>
          <span className="text-3xl font-bold text-slate-800">{items.filter(i => i.status !== 'completed').length}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <span className="text-sm text-slate-500 mb-1 block">Concluídos</span>
          <span className="text-3xl font-bold text-green-600">{items.filter(i => i.status === 'completed').length}</span>
        </div>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por código ou descrição..." 
            className="w-full h-full bg-white rounded-3xl p-4 pl-12 shadow-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <div className="grid gap-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                id={`item-${item.id}`}
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-colors ${
                  item.status === 'completed' ? 'border-green-100 bg-green-50/20' : 
                  item.status === 'urgent' ? 'border-amber-100' : 'border-transparent'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-4 items-center">
                    <div className={`p-4 rounded-2xl ${
                      item.status === 'completed' ? 'bg-green-100 text-green-600' : 
                      item.status === 'urgent' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Package size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded">
                          {item.location}
                        </span>
                        <h3 className="font-bold text-slate-800 tracking-tight">{item.code}</h3>
                        {item.status === 'urgent' && (
                          <span className="flex items-center gap-1 text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase">
                            <AlertTriangle size={10} /> Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-lg leading-tight mt-1">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-center md:text-right">
                      <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest">QTD</span>
                      <span className="text-2xl font-black text-slate-800">{item.quantity}</span>
                    </div>

                    <button
                      id={`complete-btn-${item.id}`}
                      disabled={item.status === 'completed'}
                      onClick={() => handleCompleteItem(item.id)}
                      className={`h-14 px-8 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                        item.status === 'completed' 
                        ? 'bg-green-600 text-white cursor-default' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200'
                      }`}
                    >
                      {item.status === 'completed' ? <CheckCircle size={20} /> : <div className="w-1 h-1" />}
                      {item.status === 'completed' ? 'Concluído' : 'Separar Item'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Voice Assistant Indicator */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, bottom: -20 }}
            animate={{ opacity: 1, bottom: 20 }}
            exit={{ opacity: 0, bottom: -20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border border-blue-400/30 backdrop-blur-xl"
          >
            <div className="flex gap-1 items-end h-4">
              {[0.4, 0.7, 0.3, 0.9, 0.5].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['40%', '100%', '40%'] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-blue-300 rounded-full"
                />
              ))}
            </div>
            <span className="text-sm font-bold tracking-wide">Anunciando voz inteligente...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
