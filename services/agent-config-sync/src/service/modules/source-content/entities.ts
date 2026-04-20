import { type Static, Type } from "typebox";

export const PluginContentIncludeSchema = Type.Object(
  {
    workflows: Type.Optional(Type.Boolean()),
    skills: Type.Optional(Type.Boolean()),
    scripts: Type.Optional(Type.Boolean()),
    agents: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const PluginContentProviderSchema = Type.Object(
  {
    overlayRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(PluginContentIncludeSchema),
  },
  { additionalProperties: false },
);

export const PluginContentManifestV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    contentRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(PluginContentIncludeSchema),
    providers: Type.Optional(
      Type.Object(
        {
          codex: Type.Optional(PluginContentProviderSchema),
          claude: Type.Optional(PluginContentProviderSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export type PluginContentInclude = Static<typeof PluginContentIncludeSchema>;
export type NormalizedPluginContentInclude = Required<PluginContentInclude>;
export type PluginContentManifestV1 = Static<typeof PluginContentManifestV1Schema>;

