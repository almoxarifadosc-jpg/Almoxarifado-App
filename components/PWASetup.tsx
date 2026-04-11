'use client';

import React, { useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return <PWAInstallPrompt />;
}
