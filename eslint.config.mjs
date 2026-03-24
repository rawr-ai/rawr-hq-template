import nxPlugin from "@nx/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const boundaryRule = [
  "error",
  {
    allow: ["../../../rawr.hq"],
    depConstraints: [
      {
        sourceTag: "type:app",
        onlyDependOnLibsWithTags: ["type:package", "type:plugin"]
      },
      {
        sourceTag: "type:service",
        notDependOnLibsWithTags: ["type:app", "type:plugin"]
      },
      {
        sourceTag: "type:package",
        notDependOnLibsWithTags: ["type:service"]
      },
      {
        sourceTag: "type:plugin",
        notDependOnLibsWithTags: ["type:plugin", "type:app"]
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
