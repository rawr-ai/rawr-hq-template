import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";
import {
  createExampleTodoInvocation,
  createExampleTodoProofClients,
} from "./support/example-todo-proof-clients";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

describe("example-todo proof clients", () => {
  it("keeps one capability available through in-process, rpc, and openapi proof paths", async () => {
    const app = createApp();
    const { inProcess, rpc, openapi } = createExampleTodoProofClients({
      app,
      repoRoot,
      baseUrl: "http://localhost:3000",
    });

    const directTask = await inProcess.tasks.create(
      {
        title: "In-process proof path",
      },
      createExampleTodoInvocation("trace-in-process"),
    );

    const rpcTask = await rpc.createTask({
      title: "RPC proof path",
    });

    const openapiTask = await openapi.createTask({
      title: "OpenAPI proof path",
    });

    const rpcLoaded = await rpc.getTask({ id: openapiTask.id });
    const openapiLoaded = await openapi.getTask({ id: rpcTask.id });

    expect(directTask.workspaceId).toBe("workspace-default");
    expect(rpcTask.workspaceId).toBe("workspace-default");
    expect(openapiTask.workspaceId).toBe("workspace-default");
    expect(rpcLoaded.id).toBe(openapiTask.id);
    expect(rpcLoaded.title).toBe("OpenAPI proof path");
    expect(openapiLoaded.id).toBe(rpcTask.id);
    expect(openapiLoaded.title).toBe("RPC proof path");
  });
});
