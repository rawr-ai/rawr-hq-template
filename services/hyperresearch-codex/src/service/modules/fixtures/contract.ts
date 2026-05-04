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
} from "../../shared/entities";

const RunSyntheticSliceInputSchema = Type.Object(
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

const HyperresearchFixtureResultSchema = Type.Object(
  {
    ledgerPath: Type.String({ minLength: 1 }),
    ledger: HyperresearchRunLedgerSchema,
    integrity: Type.Array(HyperresearchIntegrityFindingSchema),
  },
  { additionalProperties: false },
);

export const contract = {
  runSyntheticSlice: ocBase
    .meta({ idempotent: false, entity: "fixtures" })
    .input(schema(RunSyntheticSliceInputSchema))
    .output(schema(HyperresearchFixtureResultSchema)),
};
