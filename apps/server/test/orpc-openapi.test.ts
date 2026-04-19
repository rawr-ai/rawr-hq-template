import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "../src/app";
import { generateOrpcOpenApiSpec } from "../src/orpc";
import { registerRawrRoutes } from "../src/rawr";
import { createTestingRawrHostSeam } from "../src/testing-host";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rawrHqHostSeam = createTestingRawrHostSeam();

describe("orpc openapi", () => {
  it("generates published openapi paths only for the public example-todo surface", async () => {
    const spec = (await generateOrpcOpenApiSpec("http://localhost:3000", rawrHqHostSeam.realization.orpc.published.router)) as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };

    expect(typeof spec.openapi).toBe("string");
    expect(spec.paths).toBeDefined();
    expect(spec.paths?.["/exampleTodo/tasks/create"]).toBeDefined();
    expect(spec.paths?.["/exampleTodo/tasks/{id}"]).toBeDefined();
    expect(spec.paths?.["/state/runtime"]).toBeUndefined();
  });

  it("serves openapi spec at /api/orpc/openapi.json", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/orpc/openapi.json"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const spec = (await res.json()) as { paths?: Record<string, unknown> };
    expect(spec.paths?.["/exampleTodo/tasks/create"]).toBeDefined();
    expect(spec.paths?.["/exampleTodo/tasks/{id}"]).toBeDefined();
    expect(spec.paths?.["/state/runtime"]).toBeUndefined();
  });
});
