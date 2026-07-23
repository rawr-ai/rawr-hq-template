import type {
  NativeAgentProviderFailure,
  NativeMarketplaceSource,
  NativeProviderCapabilities,
  NativeProviderInventory,
  NativeProviderMutationResult,
  NativeProviderPluginFiles,
  NativeProviderPluginFilesReadInput,
  NativeProviderPluginSelectorInput,
} from "@rawr/resource-native-agent-provider";

import type {
  NativeProviderSessionObservation,
  NativeProviderSessionTarget,
  SelectedContentChannelResolutionInput,
  SelectedContentResolution,
  SelectedContentWorkspaceResolutionInput,
} from "../dto/provider-dependencies";

/** Exact Git and release construction stay behind this owner boundary. */
export interface SelectedContentResolver {
  resolveWorkspace(
    input: SelectedContentWorkspaceResolutionInput
  ): Promise<SelectedContentResolution>;
  resolveChannel(
    input: SelectedContentChannelResolutionInput
  ): Promise<SelectedContentResolution>;
}

interface NativeProviderSessionOperations {
  probe(): Promise<NativeProviderCapabilities>;
  inventory(): Promise<NativeProviderInventory>;
  readPluginFiles(input: NativeProviderPluginFilesReadInput): Promise<NativeProviderPluginFiles>;
  addMarketplace(source: NativeMarketplaceSource): Promise<NativeProviderMutationResult>;
  removeMarketplace(input: Readonly<{ identity: string }>): Promise<NativeProviderMutationResult>;
  installPlugin(input: NativeProviderPluginSelectorInput): Promise<NativeProviderMutationResult>;
  removePlugin(input: NativeProviderPluginSelectorInput): Promise<NativeProviderMutationResult>;
}

type NativeProviderSessionBase = Omit<NativeProviderSessionObservation, "provider"> &
  NativeProviderSessionOperations;

export type CodexNativeProviderSession = NativeProviderSessionBase &
  Readonly<{ provider: "codex" }>;

export type ClaudeNativeProviderSession = NativeProviderSessionBase &
  Readonly<{
    provider: "claude";
    enablePlugin(input: NativeProviderPluginSelectorInput): Promise<NativeProviderMutationResult>;
  }>;

export type NativeProviderSession = CodexNativeProviderSession | ClaudeNativeProviderSession;

/** Promise-facing session over the Effect-owned native resource. */
export interface NativeProviderSessionResolver {
  acquire(target: NativeProviderSessionTarget): Promise<NativeProviderSession>;
}

export type {
  NativeAgentProviderFailure,
  NativeMarketplaceSource,
  NativeProviderCapabilities,
  NativeProviderInventory,
  NativeProviderMutationResult,
  NativeProviderPluginFiles,
  NativeProviderPluginFilesReadInput,
  NativeProviderPluginSelectorInput,
} from "@rawr/resource-native-agent-provider";
export type {
  NativeProviderSessionObservation,
  NativeProviderSessionTarget,
  SelectedContent,
  SelectedContentChannelResolutionInput,
  SelectedContentFile,
  SelectedContentIssue,
  SelectedContentIssueCode,
  SelectedContentMember,
  SelectedContentResolution,
  SelectedContentTestMode,
  SelectedContentWorkspaceResolutionInput,
} from "../dto/provider-dependencies";
