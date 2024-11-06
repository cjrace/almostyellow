import type { NextConfig } from "next";

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
};

export default nextConfig;
