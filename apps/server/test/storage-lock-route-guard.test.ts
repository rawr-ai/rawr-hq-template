import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { enablePlugin } from "@rawr/state";
import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;
const CONTENTION_ROUTE_GUARD_TIMEOUT_MS = 20_000;

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("storage-lock route guard regression", () => {
  it("keeps workflow route-family guard behavior intact after contention-heavy state writes", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-storage-lock-"));
    tempDirs.push(repoRoot);

    const pluginIds = Array.from({ length: 24 }, (_, idx) => `@rawr/plugin-route-${idx}`);
    await Promise.all(pluginIds.map((pluginId) => enablePlugin(repoRoot, pluginId)));

    const app = registerRawrRoutes(createServerApp(), {
      repoRoot,
      enabledPluginIds: new Set(pluginIds),
    });

    const workflowLeak = await app.handle(new Request("http://localhost/api/workflows/state/runtime"));
    expect(workflowLeak.status).toBe(404);

    const rpcRes = await app.handle(
      new Request("http://localhost/rpc/state/getRuntimeState", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(rpcRes.status).toBe(200);
    const payload = (await rpcRes.json()) as {
      json?: {
        state?: {
          plugins?: {
            enabled?: string[];
          };
        };
      };
    };

    expect(payload.json?.state?.plugins?.enabled).toEqual([...pluginIds].sort());
  }, CONTENTION_ROUTE_GUARD_TIMEOUT_MS);
});
