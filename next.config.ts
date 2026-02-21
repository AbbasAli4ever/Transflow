import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri — generates a standalone out/ directory
  output: "export",
  // Disable Next.js image optimization (not available in static export)
  images: {
    unoptimized: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
