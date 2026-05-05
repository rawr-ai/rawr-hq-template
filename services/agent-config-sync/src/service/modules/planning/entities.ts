import { type Static, Type } from "typebox";
import {
  MaterialKindSchema,
  ProjectionSupportStatusSchema,
  SemanticCapabilityKindSchema,
  SourceContentSchema,
  SourcePluginSchema,
  SupportStatusSchema,
  SyncActionSchema,
  SyncAgentSchema,
  SyncScopeSchema,
} from "#shared/entities";

/**
 * agent-config-sync: planning entities.
 *
 * @remarks
 * Planning owns workspace discovery output, target-home selection, sync policy
 * decisions, and dry-run assessment records.
 */

/**
 * Planner-facing provider selector; `all` expands to every enabled provider
 * after target-home resolution.
 */
export const SyncAgentSelectionSchema = Type.Union([SyncAgentSchema, Type.Literal("all")]);
export type SyncAgentSelection = Static<typeof SyncAgentSelectionSchema>;

/**
 * Raw configured destination home entry.
 *
 * This stays module-private because only target-home resolution needs the
 * partially configured shape; resolved homes are represented by `TargetHomes`.
 */
const DestinationConfigSchema = Type.Object(
  {
    rootPath: Type.Optional(Type.String({ minLength: 1 })),
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

/**
 * All candidate destination homes gathered from CLI flags, environment,
 * service config, and provider defaults before agent/scope filtering.
 */
export const TargetHomeCandidatesSchema = Type.Object(
  {
    codexHomesFromFlags: Type.Array(Type.String({ minLength: 1 })),
    claudeHomesFromFlags: Type.Array(Type.String({ minLength: 1 })),
    codexHomesFromEnvironment: Type.Array(Type.String({ minLength: 1 })),
    claudeHomesFromEnvironment: Type.Array(Type.String({ minLength: 1 })),
    codexHomesFromConfig: Type.Array(DestinationConfigSchema),
    claudeHomesFromConfig: Type.Array(DestinationConfigSchema),
    codexDefaultHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeDefaultHomes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type TargetHomeCandidates = Static<typeof TargetHomeCandidatesSchema>;

/**
 * Destination homes selected after agent filtering and path normalization.
 */
export const TargetHomesSchema = Type.Object(
  {
    codexHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeHomes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type TargetHomes = Static<typeof TargetHomesSchema>;

/**
 * Source plugin directory excluded from planning with the operator-visible
 * reason.
 */
export const WorkspaceSkipSchema = Type.Object(
  {
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type WorkspaceSkip = Static<typeof WorkspaceSkipSchema>;

/**
 * Source plugin plus canonical content inventory ready to plan or execute.
 */
export const WorkspaceSyncableSchema = Type.Object(
  {
    sourcePlugin: SourcePluginSchema,
    content: SourceContentSchema,
  },
  { additionalProperties: false },
);
export type WorkspaceSyncable = Static<typeof WorkspaceSyncableSchema>;

/**
 * Flags that determine whether a requested sync is complete enough to be
 * treated as the canonical full-sync command.
 */
export const FullSyncPolicyInputSchema = Type.Object(
  {
    agent: SyncAgentSelectionSchema,
    scope: SyncScopeSchema,
    coworkEnabled: Type.Boolean(),
    codexPackageEnabled: Type.Optional(Type.Boolean()),
    codexInstallEnabled: Type.Optional(Type.Boolean()),
    claudeInstallEnabled: Type.Boolean(),
    claudeEnableEnabled: Type.Boolean(),
    installReconcileEnabled: Type.Boolean(),
    retireOrphansEnabled: Type.Boolean(),
    force: Type.Boolean(),
    gc: Type.Boolean(),
    allowPartial: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type FullSyncPolicyInput = Static<typeof FullSyncPolicyInputSchema>;

/**
 * Full-sync gate decision, including partial-mode reasons and the canonical
 * command the operator should prefer.
 */
export const FullSyncPolicyResultSchema = Type.Object(
  {
    allowed: Type.Boolean(),
    partialReasons: Type.Array(Type.String({ minLength: 1 })),
    canonical: Type.Literal("rawr plugins sync all"),
    failure: Type.Optional(
      Type.Object(
        {
          code: Type.Literal("PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL"),
          message: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export type FullSyncPolicyResult = Static<typeof FullSyncPolicyResultSchema>;

/**
 * Destination material delta discovered by a dry-run preview.
 */
export const DriftItemSchema = Type.Object(
  {
    action: SyncActionSchema,
    kind: Type.Union([
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
    ]),
    target: Type.String({ minLength: 1 }),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

/**
 * Material-level provider limitation surfaced during preview planning.
 */
export const ProjectionResidualSchema = Type.Object(
  {
    provider: SyncAgentSchema,
    materialKind: MaterialKindSchema,
    source: Type.String({ minLength: 1 }),
    supportStatus: SupportStatusSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

/**
 * Semantic capability limitation surfaced during preview planning.
 */
export const SemanticSupportResidualSchema = Type.Object(
  {
    provider: SyncAgentSchema,
    materialKind: MaterialKindSchema,
    semanticKind: SemanticCapabilityKindSchema,
    source: Type.String({ minLength: 1 }),
    supportStatus: ProjectionSupportStatusSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

/**
 * Workspace-level health report computed from dry-run provider previews.
 *
 * The assessment compresses per-plugin preview ledgers into operator-facing
 * status, totals, skipped sources, drift, conflicts, and projection residuals.
 */
export const SyncAssessmentSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("IN_SYNC"),
      Type.Literal("DRIFT_DETECTED"),
      Type.Literal("CONFLICTS"),
    ]),
    includeMetadata: Type.Boolean(),
    scope: SyncScopeSchema,
    summary: Type.Object(
      {
        totalPlugins: Type.Number(),
        totalTargets: Type.Number(),
        totalConflicts: Type.Number(),
        totalMaterialChanges: Type.Number(),
        totalMetadataChanges: Type.Number(),
        totalDriftItems: Type.Number(),
        totalProjectionResiduals: Type.Number(),
        totalMaterialProjectionResiduals: Type.Number(),
        totalSemanticSupportResiduals: Type.Number(),
      },
      { additionalProperties: false },
    ),
    skipped: Type.Array(WorkspaceSkipSchema),
    plugins: Type.Array(
      Type.Object(
        {
          dirName: Type.String({ minLength: 1 }),
          absPath: Type.String({ minLength: 1 }),
          conflicts: Type.Number(),
          materialChanges: Type.Number(),
          metadataChanges: Type.Number(),
          driftItems: Type.Array(DriftItemSchema),
          projectionResiduals: Type.Array(ProjectionResidualSchema),
          materialProjectionResiduals: Type.Array(ProjectionResidualSchema),
          semanticSupportResiduals: Type.Array(SemanticSupportResidualSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export type SyncAssessment = Static<typeof SyncAssessmentSchema>;

/**
 * Execution-ready plan for a workspace sync request.
 *
 * The plan preserves the discovered sources, selected destinations, provider
 * inclusion flags, active plugin names, policy gate, and preview assessment so
 * projections can render or execute without re-running planning.
 */
export const WorkspaceSyncPlanSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    syncable: Type.Array(WorkspaceSyncableSchema),
    skipped: Type.Array(WorkspaceSkipSchema),
    agents: Type.Array(SyncAgentSchema),
    targetHomes: TargetHomesSchema,
    includeAgentsInCodex: Type.Boolean(),
    includeAgentsInClaude: Type.Boolean(),
    activePluginNames: Type.Array(Type.String({ minLength: 1 })),
    fullSyncPolicy: FullSyncPolicyResultSchema,
    assessment: SyncAssessmentSchema,
  },
  { additionalProperties: false },
);
export type WorkspaceSyncPlan = Static<typeof WorkspaceSyncPlanSchema>;
