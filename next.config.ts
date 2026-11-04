import type { NextConfig } from "next";

// Left out only for builds served over plain HTTP on this computer: pnpm dev,
// and test builds, which set SERVED_OVER_HTTP (tests/test-env.ts and CI).
// Safari applies it to http://localhost too, so those would load nothing
const servedOverHttp =
  process.env.NODE_ENV === "development" ||
  process.env.SERVED_OVER_HTTP === "true";
const upgradeInsecure = servedOverHttp ? "" : "upgrade-insecure-requests;";

const cspHeader = `
img-src 'self' blob: data:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
${upgradeInsecure}
`;

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/form",
      "@tabler/icons-react",
      "@vercel/analytics",
      "sharp",
    ],
  },
  headers() {
    return [
      {
        source: "/games/uno-tracker/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/games/uno-tracker" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
