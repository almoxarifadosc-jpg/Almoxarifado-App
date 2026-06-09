import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desativa a verificação estática do ESLint no build corporativo da Vercel para contornar problemas de loops circulares no container
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Mantém a verificação rigorosa de tipagens ricas ativa para apoiar o sucessor da Ventisol
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
