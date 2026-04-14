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
        <link rel="manifest" href="/manifest.json?v=7" />
        <meta name="theme-color" content="#0061a4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Almoxarifado" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Almoxarifado" />
        <meta name="msapplication-TileColor" content="#0061a4" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Favicon and Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/app-logo.png?v=4" />
        <link rel="icon" type="image/png" sizes="16x16" href="/app-logo.png?v=4" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/app-logo.png?v=4" />
        <link rel="mask-icon" href="/app-logo.png?v=4" color="#0061a4" />
      </head>
      <body suppressHydrationWarning className="font-body bg-surface text-on-surface">
        {children}
        <PWASetup />
      </body>
    </html>
  );
}
