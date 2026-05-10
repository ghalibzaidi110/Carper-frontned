import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TODO: clean up `Record<string, unknown>` types and re-enable strict checks
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
  // Proxy API calls to NestJS backend (avoids CORS + mixed-content issues
  // when serving via ngrok or any external HTTPS origin).
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3000/api/v1/:path*",
      },
    ];
  },
  // ONNX Runtime Web pulls in Node-only modules at type-check time.
  // Tell webpack they aren't available in the browser.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
