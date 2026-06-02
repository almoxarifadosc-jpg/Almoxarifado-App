# Instruções de Segurança e Preservação para Agentes IA (AGENTS.md)

Este arquivo contém regras persistentes de extrema prioridade que são automaticamente injetadas nas instruções de sistema dos agentes. Qualquer agente trabalhando nesta codebase **DEVE** seguir estas diretrizes à risca.

---

## 🚨 REGRA CRÍTICA DE PROIBIÇÃO DE EXCLUSÃO (CRITICAL PRESERVATION DIRECTIVE)

### [PORTUGUÊS]
1. **PROIBIDO DELETAR ARQUIVOS DO PROJETO EM MASSA:** Sob nenhuma circunstância (incluindo erros de build, problemas de dependência ou reestruturação) você deve apagar arquivos importantes do projeto (`package.json`, `app/`, `components/`, e outros).
2. **NUNCA USE `rm -rf` NO DIRETÓRIO RAIZ OU DELETIONS EM LOTE.** Alterações e correções de erros de compilação devem ser feitas de forma cirúrgica com `edit_file` ou `multi_edit_file`.
3. **SOBRE O USO DE `degit`:** O uso de `degit` com flags de força só é permitido se a pasta estiver inteiramente vazia devido a um erro catastrófico externo. Caso contrário, nunca sobrescreva arquivos operacionais sem antes fazer backup silencioso ou consultar a alteração via diff.

### [ENGLISH]
1. **CRITICAL BANNED ACTIVITY - WIPE OUTS AND BATCH DELETIONS:** Under no circumstances (including compile errors, module resolution failures, or workspace resets) are you allowed to delete, wipe, or mass-remove project files.
2. **SURGICAL REPAIRS ONLY:** Fix compilation and linting bugs using targeted file modification tools (`edit_file` or `multi_edit_file`). Never clear directories or remove modules as a standard recovery step.
3. **PERSIST SYSTEM ROLES:** This `AGENTS.md` and any associated `.env.example` configurations must never be removed or altered to bypass rules.

---

## 🛠️ Diretrizes de Desenvolvimento e Restauração

- **Build e Lint:** Para verificar erros, execute `lint_applet` e `compile_applet`. Se houver erros como `next: not found` ou módulos ausentes, execute primeiro a instalação das dependências usando as ferramentas nativas (`install_applet_dependencies`) sem apagar as configurações existentes.
- **Integração do Almoxarifado Ventisol:**
  - O projeto utiliza **Next.js**, **Firebase Firestore/Auth**, e **Tailwind CSS**.
  - Estilos são controlados unicamente via arquivo global CSS com tailwind v4 (`@import "tailwindcss";`).
  - Animações refinadas usam `framer-motion` (importado como `motion`).
  - Ícones do sistema são exclusivamente do pacote `lucide-react`.

---

## 📊 Regras Específicas de Impressão (OPs)

- O fluxo de impressão na tela e nas sequências de separação utiliza um contêiner `#print-area`.
- **Garantia de Não-Omissão na Impressão:** Para evitar páginas em branco ao disparar `window.print()`, use o padrão de ocultação visual `visibility: hidden` em `body *` combinado com `visibility: visible` em `#print-area` e seus descendentes dentro do bloco de estilos CSS de `@media print`. Isso evita incompatibilidades com divs de layout e wrappers do Next.js.
