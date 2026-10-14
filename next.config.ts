import type { NextConfig } from "next";
import { clientConfig } from "./client.config";

// Kde smí být chat vložen v iframe (web zákazníka + localhost pro vývoj)
const frameAncestors =
  clientConfig.allowedOrigins.length === 0
    ? "*"
    : ["'self'", "http://localhost:*", "http://127.0.0.1:*", ...clientConfig.allowedOrigins].join(" ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // znalostní báze se čte za běhu ze souborů → musí být v deployi
  outputFileTracingIncludes: {
    "/api/chat": ["./knowledge/**/*"],
  },
  async headers() {
    return [
      {
        source: "/embed",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors}` }],
      },
    ];
  },
};

export default nextConfig;
