import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { Value } from "typebox/value";

const BoundedTextSchema = Type.String({ minLength: 1, maxLength: 4_096 });
const ProviderPathSchema = Type.String({ minLength: 1, maxLength: 16_384 });
const CanonicalProviderPathSchema = Refine(
  ProviderPathSchema,
  isCanonicalAbsolutePath,
  () => "Expected a canonical non-root absolute path"
);
const MarketplaceIdentitySchema = Type.String({
  pattern: "^[a-z0-9][a-z0-9_-]*$",
  maxLength: 128,
});
const PluginSelectorSchema = Type.String({
  pattern: "^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9_-]*$",
  maxLength: 256,
});
const RevisionSchema = Type.String({
  pattern: "^[^\\s#]+$",
  minLength: 1,
  maxLength: 256,
});
const SparsePathSchema = Refine(
  Type.String({ minLength: 1, maxLength: 1_024 }),
  isCanonicalRelativePath,
  () => "Expected one canonical relative POSIX path"
);
const SparsePathsSchema = Type.Unsafe<readonly Static<typeof SparsePathSchema>[]>(
  Type.Array(SparsePathSchema, { maxItems: 64 })
);
const NullablePathSchema = Type.Union([CanonicalProviderPathSchema, Type.Null()]);
const NullablePluginVersionSchema = Type.Union([
  Type.String({ pattern: "^[0-9A-Za-z][0-9A-Za-z.+_-]*$", maxLength: 256 }),
  Type.Null(),
]);

export const CanonicalGitRepositoryUrlSchema = Refine(
  Type.String({ minLength: 14, maxLength: 2_048 }),
  isCanonicalHttpsGitUrl,
  () => "Expected a canonical HTTPS Git repository URL"
);

export const NativeAgentProviderIdSchema = Type.Union([
  Type.Literal("claude"),
  Type.Literal("codex"),
]);

export const NativeAgentProviderOperationSchema = Type.Union([
  Type.Literal("acquire"),
  Type.Literal("probe"),
  Type.Literal("inventory"),
  Type.Literal("marketplace-add"),
  Type.Literal("marketplace-remove"),
  Type.Literal("plugin-files-read"),
  Type.Literal("plugin-install"),
  Type.Literal("plugin-enable"),
  Type.Literal("plugin-remove"),
]);

export const NativeProviderCommandPhaseSchema = Type.Union([
  Type.Literal("not-started"),
  Type.Literal("started"),
  Type.Literal("command-returned"),
]);

export const NativeAgentProviderFailureReasonSchema = Type.Union([
  Type.Literal("InvalidInput"),
  Type.Literal("Missing"),
  Type.Literal("Aliased"),
  Type.Literal("UnsupportedEntry"),
  Type.Literal("LimitExceeded"),
  Type.Literal("CommandFailed"),
  Type.Literal("CommandTimedOut"),
  Type.Literal("InvalidJson"),
  Type.Literal("ProtocolFailed"),
  Type.Literal("FilesystemFailed"),
]);

export const NativeAgentProviderFailureSchema = Type.Readonly(
  Type.Object(
    {
      _tag: Type.Literal("NativeAgentProviderFailure"),
      provider: NativeAgentProviderIdSchema,
      operation: NativeAgentProviderOperationSchema,
      reason: NativeAgentProviderFailureReasonSchema,
      commandPhase: NativeProviderCommandPhaseSchema,
      path: Type.Optional(ProviderPathSchema),
      detail: BoundedTextSchema,
    },
    { additionalProperties: false }
  )
);

export const NativeProviderSessionInputSchema = Type.Readonly(
  Type.Object(
    {
      executablePath: CanonicalProviderPathSchema,
      home: CanonicalProviderPathSchema,
    },
    { additionalProperties: false }
  )
);

export const NativeMarketplaceSourceSchema = Type.Union([
  Type.Readonly(
    Type.Object(
      {
        kind: Type.Literal("git"),
        repositoryUrl: CanonicalGitRepositoryUrlSchema,
        revision: RevisionSchema,
        sparsePaths: SparsePathsSchema,
      },
      { additionalProperties: false }
    )
  ),
  Type.Readonly(
    Type.Object(
      {
        kind: Type.Literal("local"),
        root: CanonicalProviderPathSchema,
      },
      { additionalProperties: false }
    )
  ),
]);

export const NativeProviderCapabilitySchema = Type.Union([
  Type.Literal("marketplace-list"),
  Type.Literal("marketplace-add"),
  Type.Literal("marketplace-remove"),
  Type.Literal("marketplace-update"),
  Type.Literal("plugin-list"),
  Type.Literal("plugin-install"),
  Type.Literal("plugin-enable"),
  Type.Literal("plugin-disable"),
  Type.Literal("plugin-remove"),
  Type.Literal("plugin-update"),
]);

const CodexNativeProviderCapabilitySchema = Type.Union([
  Type.Literal("marketplace-list"),
  Type.Literal("marketplace-add"),
  Type.Literal("marketplace-remove"),
  Type.Literal("plugin-list"),
  Type.Literal("plugin-install"),
  Type.Literal("plugin-remove"),
]);

const ClaudeNativeProviderCapabilitySchema = NativeProviderCapabilitySchema;

const nativeCapabilityProperties = {
  executablePath: CanonicalProviderPathSchema,
  home: CanonicalProviderPathSchema,
  version: BoundedTextSchema,
} as const;

export const NativeProviderCapabilitiesSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ...nativeCapabilityProperties,
      provider: Type.Literal("codex"),
      capabilities: Refine(
        Type.Array(CodexNativeProviderCapabilitySchema, { maxItems: 6 }),
        (capabilities) => new Set(capabilities).size === capabilities.length,
        () => "Codex capabilities must be distinct"
      ),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      ...nativeCapabilityProperties,
      provider: Type.Literal("claude"),
      capabilities: Refine(
        Type.Array(ClaudeNativeProviderCapabilitySchema, { maxItems: 10 }),
        (capabilities) =>
          capabilities.includes("plugin-enable") &&
          new Set(capabilities).size === capabilities.length,
        () => "Claude capabilities must include distinct plugin enablement"
      ),
    }),
    { additionalProperties: false }
  ),
]);

export const NativeProviderMarketplaceSourceObservationSchema = Type.Union([
  ReadonlyObject(
    Type.Object(
      {
        kind: Type.Literal("git"),
        repositoryUrl: CanonicalGitRepositoryUrlSchema,
        revision: Type.Union([RevisionSchema, Type.Null()]),
      },
      { additionalProperties: false }
    ),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object(
      {
        kind: Type.Literal("local"),
        root: CanonicalProviderPathSchema,
      },
      { additionalProperties: false }
    ),
    { additionalProperties: false }
  ),
]);

export const NativeProviderMarketplaceObservationSchema = Type.Readonly(
  Type.Object(
    {
      identity: MarketplaceIdentitySchema,
      source: Type.Union([NativeProviderMarketplaceSourceObservationSchema, Type.Null()]),
      installedRoot: Type.Union([CanonicalProviderPathSchema, Type.Null()]),
    },
    { additionalProperties: false }
  )
);

export const NativeProviderPluginObservationSchema = Type.Readonly(
  Type.Object(
    {
      selector: PluginSelectorSchema,
      marketplaceIdentity: MarketplaceIdentitySchema,
      name: Type.String({ pattern: "^[a-z0-9][a-z0-9._-]*$", maxLength: 128 }),
      installed: Type.Boolean(),
      enabled: Type.Union([Type.Boolean(), Type.Null()]),
      version: NullablePluginVersionSchema,
      root: NullablePathSchema,
    },
    { additionalProperties: false }
  )
);

export const MAX_NATIVE_PROVIDER_MARKETPLACES = 1_024;
export const MAX_NATIVE_PROVIDER_PLUGINS = 4_096;

export const NativeProviderInventorySchema = Refine(
  Type.Readonly(
    Type.Object(
      {
        provider: NativeAgentProviderIdSchema,
        marketplaces: Type.Readonly(
          Type.Array(NativeProviderMarketplaceObservationSchema, {
            maxItems: MAX_NATIVE_PROVIDER_MARKETPLACES,
          })
        ),
        plugins: Type.Readonly(
          Type.Array(NativeProviderPluginObservationSchema, {
            maxItems: MAX_NATIVE_PROVIDER_PLUGINS,
          })
        ),
      },
      { additionalProperties: false }
    )
  ),
  (inventory) =>
    isCanonicalDistinctOrder(inventory.marketplaces.map((marketplace) => marketplace.identity)) &&
    isCanonicalDistinctOrder(inventory.plugins.map((plugin) => plugin.selector)),
  () => "Expected canonical distinct marketplace identities and plugin selectors"
);

export const NativeProviderMarketplaceIdentityInputSchema = Type.Readonly(
  Type.Object({ identity: MarketplaceIdentitySchema }, { additionalProperties: false })
);

export const NativeProviderPluginSelectorInputSchema = Type.Readonly(
  Type.Object({ selector: PluginSelectorSchema }, { additionalProperties: false })
);

export const MAX_NATIVE_PROVIDER_PLUGIN_FILES = 16_384;
export const MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES = 64 * 1_024 * 1_024;
export const MAX_NATIVE_PROVIDER_PLUGIN_FILES_TOTAL_BYTES = 64 * 1_024 * 1_024;
const MAX_NATIVE_PROVIDER_PLUGIN_FILE_BASE64_LENGTH =
  4 * Math.ceil(MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES / 3);

export const NativeProviderPluginFileRequestSchema = Type.Readonly(
  Type.Object(
    {
      relativePath: Refine(
        Type.String({ minLength: 1, maxLength: 1_024 }),
        isCanonicalRelativePath,
        () => "Expected one canonical relative POSIX file path"
      ),
      maxBytes: Type.Integer({
        minimum: 0,
        maximum: MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES,
      }),
    },
    { additionalProperties: false }
  )
);

export const NativeProviderPluginFilesReadInputSchema = Refine(
  Type.Readonly(
    Type.Object(
      {
        selector: PluginSelectorSchema,
        files: Type.Unsafe<readonly Static<typeof NativeProviderPluginFileRequestSchema>[]>(
          Type.Array(NativeProviderPluginFileRequestSchema, {
            minItems: 1,
            maxItems: MAX_NATIVE_PROVIDER_PLUGIN_FILES,
          })
        ),
      },
      { additionalProperties: false }
    )
  ),
  hasBoundedDistinctFileRequests,
  () => "Expected distinct plugin files in canonical order within the batch byte limit"
);

export const NativeProviderPluginFileReadSchema = Type.Readonly(
  Type.Object(
    {
      kind: Type.Literal("Read"),
      relativePath: SparsePathSchema,
      byteLength: Type.Integer({
        minimum: 0,
        maximum: MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES,
      }),
      contentBase64: Type.String({ maxLength: MAX_NATIVE_PROVIDER_PLUGIN_FILE_BASE64_LENGTH }),
    },
    { additionalProperties: false }
  )
);

export const NativeProviderPluginFileMissingSchema = Type.Readonly(
  Type.Object(
    {
      kind: Type.Literal("Missing"),
      relativePath: SparsePathSchema,
    },
    { additionalProperties: false }
  )
);

export const NativeProviderPluginFileTooLargeSchema = Type.Readonly(
  Type.Object(
    {
      kind: Type.Literal("TooLarge"),
      relativePath: SparsePathSchema,
    },
    { additionalProperties: false }
  )
);

export const NativeProviderPluginFileObservationSchema = Type.Union([
  NativeProviderPluginFileReadSchema,
  NativeProviderPluginFileMissingSchema,
  NativeProviderPluginFileTooLargeSchema,
]);

export const NativeProviderPluginFilesSchema = Refine(
  Type.Readonly(
    Type.Object(
      {
        selector: PluginSelectorSchema,
        files: Type.Unsafe<readonly Static<typeof NativeProviderPluginFileObservationSchema>[]>(
          Type.Array(NativeProviderPluginFileObservationSchema, {
            minItems: 1,
            maxItems: MAX_NATIVE_PROVIDER_PLUGIN_FILES,
          })
        ),
      },
      { additionalProperties: false }
    )
  ),
  (input) => isCanonicalDistinctOrder(input.files.map((file) => file.relativePath)),
  () => "Expected one canonical observation per plugin file"
);

export const NativeProviderMutationResultSchema = Type.Readonly(
  Type.Object(
    {
      provider: NativeAgentProviderIdSchema,
      operation: NativeAgentProviderOperationSchema,
      commandPhase: Type.Literal("command-returned"),
    },
    { additionalProperties: false }
  )
);

export type NativeAgentProviderId = Static<typeof NativeAgentProviderIdSchema>;
export type NativeAgentProviderOperation = Static<typeof NativeAgentProviderOperationSchema>;
export type NativeProviderCommandPhase = Static<typeof NativeProviderCommandPhaseSchema>;
export type NativeAgentProviderFailureReason = Static<
  typeof NativeAgentProviderFailureReasonSchema
>;
export type NativeAgentProviderFailure = Static<typeof NativeAgentProviderFailureSchema>;
export type NativeProviderSessionInput = Static<typeof NativeProviderSessionInputSchema>;
export type NativeMarketplaceSource = Static<typeof NativeMarketplaceSourceSchema>;
export type NativeProviderCapability = Static<typeof NativeProviderCapabilitySchema>;
export type NativeProviderCapabilities = Static<typeof NativeProviderCapabilitiesSchema>;
export type NativeProviderMarketplaceSourceObservation = Static<
  typeof NativeProviderMarketplaceSourceObservationSchema
>;
export type NativeProviderMarketplaceObservation = Static<
  typeof NativeProviderMarketplaceObservationSchema
>;
export type NativeProviderPluginObservation = Static<typeof NativeProviderPluginObservationSchema>;
export type NativeProviderInventory = Static<typeof NativeProviderInventorySchema>;
export type NativeProviderMarketplaceIdentityInput = Static<
  typeof NativeProviderMarketplaceIdentityInputSchema
>;
export type NativeProviderPluginSelectorInput = Static<
  typeof NativeProviderPluginSelectorInputSchema
>;
export type NativeProviderPluginFileRequest = Static<typeof NativeProviderPluginFileRequestSchema>;
export type NativeProviderPluginFilesReadInput = Static<
  typeof NativeProviderPluginFilesReadInputSchema
>;
export type NativeProviderPluginFileRead = Static<typeof NativeProviderPluginFileReadSchema>;
export type NativeProviderPluginFileMissing = Static<typeof NativeProviderPluginFileMissingSchema>;
export type NativeProviderPluginFileTooLarge = Static<
  typeof NativeProviderPluginFileTooLargeSchema
>;
export type NativeProviderPluginFileObservation = Static<
  typeof NativeProviderPluginFileObservationSchema
>;
export type NativeProviderPluginFiles = Static<typeof NativeProviderPluginFilesSchema>;
export type NativeProviderMutationResult = Static<typeof NativeProviderMutationResultSchema>;

function isCanonicalAbsolutePath(value: string): boolean {
  return (
    value.startsWith("/") &&
    value !== "/" &&
    !value.endsWith("/") &&
    !value.includes("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value
      .split("/")
      .slice(1)
      .every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function isCanonicalHttpsGitUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.port === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.hostname === parsed.hostname.toLowerCase() &&
    parsed.pathname.startsWith("/") &&
    parsed.pathname.endsWith(".git") &&
    parsed.toString() === value
  );
}

export function isNativeAgentProviderFailure(input: unknown): input is NativeAgentProviderFailure {
  return Value.Check(NativeAgentProviderFailureSchema, input);
}

export type NativeAgentProviderSessionBase = Readonly<{
  provider: NativeAgentProviderId;
  executablePath: string;
  home: string;
  probe: () => Effect.Effect<NativeProviderCapabilities, NativeAgentProviderFailure>;
  inventory: () => Effect.Effect<NativeProviderInventory, NativeAgentProviderFailure>;
  readPluginFiles: (
    input: NativeProviderPluginFilesReadInput
  ) => Effect.Effect<NativeProviderPluginFiles, NativeAgentProviderFailure>;
  addMarketplace: (
    source: NativeMarketplaceSource
  ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
  removeMarketplace: (
    input: NativeProviderMarketplaceIdentityInput
  ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
  installPlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
  removePlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
}>;

export type CodexNativeAgentProviderSession = NativeAgentProviderSessionBase &
  Readonly<{ provider: "codex" }>;

export type ClaudeNativeAgentProviderSession = NativeAgentProviderSessionBase &
  Readonly<{
    provider: "claude";
    enablePlugin: (
      input: NativeProviderPluginSelectorInput
    ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
  }>;

export type NativeAgentProviderResource<Session, R = never> = Readonly<{
  acquire: (
    input: NativeProviderSessionInput
  ) => Effect.Effect<Session, NativeAgentProviderFailure, R>;
}>;

function isCanonicalRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 1_024 &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function isCanonicalDistinctOrder(values: readonly string[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) return false;
  }
  return true;
}

function hasBoundedDistinctFileRequests(
  input: Readonly<{
    files: readonly Readonly<{ relativePath: string; maxBytes: number }>[];
  }>
): boolean {
  return (
    isCanonicalDistinctOrder(input.files.map((file) => file.relativePath)) &&
    input.files.reduce((total, file) => total + file.maxBytes, 0) <=
      MAX_NATIVE_PROVIDER_PLUGIN_FILES_TOTAL_BYTES
  );
}
