import { Command, ModuleLoader, Plugin } from "@oclif/core";
import path from "node:path";

import type { StaticCommandManifest, StaticExternalExtension } from "./model";
import type { ExternalExtensionStatePort } from "./native-registry";

export function createStaticManifestPlugin(
  input: Readonly<{
    extension: StaticExternalExtension;
    type: string;
    state: ExternalExtensionStatePort;
  }>
): Plugin {
  const extension = input.extension;
  const pjson = {
    name: extension.packageId,
    version: extension.version,
    ...(extension.moduleType === "module" ? { type: "module" } : {}),
    oclif: {
      commands: `./${extension.commandRoot.join("/")}`,
      topics: Object.fromEntries(extension.topics.map((name) => [name, {}])),
    },
  } as unknown as Plugin["pjson"];
  const plugin = new Plugin({
    root: extension.canonicalRoot,
    name: extension.packageId,
    type: input.type,
    pjson,
  });

  plugin.root = extension.canonicalRoot;
  plugin.name = extension.packageId;
  plugin.alias = extension.packageId;
  plugin.version = extension.version;
  plugin.type = input.type;
  plugin.pjson = pjson;
  plugin.moduleType = extension.moduleType;
  plugin.valid = true;
  plugin.hasManifest = true;
  plugin.alreadyLoaded = true;
  plugin.commandIDs = extension.commands.map((command) => command.id);
  plugin.hooks = groupHooks(extension);

  const manifestCommands = Object.fromEntries(
    extension.commands.map((command) => [command.id, cachedCommand(command)])
  );
  plugin.manifest = {
    version: extension.version,
    commands: manifestCommands,
  };
  plugin.commands = extension.commands.map((command) => {
    const cached = manifestCommands[command.id]!;
    return {
      ...cached,
      pluginAlias: extension.packageId,
      pluginType: input.type,
      load: async () =>
        await loadGuardedCommand({
          command,
          extension,
          plugin,
          state: input.state,
        }),
    };
  });
  return plugin;
}

function cachedCommand(command: StaticCommandManifest): Command.Cached {
  const metadata = command.metadata;
  const cached: Command.Cached = {
    id: command.id,
    isESM: command.isESM,
    aliases: [...command.aliases],
    hiddenAliases: [...command.hiddenAliases],
    relativePath: [...command.relativePath],
    args: isRecord(metadata.args) ? (metadata.args as Command.Cached["args"]) : {},
    flags: isRecord(metadata.flags) ? (metadata.flags as Command.Cached["flags"]) : {},
    hidden: typeof metadata.hidden === "boolean" ? metadata.hidden : false,
  };
  for (const key of ["description", "state", "summary", "type"] as const) {
    if (typeof metadata[key] === "string") cached[key] = metadata[key];
  }
  for (const key of [
    "deprecateAliases",
    "enableJsonFlag",
    "hasDynamicHelp",
    "strict",
    "supportsStdin",
  ] as const) {
    if (typeof metadata[key] === "boolean") cached[key] = metadata[key];
  }
  if (Array.isArray(metadata.examples)) {
    cached.examples = [...metadata.examples] as Command.Cached["examples"];
  }
  if (typeof metadata.usage === "string") cached.usage = metadata.usage;
  else if (
    Array.isArray(metadata.usage) &&
    metadata.usage.every((value) => typeof value === "string")
  ) {
    cached.usage = [...metadata.usage] as string[];
  }
  if (isRecord(metadata.deprecationOptions)) {
    cached.deprecationOptions = metadata.deprecationOptions as Command.Cached["deprecationOptions"];
  }
  return cached;
}

function groupHooks(extension: StaticExternalExtension): Plugin["hooks"] {
  const hooks: Plugin["hooks"] = {};
  for (const declaration of extension.hookManifests) {
    const entries = hooks[declaration.event] ?? [];
    entries.push({
      identifier: declaration.identifier,
      target: `./${declaration.target.join("/")}`,
    });
    hooks[declaration.event] = entries;
  }
  return hooks;
}

async function loadGuardedCommand(
  input: Readonly<{
    command: StaticCommandManifest;
    extension: StaticExternalExtension;
    plugin: Plugin;
    state: ExternalExtensionStatePort;
  }>
): Promise<Command.Class> {
  const inspection = await input.state.inspectRoot(
    input.extension.canonicalRoot,
    input.extension.packageId
  );
  if (
    !inspection.accepted ||
    inspection.extension.canonicalRoot !== input.extension.canonicalRoot ||
    inspection.extension.fingerprint !== input.extension.fingerprint
  ) {
    throw new Error(`External extension evidence changed before command load: ${input.command.id}`);
  }

  const cached = cachedCommand(input.command);
  const loaded = await ModuleLoader.loadWithDataFromManifest<Record<string, unknown>>(
    cached,
    input.extension.canonicalRoot
  );
  const commandClass = findCommandClass(loaded.module);
  if (commandClass === undefined) {
    throw new Error(`External command module exports no Oclif command class: ${input.command.id}`);
  }
  const loadedCommand = commandClass as Command.Class & {
    isESM?: boolean;
    relativePath?: string[];
  };
  loadedCommand.id = input.command.id;
  loadedCommand.plugin = input.plugin;
  loadedCommand.isESM = loaded.isESM;
  loadedCommand.relativePath = path
    .relative(input.extension.canonicalRoot, loaded.filePath)
    .split(path.sep);
  return loadedCommand;
}

function findCommandClass(module: Record<string, unknown>): Command.Class | undefined {
  const candidates = [module, module.default, ...Object.values(module)];
  return candidates.find(isCommandClass) as Command.Class | undefined;
}

function isCommandClass(value: unknown): value is Command.Class {
  return (
    typeof value === "function" &&
    "run" in value &&
    typeof (value as { run?: unknown }).run === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
