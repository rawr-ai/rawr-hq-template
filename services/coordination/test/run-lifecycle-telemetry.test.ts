import { describe, expect, it } from "vitest";
import {
  createDeskEvent,
  REQUIRED_RUN_LIFECYCLE_EVENT_TYPES,
  REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT,
  type CreateDeskEventInput,
} from "@rawr/coordination/events";

type CreateRunLifecycleEventInput = Readonly<{
  runId: string;
  workflowId: string;
  deskId?: string;
  detail?: string;
  payload?: CreateDeskEventInput["payload"];
  type: (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number];
  status: CreateDeskEventInput["status"];
}>;

function createLifecycleEvent(input: CreateRunLifecycleEventInput) {
  const base = {
    eventId: "evt-test",
    ts: "2026-03-24T00:00:00.000Z",
    runId: input.runId,
    workflowId: input.workflowId,
    deskId: input.deskId,
    detail: input.detail,
    payload: input.payload,
  } as const;

  switch (input.type) {
    case "run.started":
      return createDeskEvent({
        ...base,
        type: "run.started",
        status: input.status as Extract<CreateDeskEventInput, { type: "run.started" }>["status"],
      });
    case "run.completed":
      return createDeskEvent({
        ...base,
        type: "run.completed",
        status: input.status as Extract<CreateDeskEventInput, { type: "run.completed" }>["status"],
      });
    case "run.failed":
      return createDeskEvent({
        ...base,
        type: "run.failed",
        status: input.status as Extract<CreateDeskEventInput, { type: "run.failed" }>["status"],
      });
  }
}

describe("coordination run lifecycle telemetry contract", () => {
  it("emits valid events for required lifecycle transitions", () => {
    const events = [
      createLifecycleEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.started",
        status: "queued",
        detail: "queued behind lock acquisition",
      }),
      createLifecycleEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.started",
        status: "running",
        detail: "processing started",
      }),
      createLifecycleEvent({
        runId: "run-c2",
        workflowId: "wf-c2",
        type: "run.completed",
        status: "completed",
      }),
      createLifecycleEvent({
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
        createLifecycleEvent({
          runId: "run-c2",
          workflowId: "wf-c2",
          type: pair.type,
          status: pair.status as CreateDeskEventInput["status"],
        }),
      ).toThrow("invalid lifecycle status");
    }
  });

  it("declares allowed statuses for each required lifecycle event", () => {
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.started"]).toEqual(["queued", "running"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.completed"]).toEqual(["completed"]);
    expect(REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT["run.failed"]).toEqual(["failed"]);
  });
});
