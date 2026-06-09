"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from "@/lib/firebase";
import { 
  Search, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Filter, 
  Database, 
  TrendingUp, 
  Package, 
  Truck, 
  FileText, 
  Archive, 
  CheckSquare, 
  RefreshCw,
  Building,
  User,
  AlertTriangle,
  Award,
  Download,
  ChevronRight,
  Info
} from "lucide-react";

// --- Definições de Tipos para a Solução Ventisol ---
export interface OpItem {
  codigo: string;
  nome: string;
  qtd: number;
  separado: boolean;
  conferido: boolean;
}

export interface Op {
  id?: string;
  order_number: string;
  description: string;
  status: "Pendente" | "Separando" | "Concluido" | "Baixada";
  date: string; // Formato YYYY-MM-DD
  items: OpItem[];
  sector: string; // ex: Injeção, Montagem, Motores, Climatização
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
}

export interface Recebimento {
  id?: string;
  notaFiscal: string;
  fornecedor: string;
  dataRecebimento: string;
  status: "Pendente" | "Concluido";
  volumes: number;
  responsavel: string;
}

export default function AlmoxarifadoPage() {
  // --- Estados do Sistema ---
  const [ops, setOps] = useState<Op[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [selectedOp, setSelectedOp] = useState<Op | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"separacao" | "recebimentos" | "cadastro" | "relatorios">("separacao");
  const [currentTime, setCurrentTime] = useState<string>("");

  // --- Estados de Filtros e Busca ---
  const [searchOP, setSearchOP] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  
  // Datas padrão: inicializa com os últimos 7 dias até hoje de forma local
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // intervalo clássico da semana
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // --- Estados para Formulário de Cadastro de OP ---
  const [newOpNumber, setNewOpNumber] = useState("");
  const [newOpDescription, setNewOpDescription] = useState("");
  const [newOpSector, setNewOpSector] = useState("Montagem");
  const [newOpDate, setNewOpDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newItemCodigo, setNewItemCodigo] = useState("");
  const [newItemNome, setNewItemNome] = useState("");
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newOpItems, setNewOpItems] = useState<OpItem[]>([
    { codigo: "PA-MET-10", nome: "Hélice 40cm Ventisol Metal", qtd: 100, separado: false, conferido: false },
    { codigo: "MO-V50-CO", nome: "Motor Bivolt 50cm Premium - Cobre", qtd: 100, separado: false, conferido: false },
    { codigo: "CH-RO-01", nome: "Chave Rotativa Controle de Velocidade", qtd: 100, separado: false, conferido: false },
    { codigo: "PA-PRE-50", nome: "Grade Protetora Traseira Metálica 50cm", qtd: 100, separado: false, conferido: false },
  ]);

  // --- Estados para Cadastro de Recebimentos ---
  const [newNF, setNewNF] = useState("");
  const [newNFFornecedor, setNewNFFornecedor] = useState("");
  const [newNFVolumes, setNewNFVolumes] = useState(1);
  const [newNFResponsavel, setNewNFResponsavel] = useState("");

  // --- Relógio Digital em tempo real ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Conexão Reativa em Tempo Real via Firestore (onSnapshot) ---
  useEffect(() => {
    setLoading(true);
    
    // 1. Escuta de Ordens de Produção (OPs)
    const unsubscribeOps = onSnapshot(
      collection(db, "ops"),
      (snapshot) => {
        const loadedOps: Op[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedOps.push({
            id: docSnap.id,
            order_number: data.order_number || "",
            description: data.description || "",
            status: data.status || "Pendente",
            date: data.date || "",
            items: data.items || [],
            sector: data.sector || "Montagem",
            created_at: data.created_at,
            updated_at: data.updated_at
          });
        });
        
        // Se o banco estiver vazio, sugere semear dados iniciais simulando a rotina da Ventisol
        setOps(loadedOps);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "ops");
        setLoading(false);
      }
    );

    // 2. Escuta de Recebimento de Cargas
    const unsubscribeRecebimentos = onSnapshot(
      collection(db, "recebimentos"),
      (snapshot) => {
        const loadedRecs: Recebimento[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedRecs.push({
            id: docSnap.id,
            notaFiscal: data.notaFiscal || "",
            fornecedor: data.fornecedor || "",
            dataRecebimento: data.dataRecebimento || "",
            status: data.status || "Pendente",
            volumes: Number(data.volumes || 0),
            responsavel: data.responsavel || ""
          });
        });
        setRecebimentos(loadedRecs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "recebimentos");
      }
    );

    return () => {
      unsubscribeOps();
      unsubscribeRecebimentos();
    };
  }, []);

  // --- Função auxiliar para Semear Banco se estiver totalmente limpo ---
  const semearBancoDados = async () => {
    try {
      setLoading(true);
      const mockOPs: Op[] = [
        {
          order_number: "OP-4501",
          description: "Ventilador Coluna Turbo 50cm - Ventisol",
          status: "Separando",
          date: new Date().toISOString().split("T")[0],
          sector: "Montagem",
          items: [
            { codigo: "HEL-CL-45", nome: "Hélice Plástica Azul Turbina 50cm", qtd: 150, separado: true, conferido: false },
            { codigo: "MOT-COL-50", nome: "Motor Indução Bivolt 50cm Turbo", qtd: 150, separado: true, conferido: true },
            { codigo: "COL-AC-50", nome: "Coluna Metálica Regulável Cromada", qtd: 150, separado: false, conferido: false },
            { codigo: "GR-PR-50", nome: "Grade Plástica Proteção 50cm Preta", qtd: 300, separado: true, conferido: false },
          ]
        },
        {
          order_number: "OP-4502",
          description: "Climatizador Evaporativo de Parede Ventisol",
          status: "Pendente",
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 4 dias atrás para teste de data
          sector: "Climatização",
          items: [
            { codigo: "CLIM-PAD-HU", nome: "Colmeio Painel Evaporativo Celulose", qtd: 40, separado: false, conferido: false },
            { codigo: "BOM-AG-12", nome: "Micro Bomba de Água Reversível 12V", qtd: 40, separado: true, conferido: false },
            { codigo: "PL-CON-M", nome: "Placa Elétrica Controladora Principal", qtd: 40, separado: false, conferido: false },
          ]
        },
        {
          order_number: "OP-4503",
          description: "Ventilador de Teto Comercial Ventisol Triplo",
          status: "Concluido",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // ontem
          sector: "Motores",
          items: [
            { codigo: "PA-MAD-V", nome: "Pás de Madeira Marfim para Teto", qtd: 120, separado: true, conferido: true },
            { codigo: "MOT-TC-A3", nome: "Estator de Motor de Teto Alumínio", qtd: 40, separado: true, conferido: true },
            { codigo: "KIT-FIX-T", nome: "Kit Parafusos, Buchas e Fixação", qtd: 40, separado: true, conferido: true },
          ]
        },
        {
          order_number: "OP-4504",
          description: "Ventilador de Parede Oscilante 60cm Premium",
          status: "Separando",
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 dias atrás para atestar a funcionalidade principal de pular data se incompleto
          sector: "Montagem",
          items: [
            { codigo: "HEL-CL-60", nome: "Hélice Plástica 3 Pás Vermelha 60cm", qtd: 200, separado: false, conferido: false },
            { codigo: "SUP-PAR-60", nome: "Suporte Metálico Reforçado de Parede", qtd: 100, separado: true, conferido: false },
            { codigo: "MOT-PAR-60", nome: "Motor Alta Rotação 60cm Premium", qtd: 100, separado: false, conferido: false },
          ]
        }
      ];

      for (const op of mockOPs) {
        await addDoc(collection(db, "ops"), {
          ...op,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }

      const mockRecebimentos: Recebimento[] = [
        {
          notaFiscal: "NF-892410",
          fornecedor: "Metalúrgica Força de Aço LTDA",
          dataRecebimento: new Date().toISOString().split("T")[0],
          status: "Pendente",
          volumes: 12,
          responsavel: "Carlos Roberto (Almoxarife Sênior)"
        },
        {
          notaFiscal: "NF-892408",
          fornecedor: "Schenker Eletrônicos Import",
          dataRecebimento: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "Concluido",
          volumes: 4,
          responsavel: "Aline Silva (Recebimento)"
        }
      ];

      for (const rec of mockRecebimentos) {
        await addDoc(collection(db, "recebimentos"), rec);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Função para calcular porcentagem de Separação e Conferência em Tempo Real ---
  const calculatePercentages = (items: OpItem[]) => {
    if (!items || items.length === 0) return { separation: 0, conference: 0 };
    const totalItems = items.length;
    
    // Contabiliza com base na quantidade de itens distintos marcados como separados/conferidos
    const separados = items.filter(i => i.separado).length;
    const conferidos = items.filter(i => i.conferido).length;
    
    return {
      separation: Math.round((separados / totalItems) * 100),
      conference: Math.round((conferidos / totalItems) * 100)
    };
  };

  // --- Regra Crucial Solicitada pelo Cliente ---
  // "Ops que não estiverem 100% separadas ou 100% conferidas devem ser exibidas independente do filtro de data"
  const filteredOps = useMemo(() => {
    return ops.filter(op => {
      // 1. Filtro de Busca Avançada (Número da OP, Descrição ou Nome do Componente)
      const matchesSearch = 
        op.order_number.toLowerCase().includes(searchOP.toLowerCase()) ||
        op.description.toLowerCase().includes(searchOP.toLowerCase()) ||
        op.items.some(it => it.nome.toLowerCase().includes(searchOP.toLowerCase()) || it.codigo.toLowerCase().includes(searchOP.toLowerCase()));

      const matchesSector = sectorFilter === "Todos" || op.sector === sectorFilter;

      // Se não combinar com busca ou setor, já descarta
      if (!matchesSearch || !matchesSector) return false;

      // 2. Análise de Completude (Regra de Ouro)
      const { separation, conference } = calculatePercentages(op.items);
      const is100PercentComplete = separation === 100 && conference === 100;

      // Se a OP está INCOMPLETA (menos de 100% separada ou menos de 100% conferida)
      if (!is100PercentComplete) {
        // MOSTRA SEMPRE! Burlar filtro de data para segurança do estoque e da produção
        return true;
      }

      // Se a OP estiver 100% concluída (completa), ela respeita as datas selecionadas
      const orderDate = op.date;
      const isWithinDateRange = orderDate >= startDate && orderDate <= endDate;
      return isWithinDateRange;
    });
  }, [ops, searchOP, sectorFilter, startDate, endDate]);

  // --- Funções de Manipulação da OP Ativa ---
  const handleToggleItemSeparado = async (op: Op, itemIndex: number) => {
    try {
      const updatedItens = [...op.items];
      updatedItens[itemIndex] = {
        ...updatedItens[itemIndex],
        separado: !updatedItens[itemIndex].separado
      };

      // Recalcula o status geral da OP
      const { separation, conference } = calculatePercentages(updatedItens);
      let novoStatus: Op["status"] = "Separando";
      if (separation === 100 && conference === 100) {
        novoStatus = "Concluido";
      } else if (separation === 0 && conference === 0) {
        novoStatus = "Pendente";
      }

      const opRef = doc(db, "ops", op.id!);
      await updateDoc(opRef, {
        items: updatedItens,
        status: novoStatus,
        updated_at: serverTimestamp()
      });

      // Atualiza estado do painel selecionado instantaneamente
      if (selectedOp?.id === op.id) {
        setSelectedOp({ ...op, items: updatedItens, status: novoStatus });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ops/${op.id}`);
    }
  };

  const handleToggleItemConferido = async (op: Op, itemIndex: number) => {
    try {
      const updatedItens = [...op.items];
      updatedItens[itemIndex] = {
        ...updatedItens[itemIndex],
        conferido: !updatedItens[itemIndex].conferido
      };

      // Recalcula o status geral da OP
      const { separation, conference } = calculatePercentages(updatedItens);
      let novoStatus: Op["status"] = "Separando";
      if (separation === 100 && conference === 100) {
        novoStatus = "Concluido";
      } else if (separation === 0 && conference === 0) {
        novoStatus = "Pendente";
      }

      const opRef = doc(db, "ops", op.id!);
      await updateDoc(opRef, {
        items: updatedItens,
        status: novoStatus,
        updated_at: serverTimestamp()
      });

      if (selectedOp?.id === op.id) {
        setSelectedOp({ ...op, items: updatedItens, status: novoStatus });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ops/${op.id}`);
    }
  };

  // Funções de Ações Rápidas em Lote por OP
  const handleCompletarSeparacao = async (op: Op) => {
    try {
      const updatedItens = op.items.map(it => ({ ...it, separado: true }));
      const { conference } = calculatePercentages(updatedItens);
      const novoStatus: Op["status"] = conference === 100 ? "Concluido" : "Separando";

      const opRef = doc(db, "ops", op.id!);
      await updateDoc(opRef, {
        items: updatedItens,
        status: novoStatus,
        updated_at: serverTimestamp()
      });

      if (selectedOp?.id === op.id) {
        setSelectedOp({ ...op, items: updatedItens, status: novoStatus });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompletarConferencia = async (op: Op) => {
    try {
      const updatedItens = op.items.map(it => ({ ...it, separado: true, conferido: true }));
      const opRef = doc(db, "ops", op.id!);
      await updateDoc(opRef, {
        items: updatedItens,
        status: "Concluido" as Op["status"],
        updated_at: serverTimestamp()
      });

      if (selectedOp?.id === op.id) {
        setSelectedOp({ ...op, items: updatedItens, status: "Concluido" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBaixarOp = async (op: Op) => {
    try {
      const opRef = doc(db, "ops", op.id!);
      await updateDoc(opRef, {
        status: "Baixada" as Op["status"],
        updated_at: serverTimestamp()
      });
      setSelectedOp(null); // Fecha a gaveta
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletarOp = async (opId: string) => {
    if (!window.confirm("Deseja realmente remover esta Ordem de Produção permanentemente?")) return;
    try {
      await deleteDoc(doc(db, "ops", opId));
      if (selectedOp?.id === opId) {
        setSelectedOp(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ops/${opId}`);
    }
  };

  // --- Funções de Criação de Recursos ---
  const handleAdicionarItemAoRascunho = () => {
    if (!newItemCodigo.trim() || !newItemNome.trim()) {
      alert("Por favor, informe o código e a descrição do componente.");
      return;
    }
    const novoItem: OpItem = {
      codigo: newItemCodigo.toUpperCase(),
      nome: newItemNome,
      qtd: newItemQtd,
      separado: false,
      conferido: false
    };
    setNewOpItems([...newOpItems, novoItem]);
    setNewItemCodigo("");
    setNewItemNome("");
    setNewItemQtd(1);
  };

  const handleRemoverItemDoRascunho = (idx: number) => {
    setNewOpItems(newOpItems.filter((_, i) => i !== idx));
  };

  const handleSalvarNovaOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpNumber.trim() || !newOpDescription.trim()) {
      alert("Preencha o Nº da OP e a descrição do produto.");
      return;
    }
    if (newOpItems.length === 0) {
      alert("A OP precisa ter pelo menos 1 componente na lista de separação.");
      return;
    }

    try {
      const dataOp: Omit<Op, "id"> = {
        order_number: newOpNumber.trim().toUpperCase(),
        description: newOpDescription.trim(),
        sector: newOpSector,
        date: newOpDate,
        status: "Pendente",
        items: newOpItems,
      };

      await addDoc(collection(db, "ops"), {
        ...dataOp,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Limpa dados e redireciona
      setNewOpNumber("");
      setNewOpDescription("");
      setNewOpItems([]);
      setActiveTab("separacao");
      alert(`Ordem de Produção criada com absoluto sucesso para o Almoxarifado Ventisol!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "ops");
    }
  };

  // --- Função para Cadastro de Recebimentos ---
  const handleSalvarRecebimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNF.trim() || !newNFFornecedor.trim()) {
      alert("Informe pelo menos a Nota Fiscal e o fornecedor.");
      return;
    }

    try {
      const dataRec = {
        notaFiscal: newNF.trim(),
        fornecedor: newNFFornecedor.trim(),
        volumes: Number(newNFVolumes),
        dataRecebimento: new Date().toISOString().split("T")[0],
        status: "Pendente",
        responsavel: newNFResponsavel.trim() || "Recebimento Ventisol"
      };

      await addDoc(collection(db, "recebimentos"), dataRec);
      setNewNF("");
      setNewNFFornecedor("");
      setNewNFVolumes(1);
      setNewNFResponsavel("");
      alert("Recebimento de carga registrado com sucesso.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleConcluirRecebimento = async (recId: string) => {
    try {
      await updateDoc(doc(db, "recebimentos", recId), {
        status: "Concluido"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletarRecebimento = async (recId: string) => {
    if (!window.confirm("Remover registro de entrada de carga?")) return;
    try {
      await deleteDoc(doc(db, "recebimentos", recId));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Função especial de Impressão ---
  const handlePrintOp = () => {
    window.print();
  };

  // --- Cálculos de Estatísticas para Relatórios e Indicadores ---
  const stats = useMemo(() => {
    const total = ops.length;
    const pendentes = ops.filter(o => o.status === "Pendente").length;
    const separando = ops.filter(o => o.status === "Separando").length;
    const concluidas = ops.filter(o => o.status === "Concluido").length;
    const baixadas = ops.filter(o => o.status === "Baixada").length;

    // Indicador especial de OPs fora do filtro de datas devido à pendência de separação e conferência
    const forcadasPendentes = ops.filter(o => {
      const orderDate = o.date;
      const isWithinDateRange = orderDate >= startDate && orderDate <= endDate;
      const { separation, conference } = calculatePercentages(o.items);
      const isComplete = separation === 100 && conference === 100;
      return !isWithinDateRange && !isComplete;
    }).length;

    // Componentes totais rastreados
    let totalComponentes = 0;
    let separadosComponentes = 0;
    ops.forEach(op => {
      op.items.forEach(it => {
        totalComponentes += it.qtd;
        if (it.separado) separadosComponentes += it.qtd;
      });
    });

    return {
      total,
      pendentes,
      separando,
      concluidas,
      baixadas,
      forcadasPendentes,
      totalComponentes,
      separadosComponentes,
      percentualGeralSeparados: totalComponentes > 0 ? Math.round((separadosComponentes / totalComponentes) * 100) : 0
    };
  }, [ops, startDate, endDate]);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100 selection:bg-orange-500 selection:text-white">
      
      {/* --- ÁREA DE IMPRESSÃO (Oculta na Web, Visível apenas no Print A4) --- */}
      {selectedOp && (
        <div id="print-area" className="print-only p-8 text-black bg-white select-none">
          <div className="border-b-4 border-orange-600 pb-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">VENTISOL</h1>
              <p className="text-xs tracking-widest text-slate-500">INDÚSTRIA E COMÉRCIO DE METAIS E VENTILADORES</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold font-mono">ORDEM DE PRODUÇÃO: {selectedOp.order_number}</h2>
              <p className="text-sm">Data de Movimentação: {selectedOp.date.split("-").reverse().join("/")}</p>
              <p className="text-xs text-slate-600">Setor Sincronizado: {selectedOp.sector}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-3 bg-slate-100 rounded border">
              <span className="text-xs text-slate-500 block uppercase font-semibold">Produto / Descrição da OP</span>
              <span className="font-bold text-lg text-slate-800">{selectedOp.description}</span>
            </div>
            <div className="p-3 bg-slate-100 rounded border flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-semibold">Status Operacional</span>
                <span className="font-black text-lg tracking-wider block text-orange-600">{selectedOp.status.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">Separação: {calculatePercentages(selectedOp.items).separation}%</p>
                <p className="text-xs font-semibold">Conferência: {calculatePercentages(selectedOp.items).conference}%</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold border-b pb-2 mb-3 text-slate-800">LISTA DE COMPONENTES DE SEPARAÇÃO E CONFERÊNCIA</h3>
          
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-200 text-slate-700">
                <th className="p-2 border">Código</th>
                <th className="p-2 border">Descrição do Componente</th>
                <th className="p-2 border text-center">Definição Qtd</th>
                <th className="p-2 border text-center">Separado [ ]</th>
                <th className="p-2 border text-center">Conferido [ ]</th>
                <th className="p-2 border">Visto Operador</th>
              </tr>
            </thead>
            <tbody>
              {selectedOp.items.map((item, index) => (
                <tr key={index} className="border-b hover:bg-slate-50">
                  <td className="p-2 border font-mono font-semibold">{item.codigo}</td>
                  <td className="p-2 border">{item.nome}</td>
                  <td className="p-2 border text-center font-bold text-base">{item.qtd}</td>
                  <td className="p-2 border text-center font-mono">{item.separado ? "[ X ] SIM" : "[   ] NÃO"}</td>
                  <td className="p-2 border text-center font-mono">{item.conferido ? "[ X ] SIM" : "[   ] NÃO"}</td>
                  <td className="p-2 border w-40"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t pt-4">
              <p className="font-semibold text-slate-700">Assinatura Almoxarife do Turno</p>
              <p className="text-slate-400">Ventisol S/A</p>
            </div>
            <div className="border-t pt-4">
              <p className="font-semibold text-slate-700">Responsável pela Linha de Produção</p>
              <p className="text-slate-400">Recebido em ____/____/2026</p>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-slate-400 mt-12">Sistema Integrado de Mobilidade Reversível - Almoxarifado Ventisol. Gerado em 2026.</p>
        </div>
      )}


      {/* --- SITE NORMAL (no-print) --- */}
      <div className="no-print flex flex-col flex-1">
        
        {/* --- HEADER PRINCIPAL --- */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 select-none pb-4 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Logo + Título */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20 text-white flex items-center justify-center">
                {/* Ícone customizado de ventilador / turbina */}
                <RefreshCw className="h-6 w-6 animate-spin-slow text-slate-950 font-black" style={{ animationDuration: "6s" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">VENTISOL</span>
                  <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono font-medium">SC - ALMOXARIFADO</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Painel Avançado de Fluxo de Materiais e Produção</p>
              </div>
            </div>

            {/* Status do Firebase + Horário Digital */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-emerald-400" />
                <span>Firestore:</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] animate-pulse">Sincronizado</span>
              </div>

              <div className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-orange-400" />
                <span className="font-mono text-slate-100 font-semibold">{currentTime}</span>
              </div>
              
              {ops.length === 0 && !loading && (
                <button
                  onClick={semearBancoDados}
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-slate-950 font-bold rounded-lg text-xs transition duration-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Semear Banco de Dados
                </button>
              )}
            </div>
          </div>

          {/* Menus de Abas Estilo Corporativo */}
          <div className="max-w-7xl mx-auto px-4 mt-2">
            <nav className="flex space-x-1 border-t border-slate-800/60 pt-2 pb-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("separacao")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "separacao" 
                    ? "bg-slate-800 text-orange-400 shadow-md shadow-black/80" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                Separação de OPs
                {stats.forcadasPendentes > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {stats.forcadasPendentes} Pendentes
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("recebimentos")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "recebimentos" 
                    ? "bg-slate-800 text-orange-400 shadow-md" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Truck className="h-4 w-4" />
                Recebimento Portaria
              </button>

              <button
                onClick={() => setActiveTab("cadastro")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "cadastro" 
                    ? "bg-slate-800 text-orange-400 shadow-md" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Plus className="h-4 w-4" />
                Cadastrar OP Manual
              </button>

              <button
                onClick={() => setActiveTab("relatorios")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "relatorios" 
                    ? "bg-slate-800 text-orange-400 shadow-md" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Estatística & Auditoria
              </button>
            </nav>
          </div>
        </header>

        {/* --- CARDS DE ATALHOS / KPIS GERAIS (Sincronizados das Coleções) --- */}
        <section className="max-w-7xl mx-auto w-full px-4 pt-6 select-none grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total OPs Rastradas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{stats.total}</span>
              <span className="text-xs text-slate-400">Ativas</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase text-amber-500">Pendente / Separado</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-500">{stats.pendentes + stats.separando}</span>
              <span className="text-xs text-slate-400">Em processo</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase text-emerald-500">100% Conferido</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-500">{stats.concluidas}</span>
              <span className="text-xs text-slate-400">Concluídas</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase text-blue-500">Baixadas Estocadas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-blue-500">{stats.baixadas}</span>
              <span className="text-xs text-slate-400">Histórico</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 col-span-2 md:col-span-1 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-orange-500/10">
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5 text-orange-400" />
              Eficiência Separação
            </span>
            <div className="mt-2">
              <div className="flex justify-between text-xs font-mono font-bold mb-1">
                <span>{stats.percentualGeralSeparados}%</span>
                <span className="text-slate-400">{stats.separadosComponentes}/{stats.totalComponentes} un</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${stats.percentualGeralSeparados}%` }}></div>
              </div>
            </div>
          </div>
        </section>


        {/* --- MAIN BODY CONTENT --- */}
        <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 select-none">
              <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="font-semibold text-sm">Carregando painel em tempo real...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* === TAB 1: SEPARAÇÃO DE OPS (OPERAÇÃO CRÍTICA) === */}
              {activeTab === "separacao" && (
                <div id="separacao-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
                  
                  {/* Bloco de Listagem e Filtros (9 Colunas no Desktop) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    
                    {/* Linha de Busca e Regras de Negócio */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-4">
                      
                      {/* Campo de Busca Texto */}
                      <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          value={searchOP}
                          onChange={(e) => setSearchOP(e.target.value)}
                          placeholder="Buscar OP, Modelo de Ventilador, Componente..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition duration-150"
                        />
                      </div>

                      {/* Dropdown de Setores */}
                      <div className="w-full md:w-auto">
                        <select
                          value={sectorFilter}
                          onChange={(e) => setSectorFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                        >
                          <option value="Todos">Todos os Setores</option>
                          <option value="Montagem">Montagem de Linha</option>
                          <option value="Injeção">Injeção Plástica</option>
                          <option value="Motores">Bobinamento / Motores</option>
                          <option value="Climatização">Linha Climatização</option>
                        </select>
                      </div>

                    </div>

                    {/* Filtros de Data com Aviso da Regra de Ouro */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4.5 w-4.5 text-orange-400" />
                          <span className="font-bold text-sm">Filtro de Data de Emissão (OPs 100% completas)</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Período:</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 text-xs focus:ring-1 focus:ring-orange-500"
                          />
                          <span>a</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 text-xs focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Alerta inteligente para o Trabalhador do Almoxarifado */}
                      <div className="p-3 bg-orange-950/40 border border-orange-500/20 rounded-lg flex items-start gap-2.5 text-xs text-orange-300">
                        <Info className="h-4.5 w-4.5 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-orange-200">Garantia Reversível de Almoxarifado:</strong>
                          Para segurança do estoque da Ventisol, todas as OPs com separação ou conferência pendentes (<span className="underline decoration-orange-500">não 100% concluídas</span>) são mantidas em evidência constante e serão exibidas no painel <strong className="text-white bg-orange-600/40 px-1 py-0.5 rounded">independentemente da data selecionada</strong>, evitando furos e paradas de linha!
                        </div>
                      </div>
                    </div>

                    {/* Lista Completa de OPs */}
                    <div className="flex flex-col gap-3">
                      {filteredOps.length === 0 ? (
                        <div className="p-10 text-center bg-slate-900 border border-dashed border-slate-800 rounded-xl text-slate-400">
                          <Package className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                          <p className="font-semibold text-sm">Nenhuma Ordem de Produção encontrada.</p>
                          <p className="text-xs text-slate-500 mt-1">Tente ajustar seus filtros de pesquisa ou mude os limites de datas.</p>
                        </div>
                      ) : (
                        filteredOps.map((op) => {
                          const { separation, conference } = calculatePercentages(op.items);
                          const isFullyDone = separation === 100 && conference === 100;
                          const isSelected = selectedOp?.id === op.id;

                          // Identifica se a OP está sendo mostrada ignorando a data
                          const isDateMatch = op.date >= startDate && op.date <= endDate;
                          const opExbidaPorPendente = !isDateMatch && !isFullyDone;

                          return (
                            <div
                              key={op.id}
                              id={`op-card-${op.order_number}`}
                              className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                                isSelected 
                                  ? "bg-slate-900 border-orange-500 ring-1 ring-orange-500 shadow-md shadow-orange-950/10" 
                                  : opExbidaPorPendente 
                                    ? "bg-slate-900/80 border-slate-700 hover:border-slate-500 hover:bg-slate-900" 
                                    : "bg-slate-900 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                              }`}
                              onClick={() => setSelectedOp(op)}
                            >
                              {/* Dados Básicos */}
                              <div className="flex-1 flex gap-3 items-start">
                                <div className={`p-2 rounded-lg text-slate-950 font-black mt-1 ${
                                  op.status === "Concluido" 
                                    ? "bg-emerald-400" 
                                    : op.status === "Separando"
                                      ? "bg-orange-400"
                                      : op.status === "Baixada"
                                        ? "bg-blue-400"
                                        : "bg-slate-400"
                                }`}>
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-base font-black text-slate-100">{op.order_number}</span>
                                    <span className="text-xs px-2 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-800 font-semibold">{op.sector}</span>
                                    {opExbidaPorPendente && (
                                      <span className="text-[10px] px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-500/30 rounded font-black uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                        Incompleta (Fora da Data)
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-semibold text-slate-200">{op.description}</h4>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>Movimento: {op.date.split("-").reverse().join("/")}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Barra de Progresso duplo para separação e conferência */}
                              <div className="flex flex-col gap-2 w-full md:w-44 shrink-0 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                                {/* Separação */}
                                <div className="space-y-1">
                                  <div className="flex justify-between font-mono font-bold font-semibold uppercase text-[10px] text-slate-400">
                                    <span>Separação:</span>
                                    <span className={separation === 100 ? "text-emerald-400" : "text-orange-400"}>{separation}%</span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-300 ${separation === 100 ? "bg-emerald-400" : "bg-orange-500"}`} 
                                      style={{ width: `${separation}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Conferência */}
                                <div className="space-y-1">
                                  <div className="flex justify-between font-mono font-bold font-semibold uppercase text-[10px] text-slate-400">
                                    <span>Conferência:</span>
                                    <span className={conference === 100 ? "text-emerald-400" : "text-blue-400"}>{conference}%</span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-300 ${conference === 100 ? "bg-emerald-400" : "bg-blue-400"}`} 
                                      style={{ width: `${conference}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              {/* Ação rápida / Deletar */}
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedOp(op)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition duration-150"
                                  title="Ver componentes e gerenciar OP"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletarOp(op.id!)}
                                  className="p-1.5 bg-slate-900 border border-slate-850 hover:bg-red-950 hover:text-red-400 text-slate-500 rounded-lg transition duration-150"
                                  title="Excluir OP"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Painel Operacional Lateral de Controle de Separação (5 Colunas no Desktop) */}
                  <div className="lg:col-span-5">
                    {selectedOp ? (
                      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6 sticky top-24">
                        
                        {/* Status e Cabeçalho */}
                        <div className="border-b border-slate-800 pb-4 flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-mono text-xl font-black text-slate-100">{selectedOp.order_number}</h3>
                              <span className="text-xs font-bold px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-500/20 rounded">
                                {selectedOp.sector}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-1 uppercase">OP ativa de Produção</p>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={handlePrintOp}
                              className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg transition"
                              title="Imprimir Folha A4 para Almoxarife"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSelectedOp(null)}
                              className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
                            >
                              Fechar [X]
                            </button>
                          </div>
                        </div>

                        {/* Detalhes da OP */}
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Descrição / Destino</label>
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                            <p className="text-sm font-bold text-slate-100 leading-relaxed">{selectedOp.description}</p>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Data Cadastrada: {selectedOp.date.split("-").reverse().join("/")}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progresso de Separação e Conferência */}
                        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <div>
                            <div className="flex justify-between text-xs font-bold font-mono text-orange-400 mb-1">
                              <span>SEPARAÇÃO DE MATERIAIS</span>
                              <span>{calculatePercentages(selectedOp.items).separation}%</span>
                            </div>
                            <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${calculatePercentages(selectedOp.items).separation}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-bold font-mono text-blue-400 mb-1">
                              <span>CONFERÊNCIA DE EMBALAGEM</span>
                              <span>{calculatePercentages(selectedOp.items).conference}%</span>
                            </div>
                            <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-blue-400 h-full transition-all duration-300" style={{ width: `${calculatePercentages(selectedOp.items).conference}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Lista Interativa de Componentes */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Componentes e Peças</label>
                            
                            {/* Ações Rápidas por OP */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCompletarSeparacao(selectedOp)}
                                className="text-[10px] bg-slate-850 hover:bg-slate-800 text-orange-400 px-2 py-1 rounded"
                              >
                                Separar Tudo
                              </button>
                              <button
                                onClick={() => handleCompletarConferencia(selectedOp)}
                                className="text-[10px] bg-slate-850 hover:bg-slate-800 text-blue-400 px-2 py-1 rounded"
                              >
                                Conferir e Concluir OP
                              </button>
                            </div>
                          </div>

                          <div className="max-h-76 overflow-y-auto space-y-2 pr-1">
                            {selectedOp.items.map((item, idx) => (
                              <div 
                                key={idx} 
                                className={`p-3 rounded-lg border text-xs leading-relaxed flex items-center justify-between gap-3 ${
                                  item.separado && item.conferido
                                    ? "bg-slate-950/60 border-emerald-950/40 text-slate-300"
                                    : "bg-slate-950 border-slate-850 hover:border-slate-800"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono bg-slate-900 border border-slate-800 rounded px-1.5 text-zinc-300 font-bold tracking-tight">{item.codigo}</span>
                                    <span className="font-bold text-slate-100">Qtd: {item.qtd}</span>
                                  </div>
                                  <p className="text-zinc-400 select-none">{item.nome}</p>
                                </div>

                                {/* Botões Reativos de Status do Componente */}
                                <div className="flex items-center gap-1 text-[10px]">
                                  {/* Separado */}
                                  <button
                                    onClick={() => handleToggleItemSeparado(selectedOp, idx)}
                                    className={`px-2 py-1.5 rounded font-black uppercase transition-all duration-150 ${
                                      item.separado 
                                        ? "bg-orange-500/10 border border-orange-500/20 text-orange-400" 
                                        : "bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    Separado
                                  </button>

                                  {/* Conferido */}
                                  <button
                                    onClick={() => handleToggleItemConferido(selectedOp, idx)}
                                    className={`px-2 py-1.5 rounded font-black uppercase transition-all duration-150 ${
                                      item.conferido 
                                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
                                        : "bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    Conferido
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Ações Especiais Finais para OP */}
                        {calculatePercentages(selectedOp.items).separation === 100 && 
                         calculatePercentages(selectedOp.items).conference === 100 && 
                         selectedOp.status !== "Baixada" && (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-3">
                            <p className="text-xs text-emerald-400 text-center font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                              Todos os componentes foram 100% separados e conferidos!
                            </p>
                            <button
                              onClick={() => handleBaixarOp(selectedOp)}
                              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black tracking-wider uppercase text-xs rounded-lg transition duration-200 shadow-lg shadow-emerald-500/10"
                            >
                              Baixar OP e Concluir Fluxo
                            </button>
                          </div>
                        )}

                        {selectedOp.status === "Baixada" && (
                          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-center">
                            <span className="text-xs text-blue-400 font-bold block">Esta OP foi baixada no estoque físico</span>
                            <span className="text-[10px] text-zinc-500">Histórico mantido apenas para auditoria de segurança</span>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="p-10 text-center bg-slate-900/60 border border-slate-850 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-500 select-none sticky top-24">
                        <FolderOpenIcon className="h-12 w-12 text-slate-700 mb-3" />
                        <h4 className="text-sm font-bold text-slate-400">Nenhuma OP selecionada</h4>
                        <p className="text-xs text-slate-500 max-w-64 mt-1.5 text-center leading-relaxed">
                          Selecione qualquer Ordem de Produção da lista ao lado para gerenciar checklist, estornar fluxos ou imprimir a folha A4 de separação.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* === TAB 2: RECEBIMENTO PORTARIA DE MATERIAIS === */}
              {activeTab === "recebimentos" && (
                <div id="recebimentos-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Cadastro de novo recebimento */}
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Truck className="h-5 w-5" />
                      <h3 className="font-bold text-base">Registrar Entrada de Notas Fiscais</h3>
                    </div>
                    <p className="text-xs text-slate-400">Entrada e descarga dos fornecedores de insumos para os ventiladores Ventisol.</p>

                    <form onSubmit={handleSalvarRecebimento} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-black">Nota Fiscal (NF-e)</label>
                        <input
                          type="text"
                          required
                          value={newNF}
                          onChange={(e) => setNewNF(e.target.value)}
                          placeholder="NF-892400"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-slate-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-black">Fornecedor / Siderúrgica</label>
                        <input
                          type="text"
                          required
                          value={newNFFornecedor}
                          onChange={(e) => setNewNFFornecedor(e.target.value)}
                          placeholder="Ex: Força Metálica LTDA"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black">Nº Volumes / Caixas</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={newNFVolumes}
                            onChange={(e) => setNewNFVolumes(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black">Responsável Doc.</label>
                          <input
                            type="text"
                            value={newNFResponsavel}
                            onChange={(e) => setNewNFResponsavel(e.target.value)}
                            placeholder="Almoxarife"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-slate-100"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-lg text-xs tracking-wider uppercase transition duration-150"
                      >
                        Registrar Entrada Portaria
                      </button>
                    </form>
                  </div>

                  {/* Listagem de cargas em triagem e conferência */}
                  <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-orange-400" />
                        <h3 className="font-bold text-base">Cargas em Triagem de Descarga</h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">Total: {recebimentos.length} Notas</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {recebimentos.length === 0 ? (
                        <div className="p-10 border border-dashed border-slate-800 text-center rounded-lg text-slate-500 text-xs">
                          Sem notas fiscais em conferência física no momento.
                        </div>
                      ) : (
                        recebimentos.map((rec) => (
                          <div key={rec.id} className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-slate-150">{rec.notaFiscal}</span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  rec.status === "Concluido" 
                                    ? "bg-emerald-900 text-emerald-300" 
                                    : "bg-amber-900 text-amber-300 animate-pulse"
                                }`}>
                                  {rec.status === "Concluido" ? "CONCORDADO" : "AGUARDANDO DESCARGA"}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-300">Fornecedor: {rec.fornecedor}</p>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span>Volumes: {rec.volumes} pçs</span>
                                <span>• Rec. por: {rec.responsavel}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {rec.status === "Pendente" && (
                                <button
                                  onClick={() => handleConcluirRecebimento(rec.id!)}
                                  className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs transition duration-150"
                                >
                                  Concluir Doc.
                                </button>
                              )}
                              <button
                                onClick={() => handleDeletarRecebimento(rec.id!)}
                                className="p-1.5 bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-550 rounded transition duration-150"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* === TAB 3: CADASTRO MANUAL DE OP === */}
              {activeTab === "cadastro" && (
                <div id="cadastro-view" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* Formulário Dados Gerais */}
                  <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-orange-400" />
                      <h3 className="font-bold text-base">Nova Ordem de Produção (Regra de Controle Físico)</h3>
                    </div>
                    <p className="text-xs text-slate-400">Insira as especificações da linha de sopro, injeção ou motores de ventiladores da Ventisol.</p>

                    <form onSubmit={handleSalvarNovaOp} className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black">Nº Da Ordem (OP)</label>
                          <input
                            type="text"
                            required
                            value={newOpNumber}
                            onChange={(e) => setNewOpNumber(e.target.value)}
                            placeholder="Ex: OP-4510"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black">Setor Destinatário</label>
                          <select
                            value={newOpSector}
                            onChange={(e) => setNewOpSector(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                          >
                            <option value="Montagem">Montagem de Linha</option>
                            <option value="Injeção">Injeção Plástica</option>
                            <option value="Motores">Bobinamento / Motores</option>
                            <option value="Climatização">Linha Climatização</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black font-semibold">Data Operação</label>
                          <input
                            type="date"
                            required
                            value={newOpDate}
                            onChange={(e) => setNewOpDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-black">Modelo / Aparelho de Destino</label>
                          <input
                            type="text"
                            required
                            value={newOpDescription}
                            onChange={(e) => setNewOpDescription(e.target.value)}
                            placeholder="Ex: Ventilador de Mesa Ventisol 40cm"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-800/60 pt-4 space-y-4">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                          <span className="text-[10px] text-orange-400 uppercase font-black block mb-2">Composição de Componentes</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={newItemCodigo}
                              onChange={(e) => setNewItemCodigo(e.target.value)}
                              placeholder="Cód: PA-MET-20"
                              className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100"
                            />
                            <input
                              type="text"
                              value={newItemNome}
                              onChange={(e) => setNewItemNome(e.target.value)}
                              placeholder="Desc: Grade Traseira"
                              className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 col-span-2 md:col-span-1"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={newItemQtd}
                                onChange={(e) => setNewItemQtd(Number(e.target.value))}
                                className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={handleAdicionarItemAoRascunho}
                                className="bg-orange-500 text-slate-950 font-bold px-3 rounded text-xs flex-1"
                              >
                                + Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold uppercase text-xs rounded-xl tracking-wider shadow-lg shadow-amber-500/10 transition"
                      >
                        Criar e Sincronizar OP com Almoxaritado
                      </button>
                    </form>
                  </div>

                  {/* Listagem de itens adicionados a OP de Rascunho */}
                  <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="font-bold">COMPONENTES INCLUÍDOS NESTA OP</span>
                      <span>{newOpItems.length} componentes adicionados</span>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {newOpItems.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-slate-800 text-xs text-slate-500">
                          Nenhum componente adicionado à lista. Use o formulário à esquerda para compor a OP.
                        </div>
                      ) : (
                        newOpItems.map((it, index) => (
                          <div key={index} className="p-3 bg-slate-950 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono bg-slate-900 border border-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">{it.codigo}</span>
                                <span className="text-slate-100 font-black">Qtd: {it.qtd}</span>
                              </div>
                              <span className="text-slate-400">{it.nome}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoverItemDoRascunho(index)}
                              className="p-1.5 hover:bg-red-950 hover:text-red-400 text-slate-500 rounded transition duration-150"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* === TAB 4: ESTANSTICAS E RELATÓRIO DO ALMOXARIFADO === */}
              {activeTab === "relatorios" && (
                <div id="relatorios-view" className="space-y-6">
                  
                  {/* Cartões Estatísticos de Desempenho */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-center md:text-left">
                      <span className="text-xs text-slate-500 uppercase font-black">ASSERTIVIDADE DE SEPARAÇÃO</span>
                      <p className="text-3xl font-black text-orange-400">{stats.percentualGeralSeparados}%</p>
                      <p className="text-[10px] text-slate-400">Percentual de componentes já faturados e retirados do estoque.</p>
                    </div>

                    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-center md:text-left">
                      <span className="text-xs text-slate-500 uppercase font-black">VOLUMETRIA COMPONENTES</span>
                      <p className="text-3xl font-black text-blue-400">{stats.totalComponentes} un</p>
                      <p className="text-[10px] text-slate-400">Total de componentes requeridos para as OPs da fábrica.</p>
                    </div>

                    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-center md:text-left">
                      <span className="text-xs text-slate-500 uppercase font-black">PENDÊNCIA DE CRONOGRAMA</span>
                      <p className="text-3xl font-black text-rose-500">{stats.forcadasPendentes} OPs</p>
                      <p className="text-[10px] text-slate-400">OPs antigas exibidas independente de data devido a materiais pendentes.</p>
                    </div>

                    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-center md:text-left">
                      <span className="text-xs text-slate-400 uppercase font-black">QUALIDADE VENTISOL</span>
                      <div className="flex items-center justify-center md:justify-start gap-1 text-emerald-400 font-bold block pt-1.5">
                        <Award className="h-5 w-5 animate-bounce" />
                        <span className="text-base tracking-tight text-emerald-400">Selo ISO 9001 Sede</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Garantia Reversível: zero atrasos de embalagem.</p>
                    </div>

                  </div>

                  {/* Manual Operacional Corporativo */}
                  <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4 text-xs md:text-sm">
                    <h3 className="font-bold text-base text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 flex items-center gap-2">
                      <Building className="h-5 w-5 text-orange-400" />
                      Manual Corporativo de Engenharia e Transição Técnica - Ventisol
                    </h3>
                    
                    <div className="space-y-4 text-slate-300 leading-relaxed max-w-5xl">
                      <p>
                        Este terminal de controle é de uso exclusivo de colaboradores credenciados pela 
                        <strong> Ventisol Indústria de Climatizadores e Ventiladores</strong>. O objetivo do sistema é prover uma 
                        <em> Garantia Reversível de Almoxarifado</em>, erradicando divergências de inventário através de uma sincronização de checklist dupla:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                        <li>
                          <strong className="text-slate-200">Separação de Peças:</strong> Realizada pelo almoxarife que retira os componentes das prateleiras conforme as quantidades geradas na OP.
                        </li>
                        <li>
                          <strong className="text-slate-200">Conferência de Embalagem:</strong> Realizada na saída do galpão pelo conferente antes que as caixas sejam enviadas para as esteiras de montagem final.
                        </li>
                      </ol>
                      
                      <div className="p-3 bg-orange-950/20 border border-orange-500/20 rounded-lg text-xs flex items-center gap-2 text-orange-400">
                        <AlertTriangle className="h-4.5 w-4.5" />
                        <span>Atenção: Ações de estorno ou exclusão de nota fiscal alteram o histórico de auditoria instantaneamente. Execute com critério técnico.</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </main>

        {/* --- FOOTER CORPORATIVO --- */}
        <footer className="no-print mt-auto border-t border-slate-900 bg-slate-950/80 py-4 text-center text-[10px] text-slate-500 font-mono tracking-tight select-none">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2">
            <span>© 2026 Ventisol S/A • Todos os direitos reservados.</span>
            <span>Sistema Web de Gestão Baseado em Firestore de Alta Resiliência</span>
          </div>
        </footer>

      </div>

    </div>
  );
}

// --- Ícone auxiliar de pasta ---
function FolderOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
