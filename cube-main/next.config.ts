import type { NextConfig } from "next";

/**
 * Minimal production-friendly Next.js config.
 *
 * Adds baseline security headers. Middleware-level admin auth lives in
 * `src/middleware.ts`. Route-level guards (e.g. Telegram webhook secret)
 * live in their respective route handlers.
 */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
