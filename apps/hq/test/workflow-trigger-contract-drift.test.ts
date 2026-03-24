import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import {
  GetRunTimelineInputSchema,
  QueueRunInputSchema,
  RunStatusSchema,
  typeBoxStandardSchema,
} from "@rawr/coordination/orpc";
import type { JsonValue } from "@rawr/coordination";
import { workflowTriggerContract } from "../src/orpc";

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

function schemaAccepts<TSchemaInput extends Parameters<typeof typeBoxStandardSchema>[0]>(
  schema: TSchemaInput,
  value: JsonValue,
): boolean {
  return "value" in typeBoxStandardSchema(schema)["~standard"].validate(value);
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
    const runWithoutFinalization = {
      runId: "run-trigger-f2",
      workflowId: "wf-trigger-f2",
      workflowVersion: 1,
      status: "running",
      startedAt: "2026-02-22T00:00:00.000Z",
      traceLinks: [
        {
          provider: "inngest",
          label: "trigger",
          url: "https://inngest.test/runs/run-trigger-f2",
        },
      ],
    };

    expect(schemaAccepts(RunStatusSchema, runWithoutFinalization)).toBe(true);
    expect(
      schemaAccepts(RunStatusSchema, {
        ...runWithoutFinalization,
        finalization: {
          contract: {
            delivery: "at-least-once",
            exactlyOnce: false,
            sideEffectPolicy: "idempotent-non-critical",
            failureMode: "best-effort-non-blocking",
          },
        },
      }),
    ).toBe(true);
    expect(
      schemaAccepts(RunStatusSchema, {
        ...runWithoutFinalization,
        finalization: {
          contract: {
            delivery: "at-least-once",
            exactlyOnce: false,
            sideEffectPolicy: "idempotent-non-critical",
            failureMode: "best-effort-non-blocking",
          },
          finishedHook: {
            attemptedAt: "2026-02-22T00:00:00.000Z",
            outcome: "succeeded",
            nonCritical: true,
            idempotencyRequired: true,
            timeoutMs: 1500,
          },
        },
      }),
    ).toBe(true);
  });

  it("enforces F2 workflow trigger ID constraints at the contract edge", () => {
    expect(schemaAccepts(GetRunTimelineInputSchema, { runId: "run.trigger-f2" })).toBe(true);
    expect(schemaAccepts(GetRunTimelineInputSchema, { runId: " run.trigger-f2 " })).toBe(true);
    expect(schemaAccepts(GetRunTimelineInputSchema, { runId: "run/trigger-f2" })).toBe(false);

    expect(
      schemaAccepts(QueueRunInputSchema, {
        workflowId: "wf.trigger-f2",
        runId: "run.trigger-f2",
      }),
    ).toBe(true);
    expect(
      schemaAccepts(QueueRunInputSchema, {
        workflowId: "wf/trigger-f2",
      }),
    ).toBe(false);
  });
});
