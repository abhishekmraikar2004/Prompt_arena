import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "package-lock.json"] },
  {
    files: ["apps/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: { "no-debugger": "error", "no-constant-condition": "error" },
  },
];
