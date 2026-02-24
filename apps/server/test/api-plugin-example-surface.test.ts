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
  it("serves support-example procedures for first-party /rpc callers", async () => {
    const app = createApp();

    const requestResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/request", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            queueId: "queue.rpc",
            requestedBy: "user.first-party",
            source: "manual",
          },
        }),
      }),
    );

    expect(requestResponse.status).toBe(200);
    const requestPayload = (await requestResponse.json()) as {
      json?: {
        workItem?: {
          workItemId?: string;
          status?: string;
        };
      };
    };
    expect(typeof requestPayload.json?.workItem?.workItemId).toBe("string");
    expect(requestPayload.json?.workItem?.status).toBe("queued");

    const listResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/list", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      json?: {
        workItems?: unknown[];
      };
    };
    expect(Array.isArray(listPayload.json?.workItems)).toBe(true);
    expect(listPayload.json?.workItems?.length).toBeGreaterThan(0);
  });

  it("serves support-example routes for external /api/orpc/* callers", async () => {
    const app = createApp();

    const createResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/work-items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "external",
        },
        body: JSON.stringify({
          queueId: "queue.external",
          requestedBy: "user.external",
          source: "workflow",
        }),
      }),
    );

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      workItem?: {
        workItemId?: string;
      };
    };
    expect(typeof created.workItem?.workItemId).toBe("string");

    const workItemId = created.workItem?.workItemId ?? "";
    const getResponse = await app.handle(
      new Request(`http://localhost/api/orpc/support-example/triage/work-items/${workItemId}`, {
        headers: {
          "x-rawr-caller-surface": "external",
        },
      }),
    );

    expect(getResponse.status).toBe(200);
    const getPayload = (await getResponse.json()) as {
      workItem?: {
        workItemId?: string;
        queueId?: string;
      };
    };
    expect(getPayload.workItem?.workItemId).toBe(workItemId);
    expect(getPayload.workItem?.queueId).toBe("queue.external");
  });

  it("rejects caller paths on /api/inngest", async () => {
    const app = createApp();

    const firstPartyIngressResponse = await app.handle(
      new Request("http://localhost/api/inngest", {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "first-party",
          "x-rawr-session-auth": "verified",
        },
      }),
    );
    expect(firstPartyIngressResponse.status).toBe(403);

    const externalIngressResponse = await app.handle(
      new Request("http://localhost/api/inngest", {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "external",
        },
      }),
    );
    expect(externalIngressResponse.status).toBe(403);
  });

  it("returns INVALID_QUEUE_ID as a typed error over both /rpc and /api/orpc", async () => {
    const app = createApp();

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/request", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            queueId: "   ",
            requestedBy: "user.first-party",
          },
        }),
      }),
    );
    expect(rpcResponse.status).toBe(400);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("INVALID_QUEUE_ID");
    expect(rpcPayload.json?.status).toBe(400);
    expect(rpcPayload.json?.data).toMatchObject({ queueId: "   " });

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/work-items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "external",
        },
        body: JSON.stringify({
          queueId: "   ",
          requestedBy: "user.external",
        }),
      }),
    );
    expect(openApiResponse.status).toBe(400);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("INVALID_QUEUE_ID");
    expect(openApiPayload.status).toBe(400);
    expect(openApiPayload.data).toMatchObject({ queueId: "   " });
  });

  it("returns WORK_ITEM_NOT_FOUND as a typed error over both /rpc and /api/orpc", async () => {
    const app = createApp();

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/get", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            workItemId: "missing-work-item",
          },
        }),
      }),
    );
    expect(rpcResponse.status).toBe(404);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("WORK_ITEM_NOT_FOUND");
    expect(rpcPayload.json?.status).toBe(404);
    expect(rpcPayload.json?.data).toMatchObject({ workItemId: "missing-work-item" });

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/work-items/missing-work-item", {
        headers: {
          "x-rawr-caller-surface": "external",
        },
      }),
    );
    expect(openApiResponse.status).toBe(404);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("WORK_ITEM_NOT_FOUND");
    expect(openApiPayload.status).toBe(404);
    expect(openApiPayload.data).toMatchObject({ workItemId: "missing-work-item" });
  });

  it("returns INVALID_STATUS_TRANSITION as a typed error over both /rpc and /api/orpc", async () => {
    const app = createApp();

    const requestResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/request", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            queueId: "queue-invalid-transition",
            requestedBy: "user.first-party",
          },
        }),
      }),
    );
    expect(requestResponse.status).toBe(200);
    const requestPayload = (await requestResponse.json()) as {
      json?: { workItem?: { workItemId?: string } };
    };
    const workItemId = requestPayload.json?.workItem?.workItemId ?? "";
    expect(workItemId).not.toBe("");

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/items/complete", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            workItemId,
            succeeded: true,
            triagedTicketCount: 1,
          },
        }),
      }),
    );
    expect(rpcResponse.status).toBe(409);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("INVALID_STATUS_TRANSITION");
    expect(rpcPayload.json?.status).toBe(409);
    expect(rpcPayload.json?.data).toMatchObject({
      workItemId,
      from: "queued",
      to: "completed",
    });

    const openApiResponse = await app.handle(
      new Request(`http://localhost/api/orpc/support-example/triage/work-items/${workItemId}/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "external",
        },
        body: JSON.stringify({
          succeeded: true,
          triagedTicketCount: 1,
        }),
      }),
    );
    expect(openApiResponse.status).toBe(409);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("INVALID_STATUS_TRANSITION");
    expect(openApiPayload.status).toBe(409);
    expect(openApiPayload.data).toMatchObject({
      workItemId,
      from: "queued",
      to: "completed",
    });
  });
});
