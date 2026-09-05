import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    maxWorkers: 2,
    testTimeout: 30_000,
  },
});
