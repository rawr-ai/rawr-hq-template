import path from "node:path";

import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

import { readJsonFile } from "./fs-utils";
import type { AgentConfigSyncProvider, HostSourcePlugin } from "./types";

const IncludeSchema = Type.Object(
  {
    workflows: Type.Optional(Type.Boolean()),
    skills: Type.Optional(Type.Boolean()),
    scripts: Type.Optional(Type.Boolean()),
    agents: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const ProviderSchema = Type.Object(
  {
    overlayRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(IncludeSchema),
  },
  { additionalProperties: false },
);

const PluginContentManifestV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    contentRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(IncludeSchema),
    providers: Type.Optional(
      Type.Object(
        {
          codex: Type.Optional(ProviderSchema),
          claude: Type.Optional(ProviderSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export type PluginContentManifestV1 = Static<typeof PluginContentManifestV1Schema>;
export type NormalizedInclude = Required<Static<typeof IncludeSchema>>;

export type PluginContentLayout = {
  baseRootAbs: string;
  baseInclude: NormalizedInclude;
  overlayRootAbs: Record<AgentConfigSyncProvider, string>;
  includeByProvider: Record<AgentConfigSyncProvider, NormalizedInclude>;
  manifest: PluginContentManifestV1 | null;
};

const layoutCache = new Map<string, PluginContentLayout>();

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function normalizeInclude(input: unknown): NormalizedInclude {
  const record = asObjectRecord(input) ?? {};
  return {
    workflows: typeof record.workflows === "boolean" ? record.workflows : true,
    skills: typeof record.skills === "boolean" ? record.skills : true,
    scripts: typeof record.scripts === "boolean" ? record.scripts : true,
    agents: typeof record.agents === "boolean" ? record.agents : true,
  };
}

function resolveRelativePath(pluginAbsPath: string, relOrAbsPath: string): string {
  if (path.isAbsolute(relOrAbsPath)) return relOrAbsPath;
  return path.resolve(pluginAbsPath, relOrAbsPath);
}

export async function resolvePluginContentLayout(
  sourcePlugin: HostSourcePlugin,
): Promise<PluginContentLayout> {
  const cachedLayout = layoutCache.get(sourcePlugin.absPath);
  if (cachedLayout) return cachedLayout;

  const packageJsonPath = path.join(sourcePlugin.absPath, "package.json");
  const packageJson = (await readJsonFile<Record<string, unknown>>(packageJsonPath)) ?? {};
  const rawr = asObjectRecord(packageJson.rawr);
  const manifestCandidate = rawr?.pluginContent;

  let manifest: PluginContentManifestV1 | null = null;
  if (manifestCandidate !== undefined) {
    if (!Value.Check(PluginContentManifestV1Schema, manifestCandidate)) {
      throw new Error(`Invalid package.json#rawr.pluginContent in ${packageJsonPath}`);
    }
    manifest = manifestCandidate as PluginContentManifestV1;
  }

  const baseRootAbs = resolveRelativePath(sourcePlugin.absPath, manifest?.contentRoot ?? ".");
  const baseInclude = normalizeInclude(manifest?.include);

  const overlayRootAbs: Record<AgentConfigSyncProvider, string> = {
    codex: resolveRelativePath(
      sourcePlugin.absPath,
      manifest?.providers?.codex?.overlayRoot ?? path.join("providers", "codex"),
    ),
    claude: resolveRelativePath(
      sourcePlugin.absPath,
      manifest?.providers?.claude?.overlayRoot ?? path.join("providers", "claude"),
    ),
  };

  const includeByProvider: Record<AgentConfigSyncProvider, NormalizedInclude> = {
    codex: { ...baseInclude, ...normalizeInclude(manifest?.providers?.codex?.include) },
    claude: { ...baseInclude, ...normalizeInclude(manifest?.providers?.claude?.include) },
  };

  const layout: PluginContentLayout = {
    baseRootAbs,
    baseInclude,
    overlayRootAbs,
    includeByProvider,
    manifest,
  };
  layoutCache.set(sourcePlugin.absPath, layout);
  return layout;
}

export function clearPluginContentLayoutCacheForTests(): void {
  layoutCache.clear();
}
