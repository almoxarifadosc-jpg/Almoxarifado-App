'use client';

import React from 'react';
import { 
  BookOpen, 
  Printer, 
  Github, 
  Globe, 
  Database, 
  Terminal, 
  Building2, 
  UserCheck, 
  Cpu, 
  Layers, 
  Lock, 
  ExternalLink 
} from 'lucide-react';
import { motion } from 'motion/react';

export function InfoView() {
  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto min-h-screen">
      {/* Estilos específicos para Impressão limpa via CSS do manual técnico */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: portrait;
            margin: 2cm;
          }
          
          /* Oculta visualmente todo o restante da página */
          body * {
            visibility: hidden;
          }
          /* Torna visível apenas a área de impressão */
          #print-area, #print-area * {
            visibility: visible;
          }
          /* Força exibição de display block para sobrepor a classe utility .hidden */
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: #000000 !important;
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
            box-sizing: border-box !important;
          }
          
          html, body, main {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Força quebras de página controladas ao gerar o PDF */
          .print-page-break {
            page-break-before: always;
          }
        }
      `}} />

      {/* Header Principal da Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h2 className="text-3xl md:text-4xl font-headline font-black text-on-surface tracking-tighter">
            Manual de Transição Técnica
          </h2>
          <p className="text-on-surface-variant font-medium">Documentação estratégica da Ventisol Indústria e Comércio S.A.</p>
        </div>
        
        <button
          onClick={handlePrintManual}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto"
        >
          <Printer className="w-4 h-4" />
          Imprimir Manual (PDF)
        </button>
      </div>

      {/* Seção Principal do Manual */}
      <div className="print:hidden">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Banner de Boas Vindas ao Manual */}
          <div className="p-8 md:p-10 bg-surface-container-low border border-outline-variant/10 rounded-[32px] flex flex-col md:flex-row items-center gap-6 justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary w-fit rounded-full text-xs font-black uppercase tracking-widest">
                <Building2 className="w-4 h-4" />
                Ventisol Indústria e Comércio S.A.
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface">Guia do Desenvolvedor & Manual Corporativo</h3>
              <p className="text-on-surface-variant font-medium text-sm max-w-2xl">
                Este documento estratégico serve como guia oficial de transição de cargo e manual de manutenção para os engenheiros sucessores que darão continuidade ao desenvolvimento do software do Almoxarifado.
              </p>
            </div>
            <div className="flex gap-4">
              <a
                href="https://almoxarifado-app-a9gq.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-surface-container-high text-on-surface font-bold rounded-2xl border border-outline-variant/15 transition-all text-xs"
              >
                <Globe className="w-4 h-4 text-primary" />
                Acessar Produção
              </a>
            </div>
          </div>

          {/* Grid de Conteúdo Técnico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lado Esquerdo: Navegação de Índice & Infra */}
            <div className="lg:col-span-1 space-y-6">
              {/* Resumo da Empresa e do Cargo */}
              <div className="bg-surface-container-lowest p-6 rounded-[28px] border border-outline-variant/10 shadow-xs space-y-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant/5 pb-2.5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Ficha de Transição
                </h4>
                <div className="space-y-3 mr-1 text-xs">
                  <div>
                    <span className="font-bold text-on-surface-variant">Cliente Destino:</span>
                    <p className="text-on-surface font-semibold">Ventisol Indústria e Comércio S.A.</p>
                  </div>
                  <div>
                    <span className="font-bold text-on-surface-variant">Operações Atendidas:</span>
                    <p className="text-on-surface font-semibold">Separadores e Conferentes de OPs da fábrica de Palhoça/SC.</p>
                  </div>
                  <div>
                    <span className="font-bold text-on-surface-variant">Banco de Dados Ativo:</span>
                    <p className="text-on-surface font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <Database className="w-3.5 h-3.5" /> Firebase Firestore (Produção)
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-on-surface-variant">Atualizado em:</span>
                    <p className="text-on-surface font-semibold font-mono">08/06/2026 - 14:12 UTC</p>
                  </div>
                </div>
              </div>

              {/* Informações Vercel & GitHub */}
              <div className="bg-surface-container-lowest p-6 rounded-[28px] border border-outline-variant/10 shadow-xs space-y-5">
                <h4 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant/5 pb-2.5 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Hospedagem & Git
                </h4>
                
                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-on-surface/5 rounded-xl text-on-surface mt-0.5">
                      <Github className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-black text-on-surface">Repositório GitHub</p>
                      <p className="text-on-surface-variant leading-relaxed">Controlado sob Git. Atualizações integradas de forma nativa por commits no branch principal.</p>
                      <div className="mt-1.5 px-3 py-1 bg-surface-container-low text-on-surface font-mono rounded text-[10px] w-fit font-bold">
                        branch: main
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-black text-on-surface">Servidores Vercel</p>
                      <p className="text-on-surface-variant leading-relaxed">Deploy contínuo e balanceamento de tráfego instantâneo.</p>
                      <a 
                        href="https://almoxarifado-app-a9gq.vercel.app" 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-1 px-2.5 py-0.5 bg-blue-500/5 hover:bg-blue-500/10 text-primary font-bold rounded flex items-center gap-1 text-[11px] w-fit hover:underline"
                      >
                        almoxarifado-app-a9gq.vercel.app
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-black text-on-surface">Variáveis de Ambiente</p>
                      <p className="text-on-surface-variant leading-relaxed">As credenciais seguras do Firebase e chaves de API residem no painel "Environment Variables" da Vercel.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progressive Web App */}
              <div className="bg-surface-container-lowest p-6 rounded-[28px] border border-outline-variant/10 shadow-xs space-y-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant/5 pb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Suporte a PWA & Zebra
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Aplicação configurada como **PWA nativo** moderno, garantindo compatibilidade com coletores de dados Zebra baseados em Android corporativo.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-on-surface">Service Worker:</span>
                    <code className="text-[10px] font-mono ml-auto">public/sw.js</code>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-on-surface">Ícones PWA:</span>
                    <code className="text-[10px] font-mono ml-auto">Scripts integrados ao build</code>
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-snug italic bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5">
                  💡 <strong>Correção Crítica Aplicada:</strong> O processo de build executa o gerador de imagens para garantir que todos os ícones PWA do manifesto estejam presentes e válidos antes de subir para a Vercel.
                </p>
              </div>
            </div>

            {/* Lado Direito: Detalhes Arquitetura e Fluxos Corporativos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Arquitetura e Estrutura */}
              <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-xs space-y-6">
                <h4 className="text-lg font-headline font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/5 pb-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  1. Stack Tecnológica & Arquitetura
                </h4>
                
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Este sistema foi implementado utilizando o ecossistema moderno de desenvolvimento para garantir alto desempenho, renderização instantânea de layouts e suporte a atualizações cirúrgicas de estados:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <p className="font-black text-xs text-primary uppercase">Front-end</p>
                    <h5 className="font-bold text-sm text-on-surface mt-0.5">Next.js (React) & TS</h5>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                      Adota o App Router e renderização híbrida. Uso do TypeScript nativo para impedir bugs em tempo de compilação.
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <p className="font-black text-xs text-primary uppercase">Estilização</p>
                    <h5 className="font-bold text-sm text-on-surface mt-0.5">Tailwind CSS v4 & Motion</h5>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                      Configurado via @import de arquivos globais. CSS moderno, responsivo, sem uso de inline-styles e animado de forma extremamente fluida por Framer Motion.
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <p className="font-black text-xs text-primary uppercase">Banco de Dados</p>
                    <h5 className="font-bold text-sm text-on-surface mt-0.5">Firebase Firestore (NoSQL)</h5>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                      Drives NoSQL em tempo real sob snapshots, escutas de dados e sincronizações automáticas para garantir que as atualizações cheguem no mesmo instante aos operadores.
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <p className="font-black text-xs text-primary uppercase">Autenticação Corporativa</p>
                    <h5 className="font-bold text-sm text-on-surface mt-0.5">Firebase Auth</h5>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                      Gerenciamento de credenciais e controle de acessos (com regras especiais para Ventisol e cargos como Separação, Conferência e Admin).
                    </p>
                  </div>
                </div>
              </div>

              {/* Fluxos Fundamentais de Negócio */}
              <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-xs space-y-6">
                <h4 className="text-lg font-headline font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/5 pb-3">
                  <Terminal className="w-5 h-5 text-primary" />
                  2. Fluxos Corporativos de Negócio
                </h4>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">Importação de OPs & Extração</h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        A partir da tela de "Importar OP", os administradores sobem o arquivo PDF da ordem de produção. O sistema lê as informações de itens, de forma inteligente separa códigos de barra, as respectivas quantidades necessárias, as sequências corretas de furos, dados de licitações ou marcações críticas de urgência.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">Separação de OPs & Sequenciamento</h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        A equipe de separadores coleta os volumes do estoque fisicamente, guiando-se pelo painel interativo. No módulo "Sequência de Separação", os analistas podem sequenciar via drag-and-drop as ordens (#1, #2, #3...) de forma prioritária conforme a grade de produção do dia, o que evita gargalos em esteiras.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">Regra Crítica de Cancelamento de OPs</h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        Recurso de segurança que impede que OPs suspensas ou canceladas continuem a ser separadas por engano. Uma vez cancelada no painel principal, a OP é marcada visualmente em vermelho suave, bloqueando imediatamente qualquer clique, edição, checklist de separação ou auditorias de conferência.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">Recebimento Intercompany (Doca & Fornecedores)</h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        Gerencia o fluxo de cargas de fornecedores vinculados de matéria-prima e insumos. Permite acompanhar as docas de atracação dos caminhões e dar baixa ágil em notas correspondentes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Prático do Programador */}
              <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-xs space-y-5">
                <h4 className="text-lg font-headline font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/5 pb-3">
                  <Terminal className="w-5 h-5 text-primary" />
                  3. Guia Rápido do Programador (Comandos)
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant mb-1.5">Iniciando Ambiente de Desenvolvimento Local:</p>
                    <div className="p-3 bg-on-surface text-surface text-xs font-mono rounded-xl">
                      npm run dev
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-on-surface-variant mb-1.5">Geração do Build de Produção (com PWA autovalidado):</p>
                    <div className="p-3 bg-on-surface text-surface text-xs font-mono rounded-xl leading-normal">
                      npm run build
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1.5 italic">
                      💡 Este comando executa automaticamente a compilação do next e os scripts criadores de ícones do manifesto.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-on-surface-variant mb-1.5">Como implantar correções de forma cirúrgica na produção:</p>
                    <p className="text-xs text-on-surface-variant leading-normal">
                      Todos os arquivos de layout residem em <code className="font-mono text-primary text-[11px] bg-primary/5 px-1 py-0.5 rounded font-bold">components/</code> e telas globais no App Router. Modificações de regras de segurança do banco devem ser alteradas no compilado de segurança do Firebase (<code className="font-mono text-[11px]">firestore.rules</code>) e aplicadas na console do desenvolvedor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ÁREA DE IMPRESSÃO (Formatada especificamente em Preto e Branco técnica profissional para PDF) */}
      <div id="print-area" className="hidden p-8" style={{ fontFamily: 'monospace' }}>
        <div className="border-b-4 border-black pb-6 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight">ALMOXARIFADO DE COMPONENTES - SISTEMA DE GESTÃO</h1>
          <p className="text-sm font-bold mt-2">DOCUMENTAÇÃO TÉCNICA E MANUAL DE TRANSIÇÃO CORPORATIVA</p>
          <p className="text-xs uppercase tracking-widest mt-1">VENTISOL INDÚSTRIA E COMÉRCIO S.A. | GRUPO VENTISOL DE PALHOÇA</p>
          <div className="text-xs mt-6 flex justify-between border-t border-black pt-4">
            <span>Versão: 1.0 (Produção)</span>
            <span>Data: Junho / 2026</span>
            <span>Responsável Técnico: TI & Engenharia de Software</span>
          </div>
        </div>

        <div className="mt-8 space-y-8 font-serif leading-relaxed text-sm">
          {/* Introdução */}
          <section className="space-y-3">
            <h2 className="text-lg font-black border-b border-black pb-1 uppercase">1. Introdução & Contextualização Corporativa</h2>
            <p>
              Este sistema foi customizado e programado sob medida para o fluxo logístico das empresas do grupo, focado em particular na otimização e controle operacional da <strong>Ventisol Indústria e Comércio S.A.</strong> O software centraliza os serviços operacionais de separação de ordens de produção (OPs), sequenciamentos, auditoria logísticas e monitoramentos de recebimento intercompany.
            </p>
            <p>
              Este manual técnico destina-se a orientar e amparar as equipes sucessoras de tecnologia ou consultoria para a continuidade, auditoria técnica e manutenção do sistema em produção.
            </p>
          </section>

          {/* Infraestrutura de Hospedagem */}
          <section className="space-y-3">
            <h2 className="text-lg font-black border-b border-black pb-1 uppercase">2. Infraestrutura, GitHub & Vercel</h2>
            <p>
              A aplicação é nativamente integrada ao ecossistema serverless, garantindo baixíssimo custo operacional e atualizações imediatas em tempo real:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Armazenamento no GitHub:</strong> Código-fonte hospedado de forma segura no controle de versões no branch principal <code>main</code>.
              </li>
              <li>
                <strong>Plataforma de Produção Vercel:</strong> Repositório vinculado diretamente ao painel da Vercel. O deploy ocorre automaticamente a cada envio/commit aceito na branch principal. O endereço de acesso em produção oficial do cliente é: <code>https://almoxarifado-app-a9gq.vercel.app</code>.
              </li>
              <li>
                <strong>Configurações e API Keys:</strong> Os dados de variáveis de ambiente seguros (Firebase Web API Keys, banco, id do projeto) residem ocultos na Vercel e não estão hardcoded. No ambiente local, deve-se declarar as chaves no arquivo <code>.env.local</code> (o exemplo está descrito em <code>.env.example</code>).
              </li>
            </ul>
          </section>

          {/* Arquitetura de Software e Banco */}
          <section className="space-y-3 print-page-break">
            <h2 className="text-lg font-black border-b border-black pb-1 uppercase">3. Arquitetura de Software & Banco de Dados</h2>
            <p>
              A engenharia do software apoia-se em tecnologias de excelente performance em dispositivos móveis:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Next.js (com TypeScript):</strong> Arquitetura corporativa com verificação formal de tipos que impede a propagação de falhas de tipos nulos e indefinidos, agilizando novas telas.
              </li>
              <li>
                <strong>Tailwind CSS v4 & Motility Framework:</strong> Todas as estilizações usam Tailwind no arquivo CSS central. Animações e transições usam renderizadores acelerados por GPU (Framer Motion).
              </li>
              <li>
                <strong>Firebase Firestore & Firebase Auth:</strong> Banco de dados relacional flexível NoSQL em formato JSON sincronizado via websockets persistentes, permitindo que alterações na fábrica cheguem ao painel de forma instantânea. O controle de perfis possui as categorias "Fábrica Ventisol", "Almoxarifado Ventisol", "Conferente" e Administrador Geral.
              </li>
              <li>
                <strong>Manifestos & Suporte Offline PWA:</strong> O software possui manifestos PWA calibrados para Android Zebra (coletores de dados robustos). Ícones e assets estáticos são pré-validados no processo de build automatizado, resolvendo de vez problemas de imagens ausentes.
              </li>
            </ol>
          </section>

          {/* Regras e Fluxos Corporativos */}
          <section className="space-y-3 print-page-break">
            <h2 className="text-lg font-black border-b border-black pb-1 uppercase">4. Regras Operacionais & Processos Fundamentais</h2>
            <p>
              O sistema possui lógicas que regem as principais etapas operacionais do almoxarifado de componentes:
            </p>
            <div className="space-y-4 pt-2">
              <div>
                <strong>A. Extração Inteligente de PDFs de OPs:</strong>
                <p className="mt-1">
                  O painel de OPs recebe arquivos nativos gerados pelas engenharias, automatizando a desmontagem e identificação do código principal, furos de fixação, licitações corporativas e volumes individuais nas linhas da Ventisol.
                </p>
              </div>
              <div>
                <strong>B. Ordens Prioritárias no Sequenciamento:</strong>
                <p className="mt-1">
                  Usuários autorizados reorganizam visualmente no módulo "Sequência de Separação" as prioridades numéricas de produção do dia. As mudanças atualizam instantaneamente a ordem visual de trabalho de separadores.
                </p>
              </div>
              <div>
                <strong>C. Regra de Negócio: Cancelamento de OP:</strong>
                <p className="mt-1">
                  Quando uma ordem de produção em andamento é cancelada pelos administradores, o sistema define permanentemente seu status operacional para "Cancelada" no Firestore. A OP é instantaneamente colorida em vermelho suave nas telas de andamento, bloqueando qualquer clique, ação de conferência, checklist ou alteração na lista de itens por qualquer profissional.
                </p>
              </div>
              <div>
                <strong>D. Recebimento de Cargas Intercompany:</strong>
                <p className="mt-1">
                  Cadastra, monitora e documenta os caminhões de matéria-prima e componentes nas docas produtivas, emitindo alertas visuais de eficiência para o fluxo de descargas nas docas da Ventisol.
                </p>
              </div>
            </div>
          </section>

          {/* Instruções de Edição e Manutenção */}
          <section className="space-y-3 print-page-break">
            <h2 className="text-lg font-black border-b border-black pb-1 uppercase">5. Diretrizes de Manutenção para o Programador</h2>
            <p>
              Ao realizar alterações técnicas nesta codebase, o desenvolvedor DEVE atentar-se às seguintes regras consolidadas do projeto:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>NÃO Deletar Arquivos de Forma Automatizada:</strong> É estritamente proibido o uso de scripts agressivos como <code>rm -rf</code> em pastas fundamentais (como <code>app/</code> ou <code>components/</code>) para resolver problemas de complitlação ou de importações.
              </li>
              <li>
                <strong>Procedimento para Dependências Quebradas:</strong> Se a compilação local falhar indicando ausência de módulos, execute o instalador estável nativo utilizando o comando do assistente integrado para resgatar a integridade das bibliotecas do Node.
              </li>
              <li>
                <strong>Segurança no Fluxo de Impressão (Garantia de Não-Omissão):</strong> Para evitar páginas em branco, a impressão apoia-se estritamente na ocultação total sob `@media print` de <code>body *</code> e na revelação exclusiva de itens descendentes do contêiner <code>id="print-area"</code>. Mantenha essa mesma estrutura de classes caso crie novos relatórios.
              </li>
            </ul>
          </section>

          <div className="mt-12 text-center pt-8 border-t border-dashed border-black">
            <p className="font-bold uppercase text-xs">Fim da Documentação - Almoxarifado Ventisol</p>
            <p className="text-[10px] italic mt-1 text-black bg-white">Concebido e personalizado para Ventisol Indústria e Comércio S.A.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
