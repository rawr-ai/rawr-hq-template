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

const hqOpsBoundaryRestrictedImports = [
  "node:*",
  "bun:*",
  "./support",
  "./support.*",
  "./repository",
  "./repository.*",
  "./storage",
  "./storage.*",
  "./exec",
  "./exec.*",
  "./sqlite",
  "./sqlite.*",
  "./writer",
  "./writer.*",
  "../support",
  "../support.*",
  "../repository",
  "../repository.*",
  "../storage",
  "../storage.*",
  "../exec",
  "../exec.*",
  "../sqlite",
  "../sqlite.*",
  "../writer",
  "../writer.*",
  "../../support",
  "../../support.*",
  "../../repository",
  "../../repository.*",
  "../../storage",
  "../../storage.*",
  "../../exec",
  "../../exec.*",
  "../../sqlite",
  "../../sqlite.*",
  "../../writer",
  "../../writer.*"
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
  },
  {
    files: ["packages/agent-sync/src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@rawr/hq-ops", "@rawr/hq-ops/*"],
              message: "agent-sync must not compose or import HQ Ops directly; the true host must load config first."
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      "services/hq-ops/src/service/contract.ts",
      "services/hq-ops/src/service/modules/**/contract.ts",
      "services/hq-ops/src/service/modules/**/schemas.ts",
      "services/hq-ops/src/service/modules/**/model.ts",
      "services/hq-ops/src/service/modules/**/types.ts"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: hqOpsBoundaryRestrictedImports,
              message: "HQ Ops contract/schema/model/type files must stay runtime-agnostic."
            }
          ]
        }
      ]
    }
  }
];
