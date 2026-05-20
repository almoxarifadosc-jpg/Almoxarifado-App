# Instruções para Agentes IA (AGENTS.md)

Este arquivo contém regras persistentes para garantir a estabilidade do desenvolvimento deste projeto no Google AI Studio.

## Regras de Preservação de Arquivos

1. **NUNCA use `degit` com `--force` no diretório raiz após o setup inicial.** Isso sobrescreve todas as alterações locais e causa perda de trabalho.
2. **Priorize `edit_file` e `multi_edit_file`.** Evite comandos de shell que manipulem arquivos em massa (`rm -rf`, `cp -r` de fontes externas sem cautela).
3. **Persistência de Mudanças:** Se houver necessidade de sincronizar com o GitHub, use o fluxo manual ou ferramentas de diff, nunca substituição total.
4. **Verificação de Build:** Sempre rode `lint_applet` e `compile_applet` após alterações críticas. Se o build falhar e o preview não carregar, investigue o erro no `server.ts` ou nos componentes afetados antes de tentar "resetar" o ambiente.
5. **Erros de Timeout:** Se encontrar erros de "Timed out waiting for applet file system condition", evite disparar múltiplos comandos de build/restart em sequência. Aguarde alguns segundos entre as tentativas.

## Contexto do Projeto
Este é um sistema Next.js para controle de almoxarifado da Ventisol.
- **Firebase:** Utilizado para banco de dados (Firestore) e Auth.
- **Tailwind v4:** Utilizado para estilização através do `@import "tailwindcss";` no `globals.css`.
- **Animações:** Utiliza `motion` para transições.
- **Ícones:** Exclusivamente `lucide-react`.
