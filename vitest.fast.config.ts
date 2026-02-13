import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

const heavyCliTests = [
  "test/stubs.test.ts",
  "test/plugins-command-surface-cutover.test.ts",
  "test/plugins-converge-and-doctor.test.ts",
  "test/plugins-sync-drift.test.ts",
  "test/plugins-status.test.ts",
  "test/security-posture.test.ts",
  "test/journal.test.ts",
  "test/workflow-harden.e2e.test.ts",
  "**/apps/cli/test/stubs.test.ts",
  "**/apps/cli/test/plugins-command-surface-cutover.test.ts",
  "**/apps/cli/test/plugins-converge-and-doctor.test.ts",
  "**/apps/cli/test/plugins-sync-drift.test.ts",
  "**/apps/cli/test/plugins-status.test.ts",
  "**/apps/cli/test/security-posture.test.ts",
  "**/apps/cli/test/journal.test.ts",
  "**/apps/cli/test/workflow-harden.e2e.test.ts",
] as const;

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      exclude: [
        "**/dist/**",
        "**/node_modules/**",
        "**/.turbo/**",
        "test/coordination.visual.test.ts",
        "**/apps/web/test/coordination.visual.test.ts",
        ...heavyCliTests,
      ],
    },
  }),
);
