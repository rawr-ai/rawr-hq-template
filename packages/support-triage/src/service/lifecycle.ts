import type { TriageJob, TriageJobSource, TriageJobStatus } from "../domain";
import { canTransitionTriageJobStatus, isTerminalTriageJobStatus } from "../domain";
import { SupportTriageDomainError } from "../errors";
import { normalizeSupportTriageId } from "../ids";
import type { TriageJobStore } from "./store";

export type SupportTriageServiceDeps = {
  store: TriageJobStore;
  now: () => string;
  generateJobId: () => string;
};

export type RequestTriageJobInput = {
  queueId: string;
  requestedBy: string;
  source?: TriageJobSource;
};

export type ListTriageJobsInput = {
  status?: TriageJobStatus;
};

export type CompleteTriageJobInput = {
  jobId: string;
  succeeded: boolean;
  triagedTicketCount?: number;
  escalatedTicketCount?: number;
  failureReason?: string;
  failureCode?: string;
};

function normalizeRequiredId(value: string, code: "INVALID_QUEUE_ID" | "INVALID_REQUESTED_BY" | "INVALID_JOB_ID", label: string): string {
  const normalized = normalizeSupportTriageId(value);
  if (!normalized) {
    throw new SupportTriageDomainError(code, `Invalid ${label}`, { [label]: value });
  }
  return normalized;
}

function normalizeCount(value: number | undefined, label: "triagedTicketCount" | "escalatedTicketCount"): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new SupportTriageDomainError("INVALID_COMPLETION_INPUT", `${label} must be a non-negative number`);
  }

  return Math.floor(value);
}

function validateCompletionInput(input: CompleteTriageJobInput): { triagedCount: number | undefined; escalatedCount: number | undefined } {
  const triagedCount = normalizeCount(input.triagedTicketCount, "triagedTicketCount");
  const escalatedCount = normalizeCount(input.escalatedTicketCount, "escalatedTicketCount");

  if (input.succeeded && triagedCount === undefined) {
    throw new SupportTriageDomainError("INVALID_COMPLETION_INPUT", "triagedTicketCount is required when succeeded=true", {
      jobId: input.jobId,
    });
  }

  if (!input.succeeded && (!input.failureReason || input.failureReason.trim() === "")) {
    throw new SupportTriageDomainError("INVALID_COMPLETION_INPUT", "failureReason is required when succeeded=false", {
      jobId: input.jobId,
    });
  }

  if (triagedCount !== undefined && escalatedCount !== undefined && escalatedCount > triagedCount) {
    throw new SupportTriageDomainError(
      "INVALID_COMPLETION_INPUT",
      "escalatedTicketCount cannot exceed triagedTicketCount",
      { jobId: input.jobId },
    );
  }

  return { triagedCount, escalatedCount };
}

async function resolveJobOrThrow(store: TriageJobStore, jobId: string): Promise<TriageJob> {
  const normalizedJobId = normalizeRequiredId(jobId, "INVALID_JOB_ID", "jobId");
  const existing = await store.get(normalizedJobId);
  if (!existing) {
    throw new SupportTriageDomainError("JOB_NOT_FOUND", `Support triage job not found: ${normalizedJobId}`, {
      jobId: normalizedJobId,
    });
  }
  return existing;
}

export async function requestSupportTriageJob(
  deps: SupportTriageServiceDeps,
  input: RequestTriageJobInput,
): Promise<{ job: TriageJob }> {
  const queueId = normalizeRequiredId(input.queueId, "INVALID_QUEUE_ID", "queueId");
  const requestedBy = normalizeRequiredId(input.requestedBy, "INVALID_REQUESTED_BY", "requestedBy");

  const generatedJobId = normalizeSupportTriageId(deps.generateJobId());
  if (!generatedJobId) {
    throw new SupportTriageDomainError("INVALID_JOB_ID", "Generated job id is invalid");
  }

  const now = deps.now();
  const job: TriageJob = {
    jobId: generatedJobId,
    queueId,
    requestedBy,
    source: input.source ?? "manual",
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  await deps.store.save(job);
  return { job };
}

export async function listSupportTriageJobs(
  deps: SupportTriageServiceDeps,
  input: ListTriageJobsInput = {},
): Promise<{ jobs: TriageJob[] }> {
  const allJobs = await deps.store.list();
  const filtered = input.status ? allJobs.filter((job) => job.status === input.status) : allJobs;

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { jobs: filtered };
}

export async function getSupportTriageJob(
  deps: SupportTriageServiceDeps,
  input: { jobId: string },
): Promise<{ job: TriageJob }> {
  const job = await resolveJobOrThrow(deps.store, input.jobId);
  return { job };
}

export async function startSupportTriageJob(
  deps: SupportTriageServiceDeps,
  input: { jobId: string },
): Promise<{ job: TriageJob }> {
  const current = await resolveJobOrThrow(deps.store, input.jobId);
  const nextStatus: TriageJobStatus = "running";

  if (!canTransitionTriageJobStatus(current.status, nextStatus)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Cannot transition ${current.status} -> ${nextStatus}`, {
      jobId: current.jobId,
      from: current.status,
      to: nextStatus,
    });
  }

  const startedAt = deps.now();
  const updated: TriageJob = {
    ...current,
    status: nextStatus,
    updatedAt: startedAt,
    startedAt,
    completedAt: undefined,
    triagedTicketCount: undefined,
    escalatedTicketCount: undefined,
    failedAt: undefined,
    failureReason: undefined,
    failureCode: undefined,
  };

  await deps.store.save(updated);
  return { job: updated };
}

export async function completeSupportTriageJob(
  deps: SupportTriageServiceDeps,
  input: CompleteTriageJobInput,
): Promise<{ job: TriageJob }> {
  const { triagedCount, escalatedCount } = validateCompletionInput(input);

  const current = await resolveJobOrThrow(deps.store, input.jobId);
  const nextStatus: TriageJobStatus = input.succeeded ? "completed" : "failed";

  if (!canTransitionTriageJobStatus(current.status, nextStatus)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Cannot transition ${current.status} -> ${nextStatus}`, {
      jobId: current.jobId,
      from: current.status,
      to: nextStatus,
    });
  }

  if (isTerminalTriageJobStatus(current.status)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Job ${current.jobId} is already terminal`, {
      jobId: current.jobId,
      status: current.status,
    });
  }

  const terminalAt = deps.now();
  const updated: TriageJob = input.succeeded
    ? {
        ...current,
        status: "completed",
        updatedAt: terminalAt,
        completedAt: terminalAt,
        triagedTicketCount: triagedCount,
        escalatedTicketCount: escalatedCount ?? 0,
        failedAt: undefined,
        failureReason: undefined,
        failureCode: undefined,
      }
    : {
        ...current,
        status: "failed",
        updatedAt: terminalAt,
        completedAt: undefined,
        triagedTicketCount: triagedCount,
        escalatedTicketCount: escalatedCount,
        failedAt: terminalAt,
        failureReason: input.failureReason?.trim(),
        failureCode: input.failureCode?.trim(),
      };

  await deps.store.save(updated);
  return { job: updated };
}
