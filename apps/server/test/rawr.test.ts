import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import { processCoordinationRunEvent, createCoordinationWorkflowRuntimeAdapter } from "@rawr/plugin-workflows-coordination/server";
import { createServerApp } from "../src/app";
import { createTestingRawrHostSeam } from "../src/testing-host";
import { registerOrpcRoutes } from "../src/orpc";
import { createHostInngestBundle, PHASE_A_HOST_MOUNT_ORDER, registerRawrRoutes } from "../src/rawr";
import { enablePlugin } from "@rawr/state/repo-state";
import type { Inngest } from "inngest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import type { CoordinationWorkflowV1 } from "@rawr/coordination";

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

function normalizeSemanticSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

async function readIfPresent(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function collectProcedureRoutes(node: unknown, namespace: string[] = []): string[] {
  if (!node || typeof node !== "object") return [];

  const asRecord = node as Record<string, unknown>;
  const maybeOrpc = asRecord["~orpc"];
  if (maybeOrpc && typeof maybeOrpc === "object") {
    const route = (maybeOrpc as { route?: RouteShape }).route ?? {};
    const method = route.method ?? "UNKNOWN";
    const path = route.path ?? "UNKNOWN";
    return [`${namespace.join(".")} ${method} ${path}`];
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
  await fs.writeFile(
    path.join(pluginRoot, "package.json"),
    JSON.stringify({ name: input.pluginId, private: true }, null, 2),
    "utf8",
  );
  await fs.writeFile(path.join(pluginRoot, "dist", "web.js"), "export function mount() { return { unmount() {} }; }", "utf8");

  return fixtureRoot;
}

describe("rawr server routes", () => {
  it("does not serve plugin web modules when disabled", async () => {
    const fixtureRoot = await createPluginFixture({
      dirName: "mfe-demo",
      pluginId: "@rawr/plugin-mfe-demo",
    });
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(404);
  });

  it("serves plugin web modules when enabled", async () => {
    const fixtureRoot = await createPluginFixture({
      dirName: "mfe-demo",
      pluginId: "@rawr/plugin-mfe-demo",
    });

    const enabled = new Set(["@rawr/plugin-mfe-demo"]);
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: enabled });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    const text = await res.text();
    expect(text).toContain("mount");
  });

  it("host-composition-guard: rejects unsigned ingress before runtime dispatch", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(
      new Request("http://localhost/api/inngest", { method: "GET", headers: { host: "localhost" } }),
    );
    expect(res.status).toBe(403);
  });

  it("host-composition-guard: rejects invalid ingress signatures before runtime dispatch", async () => {
    const previousSigningKey = process.env.INNGEST_SIGNING_KEY;
    const previousSigningKeyFallback = process.env.INNGEST_SIGNING_KEY_FALLBACK;
    process.env.INNGEST_SIGNING_KEY = "signkey-test-rawr-ingress";
    delete process.env.INNGEST_SIGNING_KEY_FALLBACK;

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
      await expect(res.text()).resolves.toBe("forbidden");
    } finally {
      if (previousSigningKey === undefined) {
        delete process.env.INNGEST_SIGNING_KEY;
      } else {
        process.env.INNGEST_SIGNING_KEY = previousSigningKey;
      }

      if (previousSigningKeyFallback === undefined) {
        delete process.env.INNGEST_SIGNING_KEY_FALLBACK;
      } else {
        process.env.INNGEST_SIGNING_KEY_FALLBACK = previousSigningKeyFallback;
      }
    }
  });

  it("host-composition-guard: serves both legacy and coordination Inngest functions in explicit dev mode", async () => {
    const previousInngestDev = process.env.INNGEST_DEV;
    process.env.INNGEST_DEV = "http://localhost:8288";

    try {
      const bundle = createHostInngestBundle({ repoRoot });
      expect(bundle.functions).toHaveLength(2);
    } finally {
      if (previousInngestDev === undefined) {
        delete process.env.INNGEST_DEV;
      } else {
        process.env.INNGEST_DEV = previousInngestDev;
      }
    }
  });

  it("host-composition-guard: host seam scaffold binds every plugin family through host-owned satisfiers", () => {
    const { boundRolePlan, realization } = createTestingRawrHostSeam();

    expect(boundRolePlan.apiPlugins).toHaveLength(3);
    expect(boundRolePlan.workflowPlugins).toHaveLength(2);
    expect(Object.keys(realization.orpc.router)).toEqual(
      expect.arrayContaining(["coordination", "state", "exampleTodo", "supportExample"]),
    );
    expect(Object.keys(realization.orpc.published.router)).toEqual(["exampleTodo"]);
    expect(Object.keys(realization.workflows.published.router)).toEqual(["supportExample", "coordination"]);
    expect(typeof realization.workflows.createInngestFunctions).toBe("function");
  });

  it("host-composition-guard: canonical plugin families all use declaration-plus-contribute binding on the realized host path", () => {
    const { manifest, boundRolePlan } = createTestingRawrHostSeam();
    const declarationPlugins = [
      ...Object.values(manifest.plugins.api),
      ...Object.values(manifest.plugins.workflows),
    ];

    for (const plugin of declarationPlugins) {
      expect(typeof plugin.contribute).toBe("function");
    }

    expect(boundRolePlan.apiPlugins.every((plugin) => plugin.internal?.router)).toBe(true);
    expect(boundRolePlan.workflowPlugins.every((plugin) => plugin.internal?.router)).toBe(true);
    expect(boundRolePlan.workflowPlugins.every((plugin) => typeof plugin.runtime?.createInngestFunctions === "function")).toBe(
      true,
    );
  });

  it("host-composition-guard: keeps canonical realized procedure routes stable", () => {
    const routes = collectProcedureRoutes(
      minifyContractRouter(createTestingRawrHostSeam().realization.orpc.contract),
    ).sort();

    expect(routes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.getWorkflow GET /coordination/workflows/{workflowId}",
      "coordination.listWorkflows GET /coordination/workflows",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "coordination.saveWorkflow POST /coordination/workflows",
      "coordination.validateWorkflow POST /coordination/workflows/{workflowId}/validate",
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
      "state.getRuntimeState GET /state/runtime",
      "supportExample.triage.getStatus GET /support-example/triage/status",
      "supportExample.triage.triggerRun POST /support-example/triage/runs",
    ]);
  });

  it("host-composition-guard: keeps realized published contracts scoped", () => {
    const hostSeam = createTestingRawrHostSeam().realization;

    expect(collectProcedureRoutes(minifyContractRouter(hostSeam.orpc.published.contract)).sort()).toEqual([
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
    ]);
    expect(collectProcedureRoutes(minifyContractRouter(hostSeam.workflows.published.contract)).sort()).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "supportExample.triage.getStatus GET /support-example/triage/status",
      "supportExample.triage.triggerRun POST /support-example/triage/runs",
    ]);
  });

  it("host-composition-guard: rejects spoofed /rpc auth heuristics", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });

    const spoofedRequests = [
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "first-party",
          cookie: "rawr-session=spoofed-session",
        },
        body: JSON.stringify({ json: {} }),
      }),
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "trusted-service",
          authorization: "bearer svc_spoofed-token",
        },
        body: JSON.stringify({ json: {} }),
      }),
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "cli",
          "x-rawr-service-auth": "verified",
          "user-agent": "rawr-cli/9.9.9",
        },
        body: JSON.stringify({ json: {} }),
      }),
    ];

    for (const request of spoofedRequests) {
      const response = await app.handle(request);
      expect(response.status).toBe(403);
      await expect(response.text()).resolves.toBe("forbidden");
    }
  });

  it("host-composition-guard: enforces ingress -> workflows -> rpc/openapi mount order contract", () => {
    expect(PHASE_A_HOST_MOUNT_ORDER).toEqual(["/api/inngest", "/api/workflows/<capability>/*", "/rpc + /api/orpc/*"]);
  });

  it("host-composition-guard: manifest stays composition-only and cold", async () => {
    const manifestSource = await fs.readFile(path.join(repoRoot, "apps", "hq", "src", "manifest.ts"), "utf8");
    expect(manifestSource).toContain("registerCoordinationApiPlugin");
    expect(manifestSource).toContain("registerStateApiPlugin");
    expect(manifestSource).toContain("registerExampleTodoApiPlugin");
    expect(manifestSource).toContain("registerCoordinationWorkflowPlugin");
    expect(manifestSource).toContain("registerSupportExampleWorkflowPlugin");
    expect(manifestSource).not.toContain("apps/server/src/logging");
    expect(manifestSource).not.toContain("createHqRuntimeRouter");
    expect(manifestSource).toContain("plugins: {");
    expect(manifestSource).toContain("api: apiPlugins");
    expect(manifestSource).toContain("workflows: workflowPlugins");
    expect(manifestSource).not.toContain("materializeManifestBridgeSurfaces");
    expect(manifestSource).not.toContain("createRouterClient(");
    expect(manifestSource).not.toContain("createCoordinationClient(");
    expect(manifestSource).not.toContain("createStateClient(");
    expect(manifestSource).not.toContain("createEmbeddedInMemoryDbPoolAdapter");
    expect(manifestSource).not.toContain("hostLogger");
    expect(manifestSource).not.toContain("registerOrpcRoutes");
    expect(manifestSource).not.toContain("createWorkflowRouteHarness");
    expect(manifestSource).not.toContain("new Inngest(");
    expect(manifestSource).not.toContain("createCoordinationWorkflowRuntimeAdapter");
  });

  it("host-composition-guard: host realizes workflow runtime and keeps workflow context off canonical ORPC registration", async () => {
    const rawrSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), "utf8");
    const hostSeamSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-seam.ts"), "utf8");
    const testingHostSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "testing-host.ts"), "utf8");
    const hostRealizationSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-realization.ts"), "utf8");
    const workflowRuntimeSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "workflows", "runtime.ts"), "utf8");

    expect(rawrSource).toContain('from "../../../rawr.hq"');
    expect(hostSeamSource).toContain('from "../../../rawr.hq"');
    expect(testingHostSource).toContain('from "../../../rawr.hq"');
    expect(hostSeamSource).not.toContain("@rawr/hq-app/manifest");
    expect(testingHostSource).not.toContain("@rawr/hq-app/manifest");
    expect(rawrSource).not.toContain("@rawr/plugin-api-coordination/server");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-support-example/server");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-coordination/server");
    expect(rawrSource).not.toContain("./coordination");
    expect(rawrSource).not.toContain("createCoordinationInngestFunction");
    expect(rawrSource).not.toContain("createSupportExampleInngestFunctions");
    expect(rawrSource).toContain("createRawrHostBoundRolePlan");
    expect(rawrSource).toContain("materializeRawrHostBoundRolePlan");
    expect(rawrSource).toContain('createRawrWorkflowRuntime');
    expect(rawrSource).toContain('from "./workflows/runtime"');
    expect(rawrSource).toContain("rawrHqHostSeam.workflows.createInngestFunctions");
    expect(rawrSource).toContain("new Inngest({ id: \"rawr-hq\" })");
    expect(rawrSource).toContain("serve as inngestServe");
    expect(rawrSource).not.toContain("rawrHqManifest.inngest");
    expect(rawrSource).toContain("createWorkflowRouteHarness");
    expect(rawrSource).not.toContain("resolveWorkflowCapability");
    expect(rawrSource).not.toContain("rawrHqManifest.workflows.capabilities");
    expect(rawrSource).toContain("openApiRouter: rawrHqHostSeam.orpc.published.router");
    expect(rawrSource).toContain("publishedRouter: rawrHqHostSeam.workflows.published.router");
    expect(rawrSource).toContain("contextFactory: (request, deps) => createWorkflowBoundaryContext(request, deps)");
    expect(hostRealizationSource).toContain('from "./host-surface-merge"');
    expect(hostRealizationSource).not.toContain("@rawr/hq-sdk/composition");
    expect(hostRealizationSource).toContain("mergeRawrHostSurfaceTrees");
    expect(workflowRuntimeSource).toContain("@rawr/plugin-workflows-coordination/server");
    expect(workflowRuntimeSource).toContain("resolveRawrWorkflowInngestBaseUrl");
  });

  it("host-composition-guard: proof and openapi helpers do not bypass host realization through HQ testing or manifest fixtures", async () => {
    const orpcSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "orpc.ts"), "utf8");
    const openApiScriptSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "scripts", "write-orpc-openapi.ts"),
      "utf8",
    );
    const testingHostSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "src", "testing-host.ts"),
      "utf8",
    );
    const hqTestingSource = await readIfPresent(path.join(repoRoot, "apps", "hq", "src", "testing.ts"));
    const rawrHqBridgeSource = await fs.readFile(path.join(repoRoot, "rawr.hq.ts"), "utf8");
    const proofClientSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "test", "support", "example-todo-proof-clients.ts"),
      "utf8",
    );

    expect(orpcSource).toContain("createTestingRawrHostSeam().realization.orpc.router");
    expect(orpcSource).toContain("createTestingRawrHostSeam().realization.orpc.published.router");
    expect(orpcSource).not.toContain("@rawr/hq-app/testing");
    expect(openApiScriptSource).toContain("createTestingRawrHostSeam");
    expect(openApiScriptSource).toContain("hostSeam.realization.orpc.published.router");
    expect(openApiScriptSource).not.toContain("@rawr/hq-app/testing");
    expect(testingHostSource).toContain("createRawrHostSatisfiers");
    expect(testingHostSource).toContain("createRawrHostBoundRolePlan");
    expect(testingHostSource).toContain("materializeRawrHostBoundRolePlan");
    expect(testingHostSource).not.toContain("manifest.fixtures");
    expect(hqTestingSource === null || normalizeSemanticSource(hqTestingSource) === "export{};").toBe(true);
    expect(normalizeSemanticSource(rawrHqBridgeSource)).toBe(
      'export{createRawrHqManifest,typeRawrHqManifest}from"@rawr/hq-app/manifest";',
    );
    expect(proofClientSource).not.toContain("manifest.fixtures");
    expect(proofClientSource).toContain("createTestingExampleTodoServiceClient");
  });

  it("host-composition-guard: serves capability-first workflow family paths", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/workflows/support-example/triage/status"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { capability?: string; healthy?: boolean; run?: unknown };
    expect(json.capability).toBe("support-example");
    expect(json.healthy).toBe(true);
    expect(json.run).toBeNull();
  });

  it("host-composition-guard: rejects unknown workflow capability paths", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/workflows/unknown/workflows"));
    expect(res.status).toBe(404);
  });

  it("host-composition-guard: does not leak non-workflow procedures through /api/workflows", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/workflows/state/runtime"));
    expect(res.status).toBe(404);
  });

  it("host-composition-guard: does not add a dedicated /rpc/workflows mount", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(
      new Request("http://localhost/rpc/workflows/support-example/triage/status", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("host-composition-guard: keeps workflow plugins on first-party /rpc while leaving /api/orpc unpublished", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });

    const rpcResponse = await app.handle(
      new Request("http://localhost/rpc/supportExample/triage/getStatus", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(rpcResponse.status).toBe(200);
    const rpcPayload = (await rpcResponse.json()) as { json?: { capability?: string; healthy?: boolean; run?: unknown } };
    expect(rpcPayload.json?.capability).toBe("support-example");
    expect(rpcPayload.json?.healthy).toBe(true);
    expect(rpcPayload.json?.run).toBeNull();

    const openApiResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-example/triage/status", {
        method: "GET",
      }),
    );
    expect(openApiResponse.status).toBe(404);
  });

  it("host-composition-guard: keeps runtime authority stable when initialized from alias repo roots", async () => {
    const canonicalRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-alias-root-"));
    const aliasRepoRoot = `${canonicalRepoRoot}-alias`;
    await fs.symlink(canonicalRepoRoot, aliasRepoRoot);

    try {
      await enablePlugin(canonicalRepoRoot, "@rawr/plugin-alias-root");
      const app = registerRawrRoutes(createServerApp(), {
        repoRoot: aliasRepoRoot,
        enabledPluginIds: new Set(),
      });

      await fs.rm(aliasRepoRoot, { force: true });

      const stateResponse = await app.handle(
        new Request("http://localhost/rpc/state/getRuntimeState", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: {} }),
        }),
      );
      expect(stateResponse.status).toBe(200);

      const body = (await stateResponse.json()) as {
        json?: {
          state?: {
            plugins?: {
              enabled?: string[];
            };
          };
        };
      };

      expect(body.json?.state?.plugins?.enabled).toContain("@rawr/plugin-alias-root");
    } finally {
      await fs.rm(aliasRepoRoot, { force: true });
      await fs.rm(canonicalRepoRoot, { recursive: true, force: true });
    }
  });

  it("creates, validates, runs, and returns timeline through ORPC RPC handlers", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-"));
    const runtime = createCoordinationWorkflowRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });

    const fakeInngest = {
      send: async (payload: any) => {
        const eventId = `evt-${Date.now()}`;
        const stepMemo = new Map<string, unknown>();
        await processCoordinationRunEvent({
          payload: payload.data,
          runtime,
          inngestRunId: "inngest-local-run",
          inngestEventId: eventId,
          step: {
            run: async <T,>(id: string, fn: () => Promise<T>) => {
              if (stepMemo.has(id)) {
                return stepMemo.get(id) as T;
              }
              const value = await fn();
              stepMemo.set(id, value);
              return value;
            },
          },
        });
        return { ids: [eventId] };
      },
    } as unknown as Inngest;

    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
    });

    const workflow: CoordinationWorkflowV1 = {
      workflowId: "wf-server",
      version: 1,
      name: "Server workflow",
      entryDeskId: "desk-a",
      desks: [
        {
          deskId: "desk-a",
          kind: "desk:analysis",
          name: "Desk A",
          responsibility: "Analyze",
          domain: "coord",
          inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          outputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          memoryScope: { persist: true },
        },
        {
          deskId: "desk-b",
          kind: "desk:execution",
          name: "Desk B",
          responsibility: "Execute",
          domain: "coord",
          inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
          memoryScope: { persist: false },
        },
      ],
      handoffs: [{ handoffId: "h1", fromDeskId: "desk-a", toDeskId: "desk-b" }],
    };

    const saveRes = await app.handle(
      new Request("http://localhost/rpc/coordination/saveWorkflow", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { workflow } }),
      }),
    );
    expect(saveRes.status).toBe(200);
    const saveJson = (await saveRes.json()) as { json?: { workflow?: { workflowId?: string } } };
    expect(saveJson.json?.workflow?.workflowId).toBe("wf-server");

    const validateRes = await app.handle(
      new Request("http://localhost/rpc/coordination/validateWorkflow", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { workflowId: "wf-server" } }),
      }),
    );
    expect(validateRes.status).toBe(200);
    const validateJson = (await validateRes.json()) as {
      json?: { validation?: { ok?: boolean } };
    };
    expect(validateJson.json?.validation?.ok).toBe(true);

    const runRes = await app.handle(
      new Request("http://localhost/rpc/coordination/queueRun", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { workflowId: "wf-server", input: { ticket: "T-100" } } }),
      }),
    );
    expect(runRes.status).toBe(200);
    const runJson = (await runRes.json()) as {
      json?: { run?: { runId?: string; status?: string }; eventIds?: string[] };
    };
    expect(runJson.json?.run?.status).toBe("completed");
    expect(typeof runJson.json?.run?.runId).toBe("string");

    const runId = runJson.json?.run?.runId as string;
    const statusRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunStatus", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { runId } }),
      }),
    );
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as { json?: { run?: { runId?: string } } };
    expect(statusJson.json?.run?.runId).toBe(runId);

    const timelineRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunTimeline", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { runId } }),
      }),
    );
    expect(timelineRes.status).toBe(200);
    const timelineJson = (await timelineRes.json()) as {
      json?: { timeline?: Array<{ type?: string }> };
    };
    const timeline = timelineJson.json?.timeline ?? [];
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.some((evt) => evt.type === "run.started")).toBe(true);
    expect(timeline.some((evt) => evt.type === "run.completed")).toBe(true);
  });

  it("returns ORPC-typed errors for invalid procedure requests", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-errors-"));
    const runtime = createCoordinationWorkflowRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });

    const fakeInngest = {
      send: async () => ({ ids: ["evt-test-1"] }),
    } as unknown as Inngest;

    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
    });

    const invalidWorkflowIdRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getWorkflow", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { workflowId: "invalid id" } }),
      }),
    );
    expect(invalidWorkflowIdRes.status).toBe(400);
    const invalidWorkflowIdJson = (await invalidWorkflowIdRes.json()) as {
      json?: { code?: string };
    };
    expect(["BAD_REQUEST", "INVALID_WORKFLOW_ID"]).toContain(invalidWorkflowIdJson.json?.code);

    const missingRunRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunStatus", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { runId: "run-missing" } }),
      }),
    );
    expect(missingRunRes.status).toBe(404);
    const missingRunJson = (await missingRunRes.json()) as {
      json?: { code?: string; status?: number };
    };
    expect(missingRunJson.json?.code).toBe("RUN_NOT_FOUND");
    expect(missingRunJson.json?.status).toBe(404);
  });

  it("host-composition-guard: request scoped context factory runs per ORPC request", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-context-"));
    const runtime = createCoordinationWorkflowRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });
    const fakeInngest = {
      send: async () => ({ ids: ["evt-test-1"] }),
    } as unknown as Inngest;

    const requestIds: string[] = [];
    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
      onContextCreated: (context) => {
        requestIds.push(context.requestId);
      },
    });

    const first = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-a" },
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(first.status).toBe(200);

    const second = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-b" },
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(second.status).toBe(200);

    expect(requestIds).toEqual(["req-a", "req-b"]);
  });
});
