import { describe, expect, it } from "vitest";
import {
  createDeskEvent,
  REQUIRED_RUN_LIFECYCLE_EVENT_TYPES,
  REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT,
  type CreateDeskEventInput,
} from "../src";

describe("storage lock telemetry contract", () => {
  it("emits valid events for required lifecycle transitions", () => {
    const events = [
      createDeskEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.started",
        status: "queued",
        detail: "queued behind lock acquisition",
      }),
      createDeskEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.started",
        status: "running",
        detail: "lock acquired and processing started",
      }),
      createDeskEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.completed",
        status: "completed",
      }),
      createDeskEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.failed",
        status: "failed",
      }),
    ];

    const runLifecycleTypes = events
      .map((entry) => entry.type)
      .filter((type): type is (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number] =>
        REQUIRED_RUN_LIFECYCLE_EVENT_TYPES.includes(type as (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number]),
      );

    expect(new Set(runLifecycleTypes)).toEqual(new Set(REQUIRED_RUN_LIFECYCLE_EVENT_TYPES));
  });

  it("rejects invalid lifecycle status combinations", () => {
    const invalidPairs: Array<{ type: (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number]; status: string }> = [
      { type: "run.started", status: "failed" },
      { type: "run.completed", status: "running" },
      { type: "run.failed", status: "completed" },
    ];

    for (const pair of invalidPairs) {
      expect(() =>
        createDeskEvent({
          runId: "run-c2",
          workflowId: "wf-c2",
          type: pair.type,
          status: pair.status,
        } as unknown as CreateDeskEventInput),
      ).toThrow("invalid lifecycle status");
    }
  });

  it("declares allowed statuses for each required lifecycle event", () => {
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.started"]).toEqual(["queued", "running"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.completed"]).toEqual(["completed"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.failed"]).toEqual(["failed"]);
  });
});
