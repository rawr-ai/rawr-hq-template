import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minifyContractRouter } from "@orpc/contract";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServerApp } from "../src/app";
import { registerOrpcRoutes } from "../src/orpc";
import { createHostInngestBundle, PHASE_A_HOST_MOUNT_ORDER, registerRawrRoutes } from "../src/rawr";
import { createTestingRawrHostSeam, resetTestingRawrHostSeam } from "../src/testing-host";

afterAll(() => resetTestingRawrHostSeam());

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

describe("rawr server routes", () => {
  it("does not expose retired web modules or an interim composition endpoint", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot });
    const retiredWeb = await app.handle(new Request("http://localhost/rawr/plugins/web/fixture-web"));
    const interimComposition = await app.handle(new Request("http://localhost/rawr/composition"));

    expect(retiredWeb.status).toBe(404);
    expect(interimComposition.status).toBe(404);
  });

  it("ignores stale persisted enablement without migrating or deleting it", async () => {
    const tempRoot = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "rawr-stale-membership-")),
    );
    const stateDirectory = path.join(tempRoot, ".rawr", "state");
    const statePath = path.join(stateDirectory, "state.json");
    const pluginRoot = path.join(tempRoot, "plugins", "web", "foreign-web");
    const pluginPackagePath = path.join(pluginRoot, "package.json");
    const pluginModulePath = path.join(pluginRoot, "dist", "web.js");
    const staleBytes = '{"plugins":{"enabled":["foreign-web"]}}\n';
    await fs.mkdir(stateDirectory, { recursive: true });
    await fs.mkdir(path.dirname(pluginModulePath), { recursive: true });
    await fs.writeFile(statePath, staleBytes);
    await fs.writeFile(pluginPackagePath, '{"name":"foreign-web","rawr":{"kind":"web"}}\n');
    await fs.writeFile(pluginModulePath, 'export function mount() { throw new Error("must not mount"); }\n');
    const before = await Promise.all([
      fs.readFile(statePath),
      fs.readFile(pluginPackagePath),
      fs.readFile(pluginModulePath),
    ]);
    try {
      const originalReadFile = fs.readFile;
      let staleStateReadCount = 0;
      const readFileSpy = vi.spyOn(fs, "readFile");
      readFileSpy.mockImplementation(((...args: Parameters<typeof fs.readFile>) => {
        if (canonicalPathLike(args[0]) === statePath) staleStateReadCount += 1;
        return Reflect.apply(originalReadFile, fs, args);
      }) as typeof fs.readFile);

      const response = await (async () => {
        try {
          const app = registerRawrRoutes(createServerApp(), { repoRoot: tempRoot });
          return await app.handle(new Request("http://localhost/rawr/plugins/web/foreign-web"));
        } finally {
          readFileSpy.mockRestore();
        }
      })();

      expect(response.status).toBe(404);
      expect(staleStateReadCount).toBe(0);
      const after = await Promise.all([
        fs.readFile(statePath),
        fs.readFile(pluginPackagePath),
        fs.readFile(pluginModulePath),
      ]);
      expect(after).toEqual(before);
    } finally {
      await removeOwnedStaleMembershipFixture(tempRoot);
    }
  });

  it("no-legacy-composition-authority: rejects unsigned ingress before runtime dispatch", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot });
    const res = await app.handle(new Request("http://localhost/api/inngest", { method: "GET", headers: { host: "localhost" } }));
    expect(res.status).toBe(403);
  });

  it("no-legacy-composition-authority: rejects invalid ingress signatures before runtime dispatch", async () => {
    const previousSigningKey = process.env.INNGEST_SIGNING_KEY;
    process.env.INNGEST_SIGNING_KEY = "signkey-test-rawr-ingress";
    try {
      const app = registerRawrRoutes(createServerApp(), { repoRoot });
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

  it("no-legacy-composition-authority: host seam binds every selected plugin through host-owned satisfiers", () => {
    const { boundRolePlan, realization } = createTestingRawrHostSeam();
    expect(boundRolePlan.apiPlugins).toHaveLength(1);
    expect(boundRolePlan.workflowPlugins).toHaveLength(0);
    expect(Object.keys(realization.orpc.router)).toEqual(["exampleTodo"]);
    expect(Object.keys(realization.orpc.published.router)).toEqual(["exampleTodo"]);
    expect(Object.keys(realization.workflows.published.router)).toEqual([]);
  });

  it("no-legacy-composition-authority: keeps canonical realized procedure routes stable", () => {
    const routes = collectProcedureRoutes(minifyContractRouter(createTestingRawrHostSeam().realization.orpc.contract)).sort();
    expect(routes).toEqual([
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
    ]);
  });

  it("no-legacy-composition-authority: request scoped context factory runs per ORPC request", async () => {
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
      new Request("http://localhost/rpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-a" },
        body: JSON.stringify({ json: { id: "task-a" } }),
      }),
    );
    await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: { ...FIRST_PARTY_RPC_HEADERS, "x-request-id": "req-b" },
        body: JSON.stringify({ json: { id: "task-b" } }),
      }),
    );

    expect(requestIds).toEqual(["req-a", "req-b"]);
  });

  it("no-legacy-composition-authority: enforces ingress -> workflows -> rpc/openapi mount order contract", () => {
    expect(PHASE_A_HOST_MOUNT_ORDER).toEqual(["/api/inngest", "/api/workflows/<capability>/*", "/rpc + /api/orpc/*"]);
  });
});

function canonicalPathLike(value: Parameters<typeof fs.readFile>[0]): string | null {
  if (typeof value === "string") return path.resolve(value);
  if (Buffer.isBuffer(value)) return path.resolve(value.toString());
  if (value instanceof URL && value.protocol === "file:") return path.resolve(fileURLToPath(value));
  return null;
}

async function removeOwnedStaleMembershipFixture(root: string): Promise<void> {
  const expectedParent = await fs.realpath(os.tmpdir());
  const actualParent = await fs.realpath(path.dirname(root));
  const stat = await fs.lstat(root);
  const canonicalRoot = await fs.realpath(root);
  if (
    actualParent !== expectedParent
    || canonicalRoot !== root
    || !path.basename(root).startsWith("rawr-stale-membership-")
    || !stat.isDirectory()
    || stat.isSymbolicLink()
  ) {
    throw new Error("Refusing cleanup outside an owned stale-membership fixture root");
  }
  await removeDirectoryContents(root);
  await fs.rmdir(root);
}

async function removeDirectoryContents(directory: string): Promise<void> {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      await removeDirectoryContents(target);
      await fs.rmdir(target);
    } else {
      await fs.unlink(target);
    }
  }
}
