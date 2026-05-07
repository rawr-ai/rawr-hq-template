import { type Static, Type } from "typebox";

/**
 * Source plugin family declared by RAWR plugin metadata.
 *
 * This is the source-side classification used when planning which plugin
 * material participates in a sync run.
 */
export const RawrPluginKindSchema = Type.Union([
  Type.Literal("toolkit"),
  Type.Literal("agent"),
  Type.Literal("web"),
  Type.Literal("api"),
  Type.Literal("workflows"),
  Type.Literal("schedules"),
]);

/**
 * Destination provider with first-class home discovery, projection, and
 * install/retirement behavior.
 */
export const SyncAgentSchema = Type.Union([
  Type.Literal("codex"),
  Type.Literal("claude"),
]);

/**
 * Provider map key for overlays and support ledgers.
 *
 * Keeping this alias aligned with `SyncAgent` lets provider-effective content
 * share destination vocabulary without hard-coding Codex/Claude in every map.
 */
export const ProviderKeySchema = SyncAgentSchema;

/**
 * Canonical material families discovered in source plugins.
 *
 * Material kinds describe what is being copied, projected, packaged, or
 * reported; provider-specific paths and support status live on projection
 * entities rather than in this enum.
 */
export const MaterialKindSchema = Type.Union([
  Type.Literal("workflow"),
  Type.Literal("skill"),
  Type.Literal("script"),
  Type.Literal("agent"),
  Type.Literal("plugin_metadata"),
  Type.Literal("orchestration"),
  Type.Literal("hook"),
  Type.Literal("mcp"),
  Type.Literal("settings"),
  Type.Literal("asset"),
]);

/**
 * Semantic capabilities that may be preserved, adapted, or dropped when source
 * content is projected into provider-native destinations.
 */
export const SemanticCapabilityKindSchema = Type.Union([
  Type.Literal("agent_role"),
  Type.Literal("skill_step"),
  Type.Literal("skill_invocation"),
  Type.Literal("task_spawn"),
  Type.Literal("parallel_task_join"),
  Type.Literal("todo_state"),
  Type.Literal("tool_lock"),
  Type.Literal("model_selection"),
  Type.Literal("hook"),
  Type.Literal("mcp_server"),
  Type.Literal("settings"),
  Type.Literal("bootstrap"),
  Type.Literal("cosmetic"),
  Type.Literal("artifact_state"),
  Type.Literal("asset"),
]);

/**
 * Operator-facing route used to deliver or expose projected material.
 */
export const DistributionModeSchema = Type.Union([
  Type.Literal("native_provider_plugin"),
  Type.Literal("destination_projection"),
  Type.Literal("local_plugin_install"),
  Type.Literal("package_artifact"),
  Type.Literal("manual_upload"),
  Type.Literal("org_marketplace"),
  Type.Literal("operator_only"),
]);

/**
 * Material-level support status for a provider projection.
 */
export const SupportStatusSchema = Type.Union([
  Type.Literal("native"),
  Type.Literal("adapter_required"),
  Type.Literal("legacy_or_deprecated"),
  Type.Literal("unsupported"),
  Type.Literal("unknown"),
]);

/**
 * Semantic-level support status within an otherwise material-level projection.
 */
export const ProjectionSupportStatusSchema = Type.Union([
  Type.Literal("native"),
  Type.Literal("adapter_required"),
  Type.Literal("legacy_or_deprecated"),
  Type.Literal("unsupported"),
  Type.Literal("unknown"),
]);

/**
 * Evidence strength behind projection and support claims.
 */
export const EvidenceLevelSchema = Type.Union([
  Type.Literal("official"),
  Type.Literal("local_verified"),
  Type.Literal("source_code"),
  Type.Literal("inferred"),
  Type.Literal("unverified"),
]);

/**
 * Operator-selected source-plugin scope for workspace discovery and planning.
 */
export const SyncScopeSchema = Type.Union([
  Type.Literal("all"),
  Type.Literal("cli"),
  Type.Literal("agents"),
  Type.Literal("toolkit"),
  Type.Literal("agent"),
  Type.Literal("web"),
  Type.Literal("api"),
  Type.Literal("workflows"),
  Type.Literal("schedules"),
]);

/**
 * Normalized destination-file operation emitted by previews and applied runs.
 */
export const SyncActionSchema = Type.Union([
  Type.Literal("copied"),
  Type.Literal("updated"),
  Type.Literal("skipped"),
  Type.Literal("deleted"),
  Type.Literal("conflict"),
  Type.Literal("planned"),
]);

/**
 * Operator-visible destination ledger kind.
 *
 * This vocabulary follows what preview and execution rows report, including
 * metadata and orchestration rows that are not source material families.
 */
export const SyncItemKindSchema = Type.Union([
  Type.Literal("workflow"),
  Type.Literal("skill"),
  Type.Literal("script"),
  Type.Literal("agent"),
  Type.Literal("hook"),
  Type.Literal("mcp"),
  Type.Literal("settings"),
  Type.Literal("asset"),
  Type.Literal("orchestration"),
  Type.Literal("metadata"),
]);

/**
 * Source file reference after workspace discovery normalizes a plugin root.
 */
export const ContentFileSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

/**
 * Claude-native orchestration reference detected in copied source material.
 *
 * These records let projections report adapter-required semantics without
 * treating Claude-only orchestration constructs as Codex-native behavior.
 */
export const OrchestrationSpecSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    provider: Type.Literal("claude"),
    sourceKind: Type.Union([Type.Literal("workflow"), Type.Literal("skill"), Type.Literal("agent")]),
    skillInvocations: Type.Array(Type.String({ minLength: 1 })),
    taskSpawns: Type.Array(Type.String({ minLength: 1 })),
    todoState: Type.Boolean(),
  },
  { additionalProperties: false },
);

/**
 * Source plugin identity and package metadata discovered from a workspace.
 */
export const SourcePluginSchema = Type.Object(
  {
    ref: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    dirName: Type.String({ minLength: 1 }),
    packageName: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String({ minLength: 1 })),
    version: Type.Optional(Type.String({ minLength: 1 })),
    rawrKind: Type.Optional(RawrPluginKindSchema),
  },
  { additionalProperties: false },
);

/**
 * Canonical source content inventory before provider overlays are applied.
 */
export const SourceContentSchema = Type.Object(
  {
    workflowFiles: Type.Array(ContentFileSchema),
    skills: Type.Array(ContentFileSchema),
    scripts: Type.Array(ContentFileSchema),
    agentFiles: Type.Array(ContentFileSchema),
    hooks: Type.Optional(Type.Array(ContentFileSchema)),
    hookConfigs: Type.Optional(Type.Array(ContentFileSchema)),
    mcpServers: Type.Optional(Type.Array(ContentFileSchema)),
    settings: Type.Optional(Type.Array(ContentFileSchema)),
    assets: Type.Optional(Type.Array(ContentFileSchema)),
    orchestration: Type.Optional(Type.Array(OrchestrationSpecSchema)),
  },
  { additionalProperties: false },
);

export type RawrPluginKind = Static<typeof RawrPluginKindSchema>;
export type SyncAgent = Static<typeof SyncAgentSchema>;
export type ProviderKey = Static<typeof ProviderKeySchema>;
export type MaterialKind = Static<typeof MaterialKindSchema>;
export type SemanticCapabilityKind = Static<typeof SemanticCapabilityKindSchema>;
export type DistributionMode = Static<typeof DistributionModeSchema>;
export type SupportStatus = Static<typeof SupportStatusSchema>;
export type ProjectionSupportStatus = Static<typeof ProjectionSupportStatusSchema>;
export type EvidenceLevel = Static<typeof EvidenceLevelSchema>;
export type SyncScope = Static<typeof SyncScopeSchema>;
export type SyncAction = Static<typeof SyncActionSchema>;
export type SyncItemKind = Static<typeof SyncItemKindSchema>;
export type SourcePlugin = Static<typeof SourcePluginSchema>;
export type ContentFile = Static<typeof ContentFileSchema>;
export type OrchestrationSpec = Static<typeof OrchestrationSpecSchema>;
export type SourceContent = Static<typeof SourceContentSchema>;
