import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => join(dirname(fileURLToPath(import.meta.url)), p);
const includes = [
  "test/**/*.test.ts",
  "test/**/*.test.tsx",
  "test/**/*.spec.ts",
  "test/**/*.spec.tsx",
] as const;

export default defineConfig({
  test: {
    exclude: ["**/dist/**", "**/node_modules/**"],
    // Temporary alignment note:
    // Project package.json test scripts currently pin `vitest run --project <name>`
    // so `nx run <project>:test` stays project-scoped when Vitest resolves this
    // root multi-project config. This duplication should be replaced later by a
    // single-source-of-truth Nx/Vitest integration instead of per-package script
    // pinning.
    projects: [
      {
        extends: true,
        root: r("apps/habitat"),
        test: {
          name: "habitat-cli",
          environment: "node",
          exclude: [
            "test/installed-package.test.ts",
            "test/native-oclif-extension-roundtrip.test.ts",
          ],
          include: [...includes],
        },
      },
      {
        extends: true,
        root: r("apps/habitat"),
        test: {
          name: "habitat-cli-native-runtime-acceptance",
          environment: "node",
          fileParallelism: false,
          hookTimeout: 30_000,
          include: ["test/oclif/runtime.test.ts"],
          testTimeout: 15_000,
        },
      },
      {
        extends: true,
        root: r("apps/habitat"),
        test: {
          name: "habitat-cli-native-plugins-acceptance",
          environment: "node",
          fileParallelism: false,
          hookTimeout: 180_000,
          include: ["test/native-oclif-extension-roundtrip.test.ts"],
          testTimeout: 180_000,
        },
      },
      {
        extends: true,
        root: r("apps/habitat"),
        test: {
          name: "habitat-cli-installed-package-acceptance",
          environment: "node",
          fileParallelism: false,
          hookTimeout: 180_000,
          include: [
            "test/installed-package.test.ts",
            "test/oclif/installed-command-argv.test.ts",
            "test/oclif/installed-command-lifetime.test.ts",
          ],
          testTimeout: 180_000,
        },
      },
      {
        extends: true,
        root: r("packages/core/sdk"),
        test: { name: "habitat-sdk", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("services/agent-plugin-lifecycle"),
        test: { name: "agent-plugin-lifecycle", environment: "node", include: [...includes] },
      },
    ],
  },
});
