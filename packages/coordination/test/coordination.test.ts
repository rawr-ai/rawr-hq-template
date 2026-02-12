import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ensureCoordinationStorage,
  getRunTimeline,
  listWorkflows,
  saveWorkflow,
  validateWorkflow,
  appendRunTimelineEvent,
  writeDeskMemory,
  readDeskMemory,
  type CoordinationWorkflowV1,
} from "../src/node";

const baseWorkflow: CoordinationWorkflowV1 = {
  workflowId: "wf-a",
  version: 1,
  name: "A",
  description: "demo",
  entryDeskId: "desk-a",
  desks: [
    {
      deskId: "desk-a",
      kind: "desk:analysis",
      name: "Desk A",
      responsibility: "Analyze",
      domain: "coordination",
      inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      outputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      memoryScope: { persist: true, namespace: "desk-a" },
    },
    {
      deskId: "desk-b",
      kind: "desk:execution",
      name: "Desk B",
      responsibility: "Execute",
      domain: "coordination",
      inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
      memoryScope: { persist: false },
    },
  ],
  handoffs: [{ handoffId: "h-a-b", fromDeskId: "desk-a", toDeskId: "desk-b" }],
};

describe("coordination validation", () => {
  it("accepts valid workflows", () => {
    const result = validateWorkflow(baseWorkflow);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("blocks incompatible handoff contracts", () => {
    const broken: CoordinationWorkflowV1 = {
      ...baseWorkflow,
      desks: baseWorkflow.desks.map((desk) =>
        desk.deskId === "desk-a" ? { ...desk, outputSchema: { type: "object", properties: {}, required: [] } } : desk,
      ),
    };
    const result = validateWorkflow(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("INCOMPATIBLE_HANDOFF");
  });

  it("requires explicit join desk for fan-in", () => {
    const fanIn: CoordinationWorkflowV1 = {
      ...baseWorkflow,
      desks: [
        ...baseWorkflow.desks,
        {
          deskId: "desk-c",
          kind: "desk:analysis",
          name: "Desk C",
          responsibility: "extra",
          domain: "coordination",
          inputSchema: { type: "object" },
          outputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          memoryScope: { persist: false },
        },
      ],
      handoffs: [
        ...baseWorkflow.handoffs,
        { handoffId: "h-c-b", fromDeskId: "desk-c", toDeskId: "desk-b" },
      ],
    };
    const result = validateWorkflow(fanIn);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("ILLEGAL_FAN_IN_WITHOUT_JOIN");
  });
});

describe("coordination storage", () => {
  it("persists workflows, timeline, and memory", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-coord-"));
    await ensureCoordinationStorage(repoRoot);

    await saveWorkflow(repoRoot, baseWorkflow);
    const workflows = await listWorkflows(repoRoot);
    expect(workflows.map((w) => w.workflowId)).toContain("wf-a");

    await appendRunTimelineEvent(repoRoot, "run-1", {
      eventId: "e1",
      runId: "run-1",
      workflowId: "wf-a",
      type: "run.started",
      ts: new Date().toISOString(),
      status: "running",
    });
    const timeline = await getRunTimeline(repoRoot, "run-1");
    expect(timeline).toHaveLength(1);

    await writeDeskMemory(repoRoot, "wf-a", 1, "desk-a", "default", { hello: "world" }, 60);
    const memory = await readDeskMemory(repoRoot, "wf-a", 1, "desk-a");
    expect(memory?.memoryKey).toBe("default");
  });

  it("serializes timeline appends under concurrent writes", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-coord-concurrency-"));
    await ensureCoordinationStorage(repoRoot);

    const events = Array.from({ length: 40 }, (_, idx) => ({
      eventId: `e-${idx}`,
      runId: "run-concurrent",
      workflowId: "wf-a",
      type: "desk.completed" as const,
      ts: new Date(Date.now() + idx).toISOString(),
      status: "running" as const,
    }));

    await Promise.all(events.map((event) => appendRunTimelineEvent(repoRoot, "run-concurrent", event)));
    const timeline = await getRunTimeline(repoRoot, "run-concurrent");
    expect(timeline).toHaveLength(40);
  });

  it("rejects unsafe identifiers for file-backed storage keys", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-coord-safe-ids-"));
    await ensureCoordinationStorage(repoRoot);

    await expect(saveWorkflow(repoRoot, { ...baseWorkflow, workflowId: "../../escape" })).rejects.toThrow(
      /Invalid workflowId/,
    );

    await expect(
      appendRunTimelineEvent(repoRoot, "../../escape-run", {
        eventId: "e1",
        runId: "../../escape-run",
        workflowId: "wf-a",
        type: "run.started",
        ts: new Date().toISOString(),
        status: "running",
      }),
    ).rejects.toThrow(/Invalid runId/);
  });
});
