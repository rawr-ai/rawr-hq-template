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
  readonly root: string;
  readonly entries: readonly NativeResourcePackageEntry[];
}

export interface NativeResourcePackageReadInput {
  readonly root: string;
  readonly maxEntries: number;
  readonly maxBytes: number;
}

interface NativeResourceSessionBase {
  readonly executablePath: string;
  readonly home: string;
  probe(): Promise<NativeResourceCapabilityProbe>;
  listMarketplaces(): Promise<NativeResourceJsonObservation>;
  addMarketplace(input: Readonly<{ sourcePath: string }>): Promise<unknown>;
  removeMarketplace(input: Readonly<{ identity: string }>): Promise<unknown>;
  listPlugins(): Promise<NativeResourceJsonObservation>;
  readPackage(input: NativeResourcePackageReadInput): Promise<NativeResourcePackageObservation>;
}

export interface CodexNativeResourceSession extends NativeResourceSessionBase {
  readonly provider: "codex";
  addPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  removePlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  inspectAppServer(): Promise<Readonly<{ plugins: unknown; hooks: unknown }>>;
  readConfiguration(): Promise<unknown>;
  setMarketplaceSource(input: Readonly<{ identity: string; sourcePath: string }>): Promise<unknown>;
  setPluginEnabled(input: Readonly<{ selector: string; enabled: boolean }>): Promise<unknown>;
}

export interface ClaudeNativeResourceSession extends NativeResourceSessionBase {
  readonly provider: "claude";
  installPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  enablePlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  disablePlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  uninstallPlugin(input: Readonly<{ selector: string }>): Promise<unknown>;
  readConfiguration(): Promise<unknown | null>;
}

/** Mechanical acquisition only; provider semantics remain in this service module. */
export interface NativeProviderResourcePort {
  acquireCodex(input: NativeResourceSessionInput): Promise<CodexNativeResourceSession>;
  acquireClaude(input: NativeResourceSessionInput): Promise<ClaudeNativeResourceSession>;
}
