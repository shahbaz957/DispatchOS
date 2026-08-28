import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gatewayUrl =
  process.env.API_GATEWAY_URL ?? "http://127.0.0.1:3010";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${gatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
