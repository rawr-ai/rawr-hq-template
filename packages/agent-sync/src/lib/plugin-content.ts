import path from "node:path";

import { type Static,Type } from "typebox";
import { Value } from "typebox/value";

import { readJsonFile } from "./fs-utils";
import type { SourcePlugin,SyncAgent } from "./types";

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
    // Relative to the plugin root (SourcePlugin.absPath).
    overlayRoot: Type.Optional(Type.String({ minLength: 1 })),
    include: Type.Optional(IncludeSchema),
  },
  { additionalProperties: false },
);

const PluginContentManifestV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    // Relative to the plugin root (SourcePlugin.absPath).
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
  overlayRootAbs: Record<SyncAgent, string>;
  includeByProvider: Record<SyncAgent, NormalizedInclude>;
  manifest: PluginContentManifestV1 | null;
};

const layoutCache = new Map<string, PluginContentLayout>();

function normalizeInclude(input: unknown | undefined): NormalizedInclude {
  const obj = (input && typeof input === "object") ? (input as any) : {};
  return {
    workflows: obj.workflows ?? true,
    skills: obj.skills ?? true,
    scripts: obj.scripts ?? true,
    agents: obj.agents ?? true,
  };
}

function resolveRel(pluginAbsPath: string, relOrAbs: string): string {
  // Treat everything as relative-to-plugin-root unless it's already absolute.
  if (path.isAbsolute(relOrAbs)) return relOrAbs;
  return path.resolve(pluginAbsPath, relOrAbs);
}

export async function resolvePluginContentLayout(sourcePlugin: SourcePlugin): Promise<PluginContentLayout> {
  const cached = layoutCache.get(sourcePlugin.absPath);
  if (cached) return cached;

  const pkgPath = path.join(sourcePlugin.absPath, "package.json");
  const pkgJson = (await readJsonFile<Record<string, unknown>>(pkgPath)) ?? {};
  const rawr = (pkgJson as any).rawr;
  const maybeManifest = rawr && typeof rawr === "object" ? (rawr as any).pluginContent : undefined;

  let manifest: PluginContentManifestV1 | null = null;
  if (maybeManifest !== undefined) {
    if (!Value.Check(PluginContentManifestV1Schema, maybeManifest)) {
      // Fail fast for explicit manifests so we don't silently drift layouts.
      throw new Error(`Invalid package.json#rawr.pluginContent in ${pkgPath}`);
    }
    manifest = maybeManifest as PluginContentManifestV1;
  }

  const baseRootAbs = resolveRel(sourcePlugin.absPath, manifest?.contentRoot ?? ".");
  const baseInclude = normalizeInclude(manifest?.include);

  const overlayRootAbs: Record<SyncAgent, string> = {
    codex: resolveRel(sourcePlugin.absPath, manifest?.providers?.codex?.overlayRoot ?? path.join("providers", "codex")),
    claude: resolveRel(sourcePlugin.absPath, manifest?.providers?.claude?.overlayRoot ?? path.join("providers", "claude")),
  };

  const includeByProvider: Record<SyncAgent, NormalizedInclude> = {
    codex: { ...baseInclude, ...normalizeInclude(manifest?.providers?.codex?.include) },
    claude: { ...baseInclude, ...normalizeInclude(manifest?.providers?.claude?.include) },
  };

  const layout: PluginContentLayout = { baseRootAbs, baseInclude, overlayRootAbs, includeByProvider, manifest };
  layoutCache.set(sourcePlugin.absPath, layout);
  return layout;
}

export function clearPluginContentLayoutCacheForTests(): void {
  layoutCache.clear();
}

