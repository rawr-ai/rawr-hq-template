import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

describe("orpc handlers", () => {
  it("keeps coordination on first-party /rpc and off published /api/orpc", async () => {
    const app = createApp();

    const rpcRes = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(rpcRes.status).toBe(200);
    const rpcJson = (await rpcRes.json()) as { json?: { workflows?: unknown[] } };
    expect(Array.isArray(rpcJson.json?.workflows)).toBe(true);

    const openapiRes = await app.handle(new Request("http://localhost/api/orpc/coordination/workflows"));
    expect(openapiRes.status).toBe(404);
  });

  it("serves example-todo through the published /api/orpc transport", async () => {
    const app = createApp();

    const createRes = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "external",
        },
        body: JSON.stringify({
          title: "Published example-todo proof surface",
        }),
      }),
    );

    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as { id?: string; title?: string };
    expect(createJson.id).toBeTruthy();
    expect(createJson.title).toBe("Published example-todo proof surface");
  });

  it("returns typed ORPC error payloads on RPC validation failures", async () => {
    const app = createApp();
    const res = await app.handle(
      new Request("http://localhost/rpc/coordination/getWorkflow", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { workflowId: "invalid id" } }),
      }),
    );

    expect(res.status).toBe(400);
    const payload = (await res.json()) as {
      json?: { code?: string; status?: number; message?: string };
    };
    expect(["BAD_REQUEST", "INVALID_WORKFLOW_ID"]).toContain(payload.json?.code);
    expect(payload.json?.status).toBe(400);
    expect(typeof payload.json?.message).toBe("string");
  });
});
