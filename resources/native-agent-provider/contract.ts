import type { ArtifactTreeLocation } from "@rawr/resource-agent-plugin-artifact-repository";
import type { Effect } from "effect";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

export const NativeAgentProviderIdSchema = Type.Union([
  Type.Literal("claude"),
  Type.Literal("codex"),
]);

export const NativeAgentProviderOperationSchema = Type.Union([
  Type.Literal("acquire"),
  Type.Literal("probe"),
  Type.Literal("marketplace-list"),
  Type.Literal("marketplace-read"),
  Type.Literal("marketplace-add"),
  Type.Literal("marketplace-remove"),
  Type.Literal("plugin-list"),
  Type.Literal("plugin-read"),
  Type.Literal("plugin-install"),
  Type.Literal("plugin-enable"),
  Type.Literal("plugin-disable"),
  Type.Literal("plugin-remove"),
  Type.Literal("app-server-inspect"),
  Type.Literal("config-read"),
  Type.Literal("config-write"),
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
  Type.Literal("OwnershipConflict"),
  Type.Literal("FilesystemFailed"),
]);

export const NativeAgentProviderFailureSchema = Type.Readonly(
  Type.Object(
    {
      _tag: Type.Literal("NativeAgentProviderFailure"),
      provider: NativeAgentProviderIdSchema,
      operation: NativeAgentProviderOperationSchema,
      reason: NativeAgentProviderFailureReasonSchema,
      path: Type.Optional(Type.String()),
      detail: Type.String(),
    },
    { additionalProperties: false }
  )
);

export type NativeAgentProviderId = Static<typeof NativeAgentProviderIdSchema>;
export type NativeAgentProviderOperation = Static<typeof NativeAgentProviderOperationSchema>;
export type NativeAgentProviderFailureReason = Static<
  typeof NativeAgentProviderFailureReasonSchema
>;
export type NativeAgentProviderFailure = Static<typeof NativeAgentProviderFailureSchema>;

/** Recognizes the complete resource-owned failure contract at host boundaries. */
export function isNativeAgentProviderFailure(input: unknown): input is NativeAgentProviderFailure {
  return Value.Check(NativeAgentProviderFailureSchema, input);
}

export type NativeProviderJsonPrimitive = boolean | number | string | null;
export type NativeProviderJsonValue =
  | NativeProviderJsonPrimitive
  | readonly NativeProviderJsonValue[]
  | Readonly<{ [key: string]: NativeProviderJsonValue }>;

export interface NativeProviderCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface NativeProviderJsonObservation extends NativeProviderCommandResult {
  readonly json: NativeProviderJsonValue;
}

export interface NativeProviderCapabilityProbe {
  readonly provider: NativeAgentProviderId;
  readonly executablePath: string;
  readonly home: string;
  readonly pluginCommands: readonly string[];
  readonly marketplaceCommands: readonly string[];
  readonly appServerMethods: readonly string[];
}

export interface NativeProviderPackageEntry {
  readonly path: string;
  readonly mode: number;
  readonly bytes: Uint8Array;
}

export interface NativeProviderPackageObservation {
  readonly entries: readonly NativeProviderPackageEntry[];
}

export interface NativeProviderSessionInput {
  readonly executablePath: string;
  readonly home: string;
}

export interface NativeProviderPackageReadLimits {
  readonly maxEntries: number;
  readonly maxBytes: number;
}

export interface NativeProviderMarketplaceReadInput extends NativeProviderPackageReadLimits {
  readonly identity: string;
}

export interface NativeProviderPluginReadInput extends NativeProviderPackageReadLimits {
  readonly selector: string;
}

export interface NativeProviderMarketplaceIdentityInput {
  readonly identity: string;
}

export interface NativeProviderPluginSelectorInput {
  readonly selector: string;
}

export interface NativeAgentProviderSessionBase {
  readonly provider: NativeAgentProviderId;
  readonly executablePath: string;
  readonly home: string;
  readonly probe: () => Effect.Effect<NativeProviderCapabilityProbe, NativeAgentProviderFailure>;
  readonly listMarketplaces: () => Effect.Effect<
    NativeProviderJsonObservation,
    NativeAgentProviderFailure
  >;
  readonly addMarketplace: (
    source: ArtifactTreeLocation
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly readMarketplace: (
    input: NativeProviderMarketplaceReadInput
  ) => Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure>;
  readonly removeMarketplace: (
    input: NativeProviderMarketplaceIdentityInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly listPlugins: () => Effect.Effect<
    NativeProviderJsonObservation,
    NativeAgentProviderFailure
  >;
  readonly readPlugin: (
    input: NativeProviderPluginReadInput
  ) => Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure>;
}

export interface CodexAppServerObservation {
  readonly plugins: NativeProviderJsonValue;
  readonly hooks: NativeProviderJsonValue;
}

export interface CodexNativeAgentProviderSession extends NativeAgentProviderSessionBase {
  readonly provider: "codex";
  readonly addPlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly removePlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly inspectAppServer: () => Effect.Effect<
    CodexAppServerObservation,
    NativeAgentProviderFailure
  >;
  readonly readConfiguration: () => Effect.Effect<
    NativeProviderJsonValue,
    NativeAgentProviderFailure
  >;
  readonly setMarketplaceSource: (
    input: Readonly<{ identity: string; source: ArtifactTreeLocation }>
  ) => Effect.Effect<void, NativeAgentProviderFailure>;
  readonly setPluginEnabled: (
    input: Readonly<{ selector: string; enabled: boolean }>
  ) => Effect.Effect<void, NativeAgentProviderFailure>;
}

export interface ClaudeNativeAgentProviderSession extends NativeAgentProviderSessionBase {
  readonly provider: "claude";
  readonly installPlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly enablePlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly disablePlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly uninstallPlugin: (
    input: NativeProviderPluginSelectorInput
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly readConfiguration: () => Effect.Effect<
    NativeProviderJsonValue | null,
    NativeAgentProviderFailure
  >;
}

export interface NativeAgentProviderResource<Session, R = never> {
  readonly acquire: (
    input: NativeProviderSessionInput
  ) => Effect.Effect<Session, NativeAgentProviderFailure, R>;
}
