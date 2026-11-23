import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**", "public/**", "cert/**", "sample/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: "readonly", document: "readonly", process: "readonly", console: "readonly", module: "readonly", require: "readonly", Buffer: "readonly", global: "readonly", fetch: "readonly", setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", navigator: "readonly", localStorage: "readonly", sessionStorage: "readonly", alert: "readonly", FileReader: "readonly", Image: "readonly", Event: "readonly", FormData: "readonly", AbortController: "readonly", AbortSignal: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly", setInterval: "readonly", clearInterval: "readonly", URLSearchParams: "readonly", Blob: "readonly", ResizeObserver: "readonly", TextEncoder: "readonly", TextDecoder: "readonly", __dirname: "readonly", __filename: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-undef": "off", // TypeScript handles names in TS; legacy JS is migrated incrementally.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-case-declarations": "off",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  { files: ["**/*.{js,jsx,mjs,cjs}"], rules: { "no-undef": "error" } },
);
