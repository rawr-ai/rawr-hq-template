import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("ingress signature observability", () => {
  it("rejects invalid ingress signatures before telemetry side effects", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-ingress-observability-"));
    tempDirs.push(fixtureRoot);
    const runId = "run-ingress-observability";
    const timelinePath = path.join(fixtureRoot, ".rawr", "coordination", "timelines", `${runId}.json`);

    const previousSigningKey = process.env.INNGEST_SIGNING_KEY;
    const previousSigningKeyFallback = process.env.INNGEST_SIGNING_KEY_FALLBACK;
    process.env.INNGEST_SIGNING_KEY = "signkey-test-ingress-observability";
    delete process.env.INNGEST_SIGNING_KEY_FALLBACK;

    try {
      const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
      const response = await app.handle(
        new Request("http://localhost/api/inngest", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-inngest-signature": `t=${Math.floor(Date.now() / 1000)}&s=deadbeef`,
          },
          body: JSON.stringify({
            name: "coordination/workflow.run",
            data: { runId, workflowId: "wf-ingress", input: {} },
          }),
        }),
      );

      expect(response.status).toBe(403);
      await expect(response.text()).resolves.toBe("forbidden");
      await expect(pathExists(timelinePath)).resolves.toBe(false);
    } finally {
      if (previousSigningKey === undefined) {
        delete process.env.INNGEST_SIGNING_KEY;
      } else {
        process.env.INNGEST_SIGNING_KEY = previousSigningKey;
      }

      if (previousSigningKeyFallback === undefined) {
        delete process.env.INNGEST_SIGNING_KEY_FALLBACK;
      } else {
        process.env.INNGEST_SIGNING_KEY_FALLBACK = previousSigningKeyFallback;
      }
    }
  });

  it("cannot be bypassed by spoofed caller-surface or auth headers", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-ingress-spoof-headers-"));
    tempDirs.push(fixtureRoot);
    const runId = "run-ingress-spoof-headers";
    const timelinePath = path.join(fixtureRoot, ".rawr", "coordination", "timelines", `${runId}.json`);

    const previousSigningKey = process.env.INNGEST_SIGNING_KEY;
    const previousSigningKeyFallback = process.env.INNGEST_SIGNING_KEY_FALLBACK;
    process.env.INNGEST_SIGNING_KEY = "signkey-test-ingress-observability";
    delete process.env.INNGEST_SIGNING_KEY_FALLBACK;

    try {
      const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
      const response = await app.handle(
        new Request("http://localhost/api/inngest", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-inngest-signature": `t=${Math.floor(Date.now() / 1000)}&s=deadbeef`,
            "x-rawr-caller-surface": "first-party",
            "x-rawr-session-auth": "verified",
            "x-rawr-service-auth": "verified",
            "x-rawr-cli-auth": "verified",
          },
          body: JSON.stringify({
            name: "coordination/workflow.run",
            data: { runId, workflowId: "wf-ingress-spoof", input: {} },
          }),
        }),
      );

      expect(response.status).toBe(403);
      await expect(response.text()).resolves.toBe("forbidden");
      await expect(pathExists(timelinePath)).resolves.toBe(false);
    } finally {
      if (previousSigningKey === undefined) {
        delete process.env.INNGEST_SIGNING_KEY;
      } else {
        process.env.INNGEST_SIGNING_KEY = previousSigningKey;
      }

      if (previousSigningKeyFallback === undefined) {
        delete process.env.INNGEST_SIGNING_KEY_FALLBACK;
      } else {
        process.env.INNGEST_SIGNING_KEY_FALLBACK = previousSigningKeyFallback;
      }
    }
  });

  it("preserves caller route-family behavior while ingress checks are enforced", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-ingress-route-family-"));
    tempDirs.push(fixtureRoot);
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
    const response = await app.handle(new Request("http://localhost/api/workflows/coordination/workflows"));

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { workflows?: unknown[] };
    expect(Array.isArray(payload.workflows)).toBe(true);
  });
});
