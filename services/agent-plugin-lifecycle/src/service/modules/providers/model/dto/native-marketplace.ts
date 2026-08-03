import { ReadonlyObject, type Static, Type } from "typebox";
import { ContentAuthoritySchema, PluginIdSchema } from "../../../../model/dto/release-identity";
import { BoundedReadonlyArray, NonEmptyReadonlyArray } from "../../../../model/dto/structural";

const ProviderTextSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});

/** Constrains provider marketplace entries to one plugin below the selected content root. */
export const NativeAgentPluginSourcePathSchema = Type.String({
  minLength: "./plugins/agents/a".length,
  maxLength: 1_024,
  pattern: "^\\./plugins/agents/[a-z0-9][a-z0-9._-]*$",
});

/** Describes the local source object required by Codex marketplace entries. */
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

/** Describes one Codex-visible plugin entry without assigning install authority to the manifest. */
export const CodexAgentPluginMarketplaceEntrySchema = ReadonlyObject(
  Type.Object({
    name: PluginIdSchema,
    source: CodexAgentPluginSourceSchema,
    policy: Type.Optional(CodexPluginPolicySchema),
    category: Type.Optional(ProviderTextSchema),
  }),
  { additionalProperties: false }
);

/** Defines the closed Codex marketplace projection that selected content must supply. */
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

/** Describes one Claude-visible plugin entry rooted in the selected content tree. */
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

/** Defines the closed Claude marketplace projection that selected content must supply. */
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

/** Provider-owned shape of a validated Codex marketplace document. */
export type CodexAgentPluginMarketplace = Static<typeof CodexAgentPluginMarketplaceSchema>;

/** Provider-owned shape of a validated Claude marketplace document. */
export type ClaudeAgentPluginMarketplace = Static<typeof ClaudeAgentPluginMarketplaceSchema>;
