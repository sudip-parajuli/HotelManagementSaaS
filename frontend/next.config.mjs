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

  // Rewrite /api/* to the Django backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000"}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;
