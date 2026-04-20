import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncAgentSchema,
  SyncActionSchema,
} from "../../shared/schemas";

const SyncScannedSummarySchema = Type.Object(
  {
    workflows: Type.Array(Type.String({ minLength: 1 })),
    skills: Type.Array(Type.String({ minLength: 1 })),
    scripts: Type.Array(Type.String({ minLength: 1 })),
    agents: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

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

const SyncTargetResultSchema = Type.Object(
  {
    agent: SyncAgentSchema,
    home: Type.String({ minLength: 1 }),
    items: Type.Array(SyncItemResultSchema),
    conflicts: Type.Array(SyncItemResultSchema),
  },
  { additionalProperties: false },
);

const SyncRunResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    sourcePlugin: SourcePluginSchema,
    scanned: SyncScannedSummarySchema,
    targets: Type.Array(SyncTargetResultSchema),
  },
  { additionalProperties: false },
);

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

export const contract = {
  runSync: ocBase
    .meta({ idempotent: false, entity: "execution" })
    .input(schema(RunSyncInputSchema))
    .output(schema(SyncRunResultSchema)),
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
