'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'other'>(() => {
    if (typeof window === 'undefined') return 'other';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    return isIOS ? 'ios' : 'other';
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone || window.location.search.includes('standalone=true');
    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
    
    if (isStandalone || isDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show fallback instructions after a longer delay (10s) if not standalone
    const timer = setTimeout(() => {
      if (!isStandalone && !sessionStorage.getItem('pwa-prompt-dismissed')) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [platform]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const dismissPrompt = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center p-4 sm:items-center">
      <div className="pointer-events-auto w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 p-6 overflow-hidden relative">
        <button 
          onClick={dismissPrompt}
          className="absolute top-4 right-4 p-1 hover:bg-surface-container-high rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-on-surface-variant" />
        </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Instalar App</h3>
              <p className="text-sm text-on-surface-variant">Adicione o Almoxarifado App à sua tela de início para acesso rápido.</p>
            </div>
          </div>

          {platform === 'ios' ? (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                <p className="text-xs font-medium text-on-surface flex items-center gap-2">
                  1. Toque no ícone de compartilhar <Share className="w-4 h-4 text-primary" />
                </p>
                <p className="text-xs font-medium text-on-surface flex items-center gap-2">
                  2. Role para baixo e toque em <PlusSquare className="w-4 h-4 text-primary" /> &quot;Adicionar à Tela de Início&quot;
                </p>
              </div>
              <button 
                onClick={dismissPrompt}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm"
              >
                Entendi
              </button>
            </div>
          ) : deferredPrompt ? (
            <div className="flex gap-3">
              <button 
                onClick={dismissPrompt}
                className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all text-sm"
              >
                Agora não
              </button>
              <button 
                onClick={handleInstallClick}
                className="flex-[2] py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm"
              >
                Instalar Agora
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                <p className="text-xs font-medium text-on-surface flex items-center gap-2">
                  1. Abra o menu do navegador (três pontos <X className="w-4 h-4 rotate-90 inline" />)
                </p>
                <p className="text-xs font-medium text-on-surface flex items-center gap-2">
                  2. Toque em &quot;Instalar aplicativo&quot; ou &quot;Adicionar à tela inicial&quot;
                </p>
              </div>
              <button 
                onClick={dismissPrompt}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm"
              >
                Entendi
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
