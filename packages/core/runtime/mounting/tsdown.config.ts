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
        /^\.\.\/\.\.\/(?:definition|process-runtime|harnesses)\/src(?:\/|$)/,
        /^(?![A-Za-z]:)[^./\\\0]/,
      ],
    },
    onlyImport: [
      "@orpc/client",
      "@orpc/contract",
      "@orpc/experimental-effect",
      "@orpc/server",
      "@orpc/shared",
      "@standard-schema/spec",
      "dotenv",
      "effect",
      "typebox",
    ],
  },
});
