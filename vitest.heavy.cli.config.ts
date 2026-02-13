import { defineConfig } from "vitest/config";

const heavyCliIncludes = [
  "apps/cli/test/stubs.test.ts",
  "apps/cli/test/plugins-command-surface-cutover.test.ts",
  "apps/cli/test/plugins-converge-and-doctor.test.ts",
  "apps/cli/test/plugins-sync-drift.test.ts",
  "apps/cli/test/plugins-status.test.ts",
  "apps/cli/test/security-posture.test.ts",
  "apps/cli/test/journal.test.ts",
  "apps/cli/test/workflow-harden.e2e.test.ts",
] as const;

export default defineConfig({
  test: {
    environment: "node",
    include: [...heavyCliIncludes],
    exclude: ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
    env: { NODE_ENV: "production" },
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
