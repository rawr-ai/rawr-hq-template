export const WORKSPACE_PLUGIN_KINDS = ["toolkit", "agent", "web", "api", "workflows"] as const;
export type WorkspacePluginKind = (typeof WORKSPACE_PLUGIN_KINDS)[number];

export const WORKSPACE_PLUGIN_DISCOVERY_ROOTS = ["cli", "agents", "web", "api", "workflows"] as const;
export type WorkspacePluginDiscoveryRoot = (typeof WORKSPACE_PLUGIN_DISCOVERY_ROOTS)[number];

export const FORBIDDEN_LEGACY_RAWR_KEYS = ["templateRole", "channel", "publishTier", "published"] as const;
export type ForbiddenLegacyRawrKey = (typeof FORBIDDEN_LEGACY_RAWR_KEYS)[number];

export type ParsedWorkspacePluginManifest = {
  name?: string;
  kind: WorkspacePluginKind;
  capability: string;
  templateRole: "operational";
  channel: "A" | "B";
  publishTier: "blocked";
};

const EXPECTED_KIND_BY_ROOT: Record<WorkspacePluginDiscoveryRoot, WorkspacePluginKind> = {
  cli: "toolkit",
  agents: "agent",
  web: "web",
  api: "api",
  workflows: "workflows",
};

type ManifestParseInput = {
  manifest: unknown;
  pkgJsonPath: string;
  discoveryRoot: WorkspacePluginDiscoveryRoot;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

function throwContractError(pkgJsonPath: string, message: string): never {
  throw new Error(`Plugin manifest contract violation at ${pkgJsonPath}: ${message}`);
}

function deriveLegacyCompatibilityFields(kind: WorkspacePluginKind): Pick<ParsedWorkspacePluginManifest, "templateRole" | "channel" | "publishTier"> {
  return {
    // Legacy lifecycle fields are retained as compatibility outputs only.
    templateRole: "operational",
    channel: kind === "toolkit" ? "A" : "B",
    publishTier: "blocked",
  };
}

function assertNoForbiddenLegacyKeys(rawr: Record<string, unknown>, pkgJsonPath: string): void {
  for (const key of FORBIDDEN_LEGACY_RAWR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawr, key)) {
      throwContractError(pkgJsonPath, `forbidden rawr.${key} is present`);
    }
  }
}

function parseKind(rawr: Record<string, unknown>, pkgJsonPath: string): WorkspacePluginKind {
  const kind = toOptionalString(rawr.kind);
  if (!kind) {
    throwContractError(pkgJsonPath, "required rawr.kind is missing");
  }
  if (!WORKSPACE_PLUGIN_KINDS.includes(kind as WorkspacePluginKind)) {
    throwContractError(pkgJsonPath, `invalid rawr.kind "${kind}"`);
  }
  return kind as WorkspacePluginKind;
}

function parseCapability(rawr: Record<string, unknown>, pkgJsonPath: string): string {
  const capability = toOptionalString(rawr.capability)?.trim();
  if (!capability) {
    throwContractError(pkgJsonPath, "required rawr.capability is missing");
  }
  return capability;
}

function assertKindMatchesDiscoveryRoot(
  kind: WorkspacePluginKind,
  discoveryRoot: WorkspacePluginDiscoveryRoot,
  pkgJsonPath: string,
): void {
  const expected = EXPECTED_KIND_BY_ROOT[discoveryRoot];
  if (kind !== expected) {
    throwContractError(pkgJsonPath, `rawr.kind must be "${expected}" for plugins/${discoveryRoot}/*`);
  }
}

export function parseWorkspacePluginManifest(input: ManifestParseInput): ParsedWorkspacePluginManifest {
  if (!isObjectRecord(input.manifest)) {
    throwContractError(input.pkgJsonPath, "manifest must be a JSON object");
  }

  const rawr = input.manifest.rawr;
  if (!isObjectRecord(rawr)) {
    throwContractError(input.pkgJsonPath, "required rawr object is missing");
  }

  assertNoForbiddenLegacyKeys(rawr, input.pkgJsonPath);

  const kind = parseKind(rawr, input.pkgJsonPath);
  assertKindMatchesDiscoveryRoot(kind, input.discoveryRoot, input.pkgJsonPath);

  return {
    name: toOptionalString(input.manifest.name),
    kind,
    capability: parseCapability(rawr, input.pkgJsonPath),
    ...deriveLegacyCompatibilityFields(kind),
  };
}
