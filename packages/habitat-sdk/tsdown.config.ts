import { defineConfig } from "tsdown";

const privateWorkspacePackages = [
  "@habitat-ai/resource-rule-evaluation",
  "@habitat-ai/resource-source-inventory",
  "@habitat-ai/service",
  "@habitat-ai/typebox-adapter",
];

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist",
  format: "esm",
  platform: "node",
  fixedExtension: false,
  dts: {
    resolver: "tsc",
  },
  deps: {
    alwaysBundle: privateWorkspacePackages,
    onlyImport: [
      "@effect/platform-node",
      "@getgrit/cli",
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
  copy: "../../.habitat/blueprints",
});
