import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncAgentSchema,
} from "../../common/entities";
import {
  SyncItemResultSchema,
  ProviderProjectionSchema,
  ProjectionSupportSchema,
  SyncRunResultSchema,
  SyncScannedSummarySchema,
  SyncTargetResultSchema,
} from "../../common/entities/sync-results";

/**
 * Execution input for applying or previewing destination sync.
 *
 * Planning decides which plugins should sync; execution owns destination writes,
 * conflict policy, garbage collection, and provider-specific effective content.
 */
const RunSyncInputSchema = Type.Object(
  {
    sourcePlugin: SourcePluginSchema,
    content: SourceContentSchema,
    codexHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeHomes: Type.Array(Type.String({ minLength: 1 })),
    includeCodex: Type.Boolean(),
    includeClaude: Type.Boolean(),
    includeAgentsInCodex: Type.Optional(Type.Boolean()),
    includeAgentsInClaude: Type.Optional(Type.Boolean()),
    force: Type.Boolean(),
    gc: Type.Boolean(),
    dryRun: Type.Boolean(),
  },
  { additionalProperties: false },
);

/**
 * Provider-effective content request used by packaging and preview callers that
 * need overlay resolution without destination writes.
 */
const ResolveProviderContentInputSchema = Type.Object(
  {
    agent: SyncAgentSchema,
    sourcePlugin: SourcePluginSchema,
    base: SourceContentSchema,
  },
  { additionalProperties: false },
);

export type RunSyncInput = Static<typeof RunSyncInputSchema>;
export type SyncCodexNativeAgentRolesInput = Static<typeof RunSyncInputSchema>;
export type SyncScannedSummary = Static<typeof SyncScannedSummarySchema>;
export type SyncItemResult = Static<typeof SyncItemResultSchema>;
export type ProjectionSupport = Static<typeof ProjectionSupportSchema>;
export type ProviderProjection = Static<typeof ProviderProjectionSchema>;
export type SyncTargetResult = Static<typeof SyncTargetResultSchema>;
export type SyncRunResult = Static<typeof SyncRunResultSchema>;

/**
 * Public agent-config-sync execution API.
 *
 * This remains a standalone service because destination sync can be recomposed
 * outside HQ Ops; HQ plugin-management code should not import this module.
 */
export const contract = {
  /**
   * Applies or previews a sync run into Codex and/or Claude homes.
   */
  runSync: ocBase
    .meta({ idempotent: false, entity: "execution" })
    .input(schema(RunSyncInputSchema))
    .output(schema(SyncRunResultSchema)),
  /**
   * Applies or previews the native Codex custom-agent role config lane.
   *
   * This writes only `<codex-home>/agents/*.toml` plus the managed registry's
   * `agents` claim. It is deliberately separate from generic Codex destination
   * projection so native custom agents can stay current without re-emitting
   * prompt/script/skill mirrors.
   */
  syncCodexNativeAgentRoles: ocBase
    .meta({ idempotent: false, entity: "execution" })
    .input(schema(RunSyncInputSchema))
    .output(schema(SyncRunResultSchema)),
  /**
   * Resolves provider-effective content for callers that need the same overlay
   * semantics without performing destination writes, such as Cowork packaging.
   */
  resolveProviderContent: ocBase
    .meta({ idempotent: true, entity: "execution" })
    .input(schema(ResolveProviderContentInputSchema))
    .output(schema(SourceContentSchema)),
};
