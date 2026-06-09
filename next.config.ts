import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  compress: false, // Desativa pré-compressão estática gzip que consome pico de RAM no build
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    // Limita o paralelismo de módulos compilados para evitar estouro de RAM no container (OOM/Killed 137)
    if (!dev) {
      config.parallelism = 2;
      config.optimization.minimize = false; // Desativa a minificação pesada que consome picos de RAM de mais de 2GB no contêiner local
    }
    return config;
  },
};

export default nextConfig;
