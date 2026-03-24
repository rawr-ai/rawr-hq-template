import { describe, expect, it } from "vitest";
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

describe("runtime router seam", () => {
  const manifest = createTestingRawrHqManifest();

  it("keeps root runtime route families stable", () => {
    const routes = collectProcedureRoutes(manifest.orpc.router).sort();

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

  it("keeps workflow trigger runtime routes workflow-scoped", () => {
    const routes = collectProcedureRoutes(manifest.workflows.published.router).sort();

    expect(routes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "supportExample.triage.getStatus GET /support-example/triage/status",
      "supportExample.triage.triggerRun POST /support-example/triage/runs",
    ]);
  });

  it("does not introduce finished-hook route families while adding D2 guardrails", () => {
    const rootRoutes = collectProcedureRoutes(manifest.orpc.router);
    const triggerRoutes = collectProcedureRoutes(manifest.workflows.published.router);
    const allRoutes = [...rootRoutes, ...triggerRoutes];

    expect(allRoutes.some((route) => route.toLowerCase().includes("finished"))).toBe(false);
  });
});
