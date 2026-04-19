import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { beforeEach, describe, expect, it } from "vitest";
import { __resetSupportExampleRunStoreForTests } from "@rawr/plugin-workflows-support-example/testing";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

describe("workflow trigger/status stays published on /api/workflows while remaining available to first-party /rpc callers", () => {
  beforeEach(() => {
    __resetSupportExampleRunStoreForTests();
  });

  it("keeps workflow status available to first-party /rpc callers", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });

    const res = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/getStatus", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { json?: { capability?: string; healthy?: boolean; run?: unknown } };
    expect(payload.json?.capability).toBe("support-example");
    expect(payload.json?.healthy).toBe(true);
    expect(payload.json?.run).toBeNull();
  });

  it("does not serve workflow routes through /api/orpc/*", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });

    const statusRes = await app.handle(new Request("http://localhost/api/orpc/support-example/triage/status"));
    expect(statusRes.status).toBe(404);

    const triggerRes = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queueId: "queue-1", requestedBy: "user" }),
      }),
    );
    expect(triggerRes.status).toBe(404);
  });

  it("still serves workflow status via /api/workflows", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-workflow-openapi-"));
    try {
      const app = registerRawrRoutes(createServerApp(), { repoRoot: tempRoot, enabledPluginIds: new Set() });
      const statusRes = await app.handle(new Request("http://localhost/api/workflows/support-example/triage/status"));
      expect(statusRes.status).toBe(200);
      const statusPayload = (await statusRes.json()) as { capability?: string; healthy?: boolean; run?: unknown };
      expect(statusPayload.capability).toBe("support-example");
      expect(statusPayload.healthy).toBe(true);
      expect(statusPayload.run).toBeNull();
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
