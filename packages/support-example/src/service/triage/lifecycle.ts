import { implement } from "@orpc/server";
import { supportExampleContract } from "../../contract";
import type { TriageWorkItem, TriageWorkItemStatus } from "../../domain";
import { canTransitionTriageWorkItemStatus, isTerminalTriageWorkItemStatus } from "../../domain";
import { normalizeSupportExampleId } from "../../ids";
import type { SupportExampleServiceContext } from "./context";

function normalizeCount(
  value: number | undefined,
  label: "triagedTicketCount" | "escalatedTicketCount",
  onInvalid: (message: string) => never,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    return onInvalid(`${label} must be a non-negative number`);
  }

  return Math.floor(value);
}

const o = implement<typeof supportExampleContract, SupportExampleServiceContext>(supportExampleContract);

export const supportExampleTriageItemProcedures = {
  request: o.triage.items.request.handler(async ({ context, input, errors }) => {
    const queueId = normalizeSupportExampleId(input.queueId);
    if (!queueId) {
      throw errors.INVALID_QUEUE_ID({
        message: "Invalid queueId",
        data: { queueId: input.queueId },
      });
    }

    const requestedBy = normalizeSupportExampleId(input.requestedBy);
    if (!requestedBy) {
      throw errors.INVALID_REQUESTED_BY({
        message: "Invalid requestedBy",
        data: { requestedBy: input.requestedBy },
      });
    }

    const generatedWorkItemId = normalizeSupportExampleId(context.deps.generateWorkItemId());
    if (!generatedWorkItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Generated work item id is invalid",
        data: {},
      });
    }

    const now = context.deps.now();
    const workItem: TriageWorkItem = {
      workItemId: generatedWorkItemId,
      queueId,
      requestedBy,
      source: input.source ?? "manual",
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    await context.deps.store.save(workItem);
    return { workItem };
  }),

  list: o.triage.items.list.handler(async ({ context, input }) => {
    const all = await context.deps.store.list();
    const filtered = input.status ? all.filter((workItem) => workItem.status === input.status) : all;

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { workItems: filtered };
  }),

  get: o.triage.items.get.handler(async ({ context, input, errors }) => {
    const workItemId = normalizeSupportExampleId(input.workItemId);
    if (!workItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Invalid workItemId",
        data: { workItemId: input.workItemId },
      });
    }

    const workItem = await context.deps.store.get(workItemId);
    if (!workItem) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

    return { workItem };
  }),

  start: o.triage.items.start.handler(async ({ context, input, errors }) => {
    const workItemId = normalizeSupportExampleId(input.workItemId);
    if (!workItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Invalid workItemId",
        data: { workItemId: input.workItemId },
      });
    }

    const current = await context.deps.store.get(workItemId);
    if (!current) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

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

    const startedAt = context.deps.now();
    const workItem: TriageWorkItem = {
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

    await context.deps.store.save(workItem);
    return { workItem };
  }),

  complete: o.triage.items.complete.handler(async ({ context, input, errors }) => {
    const workItemId = normalizeSupportExampleId(input.workItemId);
    if (!workItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Invalid workItemId",
        data: { workItemId: input.workItemId },
      });
    }

    const failInvalidCompletionInput = (message: string): never => {
      throw errors.INVALID_COMPLETION_INPUT({
        message,
        data: { workItemId },
      });
    };

    const triagedTicketCount = normalizeCount(input.triagedTicketCount, "triagedTicketCount", failInvalidCompletionInput);
    const escalatedTicketCount = normalizeCount(
      input.escalatedTicketCount,
      "escalatedTicketCount",
      failInvalidCompletionInput,
    );

    if (input.succeeded && triagedTicketCount === undefined) {
      failInvalidCompletionInput("triagedTicketCount is required when succeeded=true");
    }

    if (!input.succeeded && (!input.failureReason || input.failureReason.trim() === "")) {
      failInvalidCompletionInput("failureReason is required when succeeded=false");
    }

    if (
      triagedTicketCount !== undefined &&
      escalatedTicketCount !== undefined &&
      escalatedTicketCount > triagedTicketCount
    ) {
      failInvalidCompletionInput("escalatedTicketCount cannot exceed triagedTicketCount");
    }

    const current = await context.deps.store.get(workItemId);
    if (!current) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

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

    const terminalAt = context.deps.now();
    const workItem: TriageWorkItem = input.succeeded
      ? {
          ...current,
          status: "completed",
          updatedAt: terminalAt,
          completedAt: terminalAt,
          triagedTicketCount,
          escalatedTicketCount: escalatedTicketCount ?? 0,
          failedAt: undefined,
          failureReason: undefined,
          failureCode: undefined,
        }
      : {
          ...current,
          status: "failed",
          updatedAt: terminalAt,
          completedAt: undefined,
          triagedTicketCount,
          escalatedTicketCount,
          failedAt: terminalAt,
          failureReason: input.failureReason?.trim(),
          failureCode: input.failureCode?.trim(),
        };

    await context.deps.store.save(workItem);
    return { workItem };
  }),
} as const;
