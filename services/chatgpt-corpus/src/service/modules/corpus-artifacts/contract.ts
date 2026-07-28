import { oc } from "@orpc/contract";
import type { ErrorMapItem } from "@orpc/server";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { Type } from "typebox";
import { INVALID_CONVERSATION_EXPORT, INVALID_CONVERSATION_JSON } from "../../common/errors";
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

const ValidationFailedData = standard(
  Type.Object(
    {
      reason: Type.String({
        minLength: 1,
        description: "Domain reason the derived artifact bundle was rejected.",
      }),
    },
    { additionalProperties: false }
  )
);

const CORPUS_ARTIFACT_VALIDATION_FAILED: ErrorMapItem<typeof ValidationFailedData> = {
  message: "Corpus artifact validation failed",
  data: ValidationFailedData,
} as const;

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const BuildArtifactsInputSchema = Type.Object(
  {
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false }
);
const BuildArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({
      minLength: 1,
      description: "Workspace identity against which the artifact bundle was derived.",
    }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({
      minimum: 0,
      description: "Number of conversation families represented by the artifact bundle.",
    }),
    normalizedThreadCount: Type.Number({
      minimum: 0,
      description: "Number of normalized conversation threads in the artifact bundle.",
    }),
    anomalyCount: Type.Number({
      minimum: 0,
      description: "Number of source or relationship anomalies retained for inspection.",
    }),
    warnings: Type.Array(Type.String(), {
      description: "Non-fatal conditions observed while deriving the artifact bundle.",
    }),
    inventory: Type.Array(InventoryItemSchema, {
      description: "Canonical inventory of source material represented in the corpus.",
    }),
    familyGraphs: Type.Array(FamilyGraphSchema, {
      description: "Conversation-family graphs derived from the normalized sources.",
    }),
    relationships: Type.Array(RelationshipSchema, {
      description: "Explicit relationships discovered between corpus sources.",
    }),
    normalizedThreads: Type.Array(NormalizedThreadSchema, {
      description: "Canonical conversation threads available to downstream corpus consumers.",
    }),
    intermediateGraph: IntermediateGraphSchema,
    manifest: ManifestSchema,
    anomalies: Type.Array(AnomalySchema, {
      description: "Detailed anomalies preserved rather than normalized away.",
    }),
    ambiguityFlags: Type.Array(AmbiguityFlagSchema, {
      description: "Unresolved interpretation choices that require consumer awareness.",
    }),
    validationReport: ValidationReportSchema,
    canonicalitySummary: Type.String({
      description: "Human-readable assessment of the bundle's canonicality.",
    }),
    decisionLog: Type.String({
      description: "Recorded interpretation decisions made during artifact derivation.",
    }),
    mentalMap: Type.String({
      description: "Navigational model relating the corpus's principal concepts and artifacts.",
    }),
    outputDirectories: Type.Array(OutputDirectoryEntrySchema, {
      description: "Managed directories required to materialize the artifact bundle.",
    }),
    outputEntries: Type.Array(OutputEntrySchema, {
      description: "Managed files produced when the artifact bundle is materialized.",
    }),
  },
  { additionalProperties: false }
);
const MaterializeArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({
      minLength: 1,
      description: "Workspace identity that received the validated artifact bundle.",
    }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({
      minimum: 0,
      description: "Number of conversation families represented by the written artifacts.",
    }),
    normalizedThreadCount: Type.Number({
      minimum: 0,
      description: "Number of normalized threads represented by the written artifacts.",
    }),
    anomalyCount: Type.Number({
      minimum: 0,
      description: "Number of retained anomalies represented by the written artifacts.",
    }),
    warnings: Type.Array(Type.String(), {
      description: "Non-fatal conditions observed before or during materialization.",
    }),
    outputDirectories: Type.Array(OutputDirectoryEntrySchema, {
      description: "Managed directories established for the materialized corpus.",
    }),
    outputEntries: Type.Array(OutputEntrySchema, {
      description: "Managed files written for the materialized corpus.",
    }),
  },
  { additionalProperties: false }
);

export const contract = {
  build: oc
    .meta(procedureMetadata({ idempotent: true }))
    .input(standard(BuildArtifactsInputSchema))
    .output(standard(BuildArtifactsOutputSchema)),
  materialize: oc
    .meta(procedureMetadata({ idempotent: false }))
    .input(standard(EmptyInputSchema))
    .output(standard(MaterializeArtifactsOutputSchema))
    .errors({
      CORPUS_ARTIFACT_VALIDATION_FAILED,
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
