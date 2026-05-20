"use client";

import { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  PlayCircle,
  Layers,
  Search,
  Check,
  RotateCcw,
  Edit2,
  Lock,
  Loader2,
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface do item da Ordem de Produção (OP)
interface OPItem {
  id: string;
  code: string;
  description: string;
  location: string;
  collector_name: string;
  planned_quantity: number;
  quantity: number; // Quantidade conferida/separada
  checked: boolean; // Marcador de conferido
}

// Interface da Ordem de Produção (OP)
interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  date: string;
  product_location: string;
  status: "Pendente" | "Em Separação" | "Aguardando Baixa" | "Baixada";
  is_signed: boolean;
  signed_at?: string;
  items: OPItem[];
  conferencia_ok?: boolean;
}

// OPs iniciais padrão de fábrica
const DEFAULT_ORDERS: PurchaseOrder[] = [
  {
    id: "OP-4012",
    order_number: "2026-4012",
    supplier_name: "Ventisol S.A. Industrial",
    date: "2026-05-18",
    product_location: "Setor A Corridores 2 e 3",
    status: "Pendente",
    is_signed: false,
    items: [
      { id: "item-1", code: "VENT-PA-40", description: "Ventilador de Parede 40cm Bivolt", location: "Loc: A-01-02", collector_name: "Marcos Lima", planned_quantity: 25, quantity: 0, checked: false },
      { id: "item-2", code: "VENT-CL-60", description: "Climatizador de Ar Pro 60 Litros", location: "Loc: A-04-10", collector_name: "Carlos Santos", planned_quantity: 10, quantity: 0, checked: false },
      { id: "item-3", code: "GRELHA-VENT", description: "Grelha Plástica Protetora Premium 40", location: "Loc: B-02-01", collector_name: "Marcos Lima", planned_quantity: 50, quantity: 0, checked: false }
    ]
  },
  {
    id: "OP-4013",
    order_number: "2026-4013",
    supplier_name: "Ventisol Componentes Plásticos",
    date: "2026-05-19",
    product_location: "Setor B Corredor 8",
    status: "Em Separação",
    is_signed: false,
    items: [
      { id: "item-4", code: "MOTOR-V12", description: "Motor de Alta Rotação 120W", location: "Loc: C-01-15", collector_name: "João Cabral", planned_quantity: 40, quantity: 15, checked: false },
      { id: "item-5", code: "HELICE-D40", description: "Hélice Plástica Azul-Escuro 3 Pás", location: "Loc: B-06-03", collector_name: "Gabriel Neves", planned_quantity: 40, quantity: 40, checked: true }
    ]
  },
  {
    id: "OP-4014",
    order_number: "2026-4014",
    supplier_name: "Ventisol Montadora Matriz",
    date: "2026-05-20",
    product_location: "Setor D Docas Estocagem",
    status: "Aguardando Baixa",
    is_signed: true,
    signed_at: "2026-05-20 10:15",
    items: [
      { id: "item-6", code: "EXAUST-EX30", description: "Exaustor de Ar Comercial 30cm", location: "Loc: D-08-01", collector_name: "Fernando Cruz", planned_quantity: 12, quantity: 12, checked: true },
      { id: "item-7", code: "PREND-CAB-G", description: "Kit de Prendedores para Cabos Grosso", location: "Loc: E-02-05", collector_name: "Fernando Cruz", planned_quantity: 100, quantity: 100, checked: true }
    ]
  },
  {
    id: "OP-4015",
    order_number: "2026-4015",
    supplier_name: "Ventisol Climatização Sul",
    date: "2026-05-15",
    product_location: "Setor A Corredor 14",
    status: "Baixada",
    is_signed: true,
    signed_at: "2026-05-15 16:45",
    items: [
      { id: "item-8", code: "VENT-COL-50", description: "Ventilador de Coluna 50cm Cromado", location: "Loc: A-14-05", collector_name: "Jorge Silva", planned_quantity: 30, quantity: 30, checked: true }
    ]
  },
  {
    id: "OP-4016",
    order_number: "2026-4016",
    supplier_name: "Ventisol Distribuidora Matriz",
    date: "2026-05-20",
    product_location: "Setor C Corredores 1 e 2",
    status: "Pendente",
    is_signed: false,
    items: [
      { id: "item-9", code: "SUPT-PAREDE", description: "Suporte Adaptador Reforçado Universal", location: "Loc: C-02-02", collector_name: "Ana Costa", planned_quantity: 60, quantity: 0, checked: false }
    ]
  }
];

export default function App() {
  // --- Estados do Simulador de Perfil ---
  const [empresa, setEmpresa] = useState<string>("Ventisol");
  const [subcategoria, setSubcategoria] = useState<string>("Conferente");
  const [simulatedRole, setSimulatedRole] = useState<string>("Administrador");

  // --- Estados Gerais ---
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "separacao">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOP, setSelectedOP] = useState<PurchaseOrder | null>(null);
  const [showConferenciaConfirm, setShowConferenciaConfirm] = useState<boolean>(false);

  // Resetar a confirmação de conferência ao alternar de OP selecionada
  useEffect(() => {
    setShowConferenciaConfirm(false);
  }, [selectedOP?.id]);

  // --- Estados do Controle de Áudio/Voz ---
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const spokenOPsRef = useRef<Set<string>>(new Set());

  // Mensagem e notificações na tela
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Inicialização ---
  useEffect(() => {
    // Tenta carregar dados sincronizados do localStorage
    if (typeof window !== "undefined") {
      const savedOrders = localStorage.getItem("ventisol_op_orders");
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch {
          setOrders(DEFAULT_ORDERS);
        }
      } else {
        setOrders(DEFAULT_ORDERS);
      }

      const savedSpeech = localStorage.getItem("ventisol_speech_enabled");
      if (savedSpeech !== null) {
        setSpeechEnabled(savedSpeech === "true");
      }

      const savedEmpresa = localStorage.getItem("ventisol_sim_empresa");
      if (savedEmpresa) setEmpresa(savedEmpresa);

      const savedSubcat = localStorage.getItem("ventisol_sim_subcat");
      if (savedSubcat) setSubcategoria(savedSubcat);

      const savedRole = localStorage.getItem("ventisol_sim_role");
      if (savedRole) setSimulatedRole(savedRole);
    }
  }, []);

  // Persistir alterações de OPs
  const saveOrdersToLocalStorage = (updatedOrders: PurchaseOrder[]) => {
    setOrders(updatedOrders);
    localStorage.setItem("ventisol_op_orders", JSON.stringify(updatedOrders));
  };

  // Persistir preferência de simulação
  const handleRoleChange = (val: string) => {
    setSimulatedRole(val);
    localStorage.setItem("ventisol_sim_role", val);
  };

  const handleEmpresaChange = (val: string) => {
    // Apenas se for admin/super admin
    if (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") return;
    setEmpresa(val);
    localStorage.setItem("ventisol_sim_empresa", val);
  };

  const handleSubcatChange = (val: string) => {
    // Apenas se for admin/super admin
    if (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") return;
    setSubcategoria(val);
    localStorage.setItem("ventisol_sim_subcat", val);
  };

  const toggleSpeech = () => {
    setSpeechEnabled(prev => {
      const next = !prev;
      localStorage.setItem("ventisol_speech_enabled", String(next));
      return next;
    });
  };

  // --- Lógica de Permissão de Edição ---
  // Tem que ser empresa "Ventisol" e subcategoria "Conferente"
  const isAuthorizedToEdit = empresa === "Ventisol" && subcategoria === "Conferente";

  // --- Lógica do Aviso Sonoro ---
  useEffect(() => {
    if (!speechEnabled) return;
    if (orders.length === 0) return;

    // Localiza OPs que estão com status "Aguardando Baixa" ou que estão assinadas aguardando baixa
    const aguardandoBaixa = orders.filter(
      (op) => op.status === "Aguardando Baixa" || (op.is_signed && op.status !== "Baixada")
    );

    if (aguardandoBaixa.length === 0) return;

    // Falar a mensagem para cada OP que ainda não foi falada nesta sessão
    aguardandoBaixa.forEach((op) => {
      const opId = op.id;
      if (!spokenOPsRef.current.has(opId)) {
        spokenOPsRef.current.add(opId);

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          // Garante que o texto seja falado de forma limpa
          const text = `OP ${op.order_number} está liberada para baixa.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "pt-BR";
          utterance.rate = 1.0;
          
          // Envia para o mecanismo de fala nativo do navegador
          window.speechSynthesis.speak(utterance);
        }
      }
    });
  }, [orders, speechEnabled]);

  // Limpar os avisos sonoros da sessão para permitir falar novamente se o usuário quiser recarregar
  const resetSpokenHistory = () => {
    spokenOPsRef.current.clear();
    // Executa uma nova varredura de fala
    const currentOrders = [...orders];
    setOrders([]);
    setTimeout(() => {
      setOrders(currentOrders);
      showBanner("Histórico de avisos sonoros resetado. OPs pendentes serão faladas novamente!");
    }, 100);
  };

  const showBanner = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // --- Lógica do Operador para Alterar Valores ---
  const handleItemQuantityChange = (opId: string, itemId: string, value: number) => {
    if (!isAuthorizedToEdit) return;

    const updated = orders.map((op) => {
      if (op.id === opId) {
        const updatedItems = op.items.map((it) => {
          if (it.id === itemId) {
            // Garante que não é menor que zero
            const val = Math.max(0, value);
            return { ...it, quantity: val };
          }
          return it;
        });
        return { ...op, items: updatedItems };
      }
      return op;
    });

    saveOrdersToLocalStorage(updated);
    if (selectedOP?.id === opId) {
      setSelectedOP(updated.find(o => o.id === opId) || null);
    }
  };

  const handleItemCheckedToggle = (opId: string, itemId: string) => {
    if (!isAuthorizedToEdit) return;

    const updated = orders.map((op) => {
      if (op.id === opId) {
        const updatedItems = op.items.map((it) => {
          if (it.id === itemId) {
            return { ...it, checked: !it.checked };
          }
          return it;
        });
        return { ...op, items: updatedItems };
      }
      return op;
    });

    saveOrdersToLocalStorage(updated);
    if (selectedOP?.id === opId) {
      setSelectedOP(updated.find(o => o.id === opId) || null);
    }
  };

  // Marcar a conferência completa OK de uma OP
  const handleConferenciaOK = (opId: string) => {
    if (!isAuthorizedToEdit) return;

    const currentOP = orders.find(o => o.id === opId);
    if (!currentOP) return;

    // Garante que todos os itens estão conferidos e têm quantidade 100% bater
    const allCheckedAnd100 = currentOP.items.every(it => it.checked && Math.max(0, it.quantity) === it.planned_quantity);
    if (!allCheckedAnd100) {
      showBanner("Apenas OPs com 100% de conferência e todos itens marcados podem receber Conclusão OK.");
      return;
    }

    const updated = orders.map((op) => {
      if (op.id === opId) {
        return {
          ...op,
          conferencia_ok: true
        };
      }
      return op;
    });

    saveOrdersToLocalStorage(updated);
    setSelectedOP(updated.find(o => o.id === opId) || null);
    setShowConferenciaConfirm(false);
    showBanner(`Conferência OK salva para a OP ${currentOP.order_number}! O botão de assinatura foi habilitado abaixo.`);
  };

  // Lançar Botão de Conferência da OP (Conferir e Liberar p/ Baixa)
  const handleConferOP = (opId: string) => {
    if (!isAuthorizedToEdit) return;

    const currentOP = orders.find(o => o.id === opId);
    if (!currentOP) return;

    // Validação opcional para ver se todas as quantidades bateram, mas permite conferir independentemente
    const itemsUnchecked = currentOP.items.filter(it => !it.checked || it.quantity !== it.planned_quantity);
    const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);

    const updated = orders.map((op) => {
      if (op.id === opId) {
        // Atualiza todas as linhas de itens para True se ainda não marcados, para que fique completo
        const updatedItems = op.items.map(it => ({
          ...it,
          checked: true,
          quantity: it.quantity === 0 ? it.planned_quantity : it.quantity
        }));

        return {
          ...op,
          items: updatedItems,
          is_signed: true,
          status: "Aguardando Baixa" as const,
          signed_at: dateStr
        };
      }
      return op;
    });

    saveOrdersToLocalStorage(updated);
    setSelectedOP(updated.find(o => o.id === opId) || null);

    const spokenText = itemsUnchecked.length > 0 
      ? `OP ${currentOP.order_number} conferida com ajustes e liberada para baixa!` 
      : `OP ${currentOP.order_number} concluída 100% com sucesso!`;

    showBanner(spokenText);
  };

  // Resetar banco de dados para o estado inicial de fábrica
  const handleResetFactory = () => {
    if (confirm("Deseja realmente redefinir o simulador para os dados de fábrica?")) {
      spokenOPsRef.current.clear();
      setOrders(DEFAULT_ORDERS);
      localStorage.setItem("ventisol_op_orders", JSON.stringify(DEFAULT_ORDERS));
      setSelectedOP(null);
      showBanner("Simulador redefinido com dados padrão!");
    }
  };

  // Marcar uma OP como Baixada (Supervisor dá baixa)
  const handleDarBaixa = (opId: string) => {
    const updated = orders.map((op) => {
      if (op.id === opId) {
        return { ...op, status: "Baixada" as const };
      }
      return op;
    });
    saveOrdersToLocalStorage(updated);
    if (selectedOP?.id === opId) {
      setSelectedOP(updated.find(o => o.id === opId) || null);
    }
    showBanner(`OP ${orders.find(o => o.id === opId)?.order_number} baixada no sistema com sucesso!`);
  };

  // Filtragem de OPs
  const filteredOrders = orders.filter((op) => {
    const matchesSearch = 
      op.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.product_location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Estatísticas de OPs
  const totalOPs = orders.length;
  const pendentes = orders.filter((o) => o.status === "Pendente").length;
  const emSeparacao = orders.filter((o) => o.status === "Em Separação").length;
  const aguardandoBaixa = orders.filter((o) => o.status === "Aguardando Baixa").length;
  const baixadas = orders.filter((o) => o.status === "Baixada").length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 selection:bg-indigo-500 selection:text-white">
      
      {/* --- SIMULADOR DE PERFIL DE USUÁRIO (Top Header) --- */}
      <div className="w-full bg-slate-900 border-b border-indigo-950/40 text-gray-200 py-2.5 px-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 bg-yellow-400 text-slate-950 rounded-md font-extrabold animate-pulse">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="font-extrabold uppercase tracking-widest text-indigo-400">Ambiente de Simulação de Permissão de Acesso</p>
              <p className="text-[11px] text-gray-400">Selecione as credenciais para ver as restrições em tempo real.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-start lg:self-auto w-full lg:w-auto">
            
            {/* Perfil que controla o simulador */}
            <div className="flex items-center gap-1.5 px-2 border-r border-slate-700/60 pr-3">
              <span className="text-yellow-400 font-extrabold flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Usuário do Sistema:
              </span>
              <select
                value={simulatedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-slate-950 text-white rounded-lg px-2.5 py-1 border border-yellow-500/40 focus:outline-none focus:border-yellow-400 font-bold cursor-pointer text-xs"
              >
                <option value="Administrador">👑 Administrador</option>
                <option value="Super Admin">⚡ Super Admin</option>
                <option value="Operador">👤 Operador Comum</option>
              </select>
            </div>

            {/* Empresa/Categoria */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 transition-all",
              (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") && "opacity-50"
            )}>
              <span className="text-gray-400 font-medium flex items-center gap-1">
                {(simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") && <Lock className="w-3 h-3 text-rose-450 shrink-0" />}
                Empresa:
              </span>
              <select
                value={empresa}
                disabled={simulatedRole !== "Administrador" && simulatedRole !== "Super Admin"}
                onChange={(e) => handleEmpresaChange(e.target.value)}
                className={cn(
                  "bg-slate-950 text-white rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 font-semibold text-xs",
                  (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") ? "cursor-not-allowed text-gray-400" : "cursor-pointer"
                )}
                title={simulatedRole !== "Administrador" && simulatedRole !== "Super Admin" ? "Apenas Administrador ou Super Admin pode alterar" : ""}
              >
                <option value="Ventisol">Ventisol (Autorizado)</option>
                <option value="Outra">Outra Empresa (Sem direito)</option>
              </select>
            </div>

            {/* Subcategoria */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 transition-all",
              (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") && "opacity-50"
            )}>
              <span className="text-gray-400 font-medium flex items-center gap-1">
                {(simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") && <Lock className="w-3 h-3 text-rose-450 shrink-0" />}
                Subcategoria:
              </span>
              <select
                value={subcategoria}
                disabled={simulatedRole !== "Administrador" && simulatedRole !== "Super Admin"}
                onChange={(e) => handleSubcatChange(e.target.value)}
                className={cn(
                  "bg-slate-950 text-white rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 font-semibold text-xs",
                  (simulatedRole !== "Administrador" && simulatedRole !== "Super Admin") ? "cursor-not-allowed text-gray-400" : "cursor-pointer"
                )}
                title={simulatedRole !== "Administrador" && simulatedRole !== "Super Admin" ? "Apenas Administrador ou Super Admin pode alterar" : ""}
              >
                <option value="Conferente">Conferente (Autorizado)</option>
                <option value="Apenas Coletor">Coletor (Sem direito)</option>
                <option value="Recebimento">Recebimento (Sem direito)</option>
                <option value="Administrador">Admin Geral</option>
              </select>
            </div>

            {/* Status Indicativo de Permissão */}
            <div className="ml-auto lg:ml-2 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900">
              {isAuthorizedToEdit ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-black tracking-wide uppercase text-[10px]">Acesso Liberado</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-rose-400 font-black tracking-wide uppercase text-[10px]">Acesso Bloqueado</span>
                </>
              )}
            </div>
            
          </div>
        </div>
      </div>

      {/* --- BANNER DE SUCESSO FLUTUANTE --- */}
      {successMessage && (
        <div className="fixed top-16 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-900 border-l-4 border-emerald-500 text-white p-4 rounded-xl shadow-xl flex items-start gap-3 transition-all animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">Mensagem do Sistema</p>
            <p className="text-xs text-slate-200 mt-1 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* --- HEADER PRINCIPAL DA APLICAÇÃO --- */}
      <header className="bg-white border-b border-gray-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/10 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-black tracking-widest text-indigo-600 uppercase border border-indigo-100">WMS Ventisol</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">Fábrica SC</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight mt-0.5">Painel de Separadores & Conferência</h1>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/40">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2",
                activeTab === "dashboard"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              Painel de Separação
            </button>
            <button
              onClick={() => {
                setActiveTab("separacao");
                // Seleciona a primeira OP para facilitar a visualização se nenhuma estiver selecionada
                if (!selectedOP && orders.length > 0) {
                  setSelectedOP(orders[0]);
                }
              }}
              className={cn(
                "px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2",
                activeTab === "separacao"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Edit2 className="w-4 h-4 shrink-0" />
              Separação de OPs
            </button>
          </div>
        </div>
      </header>

      {/* --- CORPO PRINCIPAL --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* INFO ALERTA DE PERMISSAO */}
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Como testar esta versão de conformidade?</h4>
              <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                Utilize o simulador no menu preto do topo. Se o perfil for <span className="font-bold underline text-indigo-600">👑 Administrador</span> ou <span className="font-bold underline text-indigo-600">⚡ Super Admin</span>, você conseguirá alterar a empresa e subcategoria. Se alternar o usuário para <span className="font-bold underline text-rose-650">👤 Operador Comum</span>, a alteração da Empresa e da Subcategoria ficará <span className="font-bold text-rose-650">completamente bloqueada</span>.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetFactory}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar Dados
          </button>
        </div>

        {/* ========================================================== */}
        {/* NAVEGAÇÃO 1: PAINEL DE SEPARAÇÃO (Dashboard Executivo)     */}
        {/* ========================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* GRID DE CARDS KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total de OPs</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{totalOPs}</p>
                <span className="text-[10px] text-gray-500 font-medium mt-1 inline-block">Registradas no WMS</span>
              </div>

              <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/10 shadow-xs">
                <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-wider">Pendentes</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{pendentes}</p>
                <span className="text-[10px] text-amber-500 font-bold mt-1 inline-block">Aguardando início</span>
              </div>

              <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 shadow-xs">
                <p className="text-[10px] font-black uppercase text-blue-500/80 tracking-wider">Em Separação</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{emSeparacao}</p>
                <span className="text-[10px] text-blue-500 font-bold mt-1 inline-block">Coletores na pista</span>
              </div>

              <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/25 shadow-sm">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1 font-extrabold animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                  Aguardando Baixa
                </p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{aguardandoBaixa}</p>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block underline">Gera Alerta Sonoro 🔊</span>
              </div>

              <div className="bg-slate-500/5 p-5 rounded-2xl border border-slate-500/15 shadow-xs col-span-2 lg:col-span-1">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Baixadas</p>
                <p className="text-3xl font-black text-slate-700 mt-1">{baixadas}</p>
                <span className="text-[10px] text-slate-500/80 font-medium mt-1 inline-block">Finalizadas</span>
              </div>

            </div>

            {/* BARRA DE PESQUISA, CONTROLE DE VOZ / SOM */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por número da OP, fornecedor ou corredor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-250 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-gray-400 font-medium"
                />
              </div>

              {/* Botoes de controle de Voz Ativa / Inativa */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Botão pedido pelo usuário: Ativar e desativar voz */}
                <button
                  onClick={toggleSpeech}
                  id="btn-toggle-voz"
                  className={cn(
                    "flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest shadow-sm cursor-pointer whitespace-nowrap",
                    speechEnabled 
                      ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 hover:bg-emerald-500/25 hover:border-emerald-500" 
                      : "bg-gray-100 border-gray-250 text-gray-500 hover:bg-gray-200"
                  )}
                  title={speechEnabled ? "Clique para desativar o assistente de voz do painel" : "Clique para ativar os avisos falados automáticos"}
                >
                  {speechEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce shrink-0" />
                      <span>🔊 Voz Ativa (Fala OP Liberada)</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-gray-500 shrink-0" />
                      <span>🔇 Voz Inativa (Silenciado)</span>
                    </>
                  )}
                </button>

                {/* Resetar Histórico de Avisos para re-falar */}
                <button
                  onClick={resetSpokenHistory}
                  disabled={!speechEnabled}
                  className="px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"
                  title="Permite que o navegador fale novamente as OPs que já foram anunciadas nesta sessão caso recarregue."
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Repetir Alertas Falados
                </button>

              </div>

            </div>

            {/* LISTA INDUSTRIAL DE OPs */}
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
              <div className="px-6 py-5 bg-slate-50 border-b border-gray-250 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Acompanhamento e Status das Ordens de Produção (OPs)</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Visão unificada das OPs nos setores de Estocagem e Montagem da Ventisol.</p>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-[10px] font-extrabold text-slate-600 rounded-lg uppercase">
                  Filtrados: {filteredOrders.length} de {orders.length}
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <XCircle className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-slate-500 font-bold mt-3">Nenhuma Ordem de Produção (OP) encontrada.</p>
                  <p className="text-gray-400 text-xs mt-1">Experimente limpar sua busca ou recriar os dados de fábrica.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map((op) => {
                    const isOPWaitingDownload = op.status === "Aguardando Baixa";
                    
                    return (
                      <div 
                        key={op.id} 
                        className={cn(
                          "p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/70 transition-colors",
                          isOPWaitingDownload && speechEnabled ? "bg-emerald-500/[0.02]" : ""
                        )}
                      >
                        
                        {/* Bloco Identificador */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-black rounded-lg">
                              OP {op.order_number}
                            </span>

                            {/* Status do WMS */}
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              op.status === "Pendente" && "bg-amber-50 border-amber-200 text-amber-600",
                              op.status === "Em Separação" && "bg-blue-50 border-blue-200 text-blue-600",
                              op.status === "Aguardando Baixa" && "bg-emerald-50 border-emerald-400 text-emerald-600 animate-pulse",
                              op.status === "Baixada" && "bg-gray-100 border-gray-200 text-gray-500"
                            )}>
                              {op.status === "Pendente" && "Aguardando Coleção"}
                              {op.status === "Em Separação" && "Em Processamento"}
                              {op.status === "Aguardando Baixa" && "Aguardando Baixa (Liberada!)"}
                              {op.status === "Baixada" && "Completada/Baixada"}
                            </span>

                            {/* Alerta de Fala Ativa na OP */}
                            {isOPWaitingDownload && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest">
                                <Volume2 className="w-3 h-3 shrink-0" />
                                Alerta Sonoro Ativo
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-sm text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5" onClick={() => { setSelectedOP(op); setActiveTab("separacao"); }}>
                              {op.supplier_name}
                              <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Criada em {op.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                {op.product_location}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bloco Detalhado dos Itens da OP */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 max-w-md bg-gray-50 p-3 rounded-2xl border border-gray-200/50">
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-black uppercase text-gray-400">Total Itens</p>
                            <p className="text-sm font-black text-slate-800">{op.items.length} itens</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-gray-400">Pecas Sep.</p>
                            <p className="text-sm font-black text-slate-800">
                              {op.items.reduce((acc, it) => acc + it.quantity, 0)} / {op.items.reduce((acc, it) => acc + it.planned_quantity, 0)}
                            </p>
                          </div>
                          <div className="text-center col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0">
                            <p className="text-[10px] font-black uppercase text-gray-400">Aprovados</p>
                            <p className="text-sm font-black text-emerald-600">
                              {op.items.filter(it => it.checked).length} conf.
                            </p>
                          </div>
                        </div>

                        {/* Bloco de Botões e Assinatura */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          
                          {/* Botão de acessar detalhes para Separar/Conferir */}
                          <button
                            onClick={() => {
                              setSelectedOP(op);
                              setActiveTab("separacao");
                            }}
                            className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs uppercase tracking-wider py-3 px-4.5 rounded-xl border border-gray-250 flex items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-500 shadow-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                            Abrir Conferência
                          </button>

                          {/* Se já foi assinada, mostra o horário. Se estiver aguardando baixa, dá o botão de download para o supervisor */}
                          {op.status === "Aguardando Baixa" ? (
                            <button
                              onClick={() => handleDarBaixa(op.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-widest py-3 px-4.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                            >
                              <Check className="w-3.5 h-3.5 text-yellow-500" />
                              Efetuar Baixa
                            </button>
                          ) : op.status === "Baixada" ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Baixa Efetuada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/40">
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Em Operação</span>
                            </div>
                          )}

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Banner Informativo do Sound Synthesis */}
            <div className="p-6 bg-slate-100 rounded-3xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-800 shrink-0 shadow-xs border border-gray-200">
                <Volume2 className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h5 className="font-extrabold text-xs uppercase tracking-widest text-slate-900">Como funciona o aviso sonoro?</h5>
                <p className="text-gray-600 text-xs leading-relaxed">
                  O painel escuta os dados da nuvem. Assim que um Conferente da Ventisol clica no botão <strong>"Concluir Conferência & Liberar"</strong>, o status da OP atualiza para <span className="underline">Aguardando Baixa</span>. Neste exato momento, o navegador fala vocalmente o alerta por áudio. O alerta também toca logo no login/carregamento para todas as OPs pendentes de baixa.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* NAVEGAÇÃO 2: SEPARAÇÃO DE OPs (Tela Operacional / Editar) */}
        {/* ========================================================== */}
        {activeTab === "separacao" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            
            {/* LADO ESQUERDO: Seletor Rápido de OP na lateral (4/12 colunas) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 space-y-4">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Lista para Separação</h4>
                
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar OP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-250 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {filteredOrders.map((op) => {
                    const isSelected = selectedOP?.id === op.id;
                    const itemsConferredCount = op.items.filter(it => it.checked).length;
                    
                    return (
                      <button
                        key={op.id}
                        onClick={() => setSelectedOP(op)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer shadow-xs",
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-gray-250 hover:bg-gray-50 text-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={cn(
                            "font-mono text-xs font-bold px-2 py-0.5 rounded-lg",
                            isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
                          )}>
                            OP {op.order_number}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider",
                            op.status === "Pendente" && (isSelected ? "text-amber-400" : "text-amber-600"),
                            op.status === "Em Separação" && (isSelected ? "text-blue-300" : "text-blue-600"),
                            op.status === "Aguardando Baixa" && (isSelected ? "text-emerald-400 animate-pulse font-extrabold" : "text-emerald-600"),
                            op.status === "Baixada" && (isSelected ? "text-gray-400" : "text-gray-500")
                          )}>
                            {op.status === "Aguardando Baixa" ? "Aguardando Baixa" : op.status}
                          </span>
                        </div>

                        <p className={cn(
                          "text-xs font-extrabold truncate w-full",
                          isSelected ? "text-white" : "text-slate-900"
                        )}>
                          {op.supplier_name}
                        </p>

                        <div className="flex items-center justify-between text-[10px] w-full mt-1 border-t pt-1.5 border-slate-700/10">
                          <span className={isSelected ? "text-slate-300" : "text-gray-500"}>
                            {op.items.length} itens correspondentes
                          </span>
                          <span className={cn(
                            "font-black",
                            isSelected ? "text-emerald-400" : "text-emerald-600"
                          )}>
                            {itemsConferredCount}/{op.items.length} Conf.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LADO DIREITO: Form de conferência com as regras da OP (8/12 colunas) */}
            <div className="lg:col-span-8 space-y-6">
              {selectedOP ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  
                  {/* Cabeçalho da OP Selecionada */}
                  <div className="p-6 bg-slate-900 text-white border-b border-indigo-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-indigo-500 text-[10px] font-black tracking-widest uppercase text-white">
                            Modo de Conferência
                          </span>
                          <span className="text-gray-300 text-xs font-mono">ID: {selectedOP.id}</span>
                        </div>
                        <h2 className="text-xl font-black mt-2 leading-tight">Ordem de Produção #{selectedOP.order_number}</h2>
                        <p className="text-slate-300 text-xs font-semibold mt-1">{selectedOP.supplier_name}</p>
                      </div>

                      {/* Status Atual na lateral */}
                      <div className="sm:text-right space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status Atual no WMS</p>
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest inline-block border",
                          selectedOP.status === "Pendente" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                          selectedOP.status === "Em Separação" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                          selectedOP.status === "Aguardando Baixa" && "bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse",
                          selectedOP.status === "Baixada" && "bg-slate-500/20 border-slate-500 text-slate-400"
                        )}>
                          {selectedOP.status === "Pendente" && "Aguardando Separação"}
                          {selectedOP.status === "Em Separação" && "Em Separação"}
                          {selectedOP.status === "Aguardando Baixa" && "Liberada para Baixa"}
                          {selectedOP.status === "Baixada" && "Baixada / Concluída"}
                        </span>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300">
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Localização Original</p>
                        <p className="font-extrabold mt-0.5">{selectedOP.product_location}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Data de Emissão</p>
                        <p className="font-extrabold mt-0.5">{selectedOP.date}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Data / Assinatura de Baixa</p>
                        <p className="font-extrabold mt-0.5 text-yellow-400 truncate">
                          {selectedOP.is_signed ? `Assinada: ${selectedOP.signed_at || "Concluída"}` : "Sem Assinatura"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Restrição de Permissão Informativa */}
                  <div className={cn(
                    "px-6 py-4 border-b flex items-center justify-between gap-4 text-xs font-semibold",
                    isAuthorizedToEdit
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  )}>
                    <div className="flex items-center gap-2">
                      {isAuthorizedToEdit ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Você está autenticado como <strong>Ventisol & Conferente</strong>. Você pode alterar quantidades e aprovar OPs.</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Edição Restrita: Apenas usuários com <strong>Categoria Ventisol</strong> e <strong>Subcategoria Conferente</strong> podem alterar e assinar.
                          </span>
                        </>
                      )}
                    </div>
                    {!isAuthorizedToEdit && (
                      <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-1 rounded font-black uppercase tracking-wider">
                        Bloqueado
                      </span>
                    )}
                  </div>

                  {/* Listagem de Itens da OP com Edição de Valores */}
                  <div className="p-6 space-y-4">
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">Linhas de Produtos do Checklist</h3>
                    
                    <div className="divide-y divide-gray-100 border border-gray-200/60 rounded-2xl overflow-hidden bg-gray-50/30">
                      {selectedOP.items.map((item) => {
                        const isQuantityMatched = item.quantity === item.planned_quantity;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={cn(
                              "p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                              item.checked ? "bg-emerald-500/[0.015]" : "bg-white"
                            )}
                          >
                            
                            {/* Produto descrição */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 font-mono text-xs font-extrabold rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.code}
                                </span>
                                <span className="text-xs font-extrabold text-slate-500">
                                  🗺️ {item.location}
                                </span>
                                <span className="text-[11px] text-indigo-600 font-medium">
                                  Col: {item.collector_name}
                                </span>
                              </div>
                              <p className="font-extrabold text-xs text-slate-950">{item.description}</p>
                            </div>

                            {/* Lançamento / Edição de Quantidades */}
                            <div className="flex items-center gap-4 shrink-0自 mt-2 md:mt-0">
                              
                              {/* Planejado */}
                              <div className="text-right">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Separado / Previsto</span>
                                <div className="flex items-center gap-2 mt-1">
                                  
                                  {/* Caixa da Quantidade Conforme pedido na OP. Tem que liberar edição se for Conferente Ventisol */}
                                  <div className="flex items-center">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleItemQuantityChange(selectedOP.id, item.id, parseInt(e.target.value) || 0)}
                                      disabled={!isAuthorizedToEdit}
                                      className={cn(
                                        "w-16 px-2 py-1.5 border rounded-lg text-xs font-black text-center focus:outline-indigo-500",
                                        !isAuthorizedToEdit
                                          ? "bg-gray-100 border-gray-250 cursor-not-allowed text-gray-400"
                                          : isQuantityMatched 
                                            ? "border-emerald-300 text-emerald-700 bg-emerald-50/30" 
                                            : "border-gray-250 text-slate-800"
                                      )}
                                      min="0"
                                      max="99999"
                                    />
                                    <span className="text-gray-400 mx-1.5 text-xs">/</span>
                                    <span className="font-mono text-xs font-black text-slate-800 px-2 py-1.5 bg-gray-100 rounded-lg">
                                      {item.planned_quantity}
                                    </span>
                                  </div>

                                </div>
                              </div>

                              {/* Caixa Marcador de Conferido (Marcador de verificação solicitado) */}
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-2 text-center">Conferido</span>
                                <button
                                  disabled={!isAuthorizedToEdit}
                                  onClick={() => handleItemCheckedToggle(selectedOP.id, item.id)}
                                  className={cn(
                                    "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer focus:outline-none",
                                    !isAuthorizedToEdit 
                                      ? "bg-gray-100 border-gray-250 text-gray-300 cursor-not-allowed" 
                                      : item.checked 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10" 
                                        : "border-gray-300 hover:border-indigo-500 text-transparent hover:text-indigo-200"
                                  )}
                                  title={isAuthorizedToEdit ? "Clique para marcar como conferido" : "Bloqueado"}
                                >
                                  <Check className="w-4 h-4 stroke-[4]" />
                                </button>
                              </div>

                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Rodapé Interno com Botões de Ação para a OP */}
                    <div className="pt-6 border-t border-gray-200/80 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                      <div className="text-left">
                        {selectedOP.status !== "Aguardando Baixa" && selectedOP.status !== "Baixada" ? (
                          selectedOP.conferencia_ok ? (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-250 animate-fadeIn">
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold leading-none">Conferência OK realizada! Agora assine a OP abaixo.</span>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md">
                              {isAuthorizedToEdit 
                                ? "Complete todas as quantidades e marque todos os itens como conferidos para liberar o botão de Conferência OK."
                                : "Utilize o Simulador de Acesso no painel superior para preencher e enviar este formulário de teste."
                              }
                            </p>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-250">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-xs font-extrabold uppercase leading-none">
                              OP Concluída e Liberada! O Alerta no painel foi emitido.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Botões do Fluxo de Conferência */}
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        
                        {/* Se a OP ainda não foi concluída para baixa */}
                        {selectedOP.status !== "Aguardando Baixa" && selectedOP.status !== "Baixada" ? (
                          <>
                            {/* PASSO 1: Botão Conferência OK (só aparece se conferencia_ok for falso) */}
                            {!selectedOP.conferencia_ok ? (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                {showConferenciaConfirm ? (
                                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-xl animate-fadeIn">
                                    <span className="text-xs font-bold text-amber-700 px-2">Confirmar Conferência 100% OK?</span>
                                    <button
                                      onClick={() => handleConferenciaOK(selectedOP.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm"
                                    >
                                      Sim, Confirmar
                                    </button>
                                    <button
                                      onClick={() => setShowConferenciaConfirm(false)}
                                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    disabled={!isAuthorizedToEdit || !selectedOP.items.every(it => it.checked && Math.max(0, it.quantity) === it.planned_quantity)}
                                    onClick={() => setShowConferenciaConfirm(true)}
                                    className={cn(
                                      "w-full sm:w-auto px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all",
                                      (!isAuthorizedToEdit || !selectedOP.items.every(it => it.checked && Math.max(0, it.quantity) === it.planned_quantity))
                                        ? "bg-gray-100 border border-gray-250 text-gray-400 cursor-not-allowed" 
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-102 active:scale-98 duration-100"
                                    )}
                                  >
                                    {isAuthorizedToEdit ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Conferência OK</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>Conferência Bloqueada</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* PASSO 2: Botão de Assinar OP - Aparece apenas após Conferência OK */
                              <div className="flex items-center gap-2.5 animate-fadeIn">
                                {/* Opção de refazer conferência se necessário */}
                                <button
                                  onClick={() => {
                                    const updated = orders.map((o) => o.id === selectedOP.id ? { ...o, conferencia_ok: false } : o);
                                    saveOrdersToLocalStorage(updated);
                                    setSelectedOP(updated.find(o => o.id === selectedOP.id) || null);
                                    showBanner("Conferência OK limpa. Os itens podem ser editados novamente.");
                                  }}
                                  className="px-4 py-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                  title="Retornar para edição"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Refazer
                                </button>

                                <button
                                  disabled={!isAuthorizedToEdit}
                                  onClick={() => handleConferOP(selectedOP.id)}
                                  className={cn(
                                    "px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all animate-pulse",
                                    !isAuthorizedToEdit
                                      ? "bg-gray-100 border border-gray-250 text-gray-400 cursor-not-allowed"
                                      : "bg-yellow-500 hover:bg-yellow-600 text-slate-950 hover:scale-105"
                                  )}
                                >
                                  <Edit2 className="w-4 h-4 shrink-0 text-slate-950" />
                                  <span>Assinar OP</span>
                                </button>
                              </div>
                            )}
                          </>
                        ) : selectedOP.status === "Aguardando Baixa" ? (
                          <button
                            onClick={() => handleDarBaixa(selectedOP.id)}
                            className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Dar Baixa no WMS</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 py-3 px-5 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-wider border border-emerald-100">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Finalizada / Com Baixa</span>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-slate-500 font-bold mt-4">Selecione uma OP na lista ao lado.</p>
                  <p className="text-gray-400 text-xs mt-1">Clique em abrir nas linhas do painel ou selecione um item para conferir.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* --- RODAPÉ INFRAESTRUTURAL --- */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">WMS Separação</span>
            <p className="font-semibold">Ventisol S.A. - Todos os Direitos Reservados &copy; 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Sistema de Voz Online
            </span>
            <span className="text-gray-300">|</span>
            <span>Avisos falados via Speech Synthesis API</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
