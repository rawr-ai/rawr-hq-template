import {
  FORBIDDEN_LEGACY_RAWR_KEYS,
  WORKSPACE_PLUGIN_KINDS,
  type PluginCapabilityEligibility,
  type WorkspacePluginDiscoveryRoot,
  type WorkspacePluginKind,
} from "../entities";

const EXPECTED_KIND_BY_ROOT: Record<WorkspacePluginDiscoveryRoot, WorkspacePluginKind> = {
  cli: "toolkit",
  agents: "agent",
  web: "web",
  "server/api": "api",
  "async/workflows": "workflows",
  "async/schedules": "schedules",
};

export type ParsedWorkspacePluginManifest = {
  name?: string;
  kind: WorkspacePluginKind;
  capability: string;
};

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function throwContractError(pkgJsonPath: string, message: string): never {
  throw new Error(`Plugin manifest contract violation at ${pkgJsonPath}: ${message}`);
}

function assertNoForbiddenLegacyKeys(rawr: Record<string, unknown>, pkgJsonPath: string): void {
  for (const key of FORBIDDEN_LEGACY_RAWR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawr, key)) throwContractError(pkgJsonPath, `forbidden rawr.${key} is present`);
  }
}

export function hasWorkspacePluginContract(manifest: unknown): boolean {
  return isObjectRecord(manifest) && "rawr" in manifest;
}

export function parseWorkspacePluginManifest(input: {
  manifest: unknown;
  pkgJsonPath: string;
  discoveryRoot: WorkspacePluginDiscoveryRoot;
}): ParsedWorkspacePluginManifest {
  if (!isObjectRecord(input.manifest)) throwContractError(input.pkgJsonPath, "manifest must be a JSON object");
  const rawr = input.manifest.rawr;
  if (!isObjectRecord(rawr)) throwContractError(input.pkgJsonPath, "required rawr object is missing");
  assertNoForbiddenLegacyKeys(rawr, input.pkgJsonPath);

  const rawKind = toOptionalString(rawr.kind);
  if (!rawKind) throwContractError(input.pkgJsonPath, "required rawr.kind is missing");
  if (!WORKSPACE_PLUGIN_KINDS.includes(rawKind as WorkspacePluginKind)) {
    throwContractError(input.pkgJsonPath, `invalid rawr.kind "${rawKind}"`);
  }

  const kind = rawKind as WorkspacePluginKind;
  const expected = EXPECTED_KIND_BY_ROOT[input.discoveryRoot];
  if (kind !== expected) throwContractError(input.pkgJsonPath, `rawr.kind must be "${expected}" for plugins/${input.discoveryRoot}/*`);

  const capability = toOptionalString(rawr.capability)?.trim();
  if (!capability) throwContractError(input.pkgJsonPath, "required rawr.capability is missing");
  return { name: toOptionalString(input.manifest.name), kind, capability };
}

function hasOclifCommandWiring(pkgJson: unknown): boolean {
  if (!isObjectRecord(pkgJson)) return false;
  const oclif = isObjectRecord(pkgJson.oclif) ? pkgJson.oclif : null;
  const typescript = oclif && isObjectRecord(oclif.typescript) ? oclif.typescript : null;
  return typeof oclif?.commands === "string" && oclif.commands.length > 0
    && typeof typescript?.commands === "string" && typescript.commands.length > 0;
}

function hasRuntimeExports(pkgJson: unknown): boolean {
  if (!isObjectRecord(pkgJson)) return false;
  const exportsField = isObjectRecord(pkgJson.exports) ? pkgJson.exports : null;
  return Boolean(exportsField?.["./server"] || exportsField?.["./web"]);
}

export function commandPluginEligibility(kind: WorkspacePluginKind, pkgJson: unknown): PluginCapabilityEligibility {
  if (kind !== "toolkit") return { eligible: false, reason: "not a toolkit plugin" };
  if (!hasOclifCommandWiring(pkgJson)) return { eligible: false, reason: "toolkit plugin missing package.json#oclif command wiring" };
  return { eligible: true, reason: "has package.json#oclif command wiring" };
}

export function runtimeWebEligibility(kind: WorkspacePluginKind, pkgJson: unknown): PluginCapabilityEligibility {
  if (kind !== "web") return { eligible: false, reason: "not a web plugin" };
  if (!hasRuntimeExports(pkgJson)) return { eligible: false, reason: "plugin package has no runtime exports (./server or ./web)" };
  return { eligible: true, reason: "has runtime exports (./server or ./web)" };
}
