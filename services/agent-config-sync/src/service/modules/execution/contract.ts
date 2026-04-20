import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncAgentSchema,
  SyncActionSchema,
} from "../../shared/entities";

/**
 * Summary entity for what source content was available before provider-specific
 * overlays were applied to each destination.
 */
const SyncScannedSummarySchema = Type.Object(
  {
    workflows: Type.Array(Type.String({ minLength: 1 })),
    skills: Type.Array(Type.String({ minLength: 1 })),
    scripts: Type.Array(Type.String({ minLength: 1 })),
    agents: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

/**
 * Per-target sync result entry shared by Codex and Claude destination writers.
 */
const SyncItemResultSchema = Type.Object(
  {
    action: SyncActionSchema,
    kind: Type.Union([
      Type.Literal("workflow"),
      Type.Literal("skill"),
      Type.Literal("script"),
      Type.Literal("agent"),
      Type.Literal("metadata"),
    ]),
    source: Type.Optional(Type.String({ minLength: 1 })),
    target: Type.String({ minLength: 1 }),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

/**
 * Destination-level sync result that keeps conflicts beside all attempted work.
 */
const SyncTargetResultSchema = Type.Object(
  {
    agent: SyncAgentSchema,
    home: Type.String({ minLength: 1 }),
    items: Type.Array(SyncItemResultSchema),
    conflicts: Type.Array(SyncItemResultSchema),
  },
  { additionalProperties: false },
);

/**
 * Top-level execution result for one source plugin sync run.
 */
const SyncRunResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    sourcePlugin: SourcePluginSchema,
    scanned: SyncScannedSummarySchema,
    targets: Type.Array(SyncTargetResultSchema),
  },
  { additionalProperties: false },
);

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
