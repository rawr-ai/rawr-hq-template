import { type Static, Type, type TSchema } from "typebox";
import { ARTIFACT_OUTPUT_DIRECTORIES, STATIC_ARTIFACT_FILE_REFS } from "../../../shared/layout";
import { SourceSnapshotSchema } from "../source-materials/schemas";

function literalUnion(values: readonly string[]): TSchema {
  if (values.length === 1) return Type.Literal(values[0]!);
  return Type.Union(values.map((value) => Type.Literal(value)) as unknown as [TSchema, TSchema, ...TSchema[]]);
}

const ArtifactDirectoryIdSchema = literalUnion(ARTIFACT_OUTPUT_DIRECTORIES.map((directory) => directory.directoryId));
const StaticArtifactFileIdSchema = literalUnion(STATIC_ARTIFACT_FILE_REFS.map((file) => file.fileId));
const ArtifactFileIdSchema = Type.Union([
  StaticArtifactFileIdSchema,
  Type.String({ pattern: "^normalizedThread:.+$" }),
]);

export const OutputDirectoryEntrySchema = Type.Object(
  {
    directoryId: ArtifactDirectoryIdSchema,
    relativePath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const OutputEntrySchema = Type.Object(
  {
    fileId: ArtifactFileIdSchema,
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

const JsonConversationInventoryItemSchema = Type.Object(
  {
    source_id: Type.String({ minLength: 1 }),
    type: Type.Literal("json_conversation"),
    path: Type.String({ minLength: 1 }),
    filename: Type.String({ minLength: 1 }),
    hash_sha256: Type.String({ minLength: 1 }),
    size_bytes: Type.Number({ minimum: 0 }),
    title: Type.String({ minLength: 1 }),
    summary: Type.String(),
    normalized_title: Type.String({ minLength: 1 }),
    branch_depth: Type.Number({ minimum: 0 }),
    message_count: Type.Number({ minimum: 0 }),
    messages_hash_sha256: Type.String({ minLength: 1 }),
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
    exported: Type.Optional(Type.String()),
    link: Type.Optional(Type.String()),
    first_prompt: Type.String(),
    last_response: Type.String(),
  },
  { additionalProperties: false },
);

const MarkdownInventoryItemSchema = Type.Object(
  {
    source_id: Type.String({ minLength: 1 }),
    type: Type.Literal("markdown_document"),
    path: Type.String({ minLength: 1 }),
    filename: Type.String({ minLength: 1 }),
    hash_sha256: Type.String({ minLength: 1 }),
    size_bytes: Type.Number({ minimum: 0 }),
    title: Type.String({ minLength: 1 }),
    summary: Type.String(),
    branch_depth: Type.Number({ minimum: 0 }),
    line_count: Type.Number({ minimum: 0 }),
    headings: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const InventoryItemSchema = Type.Union([
  JsonConversationInventoryItemSchema,
  MarkdownInventoryItemSchema,
]);

export const ThreadSourceFileSchema = Type.Object(
  {
    source_id: Type.String({ minLength: 1 }),
    filename: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    classification: Type.Union([
      Type.Literal("standalone"),
      Type.Literal("root"),
      Type.Literal("branch"),
      Type.Literal("duplicate"),
    ]),
    link: Type.Union([Type.String(), Type.Null()]),
    message_count: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const MessageNodeSchema = Type.Object(
  {
    node_id: Type.String({ minLength: 1 }),
    type: Type.Literal("message"),
    role: Type.String({ minLength: 1 }),
    say: Type.String(),
    source_file_id: Type.String({ minLength: 1 }),
    source_message_index: Type.Number({ minimum: 0 }),
    source_title: Type.String({ minLength: 1 }),
    source_link: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const BranchPointNodeSchema = Type.Object(
  {
    node_id: Type.String({ minLength: 1 }),
    type: Type.Literal("branch_point"),
    parent_source_id: Type.String({ minLength: 1 }),
    child_source_id: Type.String({ minLength: 1 }),
    shared_prefix_len: Type.Number({ minimum: 0 }),
    anchor_node_id: Type.Union([Type.String(), Type.Null()]),
    evidence: Type.Array(Type.String()),
    confidence: Type.Number(),
  },
  { additionalProperties: false },
);

export const ThreadNodeSchema = Type.Union([
  MessageNodeSchema,
  BranchPointNodeSchema,
]);

export const ThreadEdgeSchema = Type.Object(
  {
    from_node_id: Type.String({ minLength: 1 }),
    to_node_id: Type.String({ minLength: 1 }),
    type: Type.Union([
      Type.Literal("starts_branch_path"),
      Type.Literal("next_message"),
      Type.Literal("branches_at"),
    ]),
  },
  { additionalProperties: false },
);

export const BranchPointSchema = Type.Object(
  {
    branch_point_id: Type.String({ minLength: 1 }),
    parent_source_id: Type.String({ minLength: 1 }),
    child_source_id: Type.String({ minLength: 1 }),
    shared_prefix_len: Type.Number({ minimum: 0 }),
    anchor_node_id: Type.Union([Type.String(), Type.Null()]),
    evidence: Type.Array(Type.String()),
    confidence: Type.Number(),
  },
  { additionalProperties: false },
);

export const BranchSchema = Type.Object(
  {
    branch_id: Type.String({ minLength: 1 }),
    parent_branch_point_id: Type.Union([Type.String(), Type.Null()]),
    semantic_name: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal("standalone"),
      Type.Literal("root"),
      Type.Literal("branch"),
      Type.Literal("duplicate"),
    ]),
    source_file_ids: Type.Array(Type.String({ minLength: 1 })),
    start_node_id: Type.Union([Type.String(), Type.Null()]),
    end_node_id: Type.Union([Type.String(), Type.Null()]),
    confidence: Type.Number(),
    rationale: Type.String(),
  },
  { additionalProperties: false },
);

export const NormalizedThreadSchema = Type.Object(
  {
    schema_version: Type.String({ minLength: 1 }),
    thread_id: Type.String({ minLength: 1 }),
    canonical_title: Type.String({ minLength: 1 }),
    root_source_ids: Type.Array(Type.String({ minLength: 1 })),
    source_files: Type.Array(ThreadSourceFileSchema),
    source_links: Type.Array(Type.String()),
    summary: Type.String(),
    nodes: Type.Array(ThreadNodeSchema),
    edges: Type.Array(ThreadEdgeSchema),
    branch_points: Type.Array(BranchPointSchema),
    branches: Type.Array(BranchSchema),
    views: Type.Object(
      {
        default_reading_order: Type.Array(Type.String({ minLength: 1 })),
        root_path_order: Type.Array(Type.String({ minLength: 1 })),
        branch_orders: Type.Record(Type.String({ minLength: 1 }), Type.Array(Type.String({ minLength: 1 }))),
      },
      { additionalProperties: false },
    ),
    anomalies: Type.Array(AnomalySchema),
  },
  { additionalProperties: false },
);

export const IntermediateGraphNodeSchema = Type.Object(
  {
    thread_id: Type.String({ minLength: 1 }),
    node_id: Type.String({ minLength: 1 }),
    type: Type.Union([Type.Literal("message"), Type.Literal("branch_point")]),
    role: Type.Optional(Type.String({ minLength: 1 })),
    say: Type.Optional(Type.String()),
    source_file_id: Type.Optional(Type.String({ minLength: 1 })),
    source_message_index: Type.Optional(Type.Number({ minimum: 0 })),
    source_title: Type.Optional(Type.String({ minLength: 1 })),
    source_link: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    parent_source_id: Type.Optional(Type.String({ minLength: 1 })),
    child_source_id: Type.Optional(Type.String({ minLength: 1 })),
    shared_prefix_len: Type.Optional(Type.Number({ minimum: 0 })),
    anchor_node_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    evidence: Type.Optional(Type.Array(Type.String())),
    confidence: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);

export const IntermediateGraphEdgeSchema = Type.Object(
  {
    thread_id: Type.String({ minLength: 1 }),
    from_node_id: Type.String({ minLength: 1 }),
    to_node_id: Type.String({ minLength: 1 }),
    type: Type.Union([
      Type.Literal("starts_branch_path"),
      Type.Literal("next_message"),
      Type.Literal("branches_at"),
    ]),
  },
  { additionalProperties: false },
);

export const IntermediateGraphSchema = Type.Object(
  {
    schema_version: Type.String({ minLength: 1 }),
    generated_at: Type.String({ minLength: 1 }),
    nodes: Type.Array(IntermediateGraphNodeSchema),
    edges: Type.Array(IntermediateGraphEdgeSchema),
    relationships: Type.Array(RelationshipSchema),
  },
  { additionalProperties: false },
);

export const ManifestThreadSchema = Type.Object(
  {
    thread_id: Type.String({ minLength: 1 }),
    canonical_title: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    branch_count: Type.Number({ minimum: 0 }),
    anomaly_count: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const ManifestDocumentSchema = Type.Object(
  {
    source_id: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    summary: Type.String(),
  },
  { additionalProperties: false },
);

export const ManifestSchema = Type.Object(
  {
    manifest_version: Type.String({ minLength: 1 }),
    generated_at: Type.String({ minLength: 1 }),
    corpus_summary: Type.Object(
      {
        source_count: Type.Number({ minimum: 0 }),
        json_conversation_count: Type.Number({ minimum: 0 }),
        markdown_document_count: Type.Number({ minimum: 0 }),
        family_count: Type.Number({ minimum: 0 }),
        normalized_thread_count: Type.Number({ minimum: 0 }),
        anomaly_count: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    source_items: Type.Array(InventoryItemSchema),
    thread_families: Type.Array(FamilyGraphSchema),
    normalized_threads: Type.Array(ManifestThreadSchema),
    documents: Type.Array(ManifestDocumentSchema),
    relationships: Type.Array(RelationshipSchema),
    anomalies: Type.Array(AnomalySchema),
  },
  { additionalProperties: false },
);

const LowConfidenceRelationshipFlagSchema = Type.Object(
  {
    kind: Type.Literal("low_confidence_relationship"),
    from_id: Type.String({ minLength: 1 }),
    to_id: Type.String({ minLength: 1 }),
    type: Type.Union([Type.Literal("branches_from"), Type.Literal("duplicate_of")]),
    confidence: Type.Number(),
    notes: Type.String(),
  },
  { additionalProperties: false },
);

const WeakFamilyBranchingSignalFlagSchema = Type.Object(
  {
    kind: Type.Literal("weak_family_branching_signal"),
    family_id: Type.String({ minLength: 1 }),
    notes: Type.String(),
  },
  { additionalProperties: false },
);

const NoMarkdownDocsFlagSchema = Type.Object(
  {
    kind: Type.Literal("no_markdown_docs"),
    notes: Type.String(),
  },
  { additionalProperties: false },
);

export const AmbiguityFlagSchema = Type.Union([
  LowConfidenceRelationshipFlagSchema,
  WeakFamilyBranchingSignalFlagSchema,
  NoMarkdownDocsFlagSchema,
]);

export const ValidationReportSchema = Type.Object(
  {
    source_inventory_complete: Type.Boolean(),
    every_json_in_one_family: Type.Boolean(),
    one_normalized_thread_per_family: Type.Boolean(),
    manifest_has_corpus_summary: Type.Boolean(),
    all_passed: Type.Boolean(),
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

export const MaterializeArtifactsOutputSchema = Type.Object(
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

export type Anomaly = Static<typeof AnomalySchema>;
export type FamilyGraph = Static<typeof FamilyGraphSchema>;
export type Relationship = Static<typeof RelationshipSchema>;
export type InventoryItem = Static<typeof InventoryItemSchema>;
export type NormalizedThread = Static<typeof NormalizedThreadSchema>;
export type IntermediateGraph = Static<typeof IntermediateGraphSchema>;
export type Manifest = Static<typeof ManifestSchema>;
export type AmbiguityFlag = Static<typeof AmbiguityFlagSchema>;
export type ValidationReport = Static<typeof ValidationReportSchema>;
export type BuildArtifactsResult = Static<typeof BuildArtifactsOutputSchema>;
export type MaterializeArtifactsResult = Static<typeof MaterializeArtifactsOutputSchema>;
