import { describe, expect, it } from "vitest";
import { createDeskEvent, defaultTraceLinks } from "../src";

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

  it("builds default trace links", () => {
    const links = defaultTraceLinks("http://localhost:3000", "run-42");
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain("/rawr/coordination/runs/run-42/timeline");
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
