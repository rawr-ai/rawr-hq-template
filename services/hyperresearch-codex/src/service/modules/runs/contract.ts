import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  HyperresearchAgentJobSchema,
  HyperresearchIntegrityFindingSchema,
  HyperresearchV8RunLedgerSchema,
  V8RunStatusSchema,
} from "../../shared/entities";

const HyperresearchTierInputSchema = Type.Union([
  Type.Literal("auto"),
  Type.Literal("light"),
  Type.Literal("full"),
]);

const StartV8RunInputSchema = Type.Object(
  {
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: Type.Optional(HyperresearchTierInputSchema),
    vaultRoot: Type.String({ minLength: 1 }),
    stepsRoot: Type.String({ minLength: 1 }),
    ledgerPath: Type.Optional(Type.String({ minLength: 1 })),
    vaultTag: Type.Optional(Type.String({ minLength: 1 })),
    wrapperRequirements: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);

const AdvanceV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    agentMode: Type.Optional(Type.Union([Type.Literal("packets"), Type.Literal("synthesize")])),
    maxSteps: Type.Optional(Type.Number({ minimum: 1 })),
    resumeReason: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const InspectV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const V8RunnerResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    status: V8RunStatusSchema,
    ledger: HyperresearchV8RunLedgerSchema,
    pendingAgentJobs: Type.Array(HyperresearchAgentJobSchema),
    integrity: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);

const V8ValidationResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    status: V8RunStatusSchema,
    passed: Type.Boolean(),
    ledger: HyperresearchV8RunLedgerSchema,
    blockingFindings: Type.Array(HyperresearchIntegrityFindingSchema),
    warningFindings: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);

export const contract = {
  startV8Run: ocBase
    .meta({ idempotent: false, entity: "runs" })
    .input(schema(StartV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  advanceV8Run: ocBase
    .meta({ idempotent: false, entity: "runs" })
    .input(schema(AdvanceV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  inspectV8Run: ocBase
    .meta({ idempotent: true, entity: "runs" })
    .input(schema(InspectV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  validateV8Run: ocBase
    .meta({ idempotent: true, entity: "runs" })
    .input(schema(InspectV8RunInputSchema))
    .output(schema(V8ValidationResultSchema)),
};
