import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      '@tabler/icons-react", "react-hook-form',
      "react-select",
      "sharp",
    ],
  },
};

export default nextConfig;
