'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardList, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Package,
  Calendar,
  AlertCircle,
  MapPin,
  Truck,
  Eye,
  X,
  Filter,
  CloudSun,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { sendGoogleChatNotification } from '@/lib/notifications';

interface OrderItem {
  code?: string;
  description: string;
  planned_quantity: number;
  quantity: number | null;
  unitPrice?: number;
  totalPrice?: number;
  collector_name?: string;
  location?: string;
  is_conferred?: boolean;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  product_location?: string;
  date: string;
  total_amount: number;
  items: OrderItem[];
  status: 'Pendente' | 'Separada' | 'Conferida' | 'Recusado' | 'Baixada';
  is_signed?: boolean;
  signature_url?: string;
  signed_by_name?: string;
  signed_at?: string;
  pis?: string[];
  created_at: string;
  sequence?: number | null;
  source_type?: 'pdf' | 'excel';
}

export function SeparationDashboardView({ 
  isAdmin, 
  isSuperAdmin, 
  currentUserId, 
  currentUserName, 
  isViewer, 
  allowedGroups,
  purchaseOrders: globalOrders = [],
  startDate,
  endDate,
  onDateChange
}: { 
  isAdmin?: boolean, 
  isSuperAdmin?: boolean,
  currentUserId?: string, 
  currentUserName?: string, 
  isViewer?: boolean,
  allowedGroups?: string[],
  purchaseOrders?: PurchaseOrder[],
  startDate: string,
  endDate: string,
  onDateChange: (start: string, end: string) => void
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(globalOrders);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [searchOP, setSearchOP] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [weather, setWeather] = useState<{ temp: number } | null>(null);
  const [dollarRate, setDollarRate] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [premiumVoiceEnabled, setPremiumVoiceEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_premium_enabled') === 'true';
    }
    return false;
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState({ rate: 1.0, pitch: 1.0 });
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ttsErrorMessage, setTtsErrorMessage] = useState<string | null>(null);

  // Controle de Notificação por Voz
  const announcedOpsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Monitora ordens que acabaram de ser assinadas
    const newlySigned = globalOrders.filter(o => 
      o.is_signed && 
      !announcedOpsRef.current.has(o.id) &&
      o.status !== 'Baixada'
    );

    if (newlySigned.length > 0 && audioEnabled) {
      newlySigned.forEach(order => {
        announceOrderRelease(order.order_number);
        announcedOpsRef.current.add(order.id);
      });
    }

    // Limpeza de memória
    const currentIds = new Set(globalOrders.map(o => o.id));
    announcedOpsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        announcedOpsRef.current.delete(id);
      }
    });
  }, [globalOrders, audioEnabled]);

  // Pré-carregamento de vozes para o TTS nativo
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Filtro rigoroso para vozes em português BR, excluindo explicitamente espanhol
        const ptVoices = voices.filter(v => {
          const l = v.lang.toLowerCase().replace('_', '-');
          const n = v.name.toLowerCase();
          const isSpanish = l.startsWith('es') || n.includes('spanish') || n.includes('espanol');
          const isPT = l.startsWith('pt');
          // No Edge, algumas vozes pt-PT podem aparecer, priorizamos pt-BR
          const isBR = l.includes('br') || n.includes('brazil') || n.includes('portuguese (brazil)');
          return isPT && isBR && !isSpanish;
        });

        setAvailableVoices(ptVoices);
        
        if (voices.length > 0) {
          console.log('TTS: Vozes BR carregadas:', ptVoices.length);
        }
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const announceText = async (message: string, forceSystem: boolean = false) => {
    if (!audioEnabled && !message.includes("Notificações ativadas")) return;

    setTtsStatus('loading');
    setTtsErrorMessage(null);

    // Estratégia Premium: ElevenLabs via API Route
    if (premiumVoiceEnabled && !forceSystem) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        });

        if (!response.ok) throw new Error('Erro ao gerar voz premium');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setTtsStatus('idle');
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setTtsStatus('error');
          setTtsErrorMessage("Erro ao reproduzir áudio premium");
        };

        await audio.play();
        return;
      } catch (error) {
        console.error('Premium TTS Error, falling back to Native:', error);
        // Se falhar o premium, não interrompe, tenta o nativo abaixo
      }
    }

    // Fallback: SpeechSynthesis (Nativo do navegador)
    if (!('speechSynthesis' in window)) {
      setTtsStatus('error');
      setTtsErrorMessage("Navegador sem suporte a voz.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    
    // Força idioma PT-BR no nível do objeto para evitar confusão de idioma padrão do SO
    utterance.lang = 'pt-BR';

    const speak = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Tenta usar a voz selecionada pelo usuário
      let bestVoice = voices.find(v => v.name === selectedVoiceName);

      if (!bestVoice) {
        // Filtro de emergência caso a lista do estado esteja vazia
        const ptBRVoices = voices.filter(v => {
          const l = v.lang.toLowerCase().replace('_', '-');
          const n = v.name.toLowerCase();
          const isSpanish = l.startsWith('es') || n.includes('spanish') || n.includes('espanol');
          const isPT = l.startsWith('pt');
          const isBR = l.includes('br') || n.includes('brazil');
          return isPT && isBR && !isSpanish;
        });

        // Prioridades: 
        // 1. Microsft Edge Natural Online
        // 2. Google Português do Brasil
        // 3. Qualquer PT-BR que sobrar
        const edgeNatural = ptBRVoices.find(v => v.name.toLowerCase().includes('natural'));
        const googleVoice = ptBRVoices.find(v => v.name.toLowerCase().includes('google') && v.lang.includes('BR'));
        bestVoice = edgeNatural || googleVoice || ptBRVoices[0];
      }
      
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = 'pt-BR'; 
      }
      
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = 1;

      utterance.onend = () => setTtsStatus('idle');
      utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        setTtsStatus('error');
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      // Pequeno delay para navegadores lentos em carregar vozes
      setTimeout(speak, 100);
    } else {
      speak();
    }
  };

  const announceOrderRelease = (orderNumber: string) => {
    announceText(`Mateus Antunes OP ${orderNumber} está liberada para baixa`);
  };

  useEffect(() => {
    const fetchExternalData = async () => {
      try {
        // Palhoça Weather
        const wRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.64&longitude=-48.67&current_weather=true');
        const wData = await wRes.json();
        if (wData.current_weather) {
          setWeather({ temp: Math.round(wData.current_weather.temperature) });
        }

        // Dollar Rate
        const dRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        const dData = await dRes.json();
        if (dData.USDBRL) {
          setDollarRate(Number(dData.USDBRL.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } catch (e) {
        console.error('Failed to fetch external weather/dollar data', e);
      }
    };

    fetchExternalData();
    const interval = setInterval(fetchExternalData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isOrderRestricted = (order: PurchaseOrder) => {
    if (isAdmin || isSuperAdmin || !allowedGroups || allowedGroups.length === 0) return false;
    if (!order.items || order.items.length === 0) return false;
    return !order.items.some(item => {
      const itemLoc = (item.location || '').toUpperCase();
      return allowedGroups.some(group => itemLoc.includes(group.toUpperCase()));
    });
  };

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const baixarOrder = async (order: PurchaseOrder) => {
    if (!isAdmin || isViewer) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'purchase_orders', order.id);
      await updateDoc(orderRef, { 
        status: 'Baixada',
        updated_at: serverTimestamp()
      });

      // Enviar notificação para o Google Chat
      const message = `🚀 *OP Baixada via Painel*\n\n` +
        `*Número:* #${order.order_number}\n` +
        `*Executor:* ${currentUserName || 'Sistema'}\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(message);

      setSuccess('OP Baixada com sucesso!');
      setConfirmingId(null);
      setIsReviewModalOpen(false);
      setSelectedOrder(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Erro ao baixar OP:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${order.id}`);
      } catch (e) {}
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to get YYYY-MM-DD in local time
  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setOrders(globalOrders);
  }, [globalOrders]);

  const calculatePercentages = (items: OrderItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0 };
    // Consideramos separado se a quantidade não for nula e maior ou igual a zero
    const separatedCount = items.filter(i => i.quantity !== null && i.quantity >= 0).length;
    const conferredCount = items.filter(i => i.is_conferred).length;
    
    return {
      separation: Math.round((separatedCount / items.length) * 100),
      conference: Math.round((conferredCount / items.length) * 100)
    };
  };

  const parseAnyDate = (rawDate: any): Date | null => {
    if (!rawDate) return null;
    let d: Date;
    
    try {
      if (typeof rawDate === 'object' && 'seconds' in rawDate) {
        // Handle Firestore Timestamp
        d = (rawDate as any).toDate();
      } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/')) {
          // Robust DD/MM/YYYY parsing
          const parts = rawDate.split(' ')[0].split('/');
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          d = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else if (rawDate.includes('-')) {
          // Robust YYYY-MM-DD parsing
          const parts = rawDate.split('T')[0].split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          d = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          d = new Date(rawDate);
        }
      } else if (typeof rawDate === 'number') {
        d = new Date(rawDate);
      } else {
        d = new Date(rawDate);
      }
      
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const parseISODate = (isoStr: string) => {
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = formatToISODate(today);

    return orders.filter(order => {
      // Regra de Grupos Permitidos (Sempre respeitada)
      if (isOrderRestricted(order)) return false;

      // Se houver busca por texto (OP), prioriza isso e ignora datas para facilitar achar OPs específicas
      if (searchOP.trim()) {
        return order.order_number.toLowerCase().includes(searchOP.toLowerCase());
      }

      const d = parseAnyDate(order.date || order.created_at);
      if (!d) return false;
      
      const orderDateStr = formatToISODate(d);
      
      // Filtro de datas (intervalo selecionado)
      const isInRange = (!startDate || orderDateStr >= startDate) && (!endDate || orderDateStr <= endDate);

      // Mostra se estiver no intervalo. 
      // Adicionalmente, mostra PENDENTES de datas muito recentes (últimas 48h) para garantir que nada se perca no turnover
      const isFinished = order.status === 'Baixada';
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setDate(fortyEightHoursAgo.getDate() - 2);
      const limitISO = formatToISODate(fortyEightHoursAgo);
      const isRecentPending = orderDateStr >= limitISO && !isFinished;

      return isInRange || isRecentPending;
    }).sort((a, b) => {
      const dA = parseAnyDate(a.date || a.created_at);
      const dB = parseAnyDate(b.date || b.created_at);
      const dateAStr = dA ? formatToISODate(dA) : '';
      const dateBStr = dB ? formatToISODate(dB) : '';

      const { separation: sepA, conference: confA } = calculatePercentages(a.items);
      const { separation: sepB, conference: confB } = calculatePercentages(b.items);
      
      const finishedA = a.status === 'Baixada' || (sepA === 100 && confA === 100);
      const finishedB = b.status === 'Baixada' || (sepB === 100 && confB === 100);

      const lateAndNotFinishedA = dateAStr < todayISO && !finishedA;
      const lateAndNotFinishedB = dateBStr < todayISO && !finishedB;

      if (lateAndNotFinishedA && !lateAndNotFinishedB) return -1;
      if (!lateAndNotFinishedA && lateAndNotFinishedB) return 1;

      // Secundário: Sequência
      if (a.sequence !== undefined && b.sequence !== undefined && a.sequence !== null && b.sequence !== null) {
        return a.sequence - b.sequence;
      }
      if (a.sequence !== null && a.sequence !== undefined) return -1;
      if (b.sequence !== null && b.sequence !== undefined) return 1;

      // Terciário: Data descendente
      return (dB?.getTime() || 0) - (dA?.getTime() || 0);
    });
  }, [orders, startDate, endDate, searchOP]);

  const kpis = useMemo(() => {
    const total = filteredOrders.length;
    let pendenteSeparacao = 0;
    let pendenteConferencia = 0;
    let pendenteGeral = 0;

    filteredOrders.forEach(order => {
      const { separation, conference } = calculatePercentages(order.items);
      if (separation < 100) pendenteSeparacao++;
      if (conference < 100) pendenteConferencia++;
      if (separation < 100 || conference < 100) pendenteGeral++;
    });

    return { total, pendenteSeparacao, pendenteConferencia, pendenteGeral };
  }, [filteredOrders]);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto min-h-screen pb-32">
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Filter */}
      <section className={cn(
        "mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 overflow-hidden",
        !showFilters && "md:h-0 md:mb-0 md:opacity-0 md:pointer-events-none"
      )}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div>
            <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight flex items-center gap-3">
              Painel de Separação
              {(!audioEnabled && 'speechSynthesis' in window) && (
                <button 
                  onClick={() => {
                    setAudioEnabled(true);
                    announceText("Notificações ativadas", true);
                  }}
                  className="px-3 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black rounded-xl border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5 animate-pulse"
                >
                  <Volume2 size={14} />
                  ATIVAR ÁUDIO
                </button>
              )}
              {audioEnabled && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                    ttsStatus === 'loading' ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : 
                    ttsStatus === 'error' ? "text-red-500 bg-red-500/10 border-red-500/20" :
                    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    <Volume2 size={12} className={cn(ttsStatus === 'loading' && "animate-pulse")} />
                    {ttsStatus === 'loading' ? "Gerando..." : "Áudio Ativo"}
                  </div>

                  {/* Configurações de Voz */}
                  <div className="flex flex-wrap items-center gap-2 bg-surface-container-low px-2 py-1 rounded-xl border border-outline-variant/10 shadow-sm">
                    <button
                      onClick={() => {
                        const newState = !premiumVoiceEnabled;
                        setPremiumVoiceEnabled(newState);
                        localStorage.setItem('tts_premium_enabled', newState.toString());
                        if (newState) {
                          announceText("Voz premium ativada", true);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all active:scale-95",
                        premiumVoiceEnabled 
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20" 
                          : "bg-surface-container-high text-on-surface-variant border-outline-variant/10 hover:bg-surface-container-highest"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", premiumVoiceEnabled ? "bg-white animate-pulse" : "bg-on-surface-variant opacity-40")} />
                      <span className="text-[9px] font-black tracking-widest uppercase">Premium (ElevenLabs)</span>
                    </button>

                    <div className="h-4 w-px bg-outline-variant/20 mx-0.5" />

                    {!premiumVoiceEnabled ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                        <Volume2 size={10} />
                        <span className="text-[9px] font-black tracking-widest uppercase">Local</span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-black text-on-surface-variant opacity-40 px-2 uppercase tracking-widest">Local</span>
                    )}

                    <div className="h-4 w-px bg-outline-variant/20 mx-0.5" />

                    {!premiumVoiceEnabled && (
                      <>
                        <select 
                          value={selectedVoiceName || ''}
                          onChange={(e) => {
                            const name = e.target.value;
                            setSelectedVoiceName(name);
                            localStorage.setItem('tts_selected_voice', name);
                            announceText("Voz alterada", true);
                          }}
                          className="bg-transparent text-[10px] font-bold text-on-surface-variant outline-none max-w-[120px] truncate cursor-pointer"
                        >
                          <option value="">Voz Padrão</option>
                          {availableVoices.map(v => (
                            <option key={v.name} value={v.name}>{v.name}</option>
                          ))}
                        </select>

                        <button 
                          onClick={() => announceText("Teste de voz", true)}
                          className="p-1 px-2 hover:bg-primary/10 text-primary rounded-lg transition-all border border-primary/20 active:scale-95"
                          title="Testar voz selecionada"
                        >
                          <Volume2 size={10} />
                        </button>

                        <div className="h-4 w-px bg-outline-variant/20 mx-1" />
                      </>
                    )}

                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black opacity-40">VEL:</span>
                       <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1" 
                        value={voiceSettings.rate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setVoiceSettings(prev => ({ ...prev, rate: val }));
                          localStorage.setItem('tts_voice_rate', val.toString());
                        }}
                        className="w-12 h-1 accent-primary cursor-pointer"
                       />
                       <span className="text-[9px] font-black text-on-surface-variant min-w-[20px]">{voiceSettings.rate}x</span>
                    </div>

                    <div className="h-4 w-px bg-outline-variant/20 mx-1" />

                    <button 
                      onClick={() => setAudioEnabled(false)}
                      className="text-[9px] font-black text-error hover:opacity-70 transition-opacity"
                    >
                      DESATIVAR
                    </button>
                  </div>

                  {ttsErrorMessage && (
                    <div className="text-[9px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                      {ttsErrorMessage}
                    </div>
                  )}
                </div>
              )}
            </h2>
            <p className="text-on-surface-variant font-medium">Monitoramento em tempo real da separação de OPs.</p>
          </div>

          {/* Weather & Dollar Widgets */}
          <div className="flex items-center gap-4">
            {weather !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 rounded-2xl border border-sky-500/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
                <CloudSun className="w-5 h-5 text-sky-600" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-sky-600/70 leading-none">Palhoça</span>
                  <span className="text-sm font-black text-sky-700 leading-tight">{weather.temp}°C</span>
                </div>
              </div>
            )}
            {dollarRate && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-1000">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70 leading-none">Dólar Hoje</span>
                  <span className="text-sm font-black text-emerald-700 leading-tight">R$ {dollarRate}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          {/* Busca por OP */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant transition-colors group-focus-within:text-primary" />
            <input 
              type="text"
              placeholder="Buscar por OP..."
              value={searchOP}
              onChange={(e) => setSearchOP(e.target.value)}
              className="w-full md:w-64 pl-11 pr-4 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none font-bold text-on-surface text-sm transition-all"
            />
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center gap-2 px-3">
                <Calendar className="w-4 h-4 text-primary" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const s = new Date(newStart);
                    
                    const end = new Date(endDate);
                    const diff = Math.abs(end.getTime() - s.getTime());
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if (days > 1) {
                      alert("Para evitar lentidão, o período máximo permitido para consulta é de 24 horas (1 dia).");
                      return;
                    }
                    onDateChange(newStart, endDate);
                  }}
                  className="bg-transparent text-xs font-bold text-on-surface outline-none"
                />
                <span className="text-on-surface-variant text-xs font-bold px-1">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const end = new Date(newEnd);
                    onDateChange(startDate, newEnd);
                  }}
                  className="bg-transparent text-xs font-bold text-on-surface outline-none"
                />
              </div>
              <button 
                onClick={() => {}}
                className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Botão de Esconder/Mostrar - Somente Desktop e Admin */}
      {isAdmin && (
        <div className="hidden md:flex justify-end mb-4">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant rounded-xl border border-outline-variant/10 transition-all text-xs font-bold"
          >
            {showFilters ? (
              <>
                <Eye className="w-4 h-4" />
                Esconder Filtros
              </>
            ) : (
              <>
                <Filter className="w-4 h-4" />
                Mostrar Filtros
              </>
            )}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total de OPs', value: kpis.total, color: 'text-primary', bg: 'bg-primary/5', icon: Package },
          { label: 'Pendente Separação', value: kpis.pendenteSeparacao, color: 'text-amber-500', bg: 'bg-amber-500/5', icon: Truck },
          { label: 'Pendente Conferência', value: kpis.pendenteConferencia, color: 'text-blue-500', bg: 'bg-blue-500/5', icon: ClipboardList },
          { label: 'Total Pendente', value: kpis.pendenteGeral, color: 'text-error', bg: 'bg-error/5', icon: AlertCircle },
        ].map((kpi) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-6 rounded-[32px] border border-outline-variant/10 bg-surface-container-lowest shadow-sm flex items-center gap-5")}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{kpi.label}</p>
              <h3 className={cn("text-3xl font-headline font-black", kpi.color)}>{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 font-bold text-on-surface-variant">Carregando dados do painel...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface-container-low p-20 rounded-[48px] border-2 border-dashed border-outline-variant/20 flex flex-col items-center text-center">
          <ClipboardList className="w-16 h-16 text-on-surface-variant opacity-10 mb-6" />
          <h3 className="text-2xl font-bold text-on-surface">Nenhuma OP encontrada no período</h3>
          <p className="text-on-surface-variant mt-2 max-w-sm">Ajuste o filtro de datas ou importe novas OPs para visualizar os dados aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredOrders.map((order, idx) => {
            const { separation, conference } = calculatePercentages(order.items);
            const isFullyComplete = separation === 100 && conference === 100;
            
            return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "bg-surface-container-lowest p-5 pl-7 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all relative overflow-hidden flex flex-col gap-4",
                  order.is_signed 
                    ? "border-l-4 border-l-emerald-500" 
                    : isFullyComplete 
                      ? "border-l-4 border-l-amber-400" 
                      : "border-l-4 border-l-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">OP Nº</span>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-headline font-black text-on-surface">#{order.order_number}</h4>
                      {order.source_type === 'pdf' && (
                        <FileText className="w-4 h-4 text-red-500 opacity-60" />
                      )}
                      {order.source_type === 'excel' && (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 opacity-60" />
                      )}
                      {order.sequence !== undefined && order.sequence !== null && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-sm">
                          SEQ: {order.sequence}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsReviewModalOpen(true);
                      }}
                      className="w-10 h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-2xl flex items-center justify-center transition-all border border-primary/20 active:scale-95 group/view shadow-sm"
                      title="Visualizar Detalhes"
                    >
                      <Eye size={20} className="group-hover/view:scale-110 transition-transform" />
                    </button>
                    {isFullyComplete && (
                      <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 block mb-1">Local</span>
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-xs font-bold truncate">{order.product_location || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 block mb-1">Data Upload</span>
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span className="text-xs font-bold">
                        {(() => {
                          const d = parseAnyDate(order.date || order.created_at);
                          if (!d) return 'N/A';
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-on-surface-variant">Separação</span>
                      <span className={cn(separation === 100 ? "text-emerald-500" : "text-primary")}>{separation}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", separation === 100 ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${separation}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-on-surface-variant">Conferência</span>
                      <span className={cn(conference === 100 ? "text-emerald-500" : "text-blue-500")}>{conference}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", conference === 100 ? "bg-emerald-500" : "bg-blue-500")}
                        style={{ width: `${conference}%` }}
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && !isViewer && order.is_signed && order.status !== 'Baixada' && (
                  <div className="mt-2">
                    <motion.button 
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsReviewModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Baixar OP
                    </motion.button>
                  </div>
                )}
                
                {order.status === 'Baixada' && (
                  <div className="mt-2 py-2.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OP Concluída
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Revisão da OP</h5>
                    <h1 className="text-4xl md:text-5xl font-headline font-black text-primary leading-none tracking-tighter">#{selectedOrder.order_number}</h1>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-8">
                  {/* Dados Gerais */}
                  <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                    <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Dados Gerais</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Linha de Produção</p>
                        <p className="font-bold text-on-surface">{selectedOrder.supplier_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Localização</p>
                        <p className="font-bold text-on-surface">{selectedOrder.product_location || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Data da OP</p>
                        <p className="font-bold text-on-surface">
                          {(() => {
                            const d = parseAnyDate(selectedOrder.date || selectedOrder.created_at);
                            return d ? d.toLocaleDateString('pt-BR') : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PIs Adicionadas */}
                  {selectedOrder.pis && selectedOrder.pis.length > 0 && (
                    <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                      <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Pedidos de Industrialização (PIs)</h4>
                      </div>
                      <div className="p-6 flex flex-wrap gap-3">
                        {selectedOrder.pis.map((pi, idx) => (
                          <div 
                            key={idx}
                            className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                          >
                            <Package className="w-3.5 h-3.5" />
                            {pi}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exibição da Assinatura no Review se existir */}
                  {selectedOrder.is_signed && (
                        <div className="bg-surface-container-high/20 rounded-[32px] border border-outline-variant/10 p-6 flex flex-col items-center gap-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Assinatura Eletrônica Registrada</p>
                          <div className="bg-white p-4 rounded-2xl w-full flex justify-center shadow-inner">
                            <img src={selectedOrder.signature_url} alt="Assinatura" className="h-32 object-contain" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-on-surface italic">Assinado por: {selectedOrder.signed_by_name}</p>
                            <p className="text-[10px] font-mono text-on-surface-variant opacity-50 uppercase">{selectedOrder.signed_at && new Date(selectedOrder.signed_at).toLocaleString()}</p>
                          </div>
                        </div>
                  )}

                  {/* Itens */}
                  <div className="bg-surface-container-high/40 rounded-[32px] border border-outline-variant/10 overflow-hidden">
                    <div className="bg-surface-container-high px-6 py-3 border-b border-outline-variant/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Itens da Operação</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 border-b border-outline-variant/10">Matéria-Prima</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 border-b border-outline-variant/10">Descrição da Matéria-Prima</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Local</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Qtd. Necessária</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Qtd. Separada</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Dif.</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-center border-b border-outline-variant/10">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant uppercase">
                                {item.code || 'S/ RED'}
                              </td>
                              <td className="px-6 py-4 uppercase">
                                <p className="text-sm font-bold text-on-surface leading-tight">{item.description}</p>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md">
                                  {item.location || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center font-bold text-on-surface">{item.planned_quantity}</td>
                              <td className="px-4 py-4 text-center font-bold text-primary">{item.quantity ?? ''}</td>
                              <td className="px-4 py-4 text-center">
                                <span className={cn(
                                  "text-[11px] font-black px-2 py-0.5 rounded-md",
                                  ((item.quantity ?? 0) - item.planned_quantity) >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                  {(item.quantity ?? 0) - item.planned_quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {item.is_conferred ? (
                                  <div className="flex items-center justify-center gap-1 text-emerald-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 opacity-60">PENDENTE</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Total Necessário</p>
                      <p className="text-xl font-headline font-black text-on-surface">
                        {selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Total Separado</p>
                      <p className="text-xl font-headline font-black text-primary">
                        {selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Diferença Total</p>
                      <p className={cn(
                        "text-xl font-headline font-black",
                        (selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0) || 0) - (selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0) || 0) >= 0 
                          ? "text-emerald-500" 
                          : "text-amber-500"
                      )}>
                        {(selectedOrder.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0) || 0) - (selectedOrder.items?.reduce((acc, i) => acc + i.planned_quantity, 0) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low/30 flex justify-end gap-4">
                <button 
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="px-8 py-4 bg-surface-container-high text-on-surface font-black uppercase tracking-widest rounded-2xl hover:bg-surface-container-highest transition-all"
                >
                  Fechar
                </button>
                {isAdmin && !isViewer && (
                  <button 
                    onClick={() => baixarOrder(selectedOrder)}
                    disabled={isProcessing}
                    className="px-8 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Confirmar Baixa de OP
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
