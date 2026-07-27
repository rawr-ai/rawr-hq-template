/**
 * @fileoverview Synthetic fixture procedure contract for Hyperresearch Codex.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  HyperresearchIntegrityFindingSchema,
  HyperresearchRunLedgerSchema,
  HyperresearchTierSchema,
} from "../../common/entities";

const RunSyntheticSliceInputSchema = Type.Object(
  {
    canonicalQuery: Type.String({
      description: "Normalized research question exercised by the synthetic slice.",
      minLength: 1,
    }),
    tier: HyperresearchTierSchema,
    vaultRoot: Type.String({
      description: "Filesystem root containing the fixture's research vault.",
      minLength: 1,
    }),
    stepsRoot: Type.String({
      description: "Filesystem root containing the synthetic step definitions to execute.",
      minLength: 1,
    }),
    artifactRoot: Type.Optional(
      Type.String({
        description: "Override root where the fixture writes produced artifacts.",
        minLength: 1,
      })
    ),
    ledgerPath: Type.Optional(
      Type.String({
        description:
          "Optional fixture ledger location to resume when present or initialize when absent.",
        minLength: 1,
      })
    ),
    maxSteps: Type.Optional(
      Type.Number({
        description:
          "Positive completed-step bound; a fractional value permits the next whole synthetic step before the bound is met.",
        minimum: 1,
      })
    ),
    resumeReason: Type.Optional(
      Type.String({
        description: "Operator reason recorded when resuming an existing fixture ledger.",
        minLength: 1,
      })
    ),
  },
  { additionalProperties: false }
);

const HyperresearchFixtureResultSchema = Type.Object(
  {
    ledgerPath: Type.String({
      description: "Filesystem path of the fixture ledger after execution.",
      minLength: 1,
    }),
    ledger: HyperresearchRunLedgerSchema,
    integrity: Type.Array(HyperresearchIntegrityFindingSchema, {
      description: "Integrity findings observed while executing and validating the fixture.",
    }),
  },
  { additionalProperties: false }
);

export const contract = {
  runSyntheticSlice: ocBase
    .meta({ idempotent: false, entity: "fixtures" })
    .input(schema(RunSyntheticSliceInputSchema))
    .output(schema(HyperresearchFixtureResultSchema)),
};
