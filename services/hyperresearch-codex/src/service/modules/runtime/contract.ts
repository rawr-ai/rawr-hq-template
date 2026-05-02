/**
 * @fileoverview Runtime module contract for Hyperresearch Codex orchestration.
 */
import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  HyperresearchAgentJobSchema,
  HyperresearchIntegrityFindingSchema,
  HyperresearchRunLedgerSchema,
  HyperresearchTierSchema,
  HyperresearchV8RunLedgerSchema,
  V8RunStatusSchema,
} from "./entities";

export const RunSyntheticSliceInputSchema = Type.Object(
  {
    canonicalQuery: Type.String({ minLength: 1 }),
    tier: HyperresearchTierSchema,
    vaultRoot: Type.String({ minLength: 1 }),
    stepsRoot: Type.String({ minLength: 1 }),
    artifactRoot: Type.Optional(Type.String({ minLength: 1 })),
    ledgerPath: Type.Optional(Type.String({ minLength: 1 })),
    maxSteps: Type.Optional(Type.Number({ minimum: 1 })),
    resumeReason: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type RunSyntheticSliceInput = Static<typeof RunSyntheticSliceInputSchema>;

export const HyperresearchRunnerResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    ledger: HyperresearchRunLedgerSchema,
    integrity: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);
export type HyperresearchRunnerResult = Static<typeof HyperresearchRunnerResultSchema>;

export const HyperresearchTierInputSchema = Type.Union([
  Type.Literal("auto"),
  Type.Literal("light"),
  Type.Literal("full"),
]);
export type HyperresearchTierInput = Static<typeof HyperresearchTierInputSchema>;

export const StartV8RunInputSchema = Type.Object(
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
export type StartV8RunInput = Static<typeof StartV8RunInputSchema>;

export const AdvanceV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    agentMode: Type.Optional(Type.Union([Type.Literal("packets"), Type.Literal("synthesize")])),
    maxSteps: Type.Optional(Type.Number({ minimum: 1 })),
    resumeReason: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type AdvanceV8RunInput = Static<typeof AdvanceV8RunInputSchema>;

export const InspectV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type InspectV8RunInput = Static<typeof InspectV8RunInputSchema>;

export const V8RunnerResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    status: V8RunStatusSchema,
    ledger: HyperresearchV8RunLedgerSchema,
    pendingAgentJobs: Type.Array(HyperresearchAgentJobSchema),
    integrity: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);
export type V8RunnerResult = Static<typeof V8RunnerResultSchema>;

export const V8ValidationResultSchema = Type.Object(
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
export type V8ValidationResult = Static<typeof V8ValidationResultSchema>;

export const contract = {
  runSyntheticSlice: ocBase
    .meta({ idempotent: false, entity: "runtime" })
    .input(schema(RunSyntheticSliceInputSchema))
    .output(schema(HyperresearchRunnerResultSchema)),
  startV8Run: ocBase
    .meta({ idempotent: false, entity: "runtime" })
    .input(schema(StartV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  advanceV8Run: ocBase
    .meta({ idempotent: false, entity: "runtime" })
    .input(schema(AdvanceV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  inspectV8Run: ocBase
    .meta({ idempotent: true, entity: "runtime" })
    .input(schema(InspectV8RunInputSchema))
    .output(schema(V8RunnerResultSchema)),
  validateV8Run: ocBase
    .meta({ idempotent: true, entity: "runtime" })
    .input(schema(InspectV8RunInputSchema))
    .output(schema(V8ValidationResultSchema)),
};
