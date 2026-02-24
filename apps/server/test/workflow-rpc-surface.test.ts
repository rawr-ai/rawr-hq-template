import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { beforeEach, describe, expect, it } from "vitest";
import type { Inngest } from "inngest";

import { rawrHqManifest } from "../../../rawr.hq";
import { __resetSupportExampleRunStoreForTests } from "../../../plugins/workflows/support-example";

import { createServerApp } from "../src/app";
import { createCoordinationRuntimeAdapter } from "../src/coordination";
import { registerOrpcRoutes } from "../src/orpc";
import { registerRawrRoutes } from "../src/rawr";
import { createRequestScopedBoundaryContext } from "../src/workflows/context";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

describe("workflow trigger/status over /rpc (without OpenAPI leakage)", () => {
  beforeEach(() => {
    __resetSupportExampleRunStoreForTests();
  });

  it("serves workflow status via /rpc using the workflow trigger router (host mount)", async () => {
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

  it("does not serve workflow OpenAPI routes through /api/orpc/*", async () => {
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

  it("serves workflow trigger via /rpc with request auth applied (registerOrpcRoutes)", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-workflow-rpc-"));
    try {
      const runtime = createCoordinationRuntimeAdapter({
        repoRoot: tempRoot,
        inngestBaseUrl: "http://localhost:8288",
      });

      const fakeInngest = {
        send: async () => ({ ids: ["evt-support-example-1"] }),
      } as unknown as Inngest;

      const app = registerOrpcRoutes(createServerApp(), {
        repoRoot: tempRoot,
        baseUrl: "http://localhost:3000",
        runtime,
        inngestClient: fakeInngest,
        router: rawrHqManifest.orpc.router,
        workflowTriggerRouter: rawrHqManifest.workflows.triggerRouter,
        contextFactory: (request, deps) => rawrHqManifest.orpc.enrichContext(createRequestScopedBoundaryContext(request, deps)),
      });

      const triggerRes = await app.handle(
        new Request("http://localhost/rpc/supportExample/triage/triggerRun", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({
            json: {
              queueId: "queue-1",
              requestedBy: "user.first-party",
              dryRun: true,
            },
          }),
        }),
      );

      expect(triggerRes.status).toBe(200);
      const triggerPayload = (await triggerRes.json()) as {
        json?: { accepted?: boolean; eventIds?: string[]; run?: { runId?: string; workItemId?: string; status?: string } };
      };
      expect(triggerPayload.json?.accepted).toBe(true);
      expect(triggerPayload.json?.eventIds).toEqual(["evt-support-example-1"]);
      expect(typeof triggerPayload.json?.run?.runId).toBe("string");
      expect(typeof triggerPayload.json?.run?.workItemId).toBe("string");
      expect(triggerPayload.json?.run?.status).toBe("queued");

      const runId = triggerPayload.json?.run?.runId ?? "";
      const statusRes = await app.handle(
        new Request("http://localhost/rpc/supportExample/triage/getStatus", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: { runId } }),
        }),
      );
      expect(statusRes.status).toBe(200);
      const statusPayload = (await statusRes.json()) as { json?: { run?: { runId?: string } } };
      expect(statusPayload.json?.run?.runId).toBe(runId);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
