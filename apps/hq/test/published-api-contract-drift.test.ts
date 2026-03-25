import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import { mergeDeclaredSurfaceTrees } from "@rawr/hq-sdk/composition";
import { createRawrHqManifest } from "../src/manifest";

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
  const manifest = createRawrHqManifest();
  const publishedApiContract = mergeDeclaredSurfaceTrees([
    manifest.plugins.api.exampleTodo.declaration!.published!.contract,
  ]);

  it("keeps published api procedure routes scoped to explicit published capabilities", () => {
    const minified = minifyContractRouter(publishedApiContract);
    const routes = collectProcedureRoutes(minified).sort();

    expect(routes).toEqual([
      "exampleTodo.tasks.create POST /exampleTodo/tasks/create",
      "exampleTodo.tasks.get GET /exampleTodo/tasks/{id}",
    ]);
  });

  it("matches the minified published api contract snapshot", () => {
    expect(minifyContractRouter(publishedApiContract)).toMatchSnapshot();
  });
});
