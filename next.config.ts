import type { NextConfig } from "next";

const fastApiBaseUrl = (process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${fastApiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
