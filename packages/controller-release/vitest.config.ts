import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "controller-release",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
