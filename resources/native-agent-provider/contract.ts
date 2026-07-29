import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { Value } from "typebox/value";

const BoundedTextSchema = Type.String({ minLength: 1, maxLength: 4_096 });
const ProviderDiagnosticPathSchema = Type.String({
  minLength: 1,
  maxLength: 16_384,
  description:
    "Bounded path text observed or rejected by one native provider operation; it need not be canonical.",
});
const CanonicalProviderPathSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: 16_384,
    description: "Canonical non-root absolute path accepted by a native provider operation.",
  }),
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
  Refine(
    Type.Array(SparsePathSchema, { maxItems: 64 }),
    isCanonicalDistinctOrder,
    () => "Expected distinct code-unit-sorted sparse paths"
  )
);
const NullablePathSchema = Type.Union([CanonicalProviderPathSchema, Type.Null()]);
const NullablePluginVersionSchema = Type.Union([
  Type.String({ pattern: "^[0-9A-Za-z][0-9A-Za-z.+_-]*$", maxLength: 256 }),
  Type.Null(),
]);

/**
 * Admits credential-free HTTPS Git locators that native marketplace adapters can reproduce exactly.
 * The canonical form prevents provider-specific URL normalization from changing source identity.
 */
export const CanonicalGitRepositoryUrlSchema = Refine(
  Type.String({ minLength: 14, maxLength: 2_048 }),
  isCanonicalHttpsGitUrl,
  () => "Expected a canonical HTTPS Git repository URL"
);

/** Identifies one native agent provider supported by the closed resource catalog. */
export const NativeAgentProviderIdSchema = Type.Union(
  [Type.Literal("claude"), Type.Literal("codex")],
  {
    description: "Identity of one supported native agent provider.",
  }
);

/**
 * Defines the closed operation vocabulary carried through provider execution and diagnostics.
 * Provider kernels and lifecycle consumers use these identifiers to preserve operation ownership.
 */
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

/**
 * Records how far a native command progressed when an operation fails.
 * Lifecycle policy uses this evidence to distinguish safe preflight failures from uncertain
 * mutation outcomes.
 */
export const NativeProviderCommandPhaseSchema = Type.Union([
  Type.Literal("not-started"),
  Type.Literal("started"),
  Type.Literal("command-returned"),
]);

/**
 * Defines provider-neutral mechanical failure categories for native operations.
 * Concrete adapters translate CLI and filesystem errors into this vocabulary before failures
 * cross into the lifecycle service.
 */
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

/**
 * Validates the typed failure envelope shared by native adapters and lifecycle operations.
 * Provider, operation, and command-phase evidence preserve enough context for service-owned
 * classification without leaking vendor exceptions.
 */
export const NativeAgentProviderFailureSchema = Type.Readonly(
  Type.Object(
    {
      _tag: Type.Literal("NativeAgentProviderFailure"),
      provider: NativeAgentProviderIdSchema,
      operation: NativeAgentProviderOperationSchema,
      reason: NativeAgentProviderFailureReasonSchema,
      commandPhase: NativeProviderCommandPhaseSchema,
      path: Type.Optional(ProviderDiagnosticPathSchema),
      detail: BoundedTextSchema,
    },
    { additionalProperties: false }
  )
);

/** Validates the explicit provider home supplied for one acquired native session. */
export const NativeProviderHomeSchema = CanonicalProviderPathSchema;

/** Admits the explicit home for one native-provider session. */
export const NativeProviderSessionInputSchema = Type.Readonly(
  Type.Object(
    {
      home: NativeProviderHomeSchema,
    },
    { additionalProperties: false }
  )
);

/**
 * Admits an explicit Git or local source for a native marketplace-add operation.
 * Provider adapters consume this neutral request and own its translation to vendor command
 * arguments.
 */
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

/**
 * Names the native marketplace and plugin operations a provider may report.
 * The lifecycle service gates optional mutations against this advertised capability vocabulary.
 */
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
  home: CanonicalProviderPathSchema,
  version: BoundedTextSchema,
} as const;

/**
 * Validates provider-discriminated capability evidence returned by session probing.
 * Provider-specific constraints keep lifecycle orchestration from assuming operations an adapter
 * cannot implement.
 */
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

/**
 * Describes the source evidence a native provider actually reports for an installed marketplace.
 * Inventory consumers compare these observations with curated intent without treating them as
 * release authority.
 */
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

/**
 * Validates one marketplace entry from live native-provider inventory.
 * Its source and installed root remain observations for lifecycle convergence, not desired state.
 */
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

/**
 * Validates one plugin entry from live native-provider inventory.
 * Installation, enablement, version, and root evidence feed status, sync, and disposable test
 * decisions owned by the lifecycle service.
 */
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

/** Caps marketplace inventory accepted from one native provider command. */
export const MAX_NATIVE_PROVIDER_MARKETPLACES = 1_024;
/** Caps plugin inventory accepted from one native provider command. */
export const MAX_NATIVE_PROVIDER_PLUGINS = 4_096;

/**
 * Validates a complete, canonically ordered native-provider inventory snapshot.
 * Stable ordering and distinct identities make provider observations deterministic for lifecycle
 * comparison and diagnostics.
 */
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

/**
 * Admits the marketplace identity for one explicit native removal.
 * The narrow request prevents mutation adapters from receiving unrelated lifecycle state.
 */
export const NativeProviderMarketplaceIdentityInputSchema = Type.Readonly(
  Type.Object({ identity: MarketplaceIdentitySchema }, { additionalProperties: false })
);

/**
 * Admits the canonical plugin selector used by native install, enable, and removal operations.
 * Provider adapters translate this shared selector into their vendor-specific commands.
 */
export const NativeProviderPluginSelectorInputSchema = Type.Readonly(
  Type.Object({ selector: PluginSelectorSchema }, { additionalProperties: false })
);

/** Caps the number of installed plugin files observed in one provider request. */
export const MAX_NATIVE_PROVIDER_PLUGIN_FILES = 16_384;
/** Caps the bytes admitted for any single installed plugin file. */
export const MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES = 64 * 1_024 * 1_024;
/** Caps aggregate requested plugin-file bytes to bound one provider observation. */
export const MAX_NATIVE_PROVIDER_PLUGIN_FILES_TOTAL_BYTES = 64 * 1_024 * 1_024;
const MAX_NATIVE_PROVIDER_PLUGIN_FILE_BASE64_LENGTH =
  4 * Math.ceil(MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES / 3);

/**
 * Admits one canonical relative file path and caller-selected byte ceiling.
 * Native sessions use this request to inspect installed content without granting unbounded
 * filesystem reads.
 */
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

/**
 * Validates a deterministic, aggregate-bounded batch of installed plugin file reads.
 * Canonical ordering lets providers return results that lifecycle comparison can match by
 * position without reinterpreting paths.
 */
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

/**
 * Carries one successfully read installed plugin file across the resource boundary.
 * Base64 content preserves exact bytes for lifecycle verification while remaining schema-safe.
 */
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

/**
 * Reports that an explicitly requested installed plugin file was absent.
 * Missing files remain ordinary observation results so lifecycle policy can classify drift.
 */
export const NativeProviderPluginFileMissingSchema = Type.Readonly(
  Type.Object(
    {
      kind: Type.Literal("Missing"),
      relativePath: SparsePathSchema,
    },
    { additionalProperties: false }
  )
);

/**
 * Reports that an installed plugin file exceeded its caller-selected read bound.
 * The provider preserves this evidence without allocating or returning the oversized content.
 */
export const NativeProviderPluginFileTooLargeSchema = Type.Readonly(
  Type.Object(
    {
      kind: Type.Literal("TooLarge"),
      relativePath: SparsePathSchema,
    },
    { additionalProperties: false }
  )
);

/**
 * Unifies read, missing, and bounded-too-large outcomes for one requested plugin file.
 * Native sessions return this closed result set to lifecycle verification.
 */
export const NativeProviderPluginFileObservationSchema = Type.Union([
  NativeProviderPluginFileReadSchema,
  NativeProviderPluginFileMissingSchema,
  NativeProviderPluginFileTooLargeSchema,
]);

/**
 * Validates a bounded, canonically ordered set of distinct file observations for one plugin.
 * Service policy separately correlates the observations with the requested paths.
 */
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

/**
 * Records that a native provider command returned for a specific operation.
 * Lifecycle policy interprets the operation and combines this result with fresh inventory.
 */
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

/**
 * Narrows an unknown provider error to the resource's canonical failure envelope.
 * Provider tests and boundary adapters use this guard before relying on operation and
 * command-phase evidence.
 *
 * @param input - The unknown value crossing the native-provider boundary.
 * @returns Whether the value satisfies the complete failure contract.
 */
export function isNativeAgentProviderFailure(input: unknown): input is NativeAgentProviderFailure {
  return Value.Check(NativeAgentProviderFailureSchema, input);
}

export type NativeAgentProviderSessionBase = Readonly<{
  provider: NativeAgentProviderId;
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

/** Provider-discriminated session returned by the closed native resource catalog. */
export type NativeAgentProviderSession =
  | CodexNativeAgentProviderSession
  | ClaudeNativeAgentProviderSession;

/**
 * Acquires a provider-specific session while preserving the provider's required
 * runtime environment in the Effect requirement channel.
 */
export type NativeAgentProviderResource<Session, R = never> = Readonly<{
  acquire: (
    input: NativeProviderSessionInput
  ) => Effect.Effect<Session, NativeAgentProviderFailure, R>;
}>;

/**
 * Closed app-supplied catalog of ready native provider resources.
 *
 * @remarks
 * Both ordinary command adapters remain structurally present. Command
 * reachability failures stay provider-discriminated rather than producing a
 * partial map.
 */
export type NativeAgentProviderResources = Readonly<{
  codex: NativeAgentProviderResource<CodexNativeAgentProviderSession, never>;
  claude: NativeAgentProviderResource<ClaudeNativeAgentProviderSession, never>;
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
