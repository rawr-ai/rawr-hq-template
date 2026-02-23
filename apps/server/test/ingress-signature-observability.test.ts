import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerRawrRoutes, verifyInngestIngressRequest } from "../src/rawr";

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
  it("allows unsigned ingress in explicit dev mode (local Inngest Dev Server)", async () => {
    const prev = {
      INNGEST_DEV: process.env.INNGEST_DEV,
      NODE_ENV: process.env.NODE_ENV,
      INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
      INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
      INNGEST_SIGNING_KEY_FALLBACK: process.env.INNGEST_SIGNING_KEY_FALLBACK,
    };

    process.env.INNGEST_DEV = "http://localhost:8288";
    delete process.env.INNGEST_SIGNING_KEY;
    delete process.env.INNGEST_SIGNING_KEY_FALLBACK;
    delete process.env.INNGEST_EVENT_KEY;

    try {
      const ok = await verifyInngestIngressRequest(
        new Request("http://localhost/api/inngest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "support-triage/run.requested", data: {} }),
        }),
      );
      expect(ok).toBe(true);
    } finally {
      for (const [key, value] of Object.entries(prev)) {
        if (value === undefined) delete (process.env as any)[key];
        else (process.env as any)[key] = value;
      }
    }
  });

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
    const response = await app.handle(new Request("http://localhost/api/workflows/support-triage/status"));

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { capability?: string; healthy?: boolean };
    expect(payload.capability).toBe("support-triage");
    expect(payload.healthy).toBe(true);
  });
});
