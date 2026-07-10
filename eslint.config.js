import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "*.config.js", "vite.config.js"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        FileReader: "readonly",
        TextDecoder: "readonly",
        Uint8Array: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        fetch: "readonly",
        console: "readonly",
        navigator: "readonly",
        MediaRecorder: "readonly",
        Blob: "readonly",
      },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Vercel serverless functions - Node runtime, not the browser.
    files: ["api/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly", Buffer: "readonly", console: "readonly",
        fetch: "readonly", FormData: "readonly", Blob: "readonly",
      },
    },
  },
];
