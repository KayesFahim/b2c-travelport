import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep false in local dev to avoid duplicate useEffect API calls.
  reactStrictMode: false,
  // Parent folder has its own package-lock.json; pin tracing + Turbopack to this app.
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/api/passport/extract-local": [
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/tesseract.js/dist/worker.min.js",
      "./tessdata/**/*.traineddata",
    ],
  },
  turbopack: {
    root: __dirname,
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
