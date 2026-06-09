import React from "react";
import "./globals.css";

export const metadata = {
  title: "Almoxarifado Ventisol",
  description: "Sistema Avançado de Gestão de Componentes, Recebimentos e Separação de OPs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
