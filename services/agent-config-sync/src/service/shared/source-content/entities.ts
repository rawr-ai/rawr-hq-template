import { type Static, Type } from "typebox";

/**
 * Reusable source-content include mask.
 *
 * This is an entity-level schema because canonical content scanning, provider
 * overlays, and composed toolkit content all share the same include semantics.
 */
export const PluginContentIncludeSchema = Type.Object(
  {
    workflows: Type.Optional(Type.Boolean()),
    skills: Type.Optional(Type.Boolean()),
    scripts: Type.Optional(Type.Boolean()),
    agents: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

/**
 * Provider-specific source-content override in package.json#rawr.pluginContent.
 */
export const PluginContentProviderSchema = Type.Object(
  {
    overlayRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(PluginContentIncludeSchema),
  },
  { additionalProperties: false },
);

/**
 * Versioned source-content manifest embedded in plugin package metadata.
 */
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
