import type { Elysia } from "elysia";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type AnyElysia = Elysia<any, any, any, any, any, any, any>;

export type ServerPluginContext = {
  baseUrl: string;
};

export type ServerPlugin = {
  name: string;
  register: (
    app: AnyElysia,
    ctx: ServerPluginContext,
  ) => void | AnyElysia | Promise<void | AnyElysia>;
};

type ServerPluginModule = {
  name?: unknown;
  registerServer?: unknown;
  register?: unknown;
  default?: unknown;
};

const maybeReadPackageName = async (pluginRoot: string): Promise<string | null> => {
  try {
    const raw = await fs.readFile(path.join(pluginRoot, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
};

const resolveRepoRootFrom = (metaUrl: string) =>
  path.resolve(path.dirname(fileURLToPath(metaUrl)), "../../..");

const resolvePluginEntrypoint = (pluginRoot: string) => {
  const candidates = [
    path.join(pluginRoot, "dist", "server.js"),
    path.join(pluginRoot, "dist", "src", "server.js"),
    path.join(pluginRoot, "dist", "server", "index.js"),
    path.join(pluginRoot, "dist", "src", "server", "index.js"),
    path.join(pluginRoot, "src", "server.ts"),
    path.join(pluginRoot, "src", "server", "index.ts"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

const normalizeServerPlugin = (mod: ServerPluginModule, fallbackName: string): ServerPlugin | null => {
  const modName = typeof mod.name === "string" ? mod.name : undefined;

  if (typeof mod.registerServer === "function") {
    return {
      name: modName ?? fallbackName,
      register: (app, ctx) => (mod.registerServer as ServerPlugin["register"])(app, ctx),
    };
  }

  if (typeof mod.register === "function") {
    return {
      name: modName ?? fallbackName,
      register: (app, ctx) => (mod.register as ServerPlugin["register"])(app, ctx),
    };
  }

  if (typeof mod.default === "function") {
    return {
      name: modName ?? fallbackName,
      register: (app, ctx) => (mod.default as ServerPlugin["register"])(app, ctx),
    };
  }

  if (
    typeof mod.default === "object" &&
    mod.default !== null &&
    "register" in mod.default &&
    typeof (mod.default as { register?: unknown }).register === "function"
  ) {
    const def = mod.default as { name?: unknown; register: ServerPlugin["register"] };
    return {
      name: typeof def.name === "string" ? def.name : modName ?? fallbackName,
      register: (app, ctx) => def.register(app, ctx),
    };
  }

  return null;
};

export async function mountServerPlugins<TApp extends AnyElysia>(
  app: TApp,
  plugins: readonly ServerPlugin[],
  ctx: ServerPluginContext,
): Promise<TApp> {
  let current: AnyElysia = app;
  for (const plugin of plugins) {
    const maybeNext = await plugin.register(current, ctx);
    if (maybeNext) current = maybeNext;
  }
  return current as TApp;
}

export type LoadWorkspaceServerPluginsOptions = {
  repoRoot?: string;
  pluginsDir?: string;
};

export async function loadWorkspaceServerPlugins(
  options: LoadWorkspaceServerPluginsOptions = {},
): Promise<ServerPlugin[]> {
  const repoRoot = options.repoRoot ?? resolveRepoRootFrom(import.meta.url);
  const splitPluginsDir = path.join(repoRoot, "plugins", "web");
  const pluginsDir = options.pluginsDir ?? splitPluginsDir;

  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await fs.readdir(pluginsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const plugins: ServerPlugin[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const pluginRoot = path.join(pluginsDir, entry.name);
    const packageName = (await maybeReadPackageName(pluginRoot)) ?? entry.name;
    const entrypoint = resolvePluginEntrypoint(pluginRoot);
    if (!entrypoint) continue;

    try {
      const mod = (await import(pathToFileURL(entrypoint).href)) as ServerPluginModule;
      const plugin = normalizeServerPlugin(mod, packageName);
      if (plugin) plugins.push(plugin);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[server] failed to load plugin ${packageName}:`, err);
    }
  }

  return plugins;
}
