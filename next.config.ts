import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevent MIME-type sniffing.
        { key: "X-Content-Type-Options",   value: "nosniff" },
        // Block the page from being embedded in an iframe on other origins.
        { key: "X-Frame-Options",          value: "SAMEORIGIN" },
        // Stop browsers sending the full URL as a referrer to third parties.
        { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
        // Disable browser features that aren't needed.
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        // HSTS — tell browsers to always use HTTPS (Vercel enforces it).
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default nextConfig;
