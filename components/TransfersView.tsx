'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeftRight, 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Calendar,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  Ban,
  Printer,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Navigation,
  Camera,
  PenTool,
  Image as ImageIcon,
  History,
  PackageCheck,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { sendGoogleChatNotification, sendPushNotification } from '@/lib/notifications';

interface TransferItem {
  code: string;
  description: string;
  quantity: number;
  transferred_quantity?: number;
  location?: string;
  checked?: boolean;
  attended_quantity?: number;
}

interface Transfer {
  id: string;
  transfer_number: string;
  date: string;
  origin: string;
  destination: string;
  carrier?: string;
  status: 'Pendente' | 'Conferida' | 'Atendida' | 'Cancelada';
  items: TransferItem[];
  pdf_url?: string;
  created_at: any;
  updated_at: any;
  created_by_name?: string;
  conferred_by_name?: string;
  conferred_at?: any;
  attended_by_name?: string;
  attended_at?: any;
  started_separation_at?: any;
  logs?: Array<{ step: string; timestamp: string; user: string }>;
  delivery_location_image?: string;
  delivery_location_saved_at?: any;
  delivery_location_saved_by?: string;
  signature_image?: string;
  signature_collected_at?: any;
  signature_collected_by?: string;
  signature_signed_by_name?: string;
  low_stock?: boolean;
  low_stock_at?: any;
  low_stock_by?: string;
}

export function formatElapsedTime(start: Date, end: Date): string {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return "00:00";
  const diffMs = end.getTime() - start.getTime();
  const totalSecs = Math.floor(diffMs / 1000);
  const secs = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const mins = totalMins % 60;
  const hours = Math.floor(totalMins / 60);

  const pad = (num: number) => String(num).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  }
  return `${pad(mins)}m ${pad(secs)}s`;
}

export function getBusinessMinutesElapsed(start: Date, end: Date): number {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  let totalMs = 0;
  const startHourLimit = 8;
  const endHourLimit = 18;
  const workHoursPerDay = endHourLimit - startHourLimit; // 10 horas

  let current = new Date(start.getTime());
  
  const isSameDay = current.getFullYear() === end.getFullYear() &&
                    current.getMonth() === end.getMonth() &&
                    current.getDate() === end.getDate();

  if (isSameDay) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Se não for fim de semana (0 = Dom, 6 = Sáb)
      const dayStart = new Date(current);
      dayStart.setHours(startHourLimit, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(endHourLimit, 0, 0, 0);

      const effectiveStart = current < dayStart ? dayStart : (current > dayEnd ? dayEnd : current);
      const effectiveEnd = end < dayStart ? dayStart : (end > dayEnd ? dayEnd : end);
      totalMs += Math.max(0, effectiveEnd.getTime() - effectiveStart.getTime());
    }
  } else {
    // 1. Primeiro dia parcial
    const dayOfWeekStart = current.getDay();
    if (dayOfWeekStart !== 0 && dayOfWeekStart !== 6) {
      const dayEnd = new Date(current);
      dayEnd.setHours(endHourLimit, 0, 0, 0);
      const dayStart = new Date(current);
      dayStart.setHours(startHourLimit, 0, 0, 0);
      
      const effectiveStart = current < dayStart ? dayStart : (current > dayEnd ? dayEnd : current);
      totalMs += Math.max(0, dayEnd.getTime() - effectiveStart.getTime());
    }

    // 2. Dias intermediários completos
    let tempDate = new Date(current);
    tempDate.setDate(tempDate.getDate() + 1);
    tempDate.setHours(0, 0, 0, 0);

    const endDateOnly = new Date(end);
    endDateOnly.setHours(0, 0, 0, 0);

    while (tempDate < endDateOnly) {
      const dow = tempDate.getDay();
      if (dow !== 0 && dow !== 6) { // Segunda a Sexta
        totalMs += workHoursPerDay * 60 * 60 * 1000;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 3. Último dia parcial
    const dayOfWeekEnd = end.getDay();
    if (dayOfWeekEnd !== 0 && dayOfWeekEnd !== 6) {
      const dayStart = new Date(end);
      dayStart.setHours(startHourLimit, 0, 0, 0);
      const dayEnd = new Date(end);
      dayEnd.setHours(endHourLimit, 0, 0, 0);

      const effectiveEnd = end < dayStart ? dayStart : (end > dayEnd ? dayEnd : end);
      totalMs += Math.max(0, effectiveEnd.getTime() - dayStart.getTime());
    }
  }

  return Math.floor(totalMs / (60 * 1000));
}

export function calculateBusinessTimeElapsed(start: Date, end: Date): string {
  const totalMinutes = getBusinessMinutesElapsed(start, end);
  if (totalMinutes === 0) return "0 min";
  if (totalMinutes < 1) return "Menos de 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const startHourLimit = 8;
  const endHourLimit = 18;
  const workHoursPerDay = endHourLimit - startHourLimit; // 10 horas

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < workHoursPerDay) {
    return `${hours}h ${minutes}min`;
  } else {
    const days = Math.floor(hours / workHoursPerDay);
    const remainingHours = hours % workHoursPerDay;
    if (days === 1) {
      return `1 dia comercial e ${remainingHours}h ${minutes}min`;
    }
    return `${days} dias comerciais e ${remainingHours}h ${minutes}min`;
  }
}

// Reproduz um sinal sonoro de notificação sintético usando a Web Audio API nava
export const playNotificationSound = () => {
  try {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      // Bipe 1 (Nota Ré5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Bipe 2 (Nota Lá5, tocando um pouco mais tarde)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 120);
    }
  } catch (err) {
    console.warn('Erro ao reproduzir som de notificação:', err);
  }
};

// Dispara uma notificação unificada com vibração e bipe de áudio no Android e Windows de forma assíncrona e resiliente
export const triggerSystemNotification = async (title: string, body: string) => {
  // 1. Vibração do celular (essencial no Android)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 100, 150]);
    } catch (e) {
      console.warn('Falha ao acionar vibração:', e);
    }
  }

  // 2. Tocar o som sintético
  playNotificationSound();

  // 3. Notificação visual de sistema
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const options = {
      body,
      icon: '/app-logo.png',
      badge: '/app-logo.png',
      vibrate: [150, 100, 150],
      tag: 'new-transfer',
      renotify: true,
      requireInteraction: true,
      data: {
        url: '/'
      }
    };

    // No Android/Chrome móvel, showNotification via Service Worker é obrigatório e robusto.
    if ('serviceWorker' in navigator) {
      try {
        // Tenta pegar registros de Service Worker já ativos de imediato
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations && registrations.length > 0) {
          await registrations[0].showNotification(title, options);
          return;
        }
        
        // Se não houver, espera até o service worker estar pronto
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn('Falha ao usar Service Worker para emitir notificação:', err);
      }
    }

    // Fallback apenas em desktop/dispositivos que aceitam o construtor nativo
    try {
      new Notification(title, options);
    } catch (err) {
      console.warn('Falha no construtor padrão de Notification (esperado no Android móvel):', err);
    }
  }
};

interface CustomSignatureCanvasProps {
  penColor?: string;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}

const CustomSignatureCanvas = React.forwardRef<any, CustomSignatureCanvasProps>(({ penColor = 'black', canvasProps }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Ajusta o tamanho real do buffer do canvas para coincidir com o tamanho visível na tela
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Define a resolução interna do canvas baseado no tamanho de renderização CSS
      canvas.width = rect.width || 300;
      canvas.height = rect.height || 150;
      
      // Limpar o canvas e redefinir o estilo de desenho após redimensionar
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    // Executa imediatamente e em redimensionamentos
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [penColor]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Suporta toques (touch) e cliques (mouse)
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: any) => {
    // Previne comportamento padrão de rolagem de tela no touch mobile!
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  React.useImperativeHandle(ref, () => ({
    isEmpty: () => !hasDrawn,
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasDrawn(false);
    },
    getTrimmedCanvas: () => {
      return {
        toDataURL: (type: string) => {
          const canvas = canvasRef.current;
          if (!canvas) return '';
          return canvas.toDataURL(type);
        }
      };
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      {...canvasProps}
    />
  );
});

const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto 2D do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
};

export function TransfersView({ 
  isAdmin, 
  userCategory 
}: { 
  isAdmin?: boolean; 
  userCategory?: string;
}) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const isFirstLoad = useRef(true);
  const [loading, setLoading] = useState(true);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  
  // Real-time timer tick for transfer cards
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Creation form state
  const [newTransfer, setNewTransfer] = useState<{
    transfer_number: string;
    date: string;
    origin: string;
    destination: string;
    carrier: string;
    items: TransferItem[];
  }>({
    transfer_number: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    destination: '',
    carrier: 'Jhon Alejandro Arevalo gomez',
    items: []
  });

  // Manual item input state
  const [manualItem, setManualItem] = useState<{
    code: string;
    description: string;
    quantity: number;
    location: string;
  }>({
    code: '',
    description: '',
    quantity: 1,
    location: ''
  });

  // UI feedback states
  const [filterText, setFilterText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationItems, setVerificationItems] = useState<TransferItem[]>([]);
  
  // Extra signature and camera states / refs
  const [isSigning, setIsSigning] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const sigCanvasRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch transfers on mount
  useEffect(() => {
    const q = query(collection(db, 'transfers'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Transfer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({ id: docSnap.id, ...data } as Transfer);
      });
      setTransfers(list);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao escutar transferências:", err);
      handleFirestoreError(err, OperationType.GET, 'transfers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sincronizar selectedTransfer com a lista transfers atualizada em tempo real via onSnapshot
  useEffect(() => {
    if (selectedTransfer) {
      const updated = transfers.find(t => t.id === selectedTransfer.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedTransfer)) {
          setSelectedTransfer(updated);
        }
      }
    }
  }, [transfers, selectedTransfer]);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    const text = filterText.toLowerCase().trim();
    if (!text) return transfers;
    return transfers.filter(t => 
      t.transfer_number.toLowerCase().includes(text) ||
      t.origin.toLowerCase().includes(text) ||
      t.destination.toLowerCase().includes(text) ||
      (t.carrier && t.carrier.toLowerCase().includes(text)) ||
      t.items.some(item => item.description.toLowerCase().includes(text) || item.code.toLowerCase().includes(text))
    );
  }, [transfers, filterText]);

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        setNotificationPermissionStatus(res);
      }
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Handle PDF Parsing via Gemini
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF de transferência.');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setError(null);
    setProcessingStatus('Enviando PDF ao Gemini para extrair os dados da transferência...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const response = await fetch('/api/gemini/parse-transfer-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64String })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Erro ao comunicar com o parsing de PDF.');
          }

          const resData = await response.json();
          const parsed = JSON.parse(resData.text);

          setNewTransfer({
            transfer_number: parsed.transfer_number || '',
            date: parsed.date || new Date().toISOString().split('T')[0],
            origin: parsed.origin || '',
            destination: parsed.destination || '',
            carrier: (parsed.carrier && (parsed.carrier.toLowerCase().includes('dayan') || parsed.carrier.toLowerCase().includes('jhon') || parsed.carrier.toLowerCase().includes('alejandro')))
              ? (parsed.carrier.toLowerCase().includes('dayan') ? 'Dayan' : 'Jhon Alejandro Arevalo gomez')
              : 'Jhon Alejandro Arevalo gomez',
            items: (parsed.items || []).map((item: any) => ({
              code: item.code || '',
              description: item.description || '',
              quantity: Number(item.quantity) || 0,
              transferred_quantity: 0,
              location: item.location || ''
            }))
          });

          setSuccess('Dados extraídos com sucesso! Por favor, revise e confirme os itens abaixo.');
          setIsProcessing(false);
          setProcessingStatus(null);
        } catch (innerErr: any) {
          console.error(innerErr);
          setError(innerErr.message || 'Erro ao processar PDF com a inteligência artificial.');
          setIsProcessing(false);
          setProcessingStatus(null);
        }
      };
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar o arquivo PDF.');
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Add item manually to form
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItem.description.trim()) {
      setError('A descrição do produto é obrigatória.');
      return;
    }
    if (manualItem.quantity <= 0) {
      setError('A quantidade deve ser maior que 0.');
      return;
    }

    const newItem: TransferItem = {
      code: manualItem.code.toUpperCase().trim(),
      description: manualItem.description.trim(),
      quantity: manualItem.quantity,
      transferred_quantity: 0,
      location: manualItem.location.trim()
    };

    setNewTransfer(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset manual item form
    setManualItem({
      code: '',
      description: '',
      quantity: 1,
      location: ''
    });
    setError(null);
  };

  // Remove item from creation list
  const handleRemoveItem = (index: number) => {
    setNewTransfer(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  // Save Transfer to Firestore
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { transfer_number, date, origin, destination, items } = newTransfer;

    if (!transfer_number.trim()) {
      setError('O número da transferência é obrigatório.');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setError('Os locais de origem e destino são obrigatórios.');
      return;
    }
    if (items.length === 0) {
      setError('É necessário adicionar ao menos um item na transferência.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Salvando transferência no banco de dados...');

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      const myDeviceId = typeof window !== 'undefined' ? localStorage.getItem('ventisol_device_session_id') || '' : '';
      
      const transferDoc = {
        transfer_number: transfer_number.trim(),
        date,
        origin: origin.trim(),
        destination: destination.trim(),
        carrier: newTransfer.carrier.trim() || 'Não especificado',
        status: 'Pendente',
        items: items.map(it => ({
          ...it,
          transferred_quantity: 0,
          attended_quantity: it.quantity,
          checked: false
        })),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by_name: currentUserName,
        device_id: myDeviceId,
        logs: [
          {
            step: 'Geração da Transferência',
            timestamp: new Date().toISOString(),
            user: currentUserName
          }
        ]
      };

      const docRef = await addDoc(collection(db, 'transfers'), transferDoc);

      // Trigger Push Notification to Google Chat Webhook
      const chatMessage = `🔄 *Nova Transferência Registrada*\n\n` +
        `*Documento:* #${transferDoc.transfer_number}\n` +
        `*Origem:* ${transferDoc.origin}\n` +
        `*Destino:* ${transferDoc.destination}\n` +
        `*Responsável:* ${transferDoc.carrier}\n` +
        `*Cadastrado por:* ${currentUserName}\n` +
        `*Itens:* ${transferDoc.items.length} produtos\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      // Envia notificação por push ativa via FCM para segundo plano (dispositivos fechados)
      try {
        await sendPushNotification(
          'Nova Transferência Registrada 🔄',
          `A transferência #${transferDoc.transfer_number} foi enviada de ${transferDoc.origin} para ${transferDoc.destination}`,
          auth.currentUser?.uid
        );
      } catch (pushErr) {
        console.error('Falha ao enviar notificação Push ativa:', pushErr);
      }

      // Dispatch Browser Local Notification
      const isEnabled = typeof window !== 'undefined' && localStorage.getItem('ventisol_notifications_enabled') !== 'false';
      if (isEnabled) {
        triggerSystemNotification(
          'Nova Transferência',
          `Transferência #${transferDoc.transfer_number} enviada de ${transferDoc.origin} para ${transferDoc.destination}`
        );
      }

      setSuccess('Transferência registrada com sucesso e notificações enviadas!');
      setIsModalOpen(false);
      setSelectedFile(null);
      setNewTransfer({
        transfer_number: '',
        date: new Date().toISOString().split('T')[0],
        origin: '',
        destination: '',
        carrier: '',
        items: []
      });
    } catch (err: any) {
      console.error(err);
      const detailedError = err.message || String(err);
      setError(`Erro ao salvar transferência no Firestore: ${detailedError}`);
      handleFirestoreError(err, OperationType.CREATE, 'transfers');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Open Details Modal
  const handleOpenDetail = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setVerificationItems(JSON.parse(JSON.stringify(transfer.items))); // Deep clone items for editing/conferring
    setIsVerifying(false);
    setIsDetailOpen(true);
  };

  // Start the physical verification and record start time in Firestore
  const handleStartSeparation = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);
    try {
      if (!selectedTransfer.started_separation_at) {
        const nowSecs = Math.floor(Date.now() / 1000);
        const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
        const updatedLogs = [
          ...(selectedTransfer.logs || []),
          {
            step: 'Início da Conferência',
            timestamp: new Date().toISOString(),
            user: currentUserName
          }
        ];
        
        await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
          started_separation_at: serverTimestamp(),
          logs: updatedLogs,
          updated_at: serverTimestamp()
        });
        
        // Update local object instantly
        setSelectedTransfer(prev => prev ? {
          ...prev,
          started_separation_at: { seconds: nowSecs },
          logs: updatedLogs
        } : null);
      }
      setIsVerifying(true);
    } catch (err: any) {
      console.error("Erro ao registrar início da separação:", err);
      setError("Erro ao iniciar a conferência/separação.");
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle checklist for item in verification
  const handleToggleItemCheck = (index: number) => {
    const updated = [...verificationItems];
    const item = updated[index];
    item.checked = !item.checked;
    
    // Automatically fill fully transferred if checked, or clear it if unchecked
    if (item.checked) {
      item.transferred_quantity = item.quantity;
    } else {
      item.transferred_quantity = 0;
    }
    setVerificationItems(updated);
  };

  // Handle specific manual transferred quantity change
  const handleTransferredQtyChange = (index: number, val: number) => {
    const updated = [...verificationItems];
    const item = updated[index];
    const qty = Math.max(0, val);
    item.transferred_quantity = qty;
    
    // Auto toggle check if transferred qty equals planned quantity
    item.checked = qty >= item.quantity;
    setVerificationItems(updated);
  };

  // Complete Transfer Verification Workflow
  const handleCompleteVerification = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const updatedLogs = [
        ...(selectedTransfer.logs || []),
        {
          step: 'Finalização da Conferência',
          timestamp: new Date().toISOString(),
          user: currentUserName
        }
      ];

      const updatedTransfer = {
        ...selectedTransfer,
        status: 'Conferida' as const,
        items: verificationItems,
        updated_at: serverTimestamp(),
        conferred_by_name: currentUserName,
        conferred_at: serverTimestamp(),
        logs: updatedLogs
      };

      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        status: 'Conferida',
        items: verificationItems,
        updated_at: serverTimestamp(),
        conferred_by_name: currentUserName,
        conferred_at: serverTimestamp(),
        logs: updatedLogs
      });

      // Send update chat notification
      const chatMessage = `✅ *Transferência Conferida e Finalizada*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Conferido por:* ${currentUserName}\n` +
        `*Resultado:* Itens conferidos no estoque de destino!\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess('Conferência finalizada com sucesso e atualizada no sistema!');
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar conferência no banco de dados.');
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Transfer
  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        status: 'Cancelada',
        updated_at: serverTimestamp()
      });

      // Send update chat notification
      const chatMessage = `🚫 *Transferência Cancelada*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess('Transferência cancelada com sucesso.');
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao cancelar a transferência.');
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark Transfer as Attended
  const handleMarkAsAttended = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      const now = new Date();
      
      const updatedLogs = [
        ...(selectedTransfer.logs || []),
        {
          step: 'Marcado como Atendida',
          timestamp: new Date().toISOString(),
          user: currentUserName
        }
      ];
      
      const updateData = {
        status: 'Atendida' as const,
        updated_at: serverTimestamp(),
        attended_by_name: currentUserName,
        attended_at: serverTimestamp(),
        logs: updatedLogs
      };

      await updateDoc(doc(db, 'transfers', selectedTransfer.id), updateData);

      // Calcular o tempo decorrido para a notificação
      const start = selectedTransfer.created_at?.seconds 
        ? new Date(selectedTransfer.created_at.seconds * 1000) 
        : (selectedTransfer.created_at instanceof Date ? selectedTransfer.created_at : new Date(selectedTransfer.created_at || now));
      
      const timeElapsed = calculateBusinessTimeElapsed(start, now);
      const businessMinutes = getBusinessMinutesElapsed(start, now);
      const isWithinSla = businessMinutes <= 10;
      const slaStatusText = isWithinSla ? "Dentro do SLA" : "Fora do SLA (Não está dentro do SLA)";

      // Send update chat notification
      const chatMessage = `📦 *Transferência Atendida e Concluída*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Atendido por:* ${currentUserName}\n` +
        `*Tempo Útil de Atendimento:* ${timeElapsed}\n` +
        `*SLA:* ${slaStatusText} (Limite: 10 min)\n` +
        `*Data:* ${now.toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess(`Transferência #${selectedTransfer.transfer_number} marcada como atendida com sucesso! Tempo de atendimento: ${timeElapsed} (${slaStatusText}).`);
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao marcar a transferência como atendida.');
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update the quantity of items served (attended_quantity)
  const handleUpdateAttendedQuantity = async (index: number, val: number) => {
    if (!selectedTransfer) return;
    const updatedItems = [...selectedTransfer.items];
    updatedItems[index] = {
      ...updatedItems[index],
      attended_quantity: Math.max(0, val)
    };
    
    const updatedTransfer = {
      ...selectedTransfer,
      items: updatedItems
    };
    
    setSelectedTransfer(updatedTransfer);
    
    try {
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        items: updatedItems,
        updated_at: serverTimestamp()
      });
    } catch (err) {
      console.error("Erro ao salvar quantidade atendida:", err);
    }
  };

  // Register image / photo of delivery location
  const handleRegisterDeliveryLocation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTransfer) return;
    
    setIsProcessing(true);
    setProcessingStatus('Compactando e salvando imagem do local de entrega...');
    setError(null);
    setSuccess(null);
    
    try {
      const base64Data = await compressImage(file, 800, 800, 0.7);
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const updatedLogs = [
        ...(selectedTransfer.logs || []),
        {
          step: 'Registro de Local de Entrega',
          timestamp: new Date().toISOString(),
          user: currentUserName
        }
      ];
      
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        delivery_location_image: base64Data,
        delivery_location_saved_at: serverTimestamp(),
        delivery_location_saved_by: currentUserName,
        logs: updatedLogs,
        updated_at: serverTimestamp()
      });
      
      setSelectedTransfer(prev => prev ? {
        ...prev,
        delivery_location_image: base64Data,
        delivery_location_saved_at: new Date(),
        delivery_location_saved_by: currentUserName,
        logs: updatedLogs
      } : null);
      
      setSuccess('Local de entrega registrado com sucesso!');
    } catch (err: any) {
      console.error("Erro ao registrar local de entrega:", err);
      setError("Erro ao salvar imagem do local de entrega: " + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Save handwritten signature
  const handleSaveSignature = async () => {
    if (!sigCanvasRef.current || !selectedTransfer) return;
    
    if (!signedByName.trim()) {
      setError("Por favor, digite o nome de quem está assinando.");
      return;
    }
    
    if (sigCanvasRef.current.isEmpty()) {
      setError("Por favor, desenhe sua assinatura no quadro.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const base64Data = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const updatedLogs = [
        ...(selectedTransfer.logs || []),
        {
          step: `Assinatura Coletada (${signedByName})`,
          timestamp: new Date().toISOString(),
          user: currentUserName
        }
      ];
      
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        signature_image: base64Data,
        signature_collected_at: serverTimestamp(),
        signature_collected_by: currentUserName,
        signature_signed_by_name: signedByName,
        logs: updatedLogs,
        updated_at: serverTimestamp()
      });
      
      setSelectedTransfer(prev => prev ? {
        ...prev,
        signature_image: base64Data,
        signature_collected_at: new Date(),
        signature_collected_by: currentUserName,
        signature_signed_by_name: signedByName,
        logs: updatedLogs
      } : null);
      
      setIsSigning(false);
      setSignedByName('');
      setSuccess('Assinatura salva com sucesso!');
    } catch (err) {
      console.error("Erro ao salvar assinatura:", err);
      setError("Erro ao salvar assinatura no banco de dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform stock write-off (low stock) and freeze actions
  const handlePerformLowStock = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema';
      
      const updatedLogs = [
        ...(selectedTransfer.logs || []),
        {
          step: 'Realizada Baixa de Estoque (Finalizado)',
          timestamp: new Date().toISOString(),
          user: currentUserName
        }
      ];
      
      await updateDoc(doc(db, 'transfers', selectedTransfer.id), {
        low_stock: true,
        low_stock_at: serverTimestamp(),
        low_stock_by: currentUserName,
        logs: updatedLogs,
        updated_at: serverTimestamp()
      });
      
      setSelectedTransfer(prev => prev ? {
        ...prev,
        low_stock: true,
        low_stock_at: new Date(),
        low_stock_by: currentUserName,
        logs: updatedLogs
      } : null);
      
      setSuccess('Baixa de estoque realizada com sucesso! A transferência foi concluída e arquivada.');
    } catch (err) {
      console.error("Erro ao dar baixa de estoque:", err);
      setError("Erro ao registrar a baixa de estoque.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Transfer
  const handleDeleteTransfer = async () => {
    if (!selectedTransfer) return;
    
    const confirmDelete = window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a transferência #${selectedTransfer.transfer_number}? Esta ação é irreversível.`);
    if (!confirmDelete) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteDoc(doc(db, 'transfers', selectedTransfer.id));

      // Send update chat notification
      const chatMessage = `🗑️ *Transferência Excluída*\n\n` +
        `*Documento:* #${selectedTransfer.transfer_number}\n` +
        `*Origem:* ${selectedTransfer.origin}\n` +
        `*Destino:* ${selectedTransfer.destination}\n` +
        `*Excluído por:* ${auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema'}\n` +
        `*Data:* ${new Date().toLocaleString('pt-BR')}`;
      
      await sendGoogleChatNotification(chatMessage);

      setSuccess(`Transferência #${selectedTransfer.transfer_number} excluída com sucesso.`);
      setIsDetailOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir a transferência do banco de dados.');
      handleFirestoreError(err, OperationType.DELETE, `transfers/${selectedTransfer.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Print using the System's standard #print-area mechanism
  const handlePrint = () => {
    if (!selectedTransfer) return;
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" id="transfers-container">
      {/* Dynamic Style Injection for Print - No-Omission Rule Guarantee */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 1.5cm !important;
            box-sizing: border-box !important;
          }
        }
      `}} />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Painel de Transferências</h2>
          <p className="text-sm text-on-surface-variant">Gerencie transferências de estoque entre depósitos, revise itens e registre conferências de entrada.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all text-sm cursor-pointer"
        >
          <Plus size={20} />
          Nova Transferência
        </button>
      </div>

      {/* Banner de Status de Notificação para Android e Desktop */}
      {notificationPermissionStatus !== 'granted' && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-on-surface">Notificações Desativadas no Aparelho</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Para receber alertas sonoros e vibrações instantâneas de novas transferências neste dispositivo, ative as notificações.
              </p>
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                💡 No Android: Toque no ícone de opções/cadeado ao lado da barra de endereços do Chrome e mude "Notificações" para "Permitir". Se for PWA instalado, vá em Ajustes do Android {`>`} Aplicativos {`>`} Almoxarifado Ventisol {`>`} Notificações e ative.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                const res = await Notification.requestPermission();
                setNotificationPermissionStatus(res);
                if (res === 'granted') {
                  triggerSystemNotification('Notificações Ativadas!', 'Você agora receberá alertas sonoros e vibrações de novas transferências!');
                }
              }
            }}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border border-amber-500/30 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            Ativar Alertas
          </button>
        </div>
      )}

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3 text-error"
          >
            <AlertCircle className="shrink-0" size={20} />
            <span className="text-sm font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 rounded-lg hover:bg-error/10">
              <X size={16} />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-success/10 border border-success/20 flex items-center gap-3 text-success animate-pulse-once"
          >
            <CheckCircle2 className="shrink-0" size={20} />
            <span className="text-sm font-semibold">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto p-1 rounded-lg hover:bg-success/10">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por número da transferência, depósito, transportadora ou produtos..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/15 rounded-2xl text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>
      </div>

      {/* Grid of Transfers */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p className="text-sm font-medium text-on-surface-variant">Carregando transferências...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/20 p-8">
          <ArrowLeftRight size={48} className="text-on-surface-variant/45 mb-4" />
          <h3 className="text-base font-bold text-on-surface">Nenhuma transferência encontrada</h3>
          <p className="text-sm text-on-surface-variant max-w-md mt-1">Nenhuma transferência de estoque foi localizada. Crie uma nova transferência manualmente ou envie um arquivo PDF para carregar automaticamente.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTransfers.map((t) => {
            const pending = t.status === 'Pendente';
            const conferred = t.status === 'Conferida';
            const attended = t.status === 'Atendida';
            const cancelled = t.status === 'Cancelada';

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-5 rounded-3xl border flex flex-col justify-between transition-all bg-surface hover:shadow-md cursor-pointer",
                  attended ? "border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/5" :
                  conferred ? "border-success/25 hover:border-success/40" : 
                  cancelled ? "border-outline-variant/20 bg-surface-container-lowest" : "border-outline-variant/20 hover:border-primary/30"
                )}
                onClick={() => handleOpenDetail(t)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-bold text-sm text-primary">#{t.transfer_number}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide",
                      attended ? "bg-emerald-500/12 text-emerald-600" :
                      conferred ? "bg-success/12 text-success" : 
                      cancelled ? "bg-outline-variant/15 text-on-surface-variant/80" : "bg-warning/12 text-warning"
                    )}>
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
                    <Calendar size={14} />
                    <span>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0" />
                      <div className="text-xs">
                        <span className="text-on-surface-variant block font-medium">Origem</span>
                        <span className="font-bold text-on-surface">{t.origin}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-tertiary shrink-0" />
                      <div className="text-xs">
                        <span className="text-on-surface-variant block font-medium">Destino</span>
                        <span className="font-bold text-on-surface">{t.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cronômetro e Estatísticas de Tempo */}
                  {!cancelled && (() => {
                    const start = t.created_at?.seconds 
                      ? new Date(t.created_at.seconds * 1000) 
                      : (t.created_at instanceof Date ? t.created_at : null);
                    
                    const separation = (t as any).started_separation_at?.seconds 
                      ? new Date((t as any).started_separation_at.seconds * 1000) 
                      : ((t as any).started_separation_at instanceof Date ? (t as any).started_separation_at : null);

                    const end = t.attended_at?.seconds 
                      ? new Date(t.attended_at.seconds * 1000) 
                      : (t.attended_at instanceof Date ? t.attended_at : null);

                    if (!start) return null;

                    if (attended && end) {
                      const uploadTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const separationTime = separation 
                        ? separation.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : 'Não inc.';
                      const totalDuration = formatElapsedTime(start, end);

                      return (
                        <div className="mt-2 p-2.5 bg-emerald-500/8 border border-emerald-500/10 rounded-2xl space-y-1 text-[10px] text-on-surface-variant">
                          <div className="flex justify-between">
                            <span>📤 Upload: <strong className="text-on-surface">{uploadTime}</strong></span>
                            <span>⚡ Separação: <strong className="text-on-surface">{separationTime}</strong></span>
                          </div>
                          <div className="flex justify-between border-t border-emerald-500/10 pt-1 mt-1 font-semibold text-emerald-700">
                            <span>⏱️ Tempo Total:</span>
                            <span className="font-mono font-bold">{totalDuration}</span>
                          </div>
                        </div>
                      );
                    } else {
                      const timeStr = formatElapsedTime(start, now);
                      return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-[11px] font-mono font-bold mt-2 animate-pulse">
                          <Clock size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Tempo Decorrido: {timeStr}</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Package size={14} />
                    <span className="font-semibold">{t.items.length} {t.items.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span>Ver Detalhes</span>
                    <Eye size={14} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface w-full max-w-2xl rounded-3xl shadow-xl border border-outline-variant/10 overflow-hidden flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="text-primary" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Nova Transferência</h3>
                    <p className="text-xs text-on-surface-variant">Carregue por PDF para preenchimento rápido ou insira manualmente.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Scroll Area */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* PDF Drag / Drop area */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-on-surface uppercase tracking-wider">Upar Arquivo PDF da Transferência</span>
                  <div className="relative border border-dashed border-primary/20 rounded-2xl bg-primary/5 p-6 text-center hover:bg-primary/8 transition-colors">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="text-primary" size={28} />
                      <span className="text-sm font-bold text-primary">Selecione ou Arraste o arquivo PDF aqui</span>
                      <span className="text-xs text-on-surface-variant">Gemini lerá o número, depósitos e itens para você</span>
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-surface-container-high border border-outline-variant/10 rounded-xl flex items-center gap-2.5">
                      <FileText size={18} className="text-primary" />
                      <span className="text-xs font-bold text-on-surface truncate flex-1">{selectedFile.name}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">PDF</span>
                    </div>
                  )}
                  {isProcessing && (
                    <div className="flex items-center gap-2.5 p-3 bg-primary/5 text-primary border border-primary/10 rounded-xl">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-xs font-semibold">{processingStatus}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-outline-variant/10" />

                {/* Form Inputs */}
                {selectedFile && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-primary">
                      <ClipboardCheck size={16} />
                      <span className="block text-xs font-bold text-on-surface uppercase tracking-wider">Dados Principais da Transferência (Prévia do PDF)</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-80 pointer-events-none">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant">Número do Documento</label>
                        <input 
                          type="text" 
                          disabled
                          value={newTransfer.transfer_number}
                          className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/15 rounded-xl text-sm text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant">Data da Transferência</label>
                        <input 
                          type="date" 
                          disabled
                          value={newTransfer.date}
                          className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/15 rounded-xl text-sm text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant">Depósito de Origem</label>
                        <input 
                          type="text" 
                          disabled
                          value={newTransfer.origin}
                          className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/15 rounded-xl text-sm text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant">Depósito de Destino</label>
                        <input 
                          type="text" 
                          disabled
                          value={newTransfer.destination}
                          className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/15 rounded-xl text-sm text-on-surface"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant">Responsável pela Transferência</label>
                        <input 
                          type="text" 
                          disabled
                          value={newTransfer.carrier}
                          className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/15 rounded-xl text-sm text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <>
                    <div className="h-px bg-outline-variant/10" />

                    {/* Items Preview List */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-on-surface-variant">Produtos na Transferência ({newTransfer.items.length})</span>
                      {newTransfer.items.length === 0 ? (
                        <div className="p-6 bg-surface-container-low text-center rounded-2xl border border-dashed border-outline-variant/20 text-xs text-on-surface-variant">
                          Nenhum produto extraído do PDF da transferência.
                        </div>
                      ) : (
                        <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                          {newTransfer.items.map((it, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-container-lowest transition-colors text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {it.code && <span className="font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface-variant">{it.code}</span>}
                                  <span className="font-bold text-on-surface truncate block">{it.description}</span>
                                </div>
                                {it.location && <span className="text-[10px] text-on-surface-variant">Loc: {it.location}</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-on-surface text-sm">{it.quantity} un</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={newTransfer.items.length === 0 || isProcessing}
                  onClick={handleSaveTransfer}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Registrar Transferência
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details & Verification Drawer */}
      <AnimatePresence>
        {isDetailOpen && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}>
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-surface w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="text-primary" size={24} />
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Transferência #{selectedTransfer.transfer_number}</h3>
                    <p className="text-xs text-on-surface-variant">Detalhes e conferência física de entrada</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Status and info */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low border border-outline-variant/10 rounded-2xl">
                  <div className="space-y-1 text-xs">
                    <span className="text-on-surface-variant block">Status Atual</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide",
                      selectedTransfer.status === 'Atendida' ? "bg-emerald-500/12 text-emerald-600" :
                      selectedTransfer.status === 'Conferida' ? "bg-success/12 text-success" : 
                      selectedTransfer.status === 'Cancelada' ? "bg-outline-variant/15 text-on-surface-variant/80" : "bg-warning/12 text-warning"
                    )}>
                      {selectedTransfer.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-right">
                    <span className="text-on-surface-variant block">Data do Envio</span>
                    <span className="font-bold text-on-surface">{new Date(selectedTransfer.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Warehouse Route */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rota de Logística</span>
                  <div className="grid grid-cols-2 gap-4 p-4 border border-outline-variant/10 rounded-2xl bg-surface">
                    <div className="border-r border-outline-variant/10 pr-3">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Origem</span>
                      <span className="text-xs font-bold text-on-surface mt-1 block">{selectedTransfer.origin}</span>
                    </div>
                    <div className="pl-3">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Destino</span>
                      <span className="text-xs font-bold text-on-surface mt-1 block">{selectedTransfer.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Carrier details */}
                <div className="space-y-2 text-xs">
                  <div className="p-4 border border-outline-variant/10 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <User size={15} />
                      <span className="font-semibold">Responsável:</span>
                      <span className="font-bold text-on-surface">{selectedTransfer.carrier || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Clock size={15} />
                      <span className="font-semibold">Criado por:</span>
                      <span className="font-bold text-on-surface">{selectedTransfer.created_by_name || 'Sistema'}</span>
                    </div>
                    {selectedTransfer.conferred_by_name && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={15} />
                        <span className="font-semibold">Conferido por:</span>
                        <span className="font-bold">{selectedTransfer.conferred_by_name}</span>
                      </div>
                    )}
                    {selectedTransfer.attended_by_name && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 size={15} />
                        <span className="font-semibold">Atendido por:</span>
                        <span className="font-bold">{selectedTransfer.attended_by_name}</span>
                      </div>
                    )}
                    {(() => {
                      const start = selectedTransfer.created_at?.seconds 
                        ? new Date(selectedTransfer.created_at.seconds * 1000) 
                        : (selectedTransfer.created_at instanceof Date ? selectedTransfer.created_at : null);

                      const separation = selectedTransfer.started_separation_at?.seconds 
                        ? new Date(selectedTransfer.started_separation_at.seconds * 1000) 
                        : (selectedTransfer.started_separation_at instanceof Date ? selectedTransfer.started_separation_at : null);

                      const end = selectedTransfer.attended_at?.seconds 
                        ? new Date(selectedTransfer.attended_at.seconds * 1000) 
                        : (selectedTransfer.attended_at instanceof Date ? selectedTransfer.attended_at : null);

                      if (!start) return null;

                      const uploadFormatted = start.toLocaleString('pt-BR');
                      const separationFormatted = separation ? separation.toLocaleString('pt-BR') : 'Aguardando início da separação';
                      const isAttended = selectedTransfer.status === 'Atendida';
                      const totalTimeStr = isAttended && end 
                        ? formatElapsedTime(start, end)
                        : formatElapsedTime(start, now);

                      return (
                        <div className="pt-3 border-t border-outline-variant/10 mt-2 space-y-2.5">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">Cronologia e Monitoramento</span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/5">
                              <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Horário de Upload</span>
                              <span className="text-xs font-bold text-on-surface mt-0.5 block">{uploadFormatted}</span>
                            </div>

                            <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/5">
                              <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Início da Separação</span>
                              <span className="text-xs font-bold text-on-surface mt-0.5 block">{separationFormatted}</span>
                            </div>
                          </div>

                          <div className={cn(
                            "p-3 rounded-xl border flex items-center justify-between",
                            isAttended 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400" 
                              : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400 animate-pulse"
                          )}>
                            <div className="flex items-center gap-2">
                              <Clock size={16} className={isAttended ? "" : "animate-spin"} style={{ animationDuration: isAttended ? undefined : '3s' }} />
                              <div>
                                <span className="text-[10px] uppercase block font-semibold">
                                  {isAttended ? 'Tempo Total de Atendimento' : 'Tempo de Atendimento (Correndo)'}
                                </span>
                                <span className="text-sm font-extrabold font-mono mt-0.5 block">{totalTimeStr}</span>
                              </div>
                            </div>
                          </div>

                          {isAttended && end && (() => {
                            const businessMinutes = getBusinessMinutesElapsed(start, end);
                            const withinSla = businessMinutes <= 10;
                            return (
                              <div className="space-y-2">
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary flex items-center justify-between text-xs font-semibold">
                                  <span>SLA:</span>
                                  <span className="font-extrabold font-mono bg-primary/20 px-2.5 py-1 rounded">
                                    {calculateBusinessTimeElapsed(start, end)}
                                  </span>
                                </div>
                                
                                {withinSla ? (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span>✓ Dentro do SLA (Limite: 10 min)</span>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error flex items-center gap-2 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-error shrink-0 animate-pulse" />
                                    <span>⚠️ Não está dentro do SLA (Limite: 10 min)</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Verification/Items Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lista de Produtos ({selectedTransfer.items.length})</span>
                    {selectedTransfer.status === 'Pendente' && !isVerifying && (
                      <button 
                        onClick={handleStartSeparation}
                        className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-primary/15"
                      >
                        <Check size={14} />
                        Iniciar Conferência
                      </button>
                    )}
                  </div>

                  {/* Standard Display Items List */}
                  {!isVerifying ? (
                    <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                      {selectedTransfer.items.map((it, idx) => {
                        const verifiedOk = selectedTransfer.status === 'Conferida' && it.transferred_quantity === it.quantity;
                        const verifiedDivergent = selectedTransfer.status === 'Conferida' && it.transferred_quantity !== it.quantity;

                        return (
                          <div key={idx} className="p-3.5 flex flex-col gap-2.5 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {it.code && <span className="font-mono bg-surface-container-high px-1 rounded text-[9px] font-bold text-on-surface-variant">{it.code}</span>}
                                  <span className="font-bold text-on-surface truncate">{it.description}</span>
                                </div>
                                {it.location && <span className="text-[10px] text-on-surface-variant mt-0.5 block">Loc: {it.location}</span>}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-on-surface font-mono">
                                  {selectedTransfer.status === 'Conferida' ? (
                                    <span className={cn(verifiedDivergent ? "text-error" : "text-success")}>
                                      Conf: {it.transferred_quantity} / {it.quantity} un
                                    </span>
                                  ) : (
                                    <span>Plan: {it.quantity} un</span>
                                  )}
                                </div>
                                {verifiedDivergent && (
                                  <span className="text-[9px] text-error font-semibold uppercase">Divergência</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Nova coluna / campo de quantidade atendida */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/5 bg-surface-container-lowest/40 p-1.5 rounded-lg mt-0.5">
                              <span className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
                                <PackageCheck size={12} className="text-primary" />
                                Qtd. Atendida:
                              </span>
                              
                              {selectedTransfer.low_stock ? (
                                <span className="font-mono font-bold text-success text-xs bg-success/10 px-2 py-0.5 rounded">
                                  {it.attended_quantity !== undefined ? it.attended_quantity : it.quantity} un
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="number" 
                                    min={0}
                                    disabled={isProcessing}
                                    value={it.attended_quantity !== undefined ? it.attended_quantity : it.quantity}
                                    onChange={(e) => handleUpdateAttendedQuantity(idx, Number(e.target.value))}
                                    className="w-16 px-2 py-0.5 bg-surface border border-outline-variant/20 rounded-md text-center font-mono font-bold text-on-surface text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                                  />
                                  <span className="text-[10px] text-on-surface-variant font-mono">un</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Verification Mode Interactive List */
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/5 text-primary rounded-xl text-[11px] font-semibold flex items-center gap-2 border border-primary/10">
                        <AlertCircle size={15} />
                        Defina a quantidade de produtos conferidos fisicamente ou clique na caixa para atestar integralmente.
                      </div>
                      
                      <div className="border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10 bg-surface">
                        {verificationItems.map((it, idx) => (
                          <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-lowest transition-colors text-xs">
                            <div className="min-w-0 flex-1 flex items-center gap-2.5">
                              {/* Custom Checkbox Toggle */}
                              <button 
                                type="button"
                                onClick={() => handleToggleItemCheck(idx)}
                                className={cn(
                                  "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                                  it.checked ? "bg-success border-success text-white" : "border-outline-variant/40 hover:border-primary/50"
                                )}
                              >
                                {it.checked && <Check size={14} />}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-on-surface truncate block">{it.description}</span>
                                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                                  {it.code && <span className="font-mono bg-surface-container-high px-1 rounded">{it.code}</span>}
                                  <span>Meta: {it.quantity} un</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Manual quantity input */}
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs font-semibold text-on-surface-variant">Recebido:</span>
                              <input 
                                type="number" 
                                min={0}
                                max={it.quantity * 2} // Allow extra/divergent receipt if physically loaded
                                value={it.transferred_quantity}
                                onChange={(e) => handleTransferredQtyChange(idx, Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-surface border border-outline-variant/20 rounded-lg text-center font-mono font-bold text-on-surface text-xs focus:outline-none focus:border-primary"
                              />
                              <span className="font-mono text-[10px] text-on-surface-variant/70">un</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mídias de Entrega (Foto Local e Assinatura) */}
                {(selectedTransfer.delivery_location_image || selectedTransfer.signature_image) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-outline-variant/10 pt-4 mt-4">
                    {selectedTransfer.delivery_location_image && (
                      <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5 space-y-2 text-center">
                        <span className="block text-[10px] font-bold uppercase text-on-surface-variant flex items-center justify-center gap-1">
                          <Camera size={12} className="text-primary" />
                          Local de Entrega Registrado
                        </span>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/10 bg-black/10">
                          <img 
                            src={selectedTransfer.delivery_location_image} 
                            alt="Local de Entrega" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {selectedTransfer.delivery_location_saved_by && (
                          <span className="block text-[9px] text-on-surface-variant font-mono">
                            Por {selectedTransfer.delivery_location_saved_by}
                          </span>
                        )}
                      </div>
                    )}

                    {selectedTransfer.signature_image && (
                      <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5 space-y-2 text-center">
                        <span className="block text-[10px] font-bold uppercase text-on-surface-variant flex items-center justify-center gap-1">
                          <PenTool size={12} className="text-primary" />
                          Assinatura Coletada
                        </span>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/10 bg-white flex items-center justify-center p-2">
                          <img 
                            src={selectedTransfer.signature_image} 
                            alt="Assinatura" 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        {selectedTransfer.signature_signed_by_name && (
                          <span className="block text-[9px] text-on-surface-variant font-mono">
                            Signatário: {selectedTransfer.signature_signed_by_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Interface Coletor de Assinatura Eletrônica Manuscrita */}
                {isSigning && (
                  <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15 space-y-3.5 border-t border-outline-variant/10 pt-4 mt-4">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                      <span className="flex items-center gap-1.5">
                        <PenTool size={14} className="text-primary" />
                        Assinatura Eletrônica Manuscrita
                      </span>
                      <button 
                        onClick={() => setIsSigning(false)}
                        className="text-error font-semibold hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant">Nome Completo do Signatário / Recebedor</label>
                      <input 
                        type="text"
                        placeholder="Digite o nome de quem está recebendo"
                        value={signedByName}
                        onChange={(e) => setSignedByName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-outline-variant/15 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant">Assinatura no Quadro Abaixo</label>
                      <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-white">
                        <CustomSignatureCanvas 
                          ref={sigCanvasRef}
                          penColor="black"
                          canvasProps={{
                            className: "w-full h-36 cursor-crosshair bg-white"
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sigCanvasRef.current?.clear()}
                        className="flex-1 py-2 bg-surface-container-high hover:bg-outline-variant/15 text-on-surface-variant font-bold rounded-xl text-xs transition-all"
                      >
                        Limpar Quadro
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSignature}
                        className="flex-1 py-2 bg-primary text-primary-container font-bold rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Confirmar e Salvar
                      </button>
                    </div>
                  </div>
                )}

                {/* Rastreabilidade e Logs de Auditoria */}
                <div className="space-y-2 border-t border-outline-variant/10 pt-4 mt-4">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    <History size={14} className="text-primary" />
                    <span>Rastreabilidade e Logs (Tempo Real)</span>
                  </div>
                  
                  <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/5 space-y-3 max-h-48 overflow-y-auto">
                    {selectedTransfer.logs && selectedTransfer.logs.length > 0 ? (
                      <div className="relative border-l-2 border-primary/20 ml-2 pl-4 space-y-4 py-1">
                        {selectedTransfer.logs.map((log, index) => (
                          <div key={index} className="relative text-xs">
                            {/* Bullet indicator */}
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface" />
                            
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{log.step}</span>
                              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                                <span className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono font-bold">{log.user}</span>
                                <span>•</span>
                                <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-on-surface-variant text-center py-2">
                        Nenhum log gravado para esta transferência.
                      </p>
                    )}
                  </div>
                </div>
                </div>

              {/* Printable sheet container wrapper inside dynamic view (hidden from view, shown on print via @media) */}
              <div id="print-area" className="hidden p-8" style={{ fontFamily: 'monospace' }}>
                <div style={{ borderBottom: '2px double black', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>ALMOXARIFADO VENTISOL</h1>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>DOCUMENTO DE TRANSFERÊNCIA DE ESTOQUE</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '12px' }}>
                  <div>
                    <p><strong>Número:</strong> #{selectedTransfer.transfer_number}</p>
                    <p><strong>Origem:</strong> {selectedTransfer.origin}</p>
                    <p><strong>Destino:</strong> {selectedTransfer.destination}</p>
                  </div>
                  <div>
                    <p><strong>Data:</strong> {new Date(selectedTransfer.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    <p><strong>Responsável:</strong> {selectedTransfer.carrier || 'Não informado'}</p>
                    <p><strong>Status:</strong> {selectedTransfer.status}</p>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid black', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0' }}>Código</th>
                      <th style={{ padding: '6px 0' }}>Descrição / Produto</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Qtd. Solicitada</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Qtd. Conferida</th>
                      <th style={{ padding: '6px 0' }}>Localização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                        <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{it.code || '-'}</td>
                        <td style={{ padding: '8px 0' }}>{it.description}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{it.quantity}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{selectedTransfer.status === 'Conferida' ? it.transferred_quantity : '______'}</td>
                        <td style={{ padding: '8px 0' }}>{it.location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ borderTop: '1px solid black', paddingTop: '8px' }}>
                    <p>Assinatura Expedição (Origem)</p>
                    <p style={{ fontSize: '9px', color: '#666' }}>Data: ___/___/______</p>
                  </div>
                  <div style={{ borderTop: '1px solid black', paddingTop: '8px' }}>
                    <p>Assinatura Recebimento (Destino)</p>
                    <p style={{ fontSize: '9px', color: '#666' }}>Data: ___/___/______</p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest space-y-3">
                {isVerifying ? (
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsVerifying(false)}
                      className="flex-1 py-2.5 bg-surface border border-outline-variant/20 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-all"
                    >
                      Voltar ao Detalhe
                    </button>
                    <button 
                      type="button"
                      onClick={handleCompleteVerification}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-success text-white rounded-xl font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Finalizar Conferência
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Input invisível de captura de imagem pela Câmera */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      ref={fileInputRef} 
                      onChange={handleRegisterDeliveryLocation} 
                      className="hidden" 
                    />

                    {selectedTransfer.low_stock ? (
                      /* Se a transferência já tiver baixa dada */
                      <div className="p-3 bg-success/10 text-success border border-success/20 rounded-xl text-xs text-center font-bold flex flex-col gap-1">
                        <span>✓ Transferência Concluída e Baixada</span>
                        <span className="text-[10px] font-normal text-on-surface-variant">Todas as etapas e baixas do estoque foram executadas.</span>
                      </div>
                    ) : (
                      /* Fluxo de botões interativos baseado em status e pendências */
                      <div className="space-y-3">
                        {/* 1. Registrar Local de Entrega (Exibido acima de Marcar como Atendida após conferido) */}
                        {selectedTransfer.status === 'Conferida' && (
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="w-full py-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <Camera size={15} />
                            {selectedTransfer.delivery_location_image ? "Atualizar Foto Local de Entrega" : "Registrar Local de Entrega"}
                          </button>
                        )}

                        {/* 2. Marcar como Atendida (Só disponível se o Local de Entrega for salvo) */}
                        {(selectedTransfer.status === 'Pendente' || selectedTransfer.status === 'Conferida') && (
                          <div className="space-y-1">
                            <button 
                              type="button"
                              onClick={handleMarkAsAttended}
                              disabled={isProcessing || (selectedTransfer.status === 'Conferida' && !selectedTransfer.delivery_location_image)}
                              className={cn(
                                "w-full py-3 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-sans shadow-lg",
                                (selectedTransfer.status === 'Conferida' && !selectedTransfer.delivery_location_image)
                                  ? "bg-surface-container-high text-on-surface-variant border border-outline-variant/10 cursor-not-allowed opacity-50 shadow-none"
                                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-600/10 hover:shadow-emerald-600/20"
                              )}
                            >
                              {isProcessing ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                              Marcar como Atendida
                            </button>
                            {selectedTransfer.status === 'Conferida' && !selectedTransfer.delivery_location_image && (
                              <p className="text-[10px] text-center text-error font-medium">
                                * Salve o Local de Entrega antes de marcar como atendida
                              </p>
                            )}
                          </div>
                        )}

                        {/* 3. Coletar Assinatura (Surge após Marcar como Atendida) */}
                        {selectedTransfer.status === 'Atendida' && !selectedTransfer.signature_image && !isSigning && (
                          <button 
                            type="button"
                            onClick={() => setIsSigning(true)}
                            disabled={isProcessing}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer font-sans"
                          >
                            <PenTool size={15} />
                            Coletar Assinatura Recebedor
                          </button>
                        )}

                        {/* 4. Realizar Baixa (Surge após assinada) */}
                        {selectedTransfer.status === 'Atendida' && selectedTransfer.signature_image && (
                          <button 
                            type="button"
                            onClick={handlePerformLowStock}
                            disabled={isProcessing}
                            className="w-full py-3 bg-success hover:bg-success-hover active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-success/15 transition-all cursor-pointer font-sans"
                          >
                            {isProcessing ? (
                              <Loader2 className="animate-spin" size={15} />
                            ) : (
                              <PackageCheck size={15} />
                            )}
                            Realizar Baixa no Estoque
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handlePrint}
                        className="flex-1 py-2.5 bg-surface-container-high hover:bg-outline-variant/15 border border-outline-variant/15 text-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Printer size={15} />
                        Imprimir Ficha
                      </button>
                      
                      {selectedTransfer.status === 'Pendente' && !selectedTransfer.low_stock && (
                        <button 
                          onClick={handleCancelTransfer}
                          disabled={isProcessing}
                          className="flex-1 py-2.5 bg-error/10 hover:bg-error/15 border border-error/20 text-error font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Ban size={15} />
                          Cancelar TR
                        </button>
                      )}

                      {/* Botão de exclusão visível para Admins */}
                      {isAdmin && (
                        <button 
                          onClick={handleDeleteTransfer}
                          disabled={isProcessing}
                          className="py-2.5 px-3 bg-error/10 hover:bg-error/15 border border-error/20 text-error font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
                          title="Excluir Transferência"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setIsDetailOpen(false);
                        setIsSigning(false);
                      }}
                      className="w-full py-2 text-center text-xs text-on-surface-variant font-bold hover:underline"
                    >
                      Fechar Painel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
