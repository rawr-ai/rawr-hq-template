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
    // The private barrel re-exports emitted leaves rather than duplicating nominal types.
    dts: { neverBundle: [/^\.\//, /^\.\.\/\.\.\/schema\/src\//, /^(?![A-Za-z]:)[^./\\\0]/] },
    onlyImport: [
      "@orpc/client",
      "@orpc/contract",
      "@orpc/experimental-effect",
      "@orpc/server",
      "effect",
      "inngest",
      "inngest/types",
      "typebox",
    ],
  },
});
