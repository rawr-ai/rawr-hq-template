import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "research-sdk",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
