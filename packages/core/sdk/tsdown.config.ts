import { defineConfig } from "tsdown";

const privateWorkspacePackages = [
  "@habitat-ai/resource-rule-evaluation",
  "@habitat-ai/resource-source-inventory",
  "@habitat-ai/resource-telemetry",
  "@habitat-ai/resource-telemetry/providers/opentelemetry-node",
  "@habitat-ai/catalog-service",
];

const blueprintIds = [
  "app",
  "package",
  "plugin",
  "plugin-nx",
  "provider",
  "resource",
  "runtime-definition",
  "service",
];

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "app/index": "src/app/index.ts",
    "effect/index": "src/effect/index.ts",
    "execution/index": "src/execution/index.ts",
    "plugins/server/index": "src/plugins/server/index.ts",
    "plugins/server/effect/index": "src/plugins/server/effect/index.ts",
    "plugins/server/mcp/index": "src/plugins/server/mcp/index.ts",
    "plugins/async/index": "src/plugins/async/index.ts",
    "plugins/async/effect/index": "src/plugins/async/effect/index.ts",
    "service/index": "src/service/index.ts",
    "service/schema": "src/service/schema.ts",
    "runtime/resources/index": "src/runtime/resources/index.ts",
    "runtime/providers/index": "src/runtime/providers/index.ts",
    "runtime/providers/effect/index": "src/runtime/providers/effect/index.ts",
    "runtime/profiles/index": "src/runtime/profiles/index.ts",
    "runtime/schema": "src/runtime/schema.ts",
    telemetry: "src/telemetry.ts",
  },
  outDir: "dist",
  format: "esm",
  platform: "node",
  target: "node24.11.0",
  fixedExtension: false,
  dts: {
    resolver: "tsc",
  },
  deps: {
    alwaysBundle: privateWorkspacePackages,
    onlyImport: [
      "@effect/platform-node",
      "@getgrit/cli",
      "@opentelemetry/api",
      "@orpc/contract",
      "@orpc/experimental-effect",
      "@orpc/server",
      "@standard-schema/spec",
      "effect",
      "picomatch",
      "smol-toml",
      "typebox",
    ],
  },
  copy: blueprintIds.map((id) => ({
    from: `../../../.habitat/blueprints/${id}`,
    to: "dist/blueprints",
  })),
});
