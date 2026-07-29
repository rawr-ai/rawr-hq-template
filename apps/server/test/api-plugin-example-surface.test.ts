import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import type { TSchema } from "typebox";
import { Validator } from "typebox/schema";
import { describe, expect, it } from "vitest";

import { contract, createClient } from "../../../plugins/server/api/example-todo/src/client";
import { createServerApp } from "../src/app";
import { generateOrpcOpenApiSpec } from "../src/orpc";
import { registerRawrRoutes } from "../src/rawr";
import { createTestingRawrHostSeam } from "../src/testing-host";

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
    baseUrl: "http://localhost:3000",
    hostComposition: createTestingRawrHostSeam(),
  });
}

type RpcErrorPayload = {
  json?: {
    defined?: boolean;
    inferable?: boolean;
    code?: string;
    message?: string;
    data?: Record<string, unknown>;
  };
};

type OpenApiErrorPayload = {
  defined?: boolean;
  inferable?: boolean;
  code?: string;
  message?: string;
  data?: Record<string, unknown>;
};

async function openApiErrorSchema(args: {
  path: string;
  method: "get" | "post";
  status: number;
}): Promise<TSchema> {
  const spec = (await generateOrpcOpenApiSpec("http://localhost:3000")) as {
    paths?: Record<
      string,
      Partial<
        Record<
          "get" | "post",
          {
            responses?: Record<string, { content?: { "application/json"?: { schema?: TSchema } } }>;
          }
        >
      >
    >;
  };
  const schema =
    spec.paths?.[args.path]?.[args.method]?.responses?.[String(args.status)]?.content?.[
      "application/json"
    ]?.schema;
  if (!schema) {
    throw new Error(`missing OpenAPI error schema: ${args.method} ${args.path} ${args.status}`);
  }
  return schema;
}

type RpcClient = RouterContractClient<typeof contract, Record<never, never>>;

function createRpcClient(app: ReturnType<typeof createApp>): RpcClient {
  const link = new RPCLink<Record<never, never>>({
    origin: "http://localhost",
    url: "/rpc",
    headers: FIRST_PARTY_RPC_HEADERS,
    fetch: (input, init) => app.handle(new Request(input, init)),
  });
  return createORPCClient<RpcClient>(link);
}

async function captureClientError(operation: Promise<unknown>) {
  try {
    await operation;
  } catch (error) {
    return error as { defined?: boolean; inferable?: boolean; code?: string };
  }
  throw new Error("expected client operation to fail");
}

describe("api plugin example surface", () => {
  it("keeps the checked-in OpenAPI document aligned with the published router", async () => {
    const checkedIn = JSON.parse(
      await readFile(path.join(repoRoot, "apps/server/openapi/orpc-openapi.json"), "utf8")
    ) as unknown;

    expect(checkedIn).toEqual(await generateOrpcOpenApiSpec("http://localhost:3000"));
  });

  it("exposes a caller client for the external API boundary", async () => {
    const app = createApp();
    const client = createClient({
      origin: "http://localhost",
      url: "/api/orpc",
      headers: {
        "x-rawr-caller-surface": "external",
      },
      fetch: (input, init) => app.handle(new Request(input, init)),
    });

    const created = await client.exampleTodo.tasks.create({
      title: "Call through the public API client",
      description: "Prove the client face and host transport together",
    });
    const loaded = await client.exampleTodo.tasks.get({ id: created.id });

    expect(loaded).toMatchObject({
      id: created.id,
      workspaceId: "workspace-default",
      title: "Call through the public API client",
    });
  });

  it("serves example-todo operations for first-party /rpc callers", async () => {
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
      })
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
      })
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

  it("serves example-todo operations for external /api/orpc callers", async () => {
    const app = createApp();

    const createResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          title: "External example-todo path",
          description: "Exercise the caller-facing proof surface",
        }),
      })
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
      new Request(`http://localhost/api/orpc/exampleTodo/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "external",
        },
      })
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
    const rpcClient = createRpcClient(app);
    const openApiClient = createClient({
      origin: "http://localhost",
      url: "/api/orpc",
      headers: {
        "x-rawr-caller-surface": "external",
      },
      fetch: (input, init) => app.handle(new Request(input, init)),
    });

    const [rpcClientError, openApiClientError] = await Promise.all([
      captureClientError(rpcClient.exampleTodo.tasks.create({ title: "   " })),
      captureClientError(openApiClient.exampleTodo.tasks.create({ title: "   " })),
    ]);
    expect(rpcClientError).toMatchObject({
      defined: true,
      inferable: true,
      code: "INVALID_TASK_TITLE",
    });
    expect(openApiClientError).toMatchObject({
      defined: true,
      inferable: true,
      code: "INVALID_TASK_TITLE",
    });
    expect(rpcClientError.code).not.toBe("MALFORMED_ORPC_ERROR_RESPONSE");
    expect(openApiClientError.code).not.toBe("MALFORMED_ORPC_ERROR_RESPONSE");

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            title: "   ",
          },
        }),
      })
    );
    expect(rpcResponse.status).toBe(400);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.inferable).toBe(true);
    expect(rpcPayload.json?.code).toBe("INVALID_TASK_TITLE");
    expect(rpcPayload.json).not.toHaveProperty("status");
    expect(rpcPayload.json?.data).toMatchObject({ title: "   " });

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({
          title: "   ",
        }),
      })
    );
    expect(openApiResponse.status).toBe(400);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.inferable).toBe(true);
    expect(openApiPayload.code).toBe("INVALID_TASK_TITLE");
    expect(openApiPayload).not.toHaveProperty("status");
    expect(openApiPayload.data).toMatchObject({ title: "   " });
    expect(
      new Validator(
        {},
        await openApiErrorSchema({
          path: "/exampleTodo/tasks/create",
          method: "post",
          status: 400,
        })
      ).Check(openApiPayload)
    ).toBe(true);
  });

  it("keeps undefined validation errors aligned with the documented OpenAPI body", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: EXTERNAL_API_HEADERS,
        body: JSON.stringify({ title: 123 }),
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as OpenApiErrorPayload;
    expect(payload).toMatchObject({
      defined: false,
      inferable: false,
      code: "BAD_REQUEST",
    });
    expect(payload).not.toHaveProperty("status");
    expect(
      new Validator(
        {},
        await openApiErrorSchema({
          path: "/exampleTodo/tasks/create",
          method: "post",
          status: 400,
        })
      ).Check(payload)
    ).toBe(true);
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
      })
    );
    expect(rpcResponse.status).toBe(404);
    const rpcPayload = (await rpcResponse.json()) as RpcErrorPayload;
    expect(rpcPayload.json?.defined).toBe(true);
    expect(rpcPayload.json?.code).toBe("RESOURCE_NOT_FOUND");
    expect(rpcPayload.json).not.toHaveProperty("status");
    expect(rpcPayload.json?.data).toMatchObject({ entity: "Task", id: missingId });

    const openApiResponse = await app.handle(
      new Request(`http://localhost/api/orpc/exampleTodo/tasks/${missingId}`, {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "external",
        },
      })
    );
    expect(openApiResponse.status).toBe(404);
    const openApiPayload = (await openApiResponse.json()) as OpenApiErrorPayload;
    expect(openApiPayload.defined).toBe(true);
    expect(openApiPayload.code).toBe("RESOURCE_NOT_FOUND");
    expect(openApiPayload).not.toHaveProperty("status");
    expect(openApiPayload.data).toMatchObject({ entity: "Task", id: missingId });
  });
});
