import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 보안 헤더. (HTTPS 강제 HSTS 는 Vercel 이 기본으로 붙여 줍니다)
  // CSP 는 `frame-ancestors` 만 둡니다 — 결제창(PG 스크립트·iframe)을 막지 않으면서 다른 사이트가 이 페이지를 액자로 끼워 넣는 것만 막습니다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
