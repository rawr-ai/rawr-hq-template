import { defineConfig } from "tsdown";

const privateWorkspacePackages = [
  "@habitat-ai/resource-rule-evaluation",
  "@habitat-ai/resource-source-inventory",
  "@habitat-ai/catalog-service",
];

const blueprintIds = ["app", "package", "plugin", "plugin-nx", "provider", "resource", "service"];

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "service/index": "src/service/index.ts",
    "service/schema": "src/service/schema.ts",
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
    from: `../../.habitat/blueprints/${id}`,
    to: "dist/blueprints",
  })),
});
