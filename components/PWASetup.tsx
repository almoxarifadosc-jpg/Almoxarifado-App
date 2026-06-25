'use client';

import React, { useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('Attempting to register Service Worker...');
      navigator.serviceWorker.register('/sw.js').then(
        async (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          
          // Registrar suporte de segundo plano no Android
          try {
            if ('sync' in registration) {
              await (registration as any).sync.register('ventisol-bg-sync');
              console.log('Background Sync registrado.');
            }
            if ('periodicSync' in registration) {
              const status = await (navigator as any).permissions.query({
                name: 'periodic-background-sync',
              });
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('ventisol-periodic-sync', {
                  minInterval: 12 * 60 * 60 * 1000,
                });
                console.log('Periodic Background Sync registrado.');
              }
            }
          } catch (syncErr) {
            console.warn('Configurações de sincronia de segundo plano ignoradas:', syncErr);
          }
        },
        (err) => {
          console.error('ServiceWorker registration failed: ', err);
        }
      );
    } else {
      console.warn('Service Workers are not supported in this browser.');
    }
  }, []);

  return <PWAInstallPrompt />;
}
