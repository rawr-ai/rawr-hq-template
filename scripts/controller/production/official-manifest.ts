import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { ControllerOfficialMemberInput } from "@rawr/controller-release";
// Classification is controller product input; the build app does not own a duplicate copy.
import type { ControllerCommandPackageClassification } from "../../../apps/cli/src/lib/controller/classification.ts";

type CachedCommand = Readonly<{
  aliases?: unknown;
  hiddenAliases?: unknown;
  id?: unknown;
  relativePath?: unknown;
}>;

export type GeneratedManifest = Readonly<{
  version: string;
  commands: Record<string, CachedCommand>;
}>;

type LoadedPlugin = Readonly<{
  manifest: GeneratedManifest;
  hooks: Readonly<Record<string, unknown>>;
  topics: readonly Readonly<{ name: string }>[];
  version: string;
  load(): Promise<void>;
}>;

type PluginConstructor = new (options: Readonly<Record<string, unknown>>) => LoadedPlugin;
const COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*$/u;

export type NativeManagerIdentity = Readonly<{
  packageId: string;
  version: string;
  hooks: readonly string[];
}>;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function collectJsonPropertyNames(value: unknown, names: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectJsonPropertyNames(entry, names);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    names.add(key);
    collectJsonPropertyNames(entry, names);
  }
}

export function serializeGeneratedManifest(manifest: GeneratedManifest): Readonly<{
  value: GeneratedManifest;
  text: string;
}> {
  const nativeText = JSON.stringify(manifest);
  if (nativeText === undefined) throw new Error("generated manifest is not JSON serializable");
  const value = JSON.parse(nativeText) as GeneratedManifest;
  const propertyNames = new Set<string>();
  collectJsonPropertyNames(value, propertyNames);
  return Object.freeze({
    value,
    text: JSON.stringify(value, [...propertyNames].sort(compareCodeUnits), 2),
  });
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
  const values = value as string[];
  if (
    values.some((entry) => entry.length === 0 || entry.trim() !== entry) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${label} must contain unique canonical strings`);
  }
  return Object.freeze([...values].sort());
}

function commandIdentity(value: string, label: string): string {
  if (!COMMAND_ID_PATTERN.test(value)) {
    throw new Error(`${label} is not a canonical command identity`);
  }
  return value;
}

function commandStringArray(value: unknown, label: string): readonly string[] {
  return stringArray(value, label).map((entry) => commandIdentity(entry, label));
}

function relativePathParts(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((part) => typeof part !== "string")
  ) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  const parts = value as string[];
  if (
    parts.some(
      (part) =>
        part.length === 0 ||
        part === "." ||
        part === ".." ||
        part.includes("/") ||
        part.includes("\\") ||
        part.includes("\0")
    )
  ) {
    throw new Error(`${label} must contain only canonical path segments`);
  }
  return Object.freeze([...parts]);
}

function assertContained(root: string, candidate: string, label: string): void {
  const offset = relative(root, candidate);
  if (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset)) return;
  throw new Error(`${label} escapes ${root}`);
}

function commandTopics(commandId: string): readonly string[] {
  const parts = commandId.split(":");
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join(":"));
}

async function loadPluginConstructor(appRoot: string): Promise<PluginConstructor> {
  const requireFromApp = createRequire(join(appRoot, "package.json"));
  const coreEntry = requireFromApp.resolve("@oclif/core");
  const core = (await import(pathToFileURL(coreEntry).href)) as { Plugin?: unknown };
  if (typeof core.Plugin !== "function")
    throw new Error("staged @oclif/core has no public Plugin class");
  return core.Plugin as PluginConstructor;
}

async function assertCommandModules(
  packageRoot: string,
  manifest: GeneratedManifest
): Promise<void> {
  for (const [id, command] of Object.entries(manifest.commands)) {
    commandIdentity(id, `generated command ${id}`);
    if (command.id !== id) throw new Error(`generated command manifest identity mismatch: ${id}`);
    const relativePath = relativePathParts(command.relativePath, `${id}.relativePath`);
    const modulePath = resolve(packageRoot, ...relativePath);
    assertContained(packageRoot, modulePath, `${id}.relativePath`);
    const status = await lstat(modulePath);
    if (!status.isFile()) throw new Error(`generated command module is not a file: ${id}`);
    if ((await realpath(modulePath)) !== modulePath) {
      throw new Error(`generated command module is not an independent static file: ${id}`);
    }
  }
}

async function generatePackageManifest(options: {
  Plugin: PluginConstructor;
  packageRoot: string;
  expectedPackageId: string;
}): Promise<{
  version: string;
  commandIds: readonly string[];
  topics: readonly string[];
  aliases: readonly string[];
  hiddenAliases: readonly string[];
  hooks: readonly string[];
}> {
  const plugin = new options.Plugin({
    root: options.packageRoot,
    type: "core",
    ignoreManifest: true,
    errorOnManifestCreate: true,
    respectNoCacheDefault: true,
  });
  await plugin.load();
  const packageManifest = JSON.parse(
    await readFile(join(options.packageRoot, "package.json"), "utf8")
  ) as { name?: unknown };
  if (packageManifest.name !== options.expectedPackageId) {
    throw new Error(`generated command package identity mismatch: ${options.expectedPackageId}`);
  }
  const serializedManifest = serializeGeneratedManifest(plugin.manifest);
  const manifest = serializedManifest.value;
  await assertCommandModules(options.packageRoot, manifest);
  const commandIds = Object.keys(manifest.commands).sort();
  const aliases = new Set<string>();
  const hiddenAliases = new Set<string>();
  const topics = new Set(
    plugin.topics.map((topic) => commandIdentity(topic.name, "generated topic"))
  );
  for (const [id, command] of Object.entries(manifest.commands)) {
    for (const topic of commandTopics(id)) topics.add(topic);
    for (const alias of commandStringArray(command.aliases ?? [], `${id}.aliases`))
      aliases.add(alias);
    for (const alias of commandStringArray(command.hiddenAliases ?? [], `${id}.hiddenAliases`))
      hiddenAliases.add(alias);
  }
  await writeFile(
    join(options.packageRoot, "oclif.manifest.json"),
    `${serializedManifest.text}\n`,
    { mode: 0o644 }
  );
  return Object.freeze({
    version: plugin.version,
    commandIds: Object.freeze(commandIds),
    topics: Object.freeze([...topics].sort()),
    aliases: Object.freeze([...aliases].sort()),
    hiddenAliases: Object.freeze([...hiddenAliases].sort()),
    hooks: Object.freeze(Object.keys(plugin.hooks).sort()),
  });
}

export async function generateOfficialMemberInputs(options: {
  appRoot: string;
  classifications: readonly ControllerCommandPackageClassification[];
  nativeManager: NativeManagerIdentity;
}): Promise<readonly Omit<ControllerOfficialMemberInput, "payloadDigest">[]> {
  const Plugin = await loadPluginConstructor(options.appRoot);
  const results: Omit<ControllerOfficialMemberInput, "payloadDigest">[] = [];
  const commandOwner = new Map<string, string>();

  for (const row of options.classifications) {
    if (row.disposition !== "controller-member") continue;
    const memberRoot = `app/node_modules/${row.packageId}`;
    const packageRoot = join(options.appRoot, "node_modules", row.packageId);
    if (!row.discoverCommands) {
      if (row.packageId !== options.nativeManager.packageId) {
        throw new Error(
          `non-discoverable controller member is not the native manager: ${row.packageId}`
        );
      }
      results.push(
        Object.freeze({
          packageId: row.packageId,
          version: options.nativeManager.version,
          role: "native-manager",
          root: memberRoot,
          commandIds: Object.freeze([]),
          topics: Object.freeze([]),
          aliases: Object.freeze([]),
          hiddenAliases: Object.freeze([]),
          hooks: options.nativeManager.hooks,
        })
      );
      continue;
    }
    const generated = await generatePackageManifest({
      Plugin,
      packageRoot,
      expectedPackageId: row.packageId,
    });
    for (const commandId of generated.commandIds) {
      const priorOwner = commandOwner.get(commandId);
      if (priorOwner !== undefined) {
        throw new Error(
          `production command ${commandId} is duplicated by ${priorOwner} and ${row.packageId}`
        );
      }
      commandOwner.set(commandId, row.packageId);
    }
    results.push(
      Object.freeze({
        packageId: row.packageId,
        version: generated.version,
        role: "command",
        root: memberRoot,
        commandIds: generated.commandIds,
        topics: generated.topics,
        aliases: generated.aliases,
        hiddenAliases: generated.hiddenAliases,
        hooks: generated.hooks,
      })
    );
  }
  results.sort((left, right) => left.packageId.localeCompare(right.packageId));
  return Object.freeze(results);
}
