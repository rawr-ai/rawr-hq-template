import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { createAuthoringClient } from "../src/authoring";
import { ensureCoordinationStorage, saveWorkflow } from "../src/storage";

describe("coordination observability", () => {
  it("emits coordination and baseline procedure signals for authoring routes", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-coord-observability-"));
    const logs: EmbeddedPlaceholderLogEntry[] = [];
    const analytics: Array<{ event: string; payload: Record<string, unknown> }> = [];

    try {
      await ensureCoordinationStorage(repoRoot);
      await saveWorkflow(repoRoot, {
        workflowId: "wf-observability",
        version: 1,
        name: "Observability workflow",
        entryDeskId: "desk-a",
        desks: [{
          deskId: "desk-a",
          kind: "desk:analysis",
          name: "Desk A",
          responsibility: "Analyze",
          domain: "coord",
          inputSchema: { type: "object", properties: {}, additionalProperties: true },
          outputSchema: { type: "object", properties: {}, additionalProperties: true },
          memoryScope: { persist: true },
        }],
        handoffs: [],
      });

      const client = createAuthoringClient({
        deps: {
          logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logs }),
          analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analytics }),
        },
        scope: { repoRoot },
        config: {},
      });

      await expect(
        client.listWorkflows(
          {},
          {
            context: {
              invocation: {
                traceId: "trace-coordination-observability",
              },
            },
          },
        ),
      ).resolves.toMatchObject({
        workflows: [{ workflowId: "wf-observability" }],
      });

      expect(logs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "coordination.procedure",
          payload: expect.objectContaining({
            outcome: "success",
            path: "workflows.listWorkflows",
            repoRoot,
            invocationTraceId: "trace-coordination-observability",
          }),
        }),
        expect.objectContaining({
          event: "orpc.procedure",
          payload: expect.objectContaining({
            outcome: "success",
            path: "workflows.listWorkflows",
            domain: "coordination",
          }),
        }),
      ]));
      expect(analytics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "orpc.procedure",
          payload: expect.objectContaining({
            path: "workflows.listWorkflows",
            analytics_repo_root: repoRoot,
            analytics_trace_id: "trace-coordination-observability",
          }),
        }),
      ]));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });
});
