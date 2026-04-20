import { type Static, Type } from "typebox";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

export function clampJournalCandidateLimit(value: number | undefined): number {
  return clampInt(value ?? 200, 1, 500);
}

export const RiskToleranceSchema = Type.Union([
  Type.Literal("strict"),
  Type.Literal("balanced"),
  Type.Literal("permissive"),
  Type.Literal("off"),
]);

export type RiskTolerance = Static<typeof RiskToleranceSchema>;

const PluginChannelPolicySchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const PluginChannelsSchema = Type.Object(
  {
    workspace: Type.Optional(PluginChannelPolicySchema),
    external: Type.Optional(PluginChannelPolicySchema),
  },
  { additionalProperties: false },
);

const SyncAgentSchema = Type.Union([Type.Literal("codex"), Type.Literal("claude"), Type.Literal("all")]);

export const SyncDestinationSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    rootPath: Type.Optional(Type.String({ minLength: 1 })),
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const SyncProviderSchema = Type.Object(
  {
    destinations: Type.Optional(Type.Array(SyncDestinationSchema)),
    includeAgents: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const SyncConfigSchema = Type.Object(
  {
    defaults: Type.Optional(
      Type.Object(
        {
          agent: Type.Optional(SyncAgentSchema),
        },
        { additionalProperties: false },
      ),
    ),
    sources: Type.Optional(
      Type.Object(
        {
          paths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        },
        { additionalProperties: false },
      ),
    ),
    providers: Type.Optional(
      Type.Object(
        {
          codex: Type.Optional(SyncProviderSchema),
          claude: Type.Optional(SyncProviderSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const RawrConfigV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    plugins: Type.Optional(
      Type.Object(
        {
          defaultRiskTolerance: Type.Optional(RiskToleranceSchema),
          channels: Type.Optional(PluginChannelsSchema),
        },
        { additionalProperties: false },
      ),
    ),
    journal: Type.Optional(
      Type.Object(
        {
          semantic: Type.Optional(
            Type.Object(
              {
                candidateLimit: Type.Optional(Type.Integer()),
                model: Type.Optional(Type.String()),
              },
              { additionalProperties: false },
            ),
          ),
        },
        { additionalProperties: false },
      ),
    ),
    server: Type.Optional(
      Type.Object(
        {
          port: Type.Optional(Type.Integer()),
          baseUrl: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
    sync: Type.Optional(SyncConfigSchema),
  },
  { additionalProperties: false },
);

export type RawrConfigV1 = Static<typeof RawrConfigV1Schema>;
export type RawrConfig = RawrConfigV1;
export type SyncDestination = Static<typeof SyncDestinationSchema>;
export type SyncProvider = Static<typeof SyncProviderSchema>;
