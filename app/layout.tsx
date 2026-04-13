import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

import { PWASetup } from '@/components/PWASetup';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Almoxarifado App',
  description: 'Sistema de controle de fluxo de operações industriais e gestão de produção.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0061a4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Almoxarifado" />
        <link rel="apple-touch-icon" href="/icon.png?v=3" />
        <link rel="icon" href="/icon.png?v=3" />
      </head>
      <body suppressHydrationWarning className="font-body bg-surface text-on-surface">
        {children}
        <PWASetup />
      </body>
    </html>
  );
}
