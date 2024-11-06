import type { NextConfig } from "next";

const cspHeader = `
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  referrer-policy 'no-referrer-when-downgrade'; 
  x-content-type-options 'nosniff';
  permissions-policy geolocation 'none', microphone 'none', camera 'none';   
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
