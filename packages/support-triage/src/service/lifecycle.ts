import type { TriageWorkItem, TriageWorkItemSource, TriageWorkItemStatus } from "../domain";
import { canTransitionTriageWorkItemStatus, isTerminalTriageWorkItemStatus } from "../domain";
import { SupportTriageDomainError } from "../errors";
import { normalizeSupportTriageId } from "../ids";
import type { TriageWorkItemStore } from "./store";

export type SupportTriageServiceDeps = {
  store: TriageWorkItemStore;
  now: () => string;
  generateWorkItemId: () => string;
};

export type RequestTriageWorkItemInput = {
  queueId: string;
  requestedBy: string;
  source?: TriageWorkItemSource;
};

export type ListTriageWorkItemsInput = {
  status?: TriageWorkItemStatus;
};

export type CompleteTriageWorkItemInput = {
  workItemId: string;
  succeeded: boolean;
  triagedTicketCount?: number;
  escalatedTicketCount?: number;
  failureReason?: string;
  failureCode?: string;
};

function normalizeRequiredId(
  value: string,
  code: "INVALID_QUEUE_ID" | "INVALID_REQUESTED_BY" | "INVALID_WORK_ITEM_ID",
  label: string,
): string {
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

function validateCompletionInput(
  input: CompleteTriageWorkItemInput,
): { triagedCount: number | undefined; escalatedCount: number | undefined } {
  const triagedCount = normalizeCount(input.triagedTicketCount, "triagedTicketCount");
  const escalatedCount = normalizeCount(input.escalatedTicketCount, "escalatedTicketCount");

  if (input.succeeded && triagedCount === undefined) {
    throw new SupportTriageDomainError("INVALID_COMPLETION_INPUT", "triagedTicketCount is required when succeeded=true", {
      workItemId: input.workItemId,
    });
  }

  if (!input.succeeded && (!input.failureReason || input.failureReason.trim() === "")) {
    throw new SupportTriageDomainError("INVALID_COMPLETION_INPUT", "failureReason is required when succeeded=false", {
      workItemId: input.workItemId,
    });
  }

  if (triagedCount !== undefined && escalatedCount !== undefined && escalatedCount > triagedCount) {
    throw new SupportTriageDomainError(
      "INVALID_COMPLETION_INPUT",
      "escalatedTicketCount cannot exceed triagedTicketCount",
      { workItemId: input.workItemId },
    );
  }

  return { triagedCount, escalatedCount };
}

async function resolveWorkItemOrThrow(store: TriageWorkItemStore, workItemId: string): Promise<TriageWorkItem> {
  const normalizedWorkItemId = normalizeRequiredId(workItemId, "INVALID_WORK_ITEM_ID", "workItemId");
  const existing = await store.get(normalizedWorkItemId);
  if (!existing) {
    throw new SupportTriageDomainError(
      "WORK_ITEM_NOT_FOUND",
      `Support triage work item not found: ${normalizedWorkItemId}`,
      {
        workItemId: normalizedWorkItemId,
      },
    );
  }
  return existing;
}

export async function requestSupportTriageWorkItem(
  deps: SupportTriageServiceDeps,
  input: RequestTriageWorkItemInput,
): Promise<{ workItem: TriageWorkItem }> {
  const queueId = normalizeRequiredId(input.queueId, "INVALID_QUEUE_ID", "queueId");
  const requestedBy = normalizeRequiredId(input.requestedBy, "INVALID_REQUESTED_BY", "requestedBy");

  const generatedWorkItemId = normalizeSupportTriageId(deps.generateWorkItemId());
  if (!generatedWorkItemId) {
    throw new SupportTriageDomainError("INVALID_WORK_ITEM_ID", "Generated work item id is invalid");
  }

  const now = deps.now();
  const workItem: TriageWorkItem = {
    workItemId: generatedWorkItemId,
    queueId,
    requestedBy,
    source: input.source ?? "manual",
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  await deps.store.save(workItem);
  return { workItem };
}

export async function listSupportTriageWorkItems(
  deps: SupportTriageServiceDeps,
  input: ListTriageWorkItemsInput = {},
): Promise<{ workItems: TriageWorkItem[] }> {
  const all = await deps.store.list();
  const filtered = input.status ? all.filter((workItem) => workItem.status === input.status) : all;

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { workItems: filtered };
}

export async function getSupportTriageWorkItem(
  deps: SupportTriageServiceDeps,
  input: { workItemId: string },
): Promise<{ workItem: TriageWorkItem }> {
  const workItem = await resolveWorkItemOrThrow(deps.store, input.workItemId);
  return { workItem };
}

export async function startSupportTriageWorkItem(
  deps: SupportTriageServiceDeps,
  input: { workItemId: string },
): Promise<{ workItem: TriageWorkItem }> {
  const current = await resolveWorkItemOrThrow(deps.store, input.workItemId);
  const nextStatus: TriageWorkItemStatus = "running";

  if (!canTransitionTriageWorkItemStatus(current.status, nextStatus)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Cannot transition ${current.status} -> ${nextStatus}`, {
      workItemId: current.workItemId,
      from: current.status,
      to: nextStatus,
    });
  }

  const startedAt = deps.now();
  const updated: TriageWorkItem = {
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
  return { workItem: updated };
}

export async function completeSupportTriageWorkItem(
  deps: SupportTriageServiceDeps,
  input: CompleteTriageWorkItemInput,
): Promise<{ workItem: TriageWorkItem }> {
  const { triagedCount, escalatedCount } = validateCompletionInput(input);

  const current = await resolveWorkItemOrThrow(deps.store, input.workItemId);
  const nextStatus: TriageWorkItemStatus = input.succeeded ? "completed" : "failed";

  if (!canTransitionTriageWorkItemStatus(current.status, nextStatus)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Cannot transition ${current.status} -> ${nextStatus}`, {
      workItemId: current.workItemId,
      from: current.status,
      to: nextStatus,
    });
  }

  if (isTerminalTriageWorkItemStatus(current.status)) {
    throw new SupportTriageDomainError("INVALID_STATUS_TRANSITION", `Work item ${current.workItemId} is already terminal`, {
      workItemId: current.workItemId,
      status: current.status,
    });
  }

  const terminalAt = deps.now();
  const updated: TriageWorkItem = input.succeeded
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
  return { workItem: updated };
}
