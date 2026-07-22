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
        onlyDependOnLibsWithTags: ["type:package", "type:plugin", "type:provider", "type:resource", "type:service"]
      },
      {
        sourceTag: "type:app",
        onlyDependOnLibsWithTags: ["type:package", "type:plugin", "type:provider", "type:resource", "type:service"]
      },
      {
        sourceTag: "type:service",
        onlyDependOnLibsWithTags: ["type:package", "type:resource", "type:service"]
      },
      {
        sourceTag: "type:package",
        onlyDependOnLibsWithTags: ["type:package"]
      },
      {
        sourceTag: "type:fixture",
        onlyDependOnLibsWithTags: ["type:package"]
      },
      {
        sourceTag: "type:plugin",
        onlyDependOnLibsWithTags: ["type:package", "type:resource", "type:service"]
      },
      {
        sourceTag: "type:provider",
        onlyDependOnLibsWithTags: ["type:package", "type:resource"]
      },
      {
        sourceTag: "type:resource",
        onlyDependOnLibsWithTags: ["type:package", "type:resource"]
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
      "apps/cli/bin/**",
      "apps/server/openapi/**",
      "apps/server/scripts/**"
    ]
  },
  {
    files: ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error"
    },
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
    files: ["apps/**/*.{js,jsx,ts,tsx,cts,mts}", "services/**/*.{js,jsx,ts,tsx,cts,mts}", "packages/**/*.{js,jsx,ts,tsx,cts,mts}", "plugins/**/*.{js,jsx,ts,tsx,cts,mts}", "resources/**/*.{js,jsx,ts,tsx,cts,mts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@rawr/agent-sync", "@rawr/agent-sync/*"],
              message: "The legacy @rawr/agent-sync package is removed; curated lifecycle belongs to the typed @rawr/agent-plugin-lifecycle service boundary."
            },
            {
              group: ["@rawr/session-tools", "@rawr/session-tools/*"],
              message: "The legacy @rawr/session-tools package is removed; use @rawr/session-intelligence and plugin/app-local concrete resources."
            },
            {
              group: ["@rawr/*-host", "@rawr/*-host/*"],
              message: "Service-specific host packages are forbidden. Services own semantics; plugin/app/runtime surfaces provide concrete resources."
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
              message: "Session Intelligence service files must stay runtime-agnostic; concrete filesystem, env, and SQLite access belongs in the plugin/app resource binding layer."
            }
          ]
        }
      ]
    }
  },
  {
    // Repository scripts and the compiler contract environment are not Nx
    // production dependency layers. They are still linted, but the Nx boundary
    // rule does not describe their import topology.
    files: [
      "scripts/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}",
      "tools/runtime-realization-type-env/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"
    ],
    rules: {
      "@nx/enforce-module-boundaries": "off"
    }
  },
  {
    // Tests intentionally reach package-private seams and fixture processes.
    // Keep every test file in the lint population while exempting only the Nx
    // production dependency-layer rule that does not model that topology.
    files: ["**/test/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}", "**/*.test.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
    rules: {
      "@nx/enforce-module-boundaries": "off"
    }
  },
  {
    // These two package files are accepted pre-ratchet boundary debt. Keep the
    // exemption exact so the repository-wide lint gate catches any new debt.
    files: ["packages/dev-node/src/resources.ts", "packages/dev-node/src/scratch-policy.ts"],
    rules: {
      "@nx/enforce-module-boundaries": "off"
    }
  }
];
