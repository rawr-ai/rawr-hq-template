import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nx/**",
      "**/coverage/**",
      "**/.tmp/**",
      "apps/cli/bin/**",
      "apps/server/openapi/**",
      "apps/server/scripts/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
];
