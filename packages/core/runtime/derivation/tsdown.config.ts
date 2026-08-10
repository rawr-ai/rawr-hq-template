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
    onlyImport: ["@orpc/contract", "@orpc/server", "@standard-schema/spec", "typebox"],
  },
});
