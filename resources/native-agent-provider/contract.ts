import type { Effect } from "effect";

import type { ArtifactTreeLocation } from "@rawr/resource-agent-plugin-artifact-repository";

export type NativeAgentProviderId = "claude" | "codex";

export type NativeAgentProviderOperation =
  | "acquire"
  | "probe"
  | "marketplace-list"
  | "marketplace-read"
  | "marketplace-add"
  | "marketplace-remove"
  | "plugin-list"
  | "plugin-read"
  | "plugin-install"
  | "plugin-enable"
  | "plugin-disable"
  | "plugin-remove"
  | "app-server-inspect"
  | "config-read"
  | "config-write";

export type NativeAgentProviderFailureReason =
  | "InvalidInput"
  | "Missing"
  | "Aliased"
  | "UnsupportedEntry"
  | "LimitExceeded"
  | "CommandFailed"
  | "CommandTimedOut"
  | "InvalidJson"
  | "ProtocolFailed"
  | "OwnershipConflict"
  | "FilesystemFailed";

export interface NativeAgentProviderFailure {
  readonly _tag: "NativeAgentProviderFailure";
  readonly provider: NativeAgentProviderId;
  readonly operation: NativeAgentProviderOperation;
  readonly reason: NativeAgentProviderFailureReason;
  readonly path?: string;
  readonly detail: string;
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
  readonly listMarketplaces: () => Effect.Effect<NativeProviderJsonObservation, NativeAgentProviderFailure>;
  readonly addMarketplace: (
    source: ArtifactTreeLocation,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly readMarketplace: (
    input: NativeProviderMarketplaceReadInput,
  ) => Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure>;
  readonly removeMarketplace: (
    input: NativeProviderMarketplaceIdentityInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly listPlugins: () => Effect.Effect<NativeProviderJsonObservation, NativeAgentProviderFailure>;
  readonly readPlugin: (
    input: NativeProviderPluginReadInput,
  ) => Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure>;
}

export interface CodexAppServerObservation {
  readonly plugins: NativeProviderJsonValue;
  readonly hooks: NativeProviderJsonValue;
}

export interface CodexNativeAgentProviderSession extends NativeAgentProviderSessionBase {
  readonly provider: "codex";
  readonly addPlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly removePlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly inspectAppServer: () => Effect.Effect<CodexAppServerObservation, NativeAgentProviderFailure>;
  readonly readConfiguration: () => Effect.Effect<NativeProviderJsonValue, NativeAgentProviderFailure>;
  readonly setMarketplaceSource: (
    input: Readonly<{ identity: string; source: ArtifactTreeLocation }>,
  ) => Effect.Effect<void, NativeAgentProviderFailure>;
  readonly setPluginEnabled: (
    input: Readonly<{ selector: string; enabled: boolean }>,
  ) => Effect.Effect<void, NativeAgentProviderFailure>;
}

export interface ClaudeNativeAgentProviderSession extends NativeAgentProviderSessionBase {
  readonly provider: "claude";
  readonly installPlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly enablePlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly disablePlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly uninstallPlugin: (
    input: NativeProviderPluginSelectorInput,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly readConfiguration: () => Effect.Effect<NativeProviderJsonValue | null, NativeAgentProviderFailure>;
}

export interface NativeAgentProviderResource<Session, R = never> {
  readonly acquire: (
    input: NativeProviderSessionInput,
  ) => Effect.Effect<Session, NativeAgentProviderFailure, R>;
}
