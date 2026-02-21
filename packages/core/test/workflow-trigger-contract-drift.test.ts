import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import { workflowTriggerContract } from "../src/orpc";
import { RunStatusSchema } from "@rawr/coordination/orpc";

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

describe("workflow trigger contract drift", () => {
  it("keeps trigger/status procedure routes scoped", () => {
    const minified = minifyContractRouter(workflowTriggerContract);
    const routes = collectProcedureRoutes(minified).sort();

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

  it("matches the minified trigger contract snapshot", () => {
    expect(minifyContractRouter(workflowTriggerContract)).toMatchSnapshot();
  });

  it("keeps D2 finalization schema available to trigger contract consumers", () => {
    const asRecord = RunStatusSchema as unknown as {
      required?: string[];
      properties?: Record<string, unknown>;
    };

    expect(asRecord.properties).toHaveProperty("finalization");
    expect(asRecord.required ?? []).not.toContain("finalization");
  });
});
