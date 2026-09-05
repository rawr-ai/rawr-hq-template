import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  dts: {
    build: true,
    resolver: "tsc",
  },
  deps: {
    neverBundle: true,
    // Keep nominal witnesses anchored to their private TypeScript project owner.
    dts: { neverBundle: [/^\.\.\/\.\.\/(definition|schema)\/src\//, /^(?![A-Za-z]:)[^./\\\0]/] },
    onlyImport: [
      "@orpc/contract",
      "@orpc/server",
      "@standard-schema/spec",
      "effect",
      "node:crypto",
      "typebox",
    ],
  },
});
