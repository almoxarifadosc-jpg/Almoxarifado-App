'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Database, ExternalLink, AlertTriangle } from 'lucide-react';

export function SupabaseSetupView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-lowest">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-outline-variant/10 text-center"
      >
        <div className="w-20 h-20 bg-warning/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Database className="text-warning w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-headline font-extrabold text-on-surface mb-4">
          Configuração Necessária
        </h2>
        
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="text-warning w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-on-surface">
              O Supabase ainda não foi configurado. Para que o sistema funcione, você precisa adicionar as credenciais da sua API.
            </p>
          </div>
          
          <ol className="space-y-3 text-sm text-on-surface-variant list-decimal list-inside">
            <li>Crie um projeto no <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary font-bold inline-flex items-center gap-1 hover:underline">Supabase <ExternalLink className="w-3 h-3" /></a></li>
            <li>Vá em <strong>Project Settings</strong> &gt; <strong>API</strong></li>
            <li>Copie a <strong>Project URL</strong> e a <strong>anon public key</strong></li>
            <li>No AI Studio, vá em <strong>Settings</strong> (ícone de engrenagem)</li>
            <li>Adicione as variáveis:
              <ul className="mt-2 space-y-1 pl-6 list-disc">
                <li><code className="bg-surface-container-high px-1.5 py-0.5 rounded text-primary font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><code className="bg-surface-container-high px-1.5 py-0.5 rounded text-primary font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
              </ul>
            </li>
          </ol>
        </div>

        <p className="text-xs text-on-surface-variant/60 italic">
          Após configurar as variáveis, a página será recarregada automaticamente e o sistema estará pronto para uso.
        </p>
      </motion.div>
    </div>
  );
}
