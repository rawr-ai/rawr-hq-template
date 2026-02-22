import { describe, expect, it } from "vitest";
import {
  createDeskEvent,
  defaultTraceLinks,
  REQUIRED_RUN_LIFECYCLE_EVENT_TYPES,
  REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT,
  type CreateDeskEventInput,
} from "../src";

describe("coordination observability", () => {
  it("creates run events", () => {
    const event = createDeskEvent({
      runId: "run-1",
      workflowId: "wf-1",
      type: "run.started",
      status: "running",
      detail: "started",
    });

    expect(event.runId).toBe("run-1");
    expect(event.workflowId).toBe("wf-1");
    expect(event.type).toBe("run.started");
    expect(event.status).toBe("running");
    expect(event.eventId).toMatch(/^evt-/);
  });

  it("exports required run lifecycle telemetry contract", () => {
    expect(REQUIRED_RUN_LIFECYCLE_EVENT_TYPES).toEqual(["run.started", "run.completed", "run.failed"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.started"]).toEqual(["queued", "running"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.completed"]).toEqual(["completed"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.failed"]).toEqual(["failed"]);
  });

  it("hard-fails invalid run lifecycle status pairs", () => {
    const invalidEvent = {
      runId: "run-1",
      workflowId: "wf-1",
      type: "run.completed",
      status: "running",
    } as unknown as CreateDeskEventInput;

    expect(() => createDeskEvent(invalidEvent)).toThrow("invalid lifecycle status");
  });

  it("builds default trace links", () => {
    const links = defaultTraceLinks("http://localhost:3000", "run-42");
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain("/api/orpc/coordination/runs/run-42/timeline");
    expect(links[1].url).toContain("http://localhost:8288/runs/run-42");
  });

  it("prefers explicit inngest run identifiers in trace links", () => {
    const links = defaultTraceLinks("http://localhost:3000", "run-42", {
      inngestBaseUrl: "http://127.0.0.1:8288",
      inngestRunId: "inngest-run-9000",
      inngestEventId: "evt-1",
    });

    expect(links[1].url).toContain("http://127.0.0.1:8288/runs/inngest-run-9000");
  });
});
