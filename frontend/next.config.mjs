/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker production builds
  output: "standalone",

  trailingSlash: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow images from the Django backend (MinIO proxied)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.siaenterprises.com.np",
        pathname: "/**",
      },
    ],
  },

  // /api/* is handled by the server-side proxy route, preserving tenant context
  // without overriding Vercel's routing Host or exposing the proxy secret.
};

export default nextConfig;
