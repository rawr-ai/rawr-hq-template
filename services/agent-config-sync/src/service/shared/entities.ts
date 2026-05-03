import { type Static, Type } from "typebox";

export const RawrPluginKindSchema = Type.Union([
  Type.Literal("toolkit"),
  Type.Literal("agent"),
  Type.Literal("web"),
  Type.Literal("api"),
  Type.Literal("workflows"),
  Type.Literal("schedules"),
]);

export const SyncAgentSchema = Type.Union([
  Type.Literal("codex"),
  Type.Literal("claude"),
]);

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

export const SyncActionSchema = Type.Union([
  Type.Literal("copied"),
  Type.Literal("updated"),
  Type.Literal("skipped"),
  Type.Literal("deleted"),
  Type.Literal("conflict"),
  Type.Literal("planned"),
]);

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

export type RawrPluginKind = Static<typeof RawrPluginKindSchema>;
export type SyncAgent = Static<typeof SyncAgentSchema>;
export type SyncScope = Static<typeof SyncScopeSchema>;
export type SyncAction = Static<typeof SyncActionSchema>;
export type SourcePlugin = Static<typeof SourcePluginSchema>;
export type SourceContent = Static<typeof SourceContentSchema>;
