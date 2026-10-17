import type { NextConfig } from "next";

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
  // záložní znalosti (profily mimo DB) se čtou za běhu ze souborů → musí být v deployi
  outputFileTracingIncludes: {
    "/**": ["./knowledge/**/*"],
  },
  async headers() {
    return [
      {
        source: "/embed",
        // Content-Security-Policy (frame-ancestors) nastavuje proxy.ts podle domén profilů v DB
        headers: [
          { key: "Permissions-Policy", value: "microphone=(self), autoplay=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
