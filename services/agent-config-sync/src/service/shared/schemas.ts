import { type Static, Type } from "typebox";

export const RawrPluginKindSchema = Type.Union([
  Type.Literal("toolkit"),
  Type.Literal("agent"),
  Type.Literal("web"),
]);

export const SyncAgentSchema = Type.Union([
  Type.Literal("codex"),
  Type.Literal("claude"),
]);

export const SyncAgentSelectionSchema = Type.Union([
  SyncAgentSchema,
  Type.Literal("all"),
]);

export const SyncScopeSchema = Type.Union([
  Type.Literal("all"),
  Type.Literal("agents"),
  Type.Literal("cli"),
  Type.Literal("web"),
]);

export const SyncActionSchema = Type.Union([
  Type.Literal("copied"),
  Type.Literal("updated"),
  Type.Literal("skipped"),
  Type.Literal("deleted"),
  Type.Literal("conflict"),
  Type.Literal("planned"),
]);

export const PathArraySchema = Type.Array(Type.String({ minLength: 1 }));

export const ContentFileSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

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

export const SourceContentSchema = Type.Object(
  {
    workflowFiles: Type.Array(ContentFileSchema),
    skills: Type.Array(ContentFileSchema),
    scripts: Type.Array(ContentFileSchema),
    agentFiles: Type.Array(ContentFileSchema),
  },
  { additionalProperties: false },
);

export const SyncPolicySchema = Type.Object(
  {
    includeAgentsInCodex: Type.Boolean(),
    includeAgentsInClaude: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const TargetHomesSchema = Type.Object(
  {
    codexHomes: PathArraySchema,
    claudeHomes: PathArraySchema,
  },
  { additionalProperties: false },
);

export const WorkspaceSkipSchema = Type.Object(
  {
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const SyncScannedSummarySchema = Type.Object(
  {
    workflows: PathArraySchema,
    skills: PathArraySchema,
    scripts: PathArraySchema,
    agents: PathArraySchema,
  },
  { additionalProperties: false },
);

export const SyncItemResultSchema = Type.Object(
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

export const SyncTargetResultSchema = Type.Object(
  {
    agent: SyncAgentSchema,
    home: Type.String({ minLength: 1 }),
    items: Type.Array(SyncItemResultSchema),
    conflicts: Type.Array(SyncItemResultSchema),
  },
  { additionalProperties: false },
);

export const SyncRunResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    sourcePlugin: SourcePluginSchema,
    scanned: SyncScannedSummarySchema,
    targets: Type.Array(SyncTargetResultSchema),
  },
  { additionalProperties: false },
);

export type RawrPluginKind = Static<typeof RawrPluginKindSchema>;
export type SyncAgent = Static<typeof SyncAgentSchema>;
export type SyncAgentSelection = Static<typeof SyncAgentSelectionSchema>;
export type SyncScope = Static<typeof SyncScopeSchema>;
export type SyncAction = Static<typeof SyncActionSchema>;
export type SourcePlugin = Static<typeof SourcePluginSchema>;
export type SourceContent = Static<typeof SourceContentSchema>;
export type SyncPolicy = Static<typeof SyncPolicySchema>;
export type TargetHomes = Static<typeof TargetHomesSchema>;
export type WorkspaceSkip = Static<typeof WorkspaceSkipSchema>;
export type SyncScannedSummary = Static<typeof SyncScannedSummarySchema>;
export type SyncItemResult = Static<typeof SyncItemResultSchema>;
export type SyncTargetResult = Static<typeof SyncTargetResultSchema>;
export type SyncRunResult = Static<typeof SyncRunResultSchema>;
