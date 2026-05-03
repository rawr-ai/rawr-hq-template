import { schema } from "@rawr/hq-sdk";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";
import {
  INVALID_CONVERSATION_EXPORT,
  INVALID_CONVERSATION_JSON,
} from "../../shared/errors";
import { ocBase } from "../../base";
import { SourceSnapshotSchema } from "../source-materials/entities";
import {
  AmbiguityFlagSchema,
  AnomalySchema,
  FamilyGraphSchema,
  IntermediateGraphSchema,
  InventoryItemSchema,
  ManifestSchema,
  NormalizedThreadSchema,
  OutputDirectoryEntrySchema,
  OutputEntrySchema,
  RelationshipSchema,
  SourceCountsSchema,
  ValidationReportSchema,
} from "./entities";

const ValidationFailedData = schema(
  Type.Object(
    {
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

const CORPUS_ARTIFACT_VALIDATION_FAILED: ErrorMapItem<typeof ValidationFailedData> = {
  status: 422,
  message: "Corpus artifact validation failed",
  data: ValidationFailedData,
} as const;

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const BuildArtifactsInputSchema = Type.Object(
  {
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false },
);
const BuildArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({ minimum: 0 }),
    normalizedThreadCount: Type.Number({ minimum: 0 }),
    anomalyCount: Type.Number({ minimum: 0 }),
    warnings: Type.Array(Type.String()),
    inventory: Type.Array(InventoryItemSchema),
    familyGraphs: Type.Array(FamilyGraphSchema),
    relationships: Type.Array(RelationshipSchema),
    normalizedThreads: Type.Array(NormalizedThreadSchema),
    intermediateGraph: IntermediateGraphSchema,
    manifest: ManifestSchema,
    anomalies: Type.Array(AnomalySchema),
    ambiguityFlags: Type.Array(AmbiguityFlagSchema),
    validationReport: ValidationReportSchema,
    canonicalitySummary: Type.String(),
    decisionLog: Type.String(),
    mentalMap: Type.String(),
    outputDirectories: Type.Array(OutputDirectoryEntrySchema),
    outputEntries: Type.Array(OutputEntrySchema),
  },
  { additionalProperties: false },
);
const MaterializeArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({ minimum: 0 }),
    normalizedThreadCount: Type.Number({ minimum: 0 }),
    anomalyCount: Type.Number({ minimum: 0 }),
    warnings: Type.Array(Type.String()),
    outputDirectories: Type.Array(OutputDirectoryEntrySchema),
    outputEntries: Type.Array(OutputEntrySchema),
  },
  { additionalProperties: false },
);

export const contract = {
  build: ocBase
    .meta({ idempotent: true })
    .input(schema(BuildArtifactsInputSchema))
    .output(schema(BuildArtifactsOutputSchema)),
  materialize: ocBase
    .meta({ idempotent: false })
    .input(schema(EmptyInputSchema))
    .output(schema(MaterializeArtifactsOutputSchema))
    .errors({
      CORPUS_ARTIFACT_VALIDATION_FAILED,
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
