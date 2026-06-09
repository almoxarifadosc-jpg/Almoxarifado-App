# Diretrizes para Gemini e Agentes de Codificação (GEMINI.md)

Este arquivo de configuração fornece diretrizes críticas para os agentes de codificação do Google AI Studio operando no projeto **Almoxarifado Ventisol**.

---

## 🚫 REGRA DE OURO: SEGURANÇA DE ARQUIVOS (FILE INTEGRITY NO-DELETE RULE)

- **INTEGRIDADE ABSOLUTA:** É terminantemente proibido deletar múltiplos arquivos de código ou zerar pastas chaves (`app/`, `components/`, etc.) para resolver falhas de compilação ou de importações.
- **RESTREABILIDADE DE SCRIPTS:** Não execute scripts purificadores (`scripts/clean.sh`, `rimraf`, `rm -rf node_modules`) que possam impactar o acesso ao sistema de arquivos do container fora de dependências estritamente controladas por `package.json`.
- **PREPARO DO AMBIENTE:** Se os comandos Next.js falharem, use `install_applet_dependencies` para restabelecer os binários sem deletar arquivos de visualização ou componentes React.

---

## 🏗️ Padrões do Projeto Almoxarifado

1. **Framework:** Next.js (App Router/TypeScript).
2. **Database & Autenticação:** Firebase Firestore & Firebase Auth configurados em `/lib/firebase.ts`.
3. **Impressão de OPs:** Mantida em `/components/SeparationSequenceView.tsx` sob selector de impressão `#print-area`.
