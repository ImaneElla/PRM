import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  allowedDevOrigins: ["192.168.11.113", "192.168.*.*", "localhost", "127.0.0.1"],
  // Ancienne adresse du tableau de bord : le tableau de bord est maintenant à la racine
  async redirects() {
    return [{ source: "/dashboard", destination: "/", permanent: false }];
  },
};

export default nextConfig;
