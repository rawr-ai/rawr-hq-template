export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | { [key: string]: JsonValue }
  | JsonValue[];

export type JsonSchemaV1 = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  description?: string;
  properties?: Record<string, JsonSchemaV1>;
  required?: string[];
  items?: JsonSchemaV1;
  enum?: JsonPrimitive[];
  additionalProperties?: boolean | JsonSchemaV1;
  oneOf?: JsonSchemaV1[];
  anyOf?: JsonSchemaV1[];
  allOf?: JsonSchemaV1[];
};

export const DESK_KINDS_V1 = [
  "desk:analysis",
  "desk:execution",
  "desk:qa",
  "desk:join",
  "desk:human-wait",
  "desk:observer",
] as const;

export type DeskKindV1 = (typeof DESK_KINDS_V1)[number];

export type RuntimePolicyV1 = Readonly<{
  retries?: number;
  timeoutSeconds?: number;
  priority?: "low" | "normal" | "high";
}>;

export type DeskMemoryScopeV1 = Readonly<{
  persist: boolean;
  ttlSeconds?: number;
  namespace?: string;
}>;

export type DeskDefinitionV1 = Readonly<{
  deskId: string;
  kind: DeskKindV1 | string;
  name: string;
  responsibility: string;
  domain: string;
  inputSchema: JsonSchemaV1;
  outputSchema: JsonSchemaV1;
  memoryScope: DeskMemoryScopeV1;
  runtimePolicy?: RuntimePolicyV1;
}>;

export type HandoffDefinitionV1 = Readonly<{
  handoffId: string;
  fromDeskId: string;
  toDeskId: string;
  condition?: string;
  mappingRefs?: Record<string, string>;
}>;

export type CoordinationWorkflowV1 = Readonly<{
  workflowId: string;
  version: number;
  name: string;
  description?: string;
  entryDeskId: string;
  desks: DeskDefinitionV1[];
  handoffs: HandoffDefinitionV1[];
  observabilityProfile?: "basic" | "full";
  updatedAt?: string;
}>;

export type DeskMemoryRecordV1 = Readonly<{
  workflowId: string;
  workflowVersion: number;
  deskId: string;
  memoryKey: string;
  data: JsonValue;
  updatedAt: string;
  expiresAt?: string;
}>;

export type RunTraceLinkV1 = Readonly<{
  provider: "inngest" | "rawr";
  label: string;
  url: string;
}>;

export type RunLifecycleStateV1 = "queued" | "running" | "completed" | "failed";

export type RunFinalizationDeliveryV1 = "at-least-once";
export type RunFinalizationSideEffectPolicyV1 = "idempotent-non-critical";
export type RunFinalizationFailureModeV1 = "best-effort-non-blocking";
export type RunFinishedHookOutcomeV1 = "succeeded" | "failed" | "skipped";

export type RunFinishedHookStateV1 = Readonly<{
  attemptedAt: string;
  outcome: RunFinishedHookOutcomeV1;
  nonCritical: true;
  idempotencyRequired: true;
  timeoutMs: number;
  error?: string;
}>;

export type RunFinalizationContractV1 = Readonly<{
  delivery: RunFinalizationDeliveryV1;
  exactlyOnce: false;
  sideEffectPolicy: RunFinalizationSideEffectPolicyV1;
  failureMode: RunFinalizationFailureModeV1;
}>;

export type RunFinalizationStateV1 = Readonly<{
  contract: RunFinalizationContractV1;
  finishedHook?: RunFinishedHookStateV1;
}>;

export const RUN_FINALIZATION_CONTRACT_V1: RunFinalizationContractV1 = {
  delivery: "at-least-once",
  exactlyOnce: false,
  sideEffectPolicy: "idempotent-non-critical",
  failureMode: "best-effort-non-blocking",
} as const;

export type RunStatusV1 = Readonly<{
  runId: string;
  workflowId: string;
  workflowVersion: number;
  status: RunLifecycleStateV1;
  startedAt: string;
  finishedAt?: string;
  input?: JsonValue;
  output?: JsonValue;
  error?: string;
  traceLinks: RunTraceLinkV1[];
  finalization?: RunFinalizationStateV1;
}>;

export type DeskRunEventTypeV1 =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "desk.started"
  | "desk.completed"
  | "desk.failed";

export type DeskRunEventV1 = Readonly<{
  eventId: string;
  runId: string;
  workflowId: string;
  deskId?: string;
  type: DeskRunEventTypeV1;
  ts: string;
  status: RunLifecycleStateV1;
  detail?: string;
  input?: JsonValue;
  output?: JsonValue;
}>;

export type ValidationErrorCodeV1 =
  | "MISSING_WORKFLOW_ID"
  | "INVALID_WORKFLOW_ID_FORMAT"
  | "MISSING_ENTRY_DESK"
  | "DUPLICATE_DESK_ID"
  | "INVALID_DESK_ID_FORMAT"
  | "INVALID_HANDOFF_ID_FORMAT"
  | "INVALID_MEMORY_SCOPE"
  | "UNKNOWN_DESK_KIND"
  | "EDGE_UNKNOWN_SOURCE"
  | "EDGE_UNKNOWN_TARGET"
  | "CYCLE_DETECTED"
  | "DISCONNECTED_DESK"
  | "INCOMPATIBLE_HANDOFF"
  | "ILLEGAL_FAN_IN_WITHOUT_JOIN";

export type ValidationErrorV1 = Readonly<{
  code: ValidationErrorCodeV1;
  message: string;
  deskId?: string;
  handoffId?: string;
}>;

export type ValidationResultV1 = Readonly<{
  ok: boolean;
  errors: ValidationErrorV1[];
}>;
