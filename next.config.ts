import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desativa verificação estática do ESLint no build do Next para evitar loops circulares no container
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Mantém a verificação rica de tipos ativa
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
