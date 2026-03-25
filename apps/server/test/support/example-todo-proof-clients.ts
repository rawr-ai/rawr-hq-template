import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import { createTestingRawrHostSeam } from "../../src/testing-host";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const EXTERNAL_OPENAPI_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "external",
} as const;

type RequestHandlerApp = {
  handle(request: Request): Promise<Response>;
};
const rawrHqHostSeam = createTestingRawrHostSeam();

type ExampleTodoTask = {
  id: string;
  workspaceId: string;
  title: string;
};

type ExampleTodoRpcTaskPayload = {
  json?: ExampleTodoTask;
};

export function createExampleTodoInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export function createExampleTodoProofClients(args: {
  app: RequestHandlerApp;
  repoRoot: string;
  baseUrl?: string;
}): {
  inProcess: ExampleTodoClient;
  rpc: {
    createTask(input: { title: string; description?: string }): Promise<ExampleTodoTask>;
    getTask(input: { id: string }): Promise<ExampleTodoTask>;
  };
  openapi: {
    createTask(input: { title: string; description?: string }): Promise<ExampleTodoTask>;
    getTask(input: { id: string }): Promise<ExampleTodoTask>;
  };
} {
  const baseUrl = args.baseUrl ?? "http://localhost:3000";

  return {
    inProcess: rawrHqHostSeam.manifest.fixtures.exampleTodo.resolveClient(args.repoRoot),
    rpc: {
      async createTask(input) {
        const response = await args.app.handle(
          new Request(`${baseUrl}/rpc/exampleTodo/tasks/create`, {
            method: "POST",
            headers: FIRST_PARTY_RPC_HEADERS,
            body: JSON.stringify({ json: input }),
          }),
        );

        return ((await response.json()) as ExampleTodoRpcTaskPayload).json as ExampleTodoTask;
      },
      async getTask(input) {
        const response = await args.app.handle(
          new Request(`${baseUrl}/rpc/exampleTodo/tasks/get`, {
            method: "POST",
            headers: FIRST_PARTY_RPC_HEADERS,
            body: JSON.stringify({ json: input }),
          }),
        );

        return ((await response.json()) as ExampleTodoRpcTaskPayload).json as ExampleTodoTask;
      },
    },
    openapi: {
      async createTask(input) {
        const response = await args.app.handle(
          new Request(`${baseUrl}/api/orpc/exampleTodo/tasks/create`, {
            method: "POST",
            headers: EXTERNAL_OPENAPI_HEADERS,
            body: JSON.stringify(input),
          }),
        );

        return (await response.json()) as ExampleTodoTask;
      },
      async getTask(input) {
        const response = await args.app.handle(
          new Request(`${baseUrl}/api/orpc/exampleTodo/tasks/${input.id}`, {
            method: "GET",
            headers: EXTERNAL_OPENAPI_HEADERS,
          }),
        );

        return (await response.json()) as ExampleTodoTask;
      },
    },
  };
}
