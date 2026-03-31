import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minifyContractRouter } from "@orpc/contract";
import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerOrpcRoutes } from "../src/orpc";
import { createHostInngestBundle, PHASE_A_HOST_MOUNT_ORDER, registerRawrRoutes } from "../src/rawr";
import { createTestingHqOpsServiceClient, createTestingRawrHostSeam } from "../src/testing-host";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

type RouteShape = {
  method?: string;
  path?: string;
};

function collectProcedureRoutes(node: unknown, namespace: string[] = []): string[] {
  if (!node || typeof node !== "object") return [];
  const asRecord = node as Record<string, unknown>;
  const maybeOrpc = asRecord["~orpc"];
  if (maybeOrpc && typeof maybeOrpc === "object") {
    const route = (maybeOrpc as { route?: RouteShape }).route ?? {};
    return [`${namespace.join(".")} ${route.method ?? "UNKNOWN"} ${route.path ?? "UNKNOWN"}`];
  }

  const items: string[] = [];
  for (const [key, value] of Object.entries(asRecord)) {
    items.push(...collectProcedureRoutes(value, [...namespace, key]));
  }
  return items;
}

async function createPluginFixture(input: { dirName: string; pluginId: string }) {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-plugin-"));
  const pluginRoot = path.join(fixtureRoot, "plugins", "web", input.dirName);

  await fs.mkdir(path.join(pluginRoot, "dist"), { recursive: true });
  await fs.writeFile(path.join(pluginRoot, "package.json"), JSON.stringify({ name: input.pluginId, private: true }, null, 2), "utf8");
  await fs.writeFile(path.join(pluginRoot, "dist", "web.js"), "export function mount() { return { unmount() {} }; }", "utf8");

  return fixtureRoot;
}

describe("rawr server routes", () => {
  it("does not serve plugin web modules when disabled", async () => {
    const fixtureRoot = await createPluginFixture({ dirName: "mfe-demo", pluginId: "@rawr/plugin-mfe-demo" });
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(404);
  });

  it("serves plugin web modules when enabled", async () => {
    const fixtureRoot = await createPluginFixture({ dirName: "mfe-demo", pluginId: "@rawr/plugin-mfe-demo" });
    const app = registerRawrRoutes(createServerApp(), {
      repoRoot: fixtureRoot,
      enabledPluginIds: new Set(["@rawr/plugin-mfe-demo"]),
    });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
  });

  it("host-composition-guard: rejects unsigned ingress before runtime dispatch", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/inngest", { method: "GET", headers: { host: "localhost" } }));
    expect(res.status).toBe(403);
  });

  it("host-composition-guard: rejects invalid ingress signatures before runtime dispatch", async () => {
    const previousSigningKey = process.env.INNGEST_SIGNING_KEY;
    process.env.INNGEST_SIGNING_KEY = "signkey-test-rawr-ingress";
    try {
      const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
      const res = await app.handle(
        new Request("http://localhost/api/inngest", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-inngest-signature": `t=${Math.floor(Date.now() / 1000)}&s=deadbeef`,
          },
          body: JSON.stringify({ ping: true }),
        }),
      );
      expect(res.status).toBe(403);
    } finally {
      if (previousSigningKey === undefined) delete process.env.INNGEST_SIGNING_KEY;
      else process.env.INNGEST_SIGNING_KEY = previousSigningKey;
    }
  });

  it("host-composition-guard: host seam scaffold binds every plugin family through host-owned satisfiers", () => {
    const { boundRolePlan, realization } = createTestingRawrHostSeam();
    expect(boundRolePlan.apiPlugins).toHaveLength(2);
    expect(boundRolePlan.workflowPlugins).toHaveLength(0);
    expect(Object.keys(realization.orpc.router)).toEqual(expect.arrayContaining(["state", "exampleTodo"]));
    expect(Object.keys(realization.orpc.published.router)).toEqual(["exampleTodo"]);
    expect(Object.keys(realization.workflows.published.router)).toEqual([]);
  });

  it("host-composition-guard: keeps canonical realized procedure routes stable", () => {
    const routes = collectProcedureRoutes(minifyContractRouter(createTestingRawrHostSeam().realization.orpc.contract)).sort();
    expect(routes).toEqual([
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
      "state.getRuntimeState GET /state/runtime",
    ]);
  });

  it("host-composition-guard: keeps runtime authority stable when initialized from alias repo roots", async () => {
    const canonicalRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-alias-root-"));
    const aliasRepoRoot = `${canonicalRepoRoot}-alias`;
    await fs.symlink(canonicalRepoRoot, aliasRepoRoot);

    try {
      await createTestingHqOpsServiceClient(canonicalRepoRoot).repoState.enablePlugin(
        { pluginId: "@rawr/plugin-alias-root" },
        { context: { invocation: { traceId: "server.test.rawr.enable-plugin" } } },
      );
      const app = registerRawrRoutes(createServerApp(), { repoRoot: aliasRepoRoot, enabledPluginIds: new Set() });
      await fs.rm(aliasRepoRoot, { force: true });
      const stateResponse = await app.handle(
        new Request("http://localhost/rpc/state/getRuntimeState", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: {} }),
        }),
      );
      expect(stateResponse.status).toBe(200);
    } finally {
      await fs.rm(aliasRepoRoot, { force: true });
      await fs.rm(canonicalRepoRoot, { recursive: true, force: true });
    }
  });

  it("host-composition-guard: request scoped context factory runs per ORPC request", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-context-"));
    const hostInngest = createHostInngestBundle({ repoRoot: tempRoot });
    const requestIds: string[] = [];
    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      runtime: hostInngest.runtime,
      inngestClient: hostInngest.client,
      router: createTestingRawrHostSeam().realization.orpc.router as never,
      onContextCreated: (context) => {
        requestIds.push(context.requestId);
      },
    });

    await app.handle(
      new Request("http://localhost/rpc/state/getRuntimeState", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-a" },
        body: JSON.stringify({ json: {} }),
      }),
    );
    await app.handle(
      new Request("http://localhost/rpc/state/getRuntimeState", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-b" },
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(requestIds).toEqual(["req-a", "req-b"]);
  });

  it("host-composition-guard: enforces ingress -> workflows -> rpc/openapi mount order contract", () => {
    expect(PHASE_A_HOST_MOUNT_ORDER).toEqual(["/api/inngest", "/api/workflows/<capability>/*", "/rpc + /api/orpc/*"]);
  });
});
