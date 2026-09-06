import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "elysia/index": "elysia/index.ts",
    "inngest/index": "inngest/index.ts",
    "web/index": "web/index.ts",
  },
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
        /^\.\//,
        /^\.\.\/\.\.\/(?:definition|compiler|process-runtime)\/src(?:\/|$)/,
        /^(?![A-Za-z]:)[^./\\\0]/,
      ],
    },
    onlyImport: [
      "@effect/opentelemetry",
      "@opentelemetry/api",
      "@orpc/client",
      "@orpc/contract",
      "@orpc/experimental-effect",
      "@orpc/server",
      "@orpc/shared",
      "@orpc/openapi",
      "@standard-schema/spec",
      "effect",
      "dotenv",
      "inngest",
      "inngest/types",
      "inngest/bun",
      "inngest/connect",
      "elysia",
      "rou3",
      "typebox",
    ],
  },
});
