/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "mammoth", "pdf-parse"],
  },
  poweredByHeader: false,
};

export default nextConfig;
