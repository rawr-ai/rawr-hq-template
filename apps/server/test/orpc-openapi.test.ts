import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "../src/app";
import { generateOrpcOpenApiSpec } from "../src/orpc";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("orpc openapi", () => {
  it("generates root-router openapi paths for coordination and state", async () => {
    const spec = (await generateOrpcOpenApiSpec("http://localhost:3000")) as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };

    expect(typeof spec.openapi).toBe("string");
    expect(spec.paths).toBeDefined();
    expect(spec.paths?.["/coordination/workflows"]).toBeDefined();
    expect(spec.paths?.["/coordination/runs/{runId}"]).toBeDefined();
    expect(spec.paths?.["/state/runtime"]).toBeDefined();
  });

  it("serves openapi spec at /api/orpc/openapi.json", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/api/orpc/openapi.json"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const spec = (await res.json()) as { paths?: Record<string, unknown> };
    expect(spec.paths?.["/coordination/workflows"]).toBeDefined();
    expect(spec.paths?.["/state/runtime"]).toBeDefined();
  });
});
