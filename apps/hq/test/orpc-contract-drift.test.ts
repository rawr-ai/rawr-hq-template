import { describe, expect, it } from "vitest";
import { minifyContractRouter } from "@orpc/contract";
import {
  GetRunStatusInputSchema,
  GetWorkflowInputSchema,
  QueueRunInputSchema,
  RunStatusSchema,
  typeBoxStandardSchema,
} from "@rawr/coordination/orpc";
import type { JsonValue } from "@rawr/coordination";
import { GetRuntimeStateOutputSchema } from "@rawr/state/orpc";
import { hqContract } from "../src/orpc";

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

describe("hq orpc contract drift", () => {
  it("keeps canonical procedure routes stable", () => {
    const minified = minifyContractRouter(hqContract);
    const routes = collectProcedureRoutes(minified).sort();

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

  it("matches the minified contract snapshot", () => {
    expect(minifyContractRouter(hqContract)).toMatchSnapshot();
  });

  it("keeps D2 finalization semantics additive in run status schema", () => {
    const baseRunStatus = {
      runId: "run-f2-policy",
      workflowId: "wf-f2-policy",
      workflowVersion: 1,
      status: "queued",
      startedAt: "2026-02-22T00:00:00.000Z",
      traceLinks: [
        {
          provider: "rawr",
          label: "run",
          url: "https://rawr.test/runs/run-f2-policy",
        },
      ],
    };

    expect(schemaAccepts(RunStatusSchema, baseRunStatus)).toBe(true);
    expect(
      schemaAccepts(RunStatusSchema, {
        ...baseRunStatus,
        finalization: {
          contract: {
            delivery: "at-least-once",
            exactlyOnce: false,
            sideEffectPolicy: "idempotent-non-critical",
            failureMode: "best-effort-non-blocking",
          },
          finishedHook: {
            attemptedAt: "2026-02-22T00:00:00.000Z",
            outcome: "skipped",
            nonCritical: true,
            idempotencyRequired: true,
            timeoutMs: 1000,
          },
        },
      }),
    ).toBe(true);
    expect(
      schemaAccepts(RunStatusSchema, {
        ...baseRunStatus,
        finalization: {
          contract: {
            delivery: "at-least-once",
            exactlyOnce: true,
            sideEffectPolicy: "idempotent-non-critical",
            failureMode: "best-effort-non-blocking",
          },
        },
      }),
    ).toBe(false);
  });

  it("keeps F2 ID input policy aligned with runtime normalization rules", () => {
    expect(schemaAccepts(GetWorkflowInputSchema, { workflowId: "wf.alpha-1" })).toBe(true);
    expect(schemaAccepts(GetWorkflowInputSchema, { workflowId: "  wf.alpha-1  " })).toBe(true);
    expect(schemaAccepts(GetWorkflowInputSchema, { workflowId: "../wf.alpha-1" })).toBe(false);

    expect(schemaAccepts(GetRunStatusInputSchema, { runId: "run.alpha-1" })).toBe(true);
    expect(schemaAccepts(GetRunStatusInputSchema, { runId: "run/alpha-1" })).toBe(false);

    expect(schemaAccepts(QueueRunInputSchema, { workflowId: "wf.alpha-1", runId: " run.alpha-1 " })).toBe(true);
    expect(schemaAccepts(QueueRunInputSchema, { workflowId: "wf.alpha-1" })).toBe(true);
    expect(schemaAccepts(QueueRunInputSchema, { workflowId: "wf.alpha-1", runId: "run/alpha-1" })).toBe(false);
  });

  it("keeps runtime state authority metadata additive for F1 seam observability", () => {
    const baseStateOutput = {
      state: {
        version: 1,
        plugins: {
          enabled: ["@rawr/plugin-alias-root"],
          lastUpdatedAt: "2026-02-22T00:00:00.000Z",
        },
      },
    };

    expect(schemaAccepts(GetRuntimeStateOutputSchema, baseStateOutput)).toBe(true);
    expect(
      schemaAccepts(GetRuntimeStateOutputSchema, {
        ...baseStateOutput,
        authorityRepoRoot: "/Users/rawr/repo",
      }),
    ).toBe(true);
    expect(
      schemaAccepts(GetRuntimeStateOutputSchema, {
        ...baseStateOutput,
        authorityRepoRoot: "",
      }),
    ).toBe(false);
  });
});
