import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep false in local dev to avoid duplicate useEffect API calls.
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: {
            exclude: ["error", "warn"],
          },
        }
      : {},
  // Parent folder has its own package-lock.json; pin tracing + Turbopack to this app.
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/api/passport/extract-local": [
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/tesseract.js/dist/worker.min.js",
      "./tessdata/**/*.traineddata",
    ],
    "/api/travelport/search-flight": [
      "./sample/**/*.json",
    ],
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/lab",
      "lodash",
      "framer-motion",
    ],
  },
  env: {
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /react/,
      use: ["@svgr/webpack"],
    });

    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: { not: [/react/] },
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
