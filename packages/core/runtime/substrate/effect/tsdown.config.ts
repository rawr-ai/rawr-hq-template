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
    dts: {
      neverBundle: [
        /^\.\//,
        /^\.\.\/\.\.\/\.\.\/(?:definition|compiler|bootgraph)\/src(?:\/|$)/,
        /^(?![A-Za-z]:)[^./\\\0]/,
      ],
    },
    onlyImport: [
      "effect",
      "dotenv",
      "@orpc/contract",
      "@orpc/server",
      "@standard-schema/spec",
      "node:crypto",
      "node:fs",
      "node:path",
      "node:util",
      "typebox",
    ],
  },
});
