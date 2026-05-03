import { Value } from "typebox/value";
import type { AgentConfigSyncResources } from "../../resources";
import type { SourcePlugin, SyncAgent } from "../../entities";
import {
  PluginContentManifestV1Schema,
  type NormalizedPluginContentInclude,
  type PluginContentManifestV1,
} from "../entities";

type PackageJson = {
  rawr?: unknown;
};

export type PluginContentLayout = {
  baseRootAbs: string;
  baseInclude: NormalizedPluginContentInclude;
  overlayRootAbs: Record<SyncAgent, string>;
  includeByProvider: Record<SyncAgent, NormalizedPluginContentInclude>;
  manifest: PluginContentManifestV1 | null;
};

/**
 * Narrows manifest JSON before resolving optional plugin-content fields.
 */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * Applies default inclusion semantics for canonical and provider content roots.
 */
function normalizeInclude(input: unknown): NormalizedPluginContentInclude {
  const record = asRecord(input) ?? {};
  return {
    workflows: typeof record.workflows === "boolean" ? record.workflows : true,
    skills: typeof record.skills === "boolean" ? record.skills : true,
    scripts: typeof record.scripts === "boolean" ? record.scripts : true,
    agents: typeof record.agents === "boolean" ? record.agents : true,
  };
}

/**
 * Resolves plugin-content paths relative to the source plugin package.
 */
function resolveRelativePath(input: {
  pathOps: AgentConfigSyncResources["path"];
  pluginAbsPath: string;
  relOrAbsPath: string;
}): string {
  return input.pathOps.isAbsolute(input.relOrAbsPath)
    ? input.relOrAbsPath
    : input.pathOps.resolve(input.pluginAbsPath, input.relOrAbsPath);
}

/**
 * Parses the versioned package.json#rawr.pluginContent manifest with TypeBox.
 */
function parsePluginContentManifest(input: {
  candidate: unknown;
  packageJsonPath: string;
}): PluginContentManifestV1 | null {
  if (input.candidate === undefined) return null;
  try {
    return Value.Parse(PluginContentManifestV1Schema, input.candidate);
  } catch {
    throw new Error(`Invalid package.json#rawr.pluginContent in ${input.packageJsonPath}`);
  }
}

/**
 * Resolves canonical and provider overlay roots for one source plugin.
 */
export async function resolvePluginContentLayout(input: {
  sourcePlugin: SourcePlugin;
  resources: AgentConfigSyncResources;
}): Promise<PluginContentLayout> {
  const packageJsonPath = input.resources.path.join(input.sourcePlugin.absPath, "package.json");
  const packageJson = (await input.resources.files.readJsonFile<PackageJson>(packageJsonPath)) ?? {};
  const rawr = asRecord(packageJson.rawr);
  const manifest = parsePluginContentManifest({
    candidate: rawr?.pluginContent,
    packageJsonPath,
  });
  const baseInclude = normalizeInclude(manifest?.include);

  return {
    baseRootAbs: resolveRelativePath({
      pathOps: input.resources.path,
      pluginAbsPath: input.sourcePlugin.absPath,
      relOrAbsPath: manifest?.contentRoot ?? ".",
    }),
    baseInclude,
    overlayRootAbs: {
      codex: resolveRelativePath({
        pathOps: input.resources.path,
        pluginAbsPath: input.sourcePlugin.absPath,
        relOrAbsPath: manifest?.providers?.codex?.overlayRoot ?? input.resources.path.join("providers", "codex"),
      }),
      claude: resolveRelativePath({
        pathOps: input.resources.path,
        pluginAbsPath: input.sourcePlugin.absPath,
        relOrAbsPath: manifest?.providers?.claude?.overlayRoot ?? input.resources.path.join("providers", "claude"),
      }),
    },
    includeByProvider: {
      codex: { ...baseInclude, ...normalizeInclude(manifest?.providers?.codex?.include) },
      claude: { ...baseInclude, ...normalizeInclude(manifest?.providers?.claude?.include) },
    },
    manifest,
  };
}
