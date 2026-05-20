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
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/app-logo.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Almoxarifado',
  },
  applicationName: 'Almoxarifado',
  formatDetection: {
    telephone: false,
  },
  other: {
    'theme-color': '#0061a4',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0061a4',
    'msapplication-tap-highlight': 'no',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-body bg-surface text-on-surface">
        {children}
        <PWASetup />
      </body>
    </html>
  );
}
