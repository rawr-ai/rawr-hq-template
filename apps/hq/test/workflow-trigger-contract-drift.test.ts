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

describe("workflow trigger contract drift", () => {
  const manifest = createRawrHqManifest();
  const publishedWorkflowContract = mergeDeclaredSurfaceTrees([
    manifest.plugins.workflows.supportExample.declaration!.published!.contract,
    manifest.plugins.workflows.coordination.declaration!.published!.contract,
  ]);

  it("keeps trigger/status procedure routes scoped", () => {
    const minified = minifyContractRouter(publishedWorkflowContract);
    const routes = collectProcedureRoutes(minified).sort();

    expect(routes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
      "supportExample.triage.getStatus GET /support-example/triage/status",
      "supportExample.triage.triggerRun POST /support-example/triage/runs",
    ]);
  });

  it("matches the minified trigger contract snapshot", () => {
    expect(minifyContractRouter(publishedWorkflowContract)).toMatchSnapshot();
  });

  it("keeps workflow trigger/status surfaces bound to workflow capability paths", () => {
    const minified = minifyContractRouter(publishedWorkflowContract);
    const routes = collectProcedureRoutes(minified);

    const coordinationRoutes = routes
      .filter((route) => route.includes("coordination."))
      .sort();
    const supportExampleRoutes = routes
      .filter((route) => route.includes("supportExample."))
      .sort();

    expect(coordinationRoutes).toEqual([
      "coordination.getRunStatus GET /coordination/runs/{runId}",
      "coordination.getRunTimeline GET /coordination/runs/{runId}/timeline",
      "coordination.queueRun POST /coordination/workflows/{workflowId}/run",
    ]);
    expect(supportExampleRoutes).toEqual([
      "supportExample.triage.getStatus GET /support-example/triage/status",
      "supportExample.triage.triggerRun POST /support-example/triage/runs",
    ]);
    expect(routes.some((route) => route.toLowerCase().includes("finished"))).toBe(false);
  });
});
