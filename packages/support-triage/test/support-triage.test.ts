import { describe, expect, it } from "vitest";
import {
  completeSupportTriageJob,
  createInMemoryTriageJobStore,
  requestSupportTriageJob,
  startSupportTriageJob,
  type SupportTriageServiceDeps,
} from "../src";

function createDeps(seed: { now: string[]; ids: string[] }): SupportTriageServiceDeps {
  const store = createInMemoryTriageJobStore();
  const nowValues = [...seed.now];
  const idValues = [...seed.ids];

  return {
    store,
    now: () => nowValues.shift() ?? "2026-02-22T00:00:00.000Z",
    generateJobId: () => idValues.shift() ?? `triage-${Math.random().toString(16).slice(2, 10)}`,
  };
}

describe("support-triage service", () => {
  it("creates, starts, and completes a queue-scoped triage job", async () => {
    const deps = createDeps({
      now: ["2026-02-22T10:00:00.000Z", "2026-02-22T10:00:01.000Z", "2026-02-22T10:00:02.000Z"],
      ids: ["triage.queue-001"],
    });

    const requested = await requestSupportTriageJob(deps, {
      queueId: "queue.alpha",
      requestedBy: "user.demo",
      source: "manual",
    });

    expect(requested.job.status).toBe("queued");
    expect(requested.job.queueId).toBe("queue.alpha");

    const started = await startSupportTriageJob(deps, { jobId: requested.job.jobId });
    expect(started.job.status).toBe("running");

    const completed = await completeSupportTriageJob(deps, {
      jobId: requested.job.jobId,
      succeeded: true,
      triagedTicketCount: 12,
      escalatedTicketCount: 3,
    });

    expect(completed.job.status).toBe("completed");
    expect(completed.job.triagedTicketCount).toBe(12);
    expect(completed.job.escalatedTicketCount).toBe(3);
    expect(completed.job.completedAt).toBeDefined();
    expect(completed.job.failedAt).toBeUndefined();
  });

  it("rejects invalid status transitions", async () => {
    const deps = createDeps({
      now: ["2026-02-22T11:00:00.000Z", "2026-02-22T11:00:01.000Z", "2026-02-22T11:00:02.000Z"],
      ids: ["triage.queue-002"],
    });

    const requested = await requestSupportTriageJob(deps, {
      queueId: "queue.beta",
      requestedBy: "user.demo",
    });

    await expect(
      completeSupportTriageJob(deps, {
        jobId: requested.job.jobId,
        succeeded: true,
        triagedTicketCount: 1,
      }),
    ).rejects.toThrow(/Cannot transition queued -> completed/);
  });
});
