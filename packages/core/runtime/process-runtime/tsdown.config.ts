import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  dts: { build: true, resolver: "tsc" },
  deps: {
    neverBundle: true,
    dts: {
      neverBundle: [
        /^\.\.\/\.\.\/(?:definition|derivation|compiler|substrate\/effect)\/src(?:\/|$)/,
        /^(?![A-Za-z]:)[^./\\\0]/,
      ],
    },
    onlyImport: [
      "@effect/opentelemetry",
      "@opentelemetry/api",
      "@orpc/client",
      "@orpc/contract",
      "@orpc/experimental-effect",
      "@orpc/openapi",
      "@orpc/server",
      "@orpc/shared",
      "@standard-schema/spec",
      "effect",
      "dotenv",
      "node:crypto",
      "node:util",
      "typebox",
    ],
  },
});
