import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { HyperresearchIntegrityFindingSchema } from "../../../model/dto";
import { HyperresearchAgentJobSchema } from "../../../model/entities";
import { V8RunStatusSchema } from "../model/dto";
import { HyperresearchV8RunLedgerSchema } from "../model/entities";

const HyperresearchTierInputSchema = Type.Union([
  Type.Literal("auto"),
  Type.Literal("light"),
  Type.Literal("full"),
]);

const StartV8RunInputSchema = Type.Object(
  {
    canonicalQuery: Type.String({
      description: "Normalized research question that defines the run's subject.",
      minLength: 1,
    }),
    tier: Type.Optional(HyperresearchTierInputSchema),
    vaultRoot: Type.String({
      description: "Filesystem root of the research vault that owns run artifacts.",
      minLength: 1,
    }),
    stepsRoot: Type.String({
      description: "Filesystem root containing the step definitions admitted for this run.",
      minLength: 1,
    }),
    ledgerPath: Type.Optional(
      Type.String({
        description: "Optional V8 ledger location to reuse when present or initialize when absent.",
        minLength: 1,
      })
    ),
    vaultTag: Type.Optional(
      Type.String({
        description: "Vault classification tag recorded with the initialized run.",
        minLength: 1,
      })
    ),
    wrapperRequirements: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), {
        description: "Additional wrapper constraints that delegated agent work must preserve.",
      })
    ),
  },
  { additionalProperties: false }
);

const AdvanceV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({
      description: "Filesystem path of the V8 ledger to advance.",
      minLength: 1,
    }),
    agentMode: Type.Optional(
      Type.Union([Type.Literal("packets"), Type.Literal("synthesize")], {
        description: "Mode used to emit delegated work or synthesize its bounded result locally.",
      })
    ),
    maxSteps: Type.Optional(
      Type.Number({
        description:
          "Positive completed-step bound; a fractional value permits the next whole step before the bound is met.",
        minimum: 1,
      })
    ),
    resumeReason: Type.Optional(
      Type.String({
        description: "Operator reason recorded for this resumed advance.",
        minLength: 1,
      })
    ),
  },
  { additionalProperties: false }
);

const InspectV8RunInputSchema = Type.Object(
  {
    ledgerPath: Type.String({
      description: "Filesystem path of the V8 ledger to inspect or validate.",
      minLength: 1,
    }),
  },
  { additionalProperties: false }
);

const V8RunnerResultSchema = Type.Object(
  {
    ledgerPath: Type.String({
      description: "Filesystem path of the V8 ledger represented by this result.",
      minLength: 1,
    }),
    status: V8RunStatusSchema,
    ledger: HyperresearchV8RunLedgerSchema,
    pendingAgentJobs: Type.Array(HyperresearchAgentJobSchema, {
      description: "Delegated agent jobs that must complete before the run can advance.",
    }),
    integrity: Type.Array(HyperresearchIntegrityFindingSchema, {
      description: "Integrity findings observed while producing the run result.",
    }),
  },
  { additionalProperties: false }
);

const V8ValidationResultSchema = Type.Object(
  {
    ledgerPath: Type.String({
      description: "Filesystem path of the V8 ledger evaluated by validation.",
      minLength: 1,
    }),
    status: V8RunStatusSchema,
    passed: Type.Boolean({
      description:
        "Whether the run is complete and has no integrity finding that blocks acceptance.",
    }),
    ledger: HyperresearchV8RunLedgerSchema,
    blockingFindings: Type.Array(HyperresearchIntegrityFindingSchema, {
      description: "Integrity findings that prevent the run from passing validation.",
    }),
    warningFindings: Type.Array(HyperresearchIntegrityFindingSchema, {
      description: "Nonblocking integrity findings retained for operator review.",
    }),
  },
  { additionalProperties: false }
);

export const runs = {
  startV8Run: oc
    .meta(procedureMetadata({ idempotent: false, entity: "runs" }))
    .input(standard(StartV8RunInputSchema))
    .output(standard(V8RunnerResultSchema)),
  advanceV8Run: oc
    .meta(procedureMetadata({ idempotent: false, entity: "runs" }))
    .input(standard(AdvanceV8RunInputSchema))
    .output(standard(V8RunnerResultSchema)),
  inspectV8Run: oc
    .meta(procedureMetadata({ idempotent: true, entity: "runs" }))
    .input(standard(InspectV8RunInputSchema))
    .output(standard(V8RunnerResultSchema)),
  validateV8Run: oc
    .meta(procedureMetadata({ idempotent: true, entity: "runs" }))
    .input(standard(InspectV8RunInputSchema))
    .output(standard(V8ValidationResultSchema)),
};
