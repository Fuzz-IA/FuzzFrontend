import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desactiva la verificación de ESLint durante el build
    ignoreDuringBuilds: true,
    // O ignora archivos específicos
    dirs: ['src/app', 'src/components'] // solo verifica estos directorios
  },
  /* config options here */
};

export default nextConfig;
