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
      "@rawr/hq-ops/service/contract",
      "@rawr/agent-config-sync",
      "@rawr/agent-config-sync/*"
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

const concreteSessionIntelligenceRuntimeImports = [
  "node:*",
  "bun:*",
  "fs",
  "fs/*",
  "path",
  "os",
  "readline",
  "readline/*",
  "sqlite",
  "sqlite3",
  "better-sqlite3"
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
    files: ["apps/**/*.{js,jsx,ts,tsx}", "services/**/*.{js,jsx,ts,tsx}", "packages/**/*.{js,jsx,ts,tsx}", "plugins/**/*.{js,jsx,ts,tsx}"],
    ignores: ["packages/agent-config-sync-host/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@rawr/agent-sync", "@rawr/agent-sync/*"],
              message: "The legacy @rawr/agent-sync package is removed; use @rawr/agent-config-sync and @rawr/agent-config-sync-host."
            },
            {
              group: ["@rawr/session-tools", "@rawr/session-tools/*"],
              message: "The legacy @rawr/session-tools package is removed; use @rawr/session-intelligence and @rawr/session-intelligence-host."
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
  },
  {
    files: ["services/session-intelligence/src/service/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: concreteSessionIntelligenceRuntimeImports,
              message: "Session Intelligence service files must stay runtime-agnostic; keep concrete filesystem, env, and SQLite access in @rawr/session-intelligence-host."
            }
          ]
        }
      ]
    }
  }
];
