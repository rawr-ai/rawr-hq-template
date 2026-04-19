import { defineConfig } from "vitest/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
        root: r("apps/cli"),
        test: { name: "cli", environment: "node", include: [...includes], env: { NODE_ENV: "production" } },
      },
      {
        extends: true,
        root: r("apps/server"),
        test: { name: "server", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("apps/hq"),
        test: { name: "hq-app", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("apps/web"),
        test: { name: "web", environment: "jsdom", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/core"),
        test: { name: "core", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("services/chatgpt-corpus"),
        test: { name: "chatgpt-corpus", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("services/hq-ops"),
        test: { name: "hq-ops", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/hq-ops-host"),
        test: { name: "hq-ops-host", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/plugin-workspace"),
        test: { name: "plugin-workspace", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("services/example-todo"),
        test: { name: "example-todo", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/session-tools"),
        test: { name: "session-tools", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/agent-sync"),
        test: { name: "agent-sync", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/test-utils"),
        test: { name: "integration", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/ui-sdk"),
        test: { name: "ui-sdk", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/cli/hello"),
        test: { name: "plugin-hello", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/cli/chatgpt-corpus"),
        test: { name: "plugin-chatgpt-corpus", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/web/mfe-demo"),
        test: { name: "plugin-mfe-demo", environment: "jsdom", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/cli/session-tools"),
        test: { name: "plugin-session-tools", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/cli/plugins"),
        test: { name: "plugin-plugins", environment: "node", include: [...includes] },
      },
    ],
  },
});
