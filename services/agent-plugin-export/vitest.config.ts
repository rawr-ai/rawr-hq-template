import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "agent-plugin-export",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
