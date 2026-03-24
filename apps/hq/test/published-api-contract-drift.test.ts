import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import { createTestingRawrHqManifest } from "../src/testing";

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

describe("published api contract drift", () => {
  const manifest = createTestingRawrHqManifest();

  it("keeps published api procedure routes scoped to explicit published capabilities", () => {
    const minified = minifyContractRouter(manifest.orpc.published.contract);
    const routes = collectProcedureRoutes(minified).sort();

    expect(routes).toEqual([
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
    ]);
  });

  it("matches the minified published api contract snapshot", () => {
    expect(minifyContractRouter(manifest.orpc.published.contract)).toMatchSnapshot();
  });
});
