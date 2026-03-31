import { type Static, Type } from "typebox";
import { SourceSnapshotSchema } from "../source-materials/schemas";

export const OutputEntrySchema = Type.Object(
  {
    fileId: Type.String({ minLength: 1 }),
    relativePath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const SourceCountsSchema = Type.Object(
  {
    jsonConversations: Type.Number({ minimum: 0 }),
    markdownDocuments: Type.Number({ minimum: 0 }),
    totalSources: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const AnomalySchema = Type.Object(
  {
    anomaly_id: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
    source_ids: Type.Array(Type.String({ minLength: 1 })),
    severity: Type.Union([
      Type.Literal("high"),
      Type.Literal("medium"),
      Type.Literal("low"),
    ]),
    notes: Type.String(),
  },
  { additionalProperties: false },
);

export const FamilyGraphSchema = Type.Object(
  {
    family_id: Type.String({ minLength: 1 }),
    canonical_title: Type.String({ minLength: 1 }),
    summary: Type.String(),
    member_source_ids: Type.Array(Type.String({ minLength: 1 })),
    member_filenames: Type.Array(Type.String({ minLength: 1 })),
    root_source_id: Type.String({ minLength: 1 }),
    classification: Type.Record(
      Type.String({ minLength: 1 }),
      Type.Union([
        Type.Literal("standalone"),
        Type.Literal("root"),
        Type.Literal("branch"),
        Type.Literal("duplicate"),
      ]),
    ),
    edges: Type.Array(
      Type.Object(
        {
          from_source_id: Type.String({ minLength: 1 }),
          to_source_id: Type.String({ minLength: 1 }),
          type: Type.Union([Type.Literal("branches_from"), Type.Literal("duplicate_of")]),
          confidence: Type.Number(),
          shared_prefix_len: Type.Number({ minimum: 0 }),
          evidence: Type.Array(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const RelationshipSchema = Type.Object(
  {
    from_id: Type.String({ minLength: 1 }),
    to_id: Type.String({ minLength: 1 }),
    type: Type.Union([Type.Literal("branches_from"), Type.Literal("duplicate_of")]),
    confidence: Type.Number(),
    evidence: Type.Array(Type.String()),
    notes: Type.String(),
  },
  { additionalProperties: false },
);

export const BuildArtifactsInputSchema = Type.Object(
  {
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false },
);

export const BuildArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({ minimum: 0 }),
    normalizedThreadCount: Type.Number({ minimum: 0 }),
    anomalyCount: Type.Number({ minimum: 0 }),
    warnings: Type.Array(Type.String()),
    inventory: Type.Array(Type.Record(Type.String(), Type.Any())),
    familyGraphs: Type.Array(FamilyGraphSchema),
    relationships: Type.Array(RelationshipSchema),
    normalizedThreads: Type.Array(Type.Any()),
    intermediateGraph: Type.Record(Type.String(), Type.Any()),
    manifest: Type.Record(Type.String(), Type.Any()),
    anomalies: Type.Array(AnomalySchema),
    ambiguityFlags: Type.Array(Type.Record(Type.String(), Type.Any())),
    validationReport: Type.Record(Type.String(), Type.Boolean()),
    canonicalitySummary: Type.String(),
    decisionLog: Type.String(),
    mentalMap: Type.String(),
    outputDirectories: Type.Array(Type.String({ minLength: 1 })),
    outputEntries: Type.Array(OutputEntrySchema),
  },
  { additionalProperties: false },
);

export const MaterializeArtifactsOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: SourceCountsSchema,
    familyCount: Type.Number({ minimum: 0 }),
    normalizedThreadCount: Type.Number({ minimum: 0 }),
    anomalyCount: Type.Number({ minimum: 0 }),
    warnings: Type.Array(Type.String()),
    outputDirectories: Type.Array(Type.String({ minLength: 1 })),
    outputEntries: Type.Array(OutputEntrySchema),
  },
  { additionalProperties: false },
);

export type Anomaly = Static<typeof AnomalySchema>;
export type FamilyGraph = Static<typeof FamilyGraphSchema>;
export type Relationship = Static<typeof RelationshipSchema>;
export type BuildArtifactsResult = Static<typeof BuildArtifactsOutputSchema>;
export type MaterializeArtifactsResult = Static<typeof MaterializeArtifactsOutputSchema>;
