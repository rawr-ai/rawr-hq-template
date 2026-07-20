import type { ProviderMarketplaceSource } from "../../service/modules/providers/ports/state";

export type NativeProviderResourceFailureKind =
  | "ownership-conflict"
  | "provider-failure";

/** Service-owned projection of a typed native-resource failure. */
export class NativeProviderResourceFailure extends Error {
  readonly _tag = "NativeProviderResourceFailure" as const;
  readonly kind: NativeProviderResourceFailureKind;
  readonly path: string | undefined;

  constructor(input: Readonly<{
    kind: NativeProviderResourceFailureKind;
    detail: string;
    path: string | undefined;
  }>) {
    super(input.detail);
    this.name = "NativeProviderResourceFailure";
    this.kind = input.kind;
    this.path = input.path;
  }
}

export interface NativeResourceSessionInput {
  readonly executablePath: string;
  readonly home: string;
}

export interface NativeResourceCapabilityProbe {
  readonly provider: "claude" | "codex";
  readonly executablePath: string;
  readonly home: string;
  readonly pluginCommands: readonly string[];
  readonly marketplaceCommands: readonly string[];
  readonly appServerMethods: readonly string[];
}

export interface NativeResourceJsonObservation {
  readonly json: unknown;
  readonly stdout: string;
  readonly stderr: string;
}

export interface NativeResourcePackageEntry {
  readonly path: string;
  readonly mode: number;
  readonly bytes: Uint8Array;
}

export interface NativeResourcePackageObservation {
  readonly entries: readonly NativeResourcePackageEntry[];
}

export interface NativeResourcePackageReadLimits {
  readonly maxEntries: number;
  readonly maxBytes: number;
}

export interface NativeResourceMarketplaceReadInput extends NativeResourcePackageReadLimits {
  readonly identity: string;
}

export interface NativeResourcePluginReadInput extends NativeResourcePackageReadLimits {
  readonly selector: string;
}

interface NativeResourceSessionBase {
  readonly executablePath: string;
  readonly home: string;
  probe(): Promise<NativeResourceCapabilityProbe>;
  listMarketplaces(): Promise<NativeResourceJsonObservation>;
  readMarketplace(input: NativeResourceMarketplaceReadInput): Promise<NativeResourcePackageObservation>;
  addMarketplace(input: ProviderMarketplaceSource): Promise<unknown>;
  removeMarketplace(input: Readonly<{ identity: string }>): Promise<unknown>;
  listPlugins(): Promise<NativeResourceJsonObservation>;
  readPlugin(input: NativeResourcePluginReadInput): Promise<NativeResourcePackageObservation>;
}

export interface CodexNativeResourceSession extends NativeResourceSessionBase {
  readonly provider: "codex";
  addPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  removePlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  inspectAppServer(): Promise<Readonly<{ plugins: unknown; hooks: unknown }>>;
  readConfiguration(): Promise<unknown>;
  setMarketplaceSource(input: Readonly<{
    identity: string;
    source: ProviderMarketplaceSource;
  }>): Promise<unknown>;
}

export interface ClaudeNativeResourceSession extends NativeResourceSessionBase {
  readonly provider: "claude";
  installPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  enablePlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  uninstallPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  readConfiguration(): Promise<unknown | null>;
}

/** Mechanical acquisition only; provider semantics remain in this service module. */
export interface NativeProviderResourcePort {
  acquireCodex(input: NativeResourceSessionInput): Promise<CodexNativeResourceSession>;
  acquireClaude(input: NativeResourceSessionInput): Promise<ClaudeNativeResourceSession>;
}
