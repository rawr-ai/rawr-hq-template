import { describe, expect, it } from "vitest";
import { createHqRuntimeRouter, createWorkflowTriggerRuntimeRouter } from "../src/orpc";

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
  it("keeps root runtime route families stable", () => {
    const routes = collectProcedureRoutes(createHqRuntimeRouter()).sort();

    expect(routes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.getWorkflow GET /coordination/workflows/{workflowId}",
      "coordination.listWorkflows GET /coordination/workflows",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "coordination.saveWorkflow POST /coordination/workflows",
      "coordination.validateWorkflow POST /coordination/workflows/{workflowId}/validate",
      "state.getRuntimeState GET /state/runtime",
    ]);
  });

  it("keeps workflow trigger runtime routes workflow-scoped", () => {
    const routes = collectProcedureRoutes(createWorkflowTriggerRuntimeRouter()).sort();

    expect(routes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.getWorkflow GET /coordination/workflows/{workflowId}",
      "coordination.listWorkflows GET /coordination/workflows",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "coordination.saveWorkflow POST /coordination/workflows",
      "coordination.validateWorkflow POST /coordination/workflows/{workflowId}/validate",
    ]);
  });
});
