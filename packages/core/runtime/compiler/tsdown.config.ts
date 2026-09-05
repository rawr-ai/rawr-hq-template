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
    // The terminal SDK bundles source; private declarations preserve owner identity.
    dts: {
      neverBundle: [
        /^\.\//,
        /^\.\.\/\.\.\/(definition|derivation)\/src\//,
        /^(?![A-Za-z]:)[^./\\\0]/,
      ],
    },
    onlyImport: [
      "@orpc/contract",
      "@orpc/server",
      "@standard-schema/spec",
      "effect",
      "inngest",
      "inngest/types",
      "node:crypto",
      "typebox",
    ],
  },
});
