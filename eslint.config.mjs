import nxPlugin from "@nx/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const boundaryRule = [
  "error",
  {
    allow: [
      "../../../rawr.hq",
      "../server/src/bootstrap",
      "../server/src/host-composition",
      "../server/src/logging",
      "@rawr/hq-app/manifest",
      "@rawr/hq-app/legacy-cutover",
      "@rawr/hq-ops",
      "@rawr/hq-ops/config",
      "@rawr/hq-ops/repo-state",
      "@rawr/hq-ops/journal",
      "@rawr/hq-ops/security",
      "@rawr/hq-ops/service/contract"
    ],
    depConstraints: [
      {
        sourceTag: "app:hq",
        onlyDependOnLibsWithTags: ["type:package", "type:plugin", "type:service"]
      },
      {
        sourceTag: "type:app",
        onlyDependOnLibsWithTags: ["type:package", "type:plugin", "type:service"]
      },
      {
        sourceTag: "type:service",
        onlyDependOnLibsWithTags: ["type:package", "type:service"]
      },
      {
        sourceTag: "type:package",
        onlyDependOnLibsWithTags: ["type:package"]
      },
      {
        sourceTag: "type:plugin",
        onlyDependOnLibsWithTags: ["type:package", "type:service"]
      }
    ],
    enforceBuildableLibDependency: false
  }
];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nx/**",
      "**/coverage/**",
      "**/.tmp/**",
      "**/test/**",
      "**/*.test.*",
      "apps/cli/bin/**",
      "apps/server/openapi/**",
      "apps/server/scripts/**"
    ]
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@nx": nxPlugin
    },
    rules: {
      "@nx/enforce-module-boundaries": boundaryRule
    }
  }
];
