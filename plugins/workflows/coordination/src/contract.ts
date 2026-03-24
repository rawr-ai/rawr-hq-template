import { oc } from "@orpc/contract";
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import {
  CoordinationIdInputSchema,
  CoordinationIdSchema,
  DeskRunEventSchema,
  JsonValueSchema,
  RunStatusSchema,
} from "@rawr/coordination/domain/schemas";

const coordinationTag = ["coordination"] as const;
const workflowContractProcedure = oc.errors({
  INVALID_WORKFLOW_ID: {
    status: 400,
    message: "Invalid workflowId format",
    data: schema(
      Type.Object(
        {
          workflowId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        },
        { additionalProperties: false },
      ),
    ),
  },
  WORKFLOW_NOT_FOUND: {
    status: 404,
    message: "workflow not found",
    data: schema(
      Type.Object(
        {
          workflowId: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  INVALID_RUN_ID: {
    status: 400,
    message: "runId must be a string when provided",
    data: schema(
      Type.Object(
        {
          runId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        },
        { additionalProperties: false },
      ),
    ),
  },
  RUN_NOT_FOUND: {
    status: 404,
    message: "run not found",
    data: schema(
      Type.Object(
        {
          runId: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  RUN_QUEUE_FAILED: {
    status: 500,
    message: "Workflow run failed",
    data: schema(
      Type.Object(
        {
          run: RunStatusSchema,
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const);

export const QueueRunInputSchema = Type.Object(
  {
    workflowId: CoordinationIdInputSchema,
    runId: Type.Optional(CoordinationIdInputSchema),
    input: Type.Optional(JsonValueSchema),
  },
  { additionalProperties: false },
);

export const QueueRunOutputSchema = Type.Object(
  {
    run: RunStatusSchema,
    eventIds: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const GetRunStatusInputSchema = Type.Object(
  { runId: CoordinationIdInputSchema },
  { additionalProperties: false },
);

export const GetRunStatusOutputSchema = Type.Object(
  { run: RunStatusSchema },
  { additionalProperties: false },
);

export const GetRunTimelineInputSchema = Type.Object(
  { runId: CoordinationIdInputSchema },
  { additionalProperties: false },
);

export const GetRunTimelineOutputSchema = Type.Object(
  {
    runId: CoordinationIdSchema,
    timeline: Type.Array(DeskRunEventSchema),
  },
  { additionalProperties: false },
);

export const coordinationWorkflowRouterContract = {
  coordination: {
    queueRun: workflowContractProcedure
      .meta({
        domain: "coordination",
        audience: "internal",
        entity: "run",
        idempotent: false,
      })
      .route({
        method: "POST",
        path: "/coordination/workflows/{workflowId}/run",
        tags: coordinationTag,
        summary: "Queue a coordination workflow run",
        operationId: "coordinationWorkflowQueueRun",
      })
      .input(schema(QueueRunInputSchema))
      .output(schema(QueueRunOutputSchema)),
    getRunStatus: workflowContractProcedure
      .meta({
        domain: "coordination",
        audience: "internal",
        entity: "run",
        idempotent: true,
      })
      .route({
        method: "GET",
        path: "/coordination/runs/{runId}",
        tags: coordinationTag,
        summary: "Get coordination workflow run status",
        operationId: "coordinationWorkflowGetRunStatus",
      })
      .input(schema(GetRunStatusInputSchema))
      .output(schema(GetRunStatusOutputSchema)),
    getRunTimeline: workflowContractProcedure
      .meta({
        domain: "coordination",
        audience: "internal",
        entity: "run",
        idempotent: true,
      })
      .route({
        method: "GET",
        path: "/coordination/runs/{runId}/timeline",
        tags: coordinationTag,
        summary: "Get coordination workflow run timeline",
        operationId: "coordinationWorkflowGetRunTimeline",
      })
      .input(schema(GetRunTimelineInputSchema))
      .output(schema(GetRunTimelineOutputSchema)),
  },
} as const;

export const coordinationWorkflowContract = coordinationWorkflowRouterContract;

export type CoordinationWorkflowContract = typeof coordinationWorkflowContract;
