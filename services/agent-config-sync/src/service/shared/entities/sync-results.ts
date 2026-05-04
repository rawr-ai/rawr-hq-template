import { type Static, Type } from "typebox";
import {
  DistributionModeSchema,
  EvidenceLevelSchema,
  MaterialKindSchema,
  ProjectionSupportStatusSchema,
  SemanticCapabilityKindSchema,
  SourcePluginSchema,
  SupportStatusSchema,
  SyncActionSchema,
  SyncAgentSchema,
} from "../entities";

/**
 * agent-config-sync: sync result entities.
 *
 * @remarks
 * Both planning and execution need to describe the same "what would / did happen"
 * shape: a scan summary plus per-home item/conflict lists. These entities are
 * service-owned so routers and helpers never import types from `contract.ts`.
 */

/**
 * Summary entity for what source content was available before provider-specific
 * overlays were applied to each destination.
 */
export const SyncScannedSummarySchema = Type.Object(
  {
    workflows: Type.Array(Type.String({ minLength: 1 })),
    skills: Type.Array(Type.String({ minLength: 1 })),
    scripts: Type.Array(Type.String({ minLength: 1 })),
    agents: Type.Array(Type.String({ minLength: 1 })),
    hooks: Type.Array(Type.String({ minLength: 1 })),
    hookConfigs: Type.Array(Type.String({ minLength: 1 })),
    mcpServers: Type.Array(Type.String({ minLength: 1 })),
    settings: Type.Array(Type.String({ minLength: 1 })),
    assets: Type.Array(Type.String({ minLength: 1 })),
    orchestration: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type SyncScannedSummary = Static<typeof SyncScannedSummarySchema>;

/**
 * Per-target sync result entry shared by Codex and Claude destination writers.
 */
export const SyncItemResultSchema = Type.Object(
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
    source: Type.Optional(Type.String({ minLength: 1 })),
    target: Type.String({ minLength: 1 }),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type SyncItemResult = Static<typeof SyncItemResultSchema>;

/**
 * Destination-level sync result that keeps conflicts beside all attempted work.
 */
export const SyncTargetResultSchema = Type.Object(
  {
    agent: SyncAgentSchema,
    home: Type.String({ minLength: 1 }),
    items: Type.Array(SyncItemResultSchema),
    conflicts: Type.Array(SyncItemResultSchema),
  },
  { additionalProperties: false },
);

export type SyncTargetResult = Static<typeof SyncTargetResultSchema>;

export const ProjectionSupportSchema = Type.Object(
  {
    provider: SyncAgentSchema,
    semanticKind: SemanticCapabilityKindSchema,
    source: Type.String({ minLength: 1 }),
    supportStatus: ProjectionSupportStatusSchema,
    evidenceLevel: EvidenceLevelSchema,
    notes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type ProjectionSupport = Static<typeof ProjectionSupportSchema>;

export const ProviderProjectionSchema = Type.Object(
  {
    provider: SyncAgentSchema,
    materialKind: MaterialKindSchema,
    source: Type.String({ minLength: 1 }),
    sourcePath: Type.Optional(Type.String({ minLength: 1 })),
    targetPaths: Type.Array(Type.String({ minLength: 1 })),
    distributionMode: DistributionModeSchema,
    supportStatus: SupportStatusSchema,
    evidenceLevel: EvidenceLevelSchema,
    semanticSupport: Type.Array(ProjectionSupportSchema),
    droppedSemantics: Type.Array(Type.String({ minLength: 1 })),
    adapterRequiredSemantics: Type.Array(Type.String({ minLength: 1 })),
    validationNotes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type ProviderProjection = Static<typeof ProviderProjectionSchema>;

/**
 * Top-level execution result for one source plugin sync run.
 */
export const SyncRunResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    sourcePlugin: SourcePluginSchema,
    scanned: SyncScannedSummarySchema,
    targets: Type.Array(SyncTargetResultSchema),
    projections: Type.Array(ProviderProjectionSchema),
  },
  { additionalProperties: false },
);

export type SyncRunResult = Static<typeof SyncRunResultSchema>;
