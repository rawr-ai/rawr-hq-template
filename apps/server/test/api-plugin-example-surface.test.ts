import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const EXTERNAL_API_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "external",
} as const;

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

type RpcErrorPayload = {
  json?: {
    defined?: boolean;
    code?: string;
    status?: number;
    data?: Record<string, unknown>;
  };
};

type OpenApiErrorPayload = {
  defined?: boolean;
  code?: string;
  status?: number;
  data?: Record<string, unknown>;
};

describe("api plugin example surface", () => {
  it("does not expose legacy support-example procedures on canonical /rpc or /api/orpc paths", async () => {
    const app = createApp();

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/getStatus", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(rpcResponse.status).toBe(404);

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/status", {
        method: "GET",
        headers: EXTERNAL_API_HEADERS,
      }),
    );
    expect(openApiResponse.status).toBe(404);
  });

  it("serves example-todo procedures for first-party /rpc callers", async () => {
    const app = createApp();

    const createResponse = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            title: "Ship example-todo API cutover",
            description: "Keep host-owned boundary construction",
          },
        }),
      }),
    );

    expect(createResponse.status).toBe(200);
    const createdPayload = (await createResponse.json()) as {
      json?: {
        id?: string;
        workspaceId?: string;
        title?: string;
      };
    };
    const taskId = createdPayload.json?.id ?? "";
    expect(taskId).not.toBe("");
    expect(createdPayload.json?.workspaceId).toBe("workspace-default");
    expect(createdPayload.json?.title).toBe("Ship example-todo API cutover");

    const getResponse = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            id: taskId,
          },
        }),
      }),
    );

    expect(getResponse.status).toBe(200);
    const getPayload = (await getResponse.json()) as {
      json?: {
        id?: string;
        workspaceId?: string;
        title?: string;
      };
    };
    expect(getPayload.json?.id).toBe(taskId);
    expect(getPayload.json?.workspaceId).toBe("workspace-default");
    expect(getPayload.json?.title).toBe("Ship example-todo API cutover");
  });

  it("serves example-todo procedures for external /api/orpc callers", async () => {
    const app = createApp();

    const createResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          title: "External example-todo path",
          description: "Exercise the caller-facing proof surface",
        }),
      }),
    );

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      id?: string;
      workspaceId?: string;
      title?: string;
    };
    const taskId = created.id ?? "";
    expect(taskId).not.toBe("");
    expect(created.workspaceId).toBe("workspace-default");
    expect(created.title).toBe("External example-todo path");

    const getResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          id: taskId,
        }),
      }),
    );

    expect(getResponse.status).toBe(200);
    const loaded = (await getResponse.json()) as {
      id?: string;
      workspaceId?: string;
      title?: string;
    };
    expect(loaded.id).toBe(taskId);
    expect(loaded.workspaceId).toBe("workspace-default");
    expect(loaded.title).toBe("External example-todo path");
  });

  it("returns INVALID_TASK_TITLE as a typed error over both /rpc and /api/orpc", async () => {
    const app = createApp();

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            title: "   ",
          },
        }),
      }),
    );
    expect(rpcResponse.status).toBe(400);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("INVALID_TASK_TITLE");
    expect(rpcPayload.json?.status).toBe(400);
    expect(rpcPayload.json?.data).toMatchObject({ title: "   " });

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          title: "   ",
        }),
      }),
    );
    expect(openApiResponse.status).toBe(400);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("INVALID_TASK_TITLE");
    expect(openApiPayload.status).toBe(400);
    expect(openApiPayload.data).toMatchObject({ title: "   " });
  });

  it("returns RESOURCE_NOT_FOUND as a typed error over both /rpc and /api/orpc", async () => {
    const app = createApp();
    const missingId = "00000000-0000-0000-0000-000000000001";

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            id: missingId,
          },
        }),
      }),
    );
    expect(rpcResponse.status).toBe(404);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("RESOURCE_NOT_FOUND");
    expect(rpcPayload.json?.status).toBe(404);
    expect(rpcPayload.json?.data).toMatchObject({ entity: "Task", id: missingId });

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          id: missingId,
        }),
      }),
    );
    expect(openApiResponse.status).toBe(404);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("RESOURCE_NOT_FOUND");
    expect(openApiPayload.status).toBe(404);
    expect(openApiPayload.data).toMatchObject({ entity: "Task", id: missingId });
  });
});
