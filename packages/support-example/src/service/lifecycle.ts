import { implement, type ORPCErrorConstructorMap } from "@orpc/server";
import { supportExampleContract, supportExampleContractErrorMap } from "../contract";
import type { TriageWorkItem, TriageWorkItemSource, TriageWorkItemStatus } from "../domain";
import { canTransitionTriageWorkItemStatus, isTerminalTriageWorkItemStatus } from "../domain";
import { normalizeSupportExampleId } from "../ids";
import type { TriageWorkItemStore } from "./store";

export type SupportExampleServiceDeps = {
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

type SupportExampleErrorConstructors = ORPCErrorConstructorMap<typeof supportExampleContractErrorMap>;

function normalizeQueueId(queueId: string, errors: SupportExampleErrorConstructors): string {
  const normalized = normalizeSupportExampleId(queueId);
  if (!normalized) {
    throw errors.INVALID_QUEUE_ID({
      message: "Invalid queueId",
      data: { queueId },
    });
  }
  return normalized;
}

function normalizeRequestedBy(requestedBy: string, errors: SupportExampleErrorConstructors): string {
  const normalized = normalizeSupportExampleId(requestedBy);
  if (!normalized) {
    throw errors.INVALID_REQUESTED_BY({
      message: "Invalid requestedBy",
      data: { requestedBy },
    });
  }
  return normalized;
}

function normalizeWorkItemId(workItemId: string, errors: SupportExampleErrorConstructors): string {
  const normalized = normalizeSupportExampleId(workItemId);
  if (!normalized) {
    throw errors.INVALID_WORK_ITEM_ID({
      message: "Invalid workItemId",
      data: { workItemId },
    });
  }
  return normalized;
}

function normalizeCount(
  value: number | undefined,
  label: "triagedTicketCount" | "escalatedTicketCount",
  workItemId: string,
  errors: SupportExampleErrorConstructors,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw errors.INVALID_COMPLETION_INPUT({
      message: `${label} must be a non-negative number`,
      data: { workItemId },
    });
  }

  return Math.floor(value);
}

function validateCompletionInput(
  input: CompleteTriageWorkItemInput,
  errors: SupportExampleErrorConstructors,
): { triagedCount: number | undefined; escalatedCount: number | undefined } {
  const triagedCount = normalizeCount(input.triagedTicketCount, "triagedTicketCount", input.workItemId, errors);
  const escalatedCount = normalizeCount(input.escalatedTicketCount, "escalatedTicketCount", input.workItemId, errors);

  if (input.succeeded && triagedCount === undefined) {
    throw errors.INVALID_COMPLETION_INPUT({
      message: "triagedTicketCount is required when succeeded=true",
      data: { workItemId: input.workItemId },
    });
  }

  if (!input.succeeded && (!input.failureReason || input.failureReason.trim() === "")) {
    throw errors.INVALID_COMPLETION_INPUT({
      message: "failureReason is required when succeeded=false",
      data: { workItemId: input.workItemId },
    });
  }

  if (triagedCount !== undefined && escalatedCount !== undefined && escalatedCount > triagedCount) {
    throw errors.INVALID_COMPLETION_INPUT({
      message: "escalatedTicketCount cannot exceed triagedTicketCount",
      data: { workItemId: input.workItemId },
    });
  }

  return { triagedCount, escalatedCount };
}

async function resolveWorkItemOrThrow(
  store: TriageWorkItemStore,
  workItemId: string,
  errors: SupportExampleErrorConstructors,
): Promise<TriageWorkItem> {
  const normalizedWorkItemId = normalizeWorkItemId(workItemId, errors);
  const existing = await store.get(normalizedWorkItemId);
  if (!existing) {
    throw errors.WORK_ITEM_NOT_FOUND({
      message: `Support triage work item not found: ${normalizedWorkItemId}`,
      data: { workItemId: normalizedWorkItemId },
    });
  }

  return existing;
}

async function requestWorkItem(
  deps: SupportExampleServiceDeps,
  input: RequestTriageWorkItemInput,
  errors: SupportExampleErrorConstructors,
): Promise<{ workItem: TriageWorkItem }> {
  const queueId = normalizeQueueId(input.queueId, errors);
  const requestedBy = normalizeRequestedBy(input.requestedBy, errors);

  const generatedWorkItemId = normalizeSupportExampleId(deps.generateWorkItemId());
  if (!generatedWorkItemId) {
    throw errors.INVALID_WORK_ITEM_ID({
      message: "Generated work item id is invalid",
      data: {},
    });
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

async function listWorkItems(
  deps: SupportExampleServiceDeps,
  input: ListTriageWorkItemsInput = {},
): Promise<{ workItems: TriageWorkItem[] }> {
  const all = await deps.store.list();
  const filtered = input.status ? all.filter((workItem) => workItem.status === input.status) : all;

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { workItems: filtered };
}

async function getWorkItem(
  deps: SupportExampleServiceDeps,
  input: { workItemId: string },
  errors: SupportExampleErrorConstructors,
): Promise<{ workItem: TriageWorkItem }> {
  const workItem = await resolveWorkItemOrThrow(deps.store, input.workItemId, errors);
  return { workItem };
}

async function startWorkItem(
  deps: SupportExampleServiceDeps,
  input: { workItemId: string },
  errors: SupportExampleErrorConstructors,
): Promise<{ workItem: TriageWorkItem }> {
  const current = await resolveWorkItemOrThrow(deps.store, input.workItemId, errors);
  const nextStatus: TriageWorkItemStatus = "running";

  if (!canTransitionTriageWorkItemStatus(current.status, nextStatus)) {
    throw errors.INVALID_STATUS_TRANSITION({
      message: `Cannot transition ${current.status} -> ${nextStatus}`,
      data: {
        workItemId: current.workItemId,
        from: current.status,
        to: nextStatus,
      },
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

async function completeWorkItem(
  deps: SupportExampleServiceDeps,
  input: CompleteTriageWorkItemInput,
  errors: SupportExampleErrorConstructors,
): Promise<{ workItem: TriageWorkItem }> {
  const { triagedCount, escalatedCount } = validateCompletionInput(input, errors);

  const current = await resolveWorkItemOrThrow(deps.store, input.workItemId, errors);
  const nextStatus: TriageWorkItemStatus = input.succeeded ? "completed" : "failed";

  if (!canTransitionTriageWorkItemStatus(current.status, nextStatus)) {
    throw errors.INVALID_STATUS_TRANSITION({
      message: `Cannot transition ${current.status} -> ${nextStatus}`,
      data: {
        workItemId: current.workItemId,
        from: current.status,
        to: nextStatus,
      },
    });
  }

  if (isTerminalTriageWorkItemStatus(current.status)) {
    throw errors.INVALID_STATUS_TRANSITION({
      message: `Work item ${current.workItemId} is already terminal`,
      data: {
        workItemId: current.workItemId,
        from: current.status,
        to: current.status,
      },
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

type SupportExampleProcedureContext = {
  deps: SupportExampleServiceDeps;
};

const o = implement<typeof supportExampleContract, SupportExampleProcedureContext>(supportExampleContract);

export const supportExampleTriageItemProcedures = {
  request: o.triage.items.request.handler(async ({ context, input, errors }) => {
    return requestWorkItem(context.deps, input, errors);
  }),

  list: o.triage.items.list.handler(async ({ context, input }) => {
    return listWorkItems(context.deps, input);
  }),

  get: o.triage.items.get.handler(async ({ context, input, errors }) => {
    return getWorkItem(context.deps, input, errors);
  }),

  start: o.triage.items.start.handler(async ({ context, input, errors }) => {
    return startWorkItem(context.deps, input, errors);
  }),

  complete: o.triage.items.complete.handler(async ({ context, input, errors }) => {
    return completeWorkItem(context.deps, input, errors);
  }),
} as const;
