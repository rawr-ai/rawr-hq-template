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
} from "../dto/provider-dependencies";

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
} from "../dto/provider-dependencies";
