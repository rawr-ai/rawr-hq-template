import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  dts: {
    resolver: "tsc",
  },
  deps: {
    neverBundle: true,
    onlyImport: ["@standard-schema/spec", "typebox"],
  },
});
