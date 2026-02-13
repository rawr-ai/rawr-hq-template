import type { Schema, SchemaIssue } from "@orpc/contract";
import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";
import type {
  CoordinationWorkflowV1,
  DeskDefinitionV1,
  DeskMemoryScopeV1,
  DeskRunEventV1,
  HandoffDefinitionV1,
  JsonSchemaV1,
  JsonValue,
  RunStatusV1,
  RuntimePolicyV1,
  ValidationErrorV1,
  ValidationResultV1,
} from "../types";

const JsonValueSchema = Type.Unsafe<JsonValue>({
  title: "JsonValue",
});

const JsonSchemaV1Schema = Type.Unsafe<JsonSchemaV1>({
  type: "object",
  title: "JsonSchemaV1",
});

const RuntimePolicySchema = Type.Unsafe<RuntimePolicyV1>(
  Type.Object(
    {
      retries: Type.Optional(Type.Integer({ minimum: 0 })),
      timeoutSeconds: Type.Optional(Type.Integer({ minimum: 0 })),
      priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")])),
    },
    { additionalProperties: false },
  ),
);

const DeskMemoryScopeSchema = Type.Unsafe<DeskMemoryScopeV1>(
  Type.Object(
    {
      persist: Type.Boolean(),
      ttlSeconds: Type.Optional(Type.Integer({ minimum: 0 })),
      namespace: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
);

const DeskDefinitionSchema = Type.Unsafe<DeskDefinitionV1>(
  Type.Object(
    {
      deskId: Type.String({ minLength: 1 }),
      kind: Type.String({ minLength: 1 }),
      name: Type.String({ minLength: 1 }),
      responsibility: Type.String({ minLength: 1 }),
      domain: Type.String({ minLength: 1 }),
      inputSchema: JsonSchemaV1Schema,
      outputSchema: JsonSchemaV1Schema,
      memoryScope: DeskMemoryScopeSchema,
      runtimePolicy: Type.Optional(RuntimePolicySchema),
    },
    { additionalProperties: false },
  ),
);

const HandoffDefinitionSchema = Type.Unsafe<HandoffDefinitionV1>(
  Type.Object(
    {
      handoffId: Type.String({ minLength: 1 }),
      fromDeskId: Type.String({ minLength: 1 }),
      toDeskId: Type.String({ minLength: 1 }),
      condition: Type.Optional(Type.String()),
      mappingRefs: Type.Optional(Type.Record(Type.String(), Type.String())),
    },
    { additionalProperties: false },
  ),
);

export const CoordinationWorkflowSchema = Type.Unsafe<CoordinationWorkflowV1>(
  Type.Object(
    {
      workflowId: Type.String({ minLength: 1 }),
      version: Type.Integer({ minimum: 1 }),
      name: Type.String({ minLength: 1 }),
      description: Type.Optional(Type.String()),
      entryDeskId: Type.String({ minLength: 1 }),
      desks: Type.Array(DeskDefinitionSchema),
      handoffs: Type.Array(HandoffDefinitionSchema),
      observabilityProfile: Type.Optional(Type.Union([Type.Literal("basic"), Type.Literal("full")])),
      updatedAt: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
);

const RunTraceLinkSchema = Type.Object(
  {
    provider: Type.Union([Type.Literal("inngest"), Type.Literal("rawr")]),
    label: Type.String(),
    url: Type.String(),
  },
  { additionalProperties: false },
);

export const RunStatusSchema = Type.Unsafe<RunStatusV1>(
  Type.Object(
    {
      runId: Type.String({ minLength: 1 }),
      workflowId: Type.String({ minLength: 1 }),
      workflowVersion: Type.Integer({ minimum: 1 }),
      status: Type.Union([
        Type.Literal("queued"),
        Type.Literal("running"),
        Type.Literal("completed"),
        Type.Literal("failed"),
      ]),
      startedAt: Type.String(),
      finishedAt: Type.Optional(Type.String()),
      input: Type.Optional(JsonValueSchema),
      output: Type.Optional(JsonValueSchema),
      error: Type.Optional(Type.String()),
      traceLinks: Type.Array(RunTraceLinkSchema),
    },
    { additionalProperties: false },
  ),
);

export const DeskRunEventSchema = Type.Unsafe<DeskRunEventV1>(
  Type.Object(
    {
      eventId: Type.String({ minLength: 1 }),
      runId: Type.String({ minLength: 1 }),
      workflowId: Type.String({ minLength: 1 }),
      deskId: Type.Optional(Type.String()),
      type: Type.Union([
        Type.Literal("run.started"),
        Type.Literal("run.completed"),
        Type.Literal("run.failed"),
        Type.Literal("desk.started"),
        Type.Literal("desk.completed"),
        Type.Literal("desk.failed"),
      ]),
      ts: Type.String(),
      status: Type.Union([
        Type.Literal("queued"),
        Type.Literal("running"),
        Type.Literal("completed"),
        Type.Literal("failed"),
      ]),
      detail: Type.Optional(Type.String()),
      input: Type.Optional(JsonValueSchema),
      output: Type.Optional(JsonValueSchema),
    },
    { additionalProperties: false },
  ),
);

const ValidationErrorSchema = Type.Unsafe<ValidationErrorV1>(
  Type.Object(
    {
      code: Type.String({ minLength: 1 }),
      message: Type.String({ minLength: 1 }),
      deskId: Type.Optional(Type.String()),
      handoffId: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
);

export const ValidationResultSchema = Type.Unsafe<ValidationResultV1>(
  Type.Object(
    {
      ok: Type.Boolean(),
      errors: Type.Array(ValidationErrorSchema),
    },
    { additionalProperties: false },
  ),
);

export const ListWorkflowsInputSchema = Type.Object({}, { additionalProperties: false });
export const ListWorkflowsOutputSchema = Type.Object(
  { workflows: Type.Array(CoordinationWorkflowSchema) },
  { additionalProperties: false },
);

export const SaveWorkflowInputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);
export const SaveWorkflowOutputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);

export const GetWorkflowInputSchema = Type.Object(
  { workflowId: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);
export const GetWorkflowOutputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);

export const ValidateWorkflowInputSchema = Type.Object(
  { workflowId: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);
export const ValidateWorkflowOutputSchema = Type.Object(
  {
    workflowId: Type.String({ minLength: 1 }),
    validation: ValidationResultSchema,
  },
  { additionalProperties: false },
);

export const QueueRunInputSchema = Type.Object(
  {
    workflowId: Type.String({ minLength: 1 }),
    runId: Type.Optional(Type.String({ minLength: 1 })),
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
  { runId: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);
export const GetRunStatusOutputSchema = Type.Object(
  { run: RunStatusSchema },
  { additionalProperties: false },
);

export const GetRunTimelineInputSchema = Type.Object(
  { runId: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);
export const GetRunTimelineOutputSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    timeline: Type.Array(DeskRunEventSchema),
  },
  { additionalProperties: false },
);

function decodePathSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;
  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodePathSegment(segment))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
  return segments.length > 0 ? segments : undefined;
}

export function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) {
          return { value: value as Static<T> };
        }

        const issues = [...Value.Errors(schema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });

        return {
          issues: issues.length > 0 ? issues : [{ message: "Validation failed" }],
        };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
