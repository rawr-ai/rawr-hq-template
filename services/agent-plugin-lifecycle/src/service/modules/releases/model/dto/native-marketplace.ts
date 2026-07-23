import { ReadonlyObject, type Static, Type } from "typebox";

import {
  ContentAuthoritySchema,
  PluginIdSchema,
} from "../../../../model/dto/releases/content-workspace";
import { BoundedReadonlyArray, NonEmptyReadonlyArray } from "../../../../model/dto/structural";

const ProviderTextSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});

/** Local plugin paths are resolved from the marketplace repository root. */
export const NativeAgentPluginSourcePathSchema = Type.String({
  minLength: "./plugins/agents/a".length,
  maxLength: 1_024,
  pattern: "^\\./plugins/agents/[a-z0-9][a-z0-9._-]*$",
});

export const CodexAgentPluginSourceSchema = ReadonlyObject(
  Type.Object({
    source: Type.Literal("local"),
    path: NativeAgentPluginSourcePathSchema,
  }),
  { additionalProperties: false }
);

const CodexPluginPolicySchema = ReadonlyObject(
  Type.Object({
    installation: ProviderTextSchema,
    authentication: ProviderTextSchema,
  }),
  { additionalProperties: false }
);

export const CodexAgentPluginMarketplaceEntrySchema = ReadonlyObject(
  Type.Object({
    name: PluginIdSchema,
    source: CodexAgentPluginSourceSchema,
    policy: Type.Optional(CodexPluginPolicySchema),
    category: Type.Optional(ProviderTextSchema),
  }),
  { additionalProperties: false }
);

export const CodexAgentPluginMarketplaceSchema = ReadonlyObject(
  Type.Object({
    name: ContentAuthoritySchema,
    plugins: NonEmptyReadonlyArray(CodexAgentPluginMarketplaceEntrySchema, {
      maxItems: 4_096,
    }),
  }),
  { additionalProperties: false }
);

const ClaudeMarketplaceOwnerSchema = ReadonlyObject(
  Type.Object({
    name: ProviderTextSchema,
    email: Type.Optional(ProviderTextSchema),
  }),
  { additionalProperties: false }
);

const ClaudeMarketplaceMetadataSchema = ReadonlyObject(
  Type.Object({
    description: Type.Optional(ProviderTextSchema),
    version: Type.Optional(ProviderTextSchema),
  }),
  { additionalProperties: false }
);

export const ClaudeAgentPluginMarketplaceEntrySchema = ReadonlyObject(
  Type.Object(
    {
      name: PluginIdSchema,
      source: NativeAgentPluginSourcePathSchema,
    },
    // Claude marketplaces may project plugin-manifest metadata alongside these
    // two authority-bearing fields. The lifecycle owner does not interpret it.
    { additionalProperties: true }
  )
);

export const ClaudeAgentPluginMarketplaceSchema = ReadonlyObject(
  Type.Object({
    $schema: Type.Optional(
      Type.Literal("https://anthropic.com/claude-code/marketplace.schema.json")
    ),
    name: ContentAuthoritySchema,
    owner: ClaudeMarketplaceOwnerSchema,
    description: Type.Optional(ProviderTextSchema),
    version: Type.Optional(ProviderTextSchema),
    metadata: Type.Optional(ClaudeMarketplaceMetadataSchema),
    allowCrossMarketplaceDependenciesOn: Type.Optional(
      BoundedReadonlyArray(ContentAuthoritySchema, { maxItems: 4_096 })
    ),
    plugins: NonEmptyReadonlyArray(ClaudeAgentPluginMarketplaceEntrySchema, {
      maxItems: 4_096,
    }),
  }),
  { additionalProperties: false }
);

export type CodexAgentPluginMarketplace = Static<typeof CodexAgentPluginMarketplaceSchema>;
export type ClaudeAgentPluginMarketplace = Static<typeof ClaudeAgentPluginMarketplaceSchema>;
