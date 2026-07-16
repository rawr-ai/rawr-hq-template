import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "agent-plugin-release",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
