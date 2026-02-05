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
        root: r("packages/security"),
        test: { name: "security", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("packages/test-utils"),
        test: { name: "integration", environment: "node", include: [...includes] },
      },
      {
        extends: true,
        root: r("plugins/hello"),
        test: { name: "plugin-hello", environment: "node", include: [...includes] },
      },
    ],
  },
});
