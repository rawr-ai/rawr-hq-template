import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncAgentSchema,
} from "../../shared/entities";
import {
  SyncItemResultSchema,
  SyncRunResultSchema,
  SyncScannedSummarySchema,
  SyncTargetResultSchema,
} from "../../shared/entities/sync-results";

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

export type RunSyncInput = Static<typeof RunSyncInputSchema>;
export type SyncScannedSummary = Static<typeof SyncScannedSummarySchema>;
export type SyncItemResult = Static<typeof SyncItemResultSchema>;
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
   * Resolves provider-effective content for callers that need the same overlay
   * semantics without performing destination writes, such as Cowork packaging.
   */
  resolveProviderContent: ocBase
    .meta({ idempotent: true, entity: "execution" })
    .input(
      schema(
        Type.Object(
          {
            agent: SyncAgentSchema,
            sourcePlugin: SourcePluginSchema,
            base: SourceContentSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(SourceContentSchema)),
};
