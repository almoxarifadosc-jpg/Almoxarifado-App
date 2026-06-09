'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Truck, 
  ShieldAlert, 
  FileText, 
  Plus, 
  Ban, 
  CheckCircle2, 
  User, 
  Info, 
  Trash2, 
  ArrowUpDown, 
  Navigation,
  FilePlus,
  RefreshCw,
  PackageOpen,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { InfoView } from '@/components/InfoView';

// interfaces locais
interface OpItem {
  codigo: string;
  nome: string;
  qtd: number;
  separado: boolean;
}

interface Op {
  id?: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  status: 'pendente' | 'separando' | 'concluido' | 'cancelada';
  furos: string;
  licitacao: string;
  sequencia: number;
  itens: OpItem[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Operation {
  id: string;
  iconType?: 'factory' | 'settings' | 'check' | string;
  line?: string;
  quantity: number;
  date: string;
  steps: boolean[];
  progress: number;
  isUrgente?: boolean;
  isLicitacao?: boolean;
  isAtrasada?: boolean;
  isCompleted?: boolean;
}

interface DockLoad {
  id?: string;
  fornecedor: string;
  material: string;
  placa: string;
  status: 'aguardando' | 'descarregando' | 'concluido';
  doca: string;
  tempoEstimado: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'separacao' | 'dock' | 'simulador' | 'admin'>('separacao');
  const [perfil, setPerfil] = useState<'fabrica' | 'almoxarifado' | 'conferente' | 'admin'>('admin');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Firestore States
  const [ops, setOps] = useState<Op[]>([]);
  const [dockLoads, setDockLoads] = useState<DockLoad[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [loadingLoads, setLoadingLoads] = useState(true);

  // Form states de cadastro
  const [newOpCode, setNewOpCode] = useState('');
  const [newOpDesc, setNewOpDesc] = useState('');
  const [newOpQty, setNewOpQty] = useState(100);
  const [newOpFuros, setNewOpFuros] = useState('Sem furação extra');
  const [newOpLicitacao, setNewOpLicitacao] = useState('Não se aplica');
  
  const [newDockFornecedor, setNewDockFornecedor] = useState('');
  const [newDockMaterial, setNewDockMaterial] = useState('');
  const [newDockPlaca, setNewDockPlaca] = useState('');
  const [newDockDoca, setNewDockDoca] = useState('Doca 1 - Central');
  const [newDockTempo, setNewDockTempo] = useState(45);

  // Estado da OP selecionada para checklist operacional
  const [selectedOp, setSelectedOp] = useState<Op | null>(null);

  // 1. Autenticação anônima silenciosa para habilitar o Firestore seguro (e-mail provido como admin na regra)
  useEffect(() => {
    const loginSilencioso = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Erro no login silencioso de desenvolvimento:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (!user) {
        loginSilencioso();
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Listeners para OPs e Cargas de Dock
  useEffect(() => {
    if (!currentUser) return;

    setLoadingOps(true);
    const qOps = query(collection(db, 'ops'), orderBy('sequencia', 'asc'));
    const unsubscribeOps = onSnapshot(qOps, (snapshot) => {
      const opsData: Op[] = [];
      snapshot.forEach((docSnap) => {
        opsData.push({ id: docSnap.id, ...docSnap.data() } as Op);
      });
      setOps(opsData);
      setLoadingOps(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ops');
      setLoadingOps(false);
    });

    return () => unsubscribeOps();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    setLoadingLoads(true);
    const qLoads = query(collection(db, 'dock_loads'), orderBy('createdAt', 'desc'));
    const unsubscribeLoads = onSnapshot(qLoads, (snapshot) => {
      const loadsData: DockLoad[] = [];
      snapshot.forEach((docSnap) => {
        loadsData.push({ id: docSnap.id, ...docSnap.data() } as DockLoad);
      });
      setDockLoads(loadsData);
      setLoadingLoads(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'dock_loads');
      setLoadingLoads(false);
    });

    return () => unsubscribeLoads();
  }, [currentUser]);

  // Seção de dados Seed se o DB estiver vazio para demonstração fantástica
  const handleSeedDatabase = async () => {
    try {
      const batch = writeBatch(db);
      
      const sampleOps: Omit<Op, 'id'>[] = [
        {
          codigo: 'VENTISO-OP-301',
          descricao: 'Ventilador de Teto Wind Light 3 Pás Palhoça',
          quantidade: 150,
          status: 'pendente',
          furos: 'Furação dupla padrão industrial',
          licitacao: 'Pregão Eletrônico 402/2026 - SEC Palhoça/SC',
          sequencia: 1,
          itens: [
            { codigo: 'MTR-12V', nome: 'Bomba Motor Rotativo 127V', qtd: 150, separado: false },
            { codigo: 'PAS-WND', nome: 'Hélice Pás Turbofan Plástico', qtd: 450, separado: false },
            { codigo: 'KIT-PAR', nome: 'Kit Fixadores de Suporte', qtd: 150, separado: false },
            { codigo: 'MAN-WND', nome: 'Manual Instruções Wind Light', qtd: 150, separado: false }
          ]
        },
        {
          codigo: 'VENTISO-OP-302',
          descricao: 'Ventilador de Cobre Turbo Premium 50cm Bivolt',
          quantidade: 80,
          status: 'separando',
          furos: 'Furo triplo base de apoio pesado',
          licitacao: 'Urgente - Remessa Exclusiva Almoxarifado',
          sequencia: 2,
          itens: [
            { codigo: 'MTR-BIV', nome: 'Motor Bobinado de Cobre Bivolt', qtd: 80, separado: true },
            { codigo: 'GRD-MTL', nome: 'Grade Frontal de Proteção Cromada', qtd: 80, separado: false },
            { codigo: 'GRD-TRS', nome: 'Grade Traseira Proteção Inteira', qtd: 80, separado: false },
            { codigo: 'HEL-MTL', nome: 'Hélice de Alumínio Balanceado 3 Pás', qtd: 80, separado: true }
          ]
        },
        {
          codigo: 'VENTISO-OP-303',
          descricao: 'Exaustor Industrial Pesado Ventisol Palhoça',
          quantidade: 40,
          status: 'cancelada',
          furos: 'Fixadores robustos de parede externa',
          licitacao: 'Não se aplica',
          sequencia: 3,
          itens: [
            { codigo: 'EXT-S40', nome: 'Motor Exaustão Alta Rotação', qtd: 40, separado: false },
            { codigo: 'CSQ-AC0', nome: 'Chapa de Aço de Fixador Angular', qtd: 40, separado: false }
          ]
        }
      ];

      const sampleLoads: Omit<DockLoad, 'id'>[] = [
        {
          fornecedor: 'Metalúrgica Palhoça Ltda',
          material: 'Bobinas de Cobre Eletrolítico',
          placa: 'MKX-3E51',
          status: 'descarregando',
          doca: 'Doca 2 - Descarga Pesada',
          tempoEstimado: 35
        },
        {
          fornecedor: 'Plásticos Termomoldados SC',
          material: 'Carenagens e Grades Frontais Injetadas',
          placa: 'RDZ-9E22',
          status: 'aguardando',
          doca: 'Doca 1 - Central Palhoça',
          tempoEstimado: 60
        },
        {
          fornecedor: 'Fios e Conectores Joinville',
          material: 'Cabos de Força Normatizados',
          placa: 'OPB-1A80',
          status: 'concluido',
          doca: 'Doca 3 - Envio Rápido',
          tempoEstimado: 20
        }
      ];

      for (const op of sampleOps) {
        const opRef = doc(collection(db, 'ops'));
        batch.set(opRef, {
          ...op,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      for (const load of sampleLoads) {
        const loadRef = doc(collection(db, 'dock_loads'));
        batch.set(loadRef, {
          ...load,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (e) {
      console.error("Erro ao rodar seed do banco:", e);
    }
  };

  // Funções de Gerenciamento de OPs
  const handleCreateOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpCode || !newOpDesc) return;

    try {
      // Itens pré-definidos simples baseados na descrição
      const defaultItens: OpItem[] = [
        { codigo: 'MTR-GEN', nome: 'Motor de Ventilador Padrão', qtd: newOpQty, separado: false },
        { codigo: 'GRD-PLT', nome: 'Grade Plástica Injetada Ventisol', qtd: newOpQty * 2, separado: false },
        { codigo: 'HEL-PLT', nome: 'Hélice Estampada 3 Pás', qtd: newOpQty, separado: false }
      ];

      const nextSequence = ops.length > 0 ? Math.max(...ops.map(o => o.sequencia)) + 1 : 1;

      const payload = {
        codigo: newOpCode,
        descricao: newOpDesc,
        quantidade: Number(newOpQty),
        status: 'pendente' as const,
        furos: newOpFuros,
        licitacao: newOpLicitacao,
        sequencia: nextSequence,
        itens: defaultItens,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'ops'), payload);
      
      // Limpeza
      setNewOpCode('');
      setNewOpDesc('');
      setNewOpQty(100);
      setNewOpFuros('Sem furação extra');
      setNewOpLicitacao('Não se aplica');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ops');
    }
  };

  const handleStatusChange = async (opId: string, newStatus: Op['status']) => {
    try {
      const opRef = doc(db, 'ops', opId);
      await updateDoc(opRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      // atualizar tbm o modal se estiver aberto
      if (selectedOp && selectedOp.id === opId) {
        setSelectedOp(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ops/${opId}`);
    }
  };

  const handleToggleItemCheck = async (op: Op, itemIndex: number) => {
    // Se a OP estiver cancelada, a regra de negócio impede qualquer checklist!
    if (op.status === 'cancelada') return;

    try {
      const updatedItens = [...op.itens];
      updatedItens[itemIndex].separado = !updatedItens[itemIndex].separado;

      // Se todos os componentes forem separados, muda o status automaticamente pra 'concluido'
      const todosSeparados = updatedItens.every(i => i.separado);
      const novoStatus = (todosSeparados ? 'concluido' : 'separando') as Op['status'];

      const opRef = doc(db, 'ops', op.id!);
      await updateDoc(opRef, {
        itens: updatedItens,
        status: novoStatus,
        updatedAt: serverTimestamp()
      });

      const updatedOp: Op = { ...op, itens: updatedItens, status: novoStatus };
      setSelectedOp(updatedOp);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ops/${op.id}`);
    }
  };

  const handleDeleteOp = async (opId: string) => {
    if (!confirm("Deseja realmente excluir esta OP permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'ops', opId));
      if (selectedOp?.id === opId) setSelectedOp(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ops/${opId}`);
    }
  };

  // Funções de Docas e Recebimento
  const handleCreateDockLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDockFornecedor || !newDockMaterial || !newDockPlaca) return;

    try {
      const payload = {
        fornecedor: newDockFornecedor,
        material: newDockMaterial,
        placa: newDockPlaca,
        status: 'aguardando' as const,
        doca: newDockDoca,
        tempoEstimado: Number(newDockTempo),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'dock_loads'), payload);

      setNewDockFornecedor('');
      setNewDockMaterial('');
      setNewDockPlaca('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dock_loads');
    }
  };

  const handleUpdateDockStatus = async (loadId: string, newStatus: DockLoad['status']) => {
    try {
      const ref = doc(db, 'dock_loads', loadId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dock_loads/${loadId}`);
    }
  };

  const handleDeleteDockLoad = async (loadId: string) => {
    if (!confirm("Remover este registro de doca?")) return;
    try {
      await deleteDoc(doc(db, 'dock_loads', loadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dock_loads/${loadId}`);
    }
  };

  // Funções de Sequenciamento manual (Drag and Drop simulado fácil, ou botões de subir/descer)
  const handleMoveSequence = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ops.length) return;

    try {
      const opA = ops[index];
      const opB = ops[targetIndex];

      const opARef = doc(db, 'ops', opA.id!);
      const opBRef = doc(db, 'ops', opB.id!);

      const tempSeq = opA.sequencia;

      // Executa duas atualizações em lote ou sequenciais rápidas
      await updateDoc(opARef, { sequencia: opB.sequencia, updatedAt: serverTimestamp() });
      await updateDoc(opBRef, { sequencia: tempSeq, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error("Erro ao alterar sequência de trabalho:", error);
    }
  };

  // Se o usuário clicar em uma OP que está cancelada, exibe o aviso
  const selectOpSafely = (op: Op) => {
    setSelectedOp(op);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans transition-all duration-300">
      {/* Top Header Barra Ventisol */}
      <header className="bg-slate-950 border-b border-slate-800 py-4 px-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white rounded-xl p-2.5 shadow-sm shadow-blue-500/20">
              <ClipboardList className="w-6 h-6 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase sm:text-2xl">Almoxarifado</h1>
                <span className="bg-blue-950/40 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-800/50">Palhoça-SC</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Ventisol Indústria e Comércio S.A.</p>
            </div>
          </div>

          {/* Seletor de Perfil Ativo (Simulador Operacional) */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase pl-2 shrink-0 md:inline hidden">Perfil Inicial:</span>
            {(['fabrica', 'almoxarifado', 'conferente', 'admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setPerfil(role)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all uppercase shrink-0 ${
                  perfil === role 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {role === 'admin' ? 'Administrador' : role === 'fabrica' ? 'Fábrica' : role === 'almoxarifado' ? 'Almoxarifado' : 'Conferente'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Navegação de Abas do Sistema */}
      <nav className="bg-slate-950 border-b border-slate-800 py-1.5 px-6 print:hidden">
        <div className="max-w-[1400px] mx-auto flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('separacao')}
            className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'separacao' 
                ? 'border-blue-500 text-blue-400 bg-slate-900/50' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Sequência de Separação de OPs
          </button>

          <button
            onClick={() => setActiveTab('dock')}
            className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'dock' 
                ? 'border-blue-500 text-blue-400 bg-slate-900/50' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Truck className="w-4 h-4" />
            Recebimento Intercompany Docas
          </button>

          {/* ABA ADMIN: Exibida e Operante apenas no modo Perfil Administrador Geral */}
          {perfil === 'admin' ? (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all shrink-0 ${
                activeTab === 'admin' 
                  ? 'border-blue-500 text-blue-400 bg-slate-900/50' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
              }`}
            >
              <FileText className="w-4 h-4" />
              Painel Admin & Manual Técnico
            </button>
          ) : (
            <div className="text-slate-500 py-3 px-4 text-xs font-medium border-b-2 border-transparent italic cursor-not-allowed shrink-0 select-none flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Painel Admin (Apenas Administrador)
            </div>
          )}
        </div>
      </nav>

      {/* Corpo Principal da Aplicação */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-6 py-6 print:py-0">
        
        {/* Caso nenhuma informação esteja inserida e estejamos em loading */}
        {!isAuthReady ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-slate-400 font-medium">Autenticando de forma segura no Firebase...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Sequência de Separação de OPs */}
            {activeTab === 'separacao' && (
              <motion.div
                key="separacao"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                      Grade Operacional de Palhoça/SC
                    </h2>
                    <p className="text-sm text-slate-400">Ordens de produção a separar em tempo real. Ordene a fila conforme prioridade de esteira.</p>
                  </div>
                  
                  {ops.length === 0 && !loadingOps && (
                    <button
                      onClick={handleSeedDatabase}
                      className="px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Sem dados? Rodar Seed Demonstrativo
                    </button>
                  )}
                </div>

                {loadingOps ? (
                  <div className="flex justify-center items-center py-20">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Lista Principal das OPs */}
                    <div className="lg:col-span-2 space-y-4">
                      {ops.length === 0 ? (
                        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                          <PackageOpen className="w-12 h-12 text-slate-600" />
                          <p className="font-semibold text-slate-400">Nenhuma Ordem de Produção (OP) cadastrada.</p>
                          <p className="text-xs text-slate-500 max-w-sm">Mude seu perfil para Administrador e use a aba do painel admin para importar ou cadastrar OPs nativas no Firebase.</p>
                        </div>
                      ) : (
                        ops.map((op, opIndex) => {
                          const statusColors = {
                            pendente: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                            separando: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                            concluido: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            cancelada: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          };

                          const totalComponentes = op.itens?.length || 0;
                          const componentesSeparados = op.itens?.filter(i => i.separado).length || 0;
                          const porcProgresso = totalComponentes > 0 ? Math.round((componentesSeparados / totalComponentes) * 100) : 0;

                          return (
                            <div 
                              key={op.id}
                              className={`bg-slate-950 p-5 rounded-2xl border transition-all ${
                                op.status === 'cancelada' 
                                  ? 'border-rose-900/30 bg-rose-950/5 relative shadow-inner' 
                                  : 'border-slate-800/80 hover:border-slate-700 hover:shadow-lg hover:shadow-black/10'
                              } ${selectedOp?.id === op.id ? 'ring-2 ring-blue-500/50' : ''}`}
                            >
                              {/* Tarja de OP Cancelada */}
                              {op.status === 'cancelada' && (
                                <div className="absolute top-3 right-3 bg-rose-600/20 text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-600/30 flex items-center gap-1 uppercase tracking-wider uppercase">
                                  <Ban className="w-3 h-3" />
                                  OP Cancelada - Bloqueada
                                </div>
                              )}

                              {/* Cabeçalho do Card */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-blue-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                      #{op.sequencia} da Grade
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusColors[op.status]}`}>
                                      {op.status}
                                    </span>
                                  </div>
                                  <h3 className={`text-base font-bold ${op.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-white'}`}>
                                    {op.codigo} - {op.descricao}
                                  </h3>
                                  <p className="text-xs text-slate-400 flex items-center gap-3">
                                    <span>Qtd Solicitada: <strong className="text-slate-200">{op.quantidade} un</strong></span>
                                    {op.licitacao && op.licitacao !== 'Não se aplica' && (
                                      <span className="text-amber-400 font-medium">⚠️ {op.licitacao}</span>
                                    )}
                                  </p>
                                </div>

                                {/* Controles de Fila de Trabalho (Subir / Descer Prioridade) */}
                                <div className="flex items-center gap-1 shrink-0 print:hidden">
                                  <button
                                    onClick={() => handleMoveSequence(opIndex, 'up')}
                                    disabled={opIndex === 0}
                                    className="p-1.5 hover:bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Subir prioridade"
                                  >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveSequence(opIndex, 'down')}
                                    disabled={opIndex === ops.length - 1}
                                    className="p-1.5 hover:bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-slate-300 disabled:opacity-30"
                                    title="Descer prioridade"
                                  >
                                    <ArrowUpDown className="w-3.5 h-3.5 rotate-180" />
                                  </button>
                                </div>
                              </div>

                              {/* Barra de Progresso de Separação */}
                              {op.status !== 'cancelada' && (
                                <div className="mt-4 pt-4 border-t border-slate-900 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-medium">Progresso da Separação</span>
                                    <span className="text-slate-200 font-bold">{porcProgresso}% ({componentesSeparados}/{totalComponentes})</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                      style={{ width: `${porcProgresso}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Rodapé do Card com Ação de Iniciar checklist */}
                              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-900">
                                <div className="text-xs text-slate-400 mr-2">
                                  Furos: <span className="font-bold text-slate-200">{op.furos}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {op.status !== 'cancelada' && (
                                    <button
                                      onClick={() => selectOpSafely(op)}
                                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
                                    >
                                      <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                                      Checklist de Componentes
                                    </button>
                                  )}

                                  {/* Operações rápidas de Admin / Almoxarifado */}
                                  {(perfil === 'admin' || perfil === 'almoxarifado') && (
                                    <>
                                      {op.status !== 'cancelada' && (
                                        <button
                                          onClick={() => handleStatusChange(op.id!, 'cancelada')}
                                          className="p-2 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 hover:text-rose-200 border border-rose-900/30 rounded-xl text-xs font-semibold transition-all"
                                          title="Cancelar OP de Produção"
                                        >
                                          <Ban className="w-4 h-4" />
                                        </button>
                                      )}
                                      {perfil === 'admin' && (
                                        <button
                                          onClick={() => handleDeleteOp(op.id!)}
                                          className="p-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs font-semibold transition-all"
                                          title="Excluir do Sistema"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Detalhes / Checklist interativo da OP Selecionada */}
                    <div className="lg:col-span-1">
                      <div className="bg-slate-950 border border-slate-800 p-6 rounded-[24px] shadow-sm sticky top-24 space-y-4">
                        {selectedOp ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <div>
                                <span className="text-[10px] text-blue-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-md">
                                  #{selectedOp.sequencia}
                                </span>
                                <h3 className="text-base font-black text-white mt-1 uppercase tracking-tight">{selectedOp.codigo}</h3>
                              </div>
                              <button 
                                onClick={() => setSelectedOp(null)}
                                className="text-xs font-bold text-slate-400 hover:text-white"
                              >
                                Fechar
                              </button>
                            </div>

                            {selectedOp.status === 'cancelada' ? (
                              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center space-y-1.5">
                                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                                <h4 className="text-xs font-black uppercase text-rose-400">Separação Suspensa</h4>
                                <p className="text-[11px] text-rose-300">Esta OP foi cancelada pela gestão. Edições e baixa de itens estão integralmente bloqueadas.</p>
                              </div>
                            ) : (
                              <>
                                <div className="space-y-1 text-xs">
                                  <p className="text-slate-400">Descrição:</p>
                                  <p className="text-white font-bold">{selectedOp.descricao}</p>
                                  <div className="pt-2 flex justify-between">
                                    <span className="text-slate-400">Total Solicitado:</span>
                                    <span className="text-slate-100 font-semibold">{selectedOp.quantidade} ventiladores</span>
                                  </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                                    <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                                    Checklist Almoxarifado
                                  </h4>
                                  
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {selectedOp.itens && selectedOp.itens.map((subitem, index) => (
                                      <button
                                        key={index}
                                        onClick={() => handleToggleItemCheck(selectedOp, index)}
                                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-all ${
                                          subitem.separado 
                                            ? 'bg-slate-900 border-emerald-500/20 text-slate-300' 
                                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="space-y-0.5">
                                          <p className={`font-semibold ${subitem.separado ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                            {subitem.nome}
                                          </p>
                                          <p className="font-mono text-[10px] text-slate-500">
                                            ref: {subitem.codigo} | Qtd: {subitem.qtd}
                                          </p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                          subitem.separado 
                                            ? 'bg-emerald-600 border-transparent text-white' 
                                            : 'border-slate-700'
                                        }`}>
                                          {subitem.separado && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Alteração manual do status geral */}
                                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                                  <span className="text-slate-400 text-xs font-medium">Finalizar OP diretamente:</span>
                                  <button
                                    onClick={() => handleStatusChange(selectedOp.id!, 'concluido')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Dar Baixa Geral
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-3">
                            <ClipboardList className="w-10 h-10 text-slate-700" />
                            <p className="text-xs font-bold text-slate-400">Instruções aos Separadores</p>
                            <p className="text-[11px] text-slate-500 max-w-xs leading-normal">
                              Selecione uma Ordem de Produção ativa clicando no botão <strong>"Checklist de Componentes"</strong> para dar baixa física nos motores, furos e peças em tempo real.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: Recebimento Intercompany Docas */}
            {activeTab === 'dock' && (
              <motion.div
                key="dock"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                      Monitoramento de Docas Intercompany
                    </h2>
                    <p className="text-sm text-slate-400">Gerenciamento logístico e atracação de caminhões e fornecedores na fábrica de Palhoça/SC.</p>
                  </div>
                </div>

                {/* Formulário de Cadastro de Nova Carga de Doca */}
                {(perfil === 'admin' || perfil === 'almoxarifado') && (
                  <form onSubmit={handleCreateDockLoad} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Parceiro / Fornecedor</label>
                      <input
                        type="text"
                        placeholder="Ex: Fornecedor de Bobina JVE"
                        value={newDockFornecedor}
                        onChange={(e) => setNewDockFornecedor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Material / Insumo</label>
                      <input
                        type="text"
                        placeholder="Ex: Chapas / Fios"
                        value={newDockMaterial}
                        onChange={(e) => setNewDockMaterial(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Placa do Veículo</label>
                      <input
                        type="text"
                        placeholder="Ex: AAA-0A00"
                        value={newDockPlaca}
                        onChange={(e) => setNewDockPlaca(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all h-[42px]"
                    >
                      <Plus className="w-4 h-4" />
                      Atracar Carga
                    </button>
                  </form>
                )}

                {loadingLoads ? (
                  <div className="flex justify-center items-center py-20">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dockLoads.length === 0 ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 col-span-3">
                        Nenhum veículo aguardando nas docas de Palhoça/SC no momento.
                      </div>
                    ) : (
                      dockLoads.map((load) => {
                        const statusColors = {
                          aguardando: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                          descarregando: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                          concluido: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        };

                        return (
                          <div 
                            key={load.id}
                            className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] text-blue-400 rounded-md font-bold uppercase">
                                  {load.doca}
                                </span>
                                <h3 className="text-base font-black text-white mt-2 uppercase">{load.fornecedor}</h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">placa: {load.placa}</p>
                              </div>

                              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusColors[load.status]}`}>
                                {load.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-900/50 text-xs">
                              <div>
                                <span className="text-slate-400 block">Insumos/Carga:</span>
                                <span className="font-bold text-slate-100">{load.material}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Tempo Descarga:</span>
                                <span className="font-bold text-slate-100">{load.tempoEstimado} minutos</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Alterar Status:</span>
                              
                              <div className="flex items-center gap-1">
                                {load.status === 'aguardando' && (
                                  <button
                                    onClick={() => handleUpdateDockStatus(load.id!, 'descarregando')}
                                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Iniciar Descarga
                                  </button>
                                )}
                                {load.status === 'descarregando' && (
                                  <button
                                    onClick={() => handleUpdateDockStatus(load.id!, 'concluido')}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Finalizar Carga
                                  </button>
                                )}
                                {perfil === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteDockLoad(load.id!)}
                                    className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded border border-slate-800"
                                    title="Remover veículo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: Painel Admin & Manual Técnico (REPRESENTANDO A COMPLETA RESOLUÇÃO DA SOLICITAÇÃO) */}
            {activeTab === 'admin' && perfil === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Cabeçalho da Aba Admin */}
                <div className="bg-slate-950 border border-slate-800/80 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <FilePlus className="w-6 h-6 text-blue-500" />
                      Nova Ordem de Produção (Inserção Manual)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ferramenta restrita a administradores gerenciais do Almoxarifado Ventisol.</p>
                  </div>
                  <button
                    onClick={handleSeedDatabase}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 w-fit justify-center"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    Resetar / Alimentar Banco Seed
                  </button>
                </div>

                {/* Formulário de Cadastro Manual de OPs */}
                <form onSubmit={handleCreateOp} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Código da OP</label>
                    <input
                      type="text"
                      placeholder="Ex: OP-VEN-TURB50"
                      value={newOpCode}
                      onChange={(e) => setNewOpCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Descrição dos Ventiladores/Insumos</label>
                    <input
                      type="text"
                      placeholder="Ex: Ventilador de Coluna Turbo 6 50cm Bivolt"
                      value={newOpDesc}
                      onChange={(e) => setNewOpDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Quantidade Solicitada</label>
                    <input
                      type="number"
                      value={newOpQty}
                      onChange={(e) => setNewOpQty(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                      min={10}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Furos de Fixação</label>
                    <input
                      type="text"
                      placeholder="Ex: Furo Triplo Central Angular"
                      value={newOpFuros}
                      onChange={(e) => setNewOpFuros(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Licitação / Detalhes</label>
                    <input
                      type="text"
                      placeholder="Ex: Pregão 301/2026"
                      value={newOpLicitacao}
                      onChange={(e) => setNewOpLicitacao(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-3 pt-2">
                    <button
                      type="submit"
                      className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar OP no Firestore
                    </button>
                  </div>
                </form>

                {/* AREA DO MANUAL CORPORATIVO DE TRANSIÇÃO TÉCNICA (DEVE SER VISÍVEL APENAS AQUI) */}
                <div className="border-t border-slate-800 pt-8">
                  <div className="bg-slate-950/40 p-4 rounded-3xl border border-slate-800/40 mb-6 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-400 leading-normal">
                      <strong className="text-slate-200">Manual Corporativo de Engenharia e Transição Técnica</strong>
                      <p className="mt-1">
                        Abaixo é renderizada a documentação de transição da Ventisol de Palhoça/SC, em conformidade com a sua última regra corporativa de visibilidade. Apenas administradores habilitados possuem nível de privilégio suficiente para acessá-la.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-800/70 rounded-[32px] overflow-hidden">
                    {/* Renderização direta do core InfoView importado de components/InfoView.tsx */}
                    <InfoView />
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* Footer corporativo sutil e informativo */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-6 px-6 text-center text-slate-500 text-xs print:hidden">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Ventisol Indústria e Comércio S.A. | Todos os direitos reservados</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Terminal: <strong>Zebra TC26 Android</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Banco: <strong>Firestore Conectado</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
