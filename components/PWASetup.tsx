'use client';

import React, { useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => {
        console.log('Attempting to register Service Worker...');
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.error('ServiceWorker registration failed: ', err);
          }
        );
      };

      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    } else {
      console.warn('Service Workers are not supported in this browser.');
    }
  }, []);

  return <PWAInstallPrompt />;
}
