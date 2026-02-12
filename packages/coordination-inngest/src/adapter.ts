import { Engine, type EngineAction } from "@inngest/workflow-kit";
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";
import {
  DESK_KINDS_V1,
  isSafeCoordinationId,
  topologicalDeskOrder,
  validateWorkflow,
  type CoordinationWorkflowV1,
  type DeskDefinitionV1,
  type DeskRunEventV1,
  type JsonValue,
  type RunStatusV1,
} from "@rawr/coordination";
import { createDeskEvent, defaultTraceLinks } from "@rawr/coordination-observability";
import {
  COORDINATION_RUN_EVENT,
  DESK_KIND_META,
  coordinationAvailableActions,
  fromWorkflowKitWorkflow,
  toWorkflowKitWorkflow,
} from "./browser";

const COORDINATION_FUNCTION_ID = "coordination-workflow-runner";
const runQueueLocks = new Map<string, Promise<void>>();

async function withRunQueueLock<T>(runId: string, task: () => Promise<T>): Promise<T> {
  const previous = runQueueLocks.get(runId) ?? Promise.resolve();
  let releaseCurrent: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const nextTail = previous.then(() => current);
  runQueueLocks.set(runId, nextTail);

  await previous;
  try {
    return await task();
  } finally {
    releaseCurrent();
    if (runQueueLocks.get(runId) === nextTail) {
      runQueueLocks.delete(runId);
    }
  }
}

export type InngestCompileResult = Readonly<{
  actions: Array<{ id: string; kind: string }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
}>;

export type CoordinationRunEventData = Readonly<{
  runId: string;
  workflow: CoordinationWorkflowV1;
  input?: JsonValue;
  baseUrl: string;
}>;

export type CoordinationRuntimeAdapter = Readonly<{
  readMemory: (workflow: CoordinationWorkflowV1, deskId: string) => Promise<unknown>;
  writeMemory: (workflow: CoordinationWorkflowV1, desk: DeskDefinitionV1, value: JsonValue) => Promise<void>;
  getRunStatus: (runId: string) => Promise<RunStatusV1 | null>;
  saveRunStatus: (run: RunStatusV1) => Promise<void>;
  appendTimeline: (runId: string, event: DeskRunEventV1) => Promise<void>;
  inngestBaseUrl?: string;
}>;

export type QueueCoordinationRunOptions = Readonly<{
  client: Inngest;
  runtime: CoordinationRuntimeAdapter;
  workflow: CoordinationWorkflowV1;
  runId: string;
  input?: JsonValue;
  baseUrl: string;
}>;

export type QueueCoordinationRunResult = Readonly<{
  run: RunStatusV1;
  eventIds: string[];
}>;

export type CoordinationFunctionBundle = Readonly<{
  client: Inngest;
  functions: readonly unknown[];
}>;

type StepToolLike = Readonly<{
  run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
}>;

export type CoordinationRunProcessorOptions = Readonly<{
  payload: CoordinationRunEventData;
  runtime: CoordinationRuntimeAdapter;
  inngestRunId: string;
  inngestEventId?: string;
  step: StepToolLike;
}>;

export function createInngestClient(appId = "rawr-coordination"): Inngest {
  return new Inngest({ id: appId });
}

export function createInngestServeHandler(input: { client: Inngest; functions: readonly unknown[] }) {
  return inngestServe({
    client: input.client,
    functions: input.functions as any,
  });
}

export function compileWorkflowToInngest(workflow: CoordinationWorkflowV1): InngestCompileResult {
  return {
    actions: workflow.desks.map((desk) => ({ id: desk.deskId, kind: desk.kind })),
    edges: workflow.handoffs.map((handoff) => ({
      from: handoff.fromDeskId,
      to: handoff.toDeskId,
      condition: handoff.condition,
    })),
  };
}

export { coordinationAvailableActions, fromWorkflowKitWorkflow, toWorkflowKitWorkflow };

export async function queueCoordinationRunWithInngest(
  options: QueueCoordinationRunOptions,
): Promise<QueueCoordinationRunResult> {
  if (!isSafeCoordinationId(options.runId)) {
    throw new Error(`Invalid runId: ${options.runId}`);
  }

  const validation = validateWorkflow(options.workflow);
  if (!validation.ok) {
    const details = validation.errors.map((entry) => entry.message).join("; ");
    throw new Error(`Workflow validation failed: ${details}`);
  }

  return withRunQueueLock(options.runId, async () => {
    const existing = await options.runtime.getRunStatus(options.runId);
    if (existing) {
      if (existing.workflowId !== options.workflow.workflowId) {
        throw new Error(`runId ${options.runId} is already used by workflow ${existing.workflowId}`);
      }

      return {
        run: existing,
        eventIds: [],
      };
    }

    const startedAt = new Date().toISOString();
    const queuedRun: RunStatusV1 = {
      runId: options.runId,
      workflowId: options.workflow.workflowId,
      workflowVersion: options.workflow.version,
      status: "queued",
      startedAt,
      input: toJsonValue(options.input ?? {}),
      traceLinks: defaultTraceLinks(options.baseUrl, options.runId, {
        inngestBaseUrl: options.runtime.inngestBaseUrl,
      }),
    };

    await options.runtime.saveRunStatus(queuedRun);
    await options.runtime.appendTimeline(
      queuedRun.runId,
      createDeskEvent({
        runId: queuedRun.runId,
        workflowId: queuedRun.workflowId,
        type: "run.started",
        status: "queued",
        detail: "Coordination run queued for Inngest execution",
        payload: queuedRun.input,
      }),
    );

    const sendResult = await options.client.send({
      name: COORDINATION_RUN_EVENT,
      data: {
        runId: options.runId,
        workflow: options.workflow,
        input: toJsonValue(options.input ?? {}),
        baseUrl: options.baseUrl,
      },
    });

    const firstEventId = sendResult.ids[0];
    const latestRun = await options.runtime.getRunStatus(options.runId);
    const baseRun = latestRun ?? queuedRun;
    const updatedRun: RunStatusV1 = {
      ...baseRun,
      traceLinks: defaultTraceLinks(options.baseUrl, options.runId, {
        inngestBaseUrl: options.runtime.inngestBaseUrl,
        inngestRunId: baseRun.status === "running" || baseRun.status === "completed" || baseRun.status === "failed"
          ? extractInngestRunId(baseRun.traceLinks)
          : undefined,
        inngestEventId: firstEventId,
      }),
    };
    await options.runtime.saveRunStatus(updatedRun);

    return {
      run: updatedRun,
      eventIds: sendResult.ids,
    };
  });
}

export function createCoordinationInngestFunction(input: {
  runtime: CoordinationRuntimeAdapter;
  client?: Inngest;
  appId?: string;
}): CoordinationFunctionBundle {
  const client = input.client ?? createInngestClient(input.appId);

  const runner = client.createFunction(
    {
      id: COORDINATION_FUNCTION_ID,
      name: "Coordination Workflow Runner",
      retries: 2,
    },
    { event: COORDINATION_RUN_EVENT },
    async ({ event, runId, step }) => {
      const payload = parseRunEventPayload(event.data);
      if (!payload) {
        throw new Error("Invalid coordination run payload");
      }
      const result = await processCoordinationRunEvent({
        payload,
        runtime: input.runtime,
        inngestRunId: runId,
        inngestEventId: event.id,
        step,
      });
      return { ok: true, runId: payload.runId, output: result.output };
    },
  );

  return {
    client,
    functions: [runner],
  };
}

export async function processCoordinationRunEvent(options: CoordinationRunProcessorOptions): Promise<{ output: JsonValue }> {
  const validation = validateWorkflow(options.payload.workflow);
  if (!validation.ok) {
    const details = validation.errors.map((entry) => entry.message).join("; ");
    throw new Error(`Workflow validation failed: ${details}`);
  }

  const priorRun = await options.runtime.getRunStatus(options.payload.runId);
  const startedAt = priorRun?.startedAt ?? new Date().toISOString();

  await options.step.run("coordination/run-start", async () => {
    const runningStatus: RunStatusV1 = {
      runId: options.payload.runId,
      workflowId: options.payload.workflow.workflowId,
      workflowVersion: options.payload.workflow.version,
      status: "running",
      startedAt,
      input: toJsonValue(options.payload.input ?? {}),
      traceLinks: defaultTraceLinks(options.payload.baseUrl, options.payload.runId, {
        inngestBaseUrl: options.runtime.inngestBaseUrl,
        inngestRunId: options.inngestRunId,
        inngestEventId: options.inngestEventId,
      }),
    };

    await options.runtime.saveRunStatus(runningStatus);
    await options.runtime.appendTimeline(
      options.payload.runId,
      createDeskEvent({
        runId: options.payload.runId,
        workflowId: options.payload.workflow.workflowId,
        type: "run.started",
        status: "running",
        detail: `Inngest execution started (${options.inngestRunId})`,
        payload: runningStatus.input,
      }),
    );
  });

  try {
    const engine = buildEngine({
      workflow: options.payload.workflow,
      runId: options.payload.runId,
      input: options.payload.input ?? {},
      step: options.step,
      runtime: options.runtime,
    });

    const execution = await engine.run({
      event: options.payload.input ?? {},
      step: options.step,
    });

    const output = finalOutputFromState(options.payload.workflow, execution.state, options.payload.input ?? {});

    await options.step.run("coordination/run-completed", async () => {
      const finishedAt = new Date().toISOString();
      const completedStatus: RunStatusV1 = {
        runId: options.payload.runId,
        workflowId: options.payload.workflow.workflowId,
        workflowVersion: options.payload.workflow.version,
        status: "completed",
        startedAt,
        finishedAt,
        input: toJsonValue(options.payload.input ?? {}),
        output: toJsonValue(output),
        traceLinks: defaultTraceLinks(options.payload.baseUrl, options.payload.runId, {
          inngestBaseUrl: options.runtime.inngestBaseUrl,
          inngestRunId: options.inngestRunId,
          inngestEventId: options.inngestEventId,
        }),
      };

      await options.runtime.saveRunStatus(completedStatus);
      await options.runtime.appendTimeline(
        options.payload.runId,
        createDeskEvent({
          runId: options.payload.runId,
          workflowId: options.payload.workflow.workflowId,
          type: "run.completed",
          status: "completed",
          detail: `Inngest execution completed (${options.inngestRunId})`,
          payload: completedStatus.output,
        }),
      );
    });

    return { output: toJsonValue(output) };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await options.step.run("coordination/run-failed", async () => {
      const failedAt = new Date().toISOString();
      const failedStatus: RunStatusV1 = {
        runId: options.payload.runId,
        workflowId: options.payload.workflow.workflowId,
        workflowVersion: options.payload.workflow.version,
        status: "failed",
        startedAt,
        finishedAt: failedAt,
        input: toJsonValue(options.payload.input ?? {}),
        error,
        traceLinks: defaultTraceLinks(options.payload.baseUrl, options.payload.runId, {
          inngestBaseUrl: options.runtime.inngestBaseUrl,
          inngestRunId: options.inngestRunId,
          inngestEventId: options.inngestEventId,
        }),
      };

      await options.runtime.saveRunStatus(failedStatus);
      await options.runtime.appendTimeline(
        options.payload.runId,
        createDeskEvent({
          runId: options.payload.runId,
          workflowId: options.payload.workflow.workflowId,
          type: "run.failed",
          status: "failed",
          detail: error,
          payload: failedStatus.input,
        }),
      );
    });

    throw err;
  }
}

function parseRunEventPayload(value: unknown): CoordinationRunEventData | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<CoordinationRunEventData>;

  if (typeof payload.runId !== "string" || payload.runId.trim() === "") return null;
  if (!isSafeCoordinationId(payload.runId)) return null;
  if (typeof payload.baseUrl !== "string" || payload.baseUrl.trim() === "") return null;
  if (!payload.workflow || typeof payload.workflow !== "object") return null;

  return {
    runId: payload.runId,
    baseUrl: payload.baseUrl,
    workflow: payload.workflow,
    input: toJsonValue(payload.input ?? {}),
  };
}

function buildEngine(input: {
  workflow: CoordinationWorkflowV1;
  runId: string;
  input: JsonValue;
  step: StepToolLike;
  runtime: CoordinationRuntimeAdapter;
}): Engine {
  const deskById = new Map(input.workflow.desks.map((desk) => [desk.deskId, desk]));
  const kinds = new Set(input.workflow.desks.map((desk) => desk.kind));

  const handler: EngineAction["handler"] = async ({ workflowAction, state, step }) => {
    const desk = deskById.get(workflowAction.id);
    if (!desk) {
      throw new Error(`Unknown desk action id: ${workflowAction.id}`);
    }

    const inbound = inboundPayload(input.workflow, desk.deskId, state, input.input);
    await step.run(`desk/${desk.deskId}/started`, async () => {
      await input.runtime.appendTimeline(
        input.runId,
        createDeskEvent({
          runId: input.runId,
          workflowId: input.workflow.workflowId,
          deskId: desk.deskId,
          type: "desk.started",
          status: "running",
          detail: `${desk.name} started`,
          payload: toJsonValue(inbound),
        }),
      );
    });

    const memory = await step.run(`desk/${desk.deskId}/memory-read`, async () => {
      return input.runtime.readMemory(input.workflow, desk.deskId);
    });

    const output = await step.run(`desk/${desk.deskId}/execute`, async () => {
      return deskOutput(desk, inbound, memory);
    });

    if (desk.memoryScope.persist) {
      await step.run(`desk/${desk.deskId}/memory-write`, async () => {
        await input.runtime.writeMemory(input.workflow, desk, toJsonValue(output));
      });
    }

    await step.run(`desk/${desk.deskId}/completed`, async () => {
      await input.runtime.appendTimeline(
        input.runId,
        createDeskEvent({
          runId: input.runId,
          workflowId: input.workflow.workflowId,
          deskId: desk.deskId,
          type: "desk.completed",
          status: "running",
          detail: `${desk.name} completed`,
          payload: toJsonValue(output),
        }),
      );
    });

    return output;
  };

  const actions: EngineAction[] = Array.from(kinds).map((kind) => ({
    kind,
    name: DESK_KIND_META[kind]?.name ?? kind,
    description: DESK_KIND_META[kind]?.description,
    handler,
  }));

  return new Engine({
    actions,
    loader: async () => toWorkflowKitWorkflow(input.workflow),
  });
}

function inboundPayload(
  workflow: CoordinationWorkflowV1,
  deskId: string,
  state: Map<string, unknown>,
  initialInput: JsonValue,
): unknown {
  const upstream = workflow.handoffs.filter((handoff) => handoff.toDeskId === deskId).map((handoff) => handoff.fromDeskId);
  if (upstream.length === 0) {
    return initialInput;
  }
  if (upstream.length === 1) {
    return state.get(upstream[0]) ?? {};
  }
  return Object.fromEntries(upstream.map((id) => [id, state.get(id) ?? null]));
}

function deskOutput(desk: DeskDefinitionV1, received: unknown, memory: unknown): Record<string, unknown> {
  if (desk.kind === "desk:human-wait") {
    return {
      deskId: desk.deskId,
      status: "received",
      received,
      memory,
    };
  }

  if (desk.kind === "desk:join") {
    return {
      deskId: desk.deskId,
      status: "joined",
      merged: received,
      memory,
    };
  }

  return {
    deskId: desk.deskId,
    status: "ok",
    kind: desk.kind,
    received,
    memory,
  };
}

function finalOutputFromState(
  workflow: CoordinationWorkflowV1,
  state: Map<string, unknown>,
  initialInput: JsonValue,
): JsonValue {
  const order = topologicalDeskOrder(workflow);
  const finalDeskId = order[order.length - 1];
  if (!finalDeskId) {
    return toJsonValue(initialInput);
  }
  return toJsonValue(state.get(finalDeskId) ?? initialInput);
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function extractInngestRunId(links: RunStatusV1["traceLinks"]): string | undefined {
  const inngest = links.find((link) => link.provider === "inngest");
  if (!inngest) return undefined;
  const match = inngest.url.match(/\/runs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
