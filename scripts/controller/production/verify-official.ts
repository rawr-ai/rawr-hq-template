import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { ControllerOfficialMember } from "@rawr/controller-release";
import { CONTROLLER_PRODUCTION_APP_NAME } from "./constants.ts";
// The semantic adapter extends the sole release byte verifier; it does not
// create a second envelope or inventory read model.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  requireVerifiedControllerRelease,
  type VerifiedControllerRelease,
} from "../../../apps/cli/src/lib/controller/release-inspector.ts";

type JsonRecord = Record<string, unknown>;
const COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*$/u;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function canonical(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label}`);
  }
  const values = value as string[];
  if (
    values.some((entry) => entry.length === 0 || entry.trim() !== entry)
    || new Set(values).size !== values.length
  ) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} is not a canonical string set`);
  }
  return Object.freeze([...values].sort());
}

function orderedStringArray(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((entry) => typeof entry !== "string")
  ) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label}`);
  }
  const parts = value as string[];
  if (
    parts.some(
      (part) => part.length === 0
        || part === "."
        || part === ".."
        || part.includes("/")
        || part.includes("\\")
        || part.includes("\0"),
    )
  ) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has unsafe path segments`);
  }
  return Object.freeze([...parts]);
}

function commandIdentity(value: string, label: string): string {
  if (!COMMAND_ID_PATTERN.test(value)) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} is not canonical`);
  }
  return value;
}

function commandStringArray(value: unknown, label: string): readonly string[] {
  return stringArray(value, label).map((entry) => commandIdentity(entry, label));
}

function commandTopics(commandId: string): readonly string[] {
  const parts = commandId.split(":");
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join(":"));
}

function equalSet(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function requireEqualSurface(
  member: ControllerOfficialMember,
  name: "commandIds" | "topics" | "aliases" | "hiddenAliases" | "hooks",
  actual: readonly string[],
): void {
  if (!equalSet(member[name], actual)) {
    throw new Error(
      `CONTROLLER_OFFICIAL_SURFACE_MISMATCH: ${member.packageId}.${name} expected ${member[name].join(",")} received ${actual.join(",")}`,
    );
  }
}

function assertContained(root: string, candidate: string, label: string): void {
  const offset = relative(root, candidate);
  if (offset === "" || (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset))) return;
  throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} escapes ${root}`);
}

async function assertIndependentFile(root: string, candidate: string, label: string): Promise<void> {
  assertContained(root, candidate, label);
  try {
    if (await realpath(candidate) !== candidate || !(await lstat(candidate)).isFile()) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} is not an independent file`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CONTROLLER_OFFICIAL_SURFACE_INVALID:")) {
      throw error;
    }
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} is not an independent file`, {
      cause: error,
    });
  }
}

function hookTargets(value: unknown, label: string): readonly string[] {
  const entries = Array.isArray(value) ? value : [value];
  if (entries.length === 0) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has no targets`);
  }
  const targets = entries.map((entry, index) => {
    const target = typeof entry === "string"
      ? entry
      : isRecord(entry) && typeof entry.target === "string"
        ? entry.target
        : undefined;
    if (target === undefined || !target.startsWith("./") || target.includes("*") || target.includes("\0")) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label}[${index}] target`);
    }
    return target;
  });
  if (new Set(targets).size !== targets.length) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has duplicate targets`);
  }
  return Object.freeze(targets);
}

async function verifyHookTargets(memberRoot: string, hooks: JsonRecord, label: string): Promise<void> {
  for (const [hook, value] of Object.entries(hooks)) {
    if (hook.length === 0 || hook.trim() !== hook) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has a noncanonical hook name`);
    }
    for (const target of hookTargets(value, `${label}.${hook}`)) {
      const path = resolve(memberRoot, target);
      await assertIndependentFile(memberRoot, path, `${label}.${hook}`);
    }
  }
}

function exportTargets(value: unknown, label: string): readonly string[] {
  if (typeof value === "string") return Object.freeze([value]);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has no targets`);
    }
    return Object.freeze(value.flatMap((entry, index) => exportTargets(entry, `${label}[${index}]`)));
  }
  if (!isRecord(value)) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} target`);
  }
  const targets = Object.entries(value)
    .filter(([condition]) => condition !== "types")
    .flatMap(([condition, target]) => exportTargets(target, `${label}.${condition}`));
  if (targets.length === 0) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has no executable target`);
  }
  return Object.freeze(targets);
}

async function verifyPublicExports(memberRoot: string, value: unknown, label: string): Promise<void> {
  const targets = exportTargets(value, label);
  if (new Set(targets).size !== targets.length) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} has duplicate targets`);
  }
  for (const target of targets) {
    if (!target.startsWith("./") || target.includes("*") || target.includes("\0")) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${label} target`);
    }
    await assertIndependentFile(memberRoot, resolve(memberRoot, target), label);
  }
}

async function verifyProductionApp(
  releaseRoot: string,
  members: readonly ControllerOfficialMember[],
): Promise<void> {
  const cli = members.find((member) => member.packageId === "@rawr/cli");
  if (cli === undefined) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_MISMATCH: production app has no @rawr/cli member");
  }
  const appRoot = resolve(releaseRoot, "app");
  assertContained(releaseRoot, appRoot, "production app root");
  if (await realpath(appRoot) !== appRoot || !(await lstat(appRoot)).isDirectory()) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_INVALID: production app root");
  }
  const manifest = JSON.parse(await readFile(join(appRoot, "package.json"), "utf8")) as JsonRecord;
  const oclif = manifest.oclif;
  const dependencies = manifest.dependencies;
  if (
    !hasExactKeys(manifest, ["dependencies", "name", "oclif", "private", "type", "version"])
    || manifest.name !== CONTROLLER_PRODUCTION_APP_NAME
    || manifest.version !== cli.version
    || manifest.private !== true
    || manifest.type !== "module"
    || !isRecord(dependencies)
    || dependencies["@rawr/cli"] !== cli.version
    || !isRecord(oclif)
    || !hasExactKeys(oclif, ["bin", "plugins", "topicSeparator"])
    || oclif.bin !== "rawr"
    || oclif.topicSeparator !== " "
    || oclif.commands !== undefined
    || oclif.devPlugins !== undefined
    || oclif.hooks !== undefined
    || !equalSet(stringArray(oclif.plugins, "production app plugins"), ["@rawr/cli"])
  ) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_MISMATCH: production app composition");
  }
  for (const manifestName of ["oclif.manifest.json", ".oclif.manifest.json"]) {
    try {
      await lstat(join(appRoot, manifestName));
      throw new Error("CONTROLLER_OFFICIAL_SURFACE_INVALID: production app command manifest is present");
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
}

async function verifyCommandMember(options: {
  member: ControllerOfficialMember;
  memberRoot: string;
  packageManifest: JsonRecord;
}): Promise<void> {
  const oclif = options.packageManifest.oclif;
  if (!isRecord(oclif) || typeof oclif.commands !== "string") {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: ${options.member.packageId} has no static command root`);
  }
  if (oclif.plugins !== undefined && options.member.packageId !== "@rawr/cli") {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: nested plugins in ${options.member.packageId}`);
  }
  if (oclif.devPlugins !== undefined) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: dev plugins in ${options.member.packageId}`);
  }
  const manifest = JSON.parse(
    await readFile(join(options.memberRoot, "oclif.manifest.json"), "utf8"),
  ) as JsonRecord;
  if (manifest.version !== options.member.version || !isRecord(manifest.commands)) {
    throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: static manifest identity for ${options.member.packageId}`);
  }
  const commandIds = Object.keys(manifest.commands).sort();
  const topics = new Set<string>();
  const aliases = new Set<string>();
  const hiddenAliases = new Set<string>();
  for (const [id, rawCommand] of Object.entries(manifest.commands)) {
    commandIdentity(id, `${options.member.packageId}:${id}`);
    if (!isRecord(rawCommand) || rawCommand.id !== id) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: command identity ${options.member.packageId}:${id}`);
    }
    for (const topic of commandTopics(id)) topics.add(topic);
    for (const alias of commandStringArray(rawCommand.aliases ?? [], `${id}.aliases`)) aliases.add(alias);
    for (const alias of commandStringArray(rawCommand.hiddenAliases ?? [], `${id}.hiddenAliases`)) {
      hiddenAliases.add(alias);
    }
    const relativePath = orderedStringArray(rawCommand.relativePath, `${id}.relativePath`);
    const modulePath = resolve(options.memberRoot, ...relativePath);
    await assertIndependentFile(
      options.memberRoot,
      modulePath,
      `command module ${options.member.packageId}:${id}`,
    );
  }
  if (isRecord(oclif.topics)) {
    for (const topic of Object.keys(oclif.topics)) {
      topics.add(commandIdentity(topic, `${options.member.packageId}.topics`));
    }
  }
  const hooksConfig = isRecord(oclif.hooks) ? oclif.hooks : {};
  await verifyHookTargets(options.memberRoot, hooksConfig, `${options.member.packageId}.hooks`);
  const hooks = Object.keys(hooksConfig);
  requireEqualSurface(options.member, "commandIds", commandIds);
  requireEqualSurface(options.member, "topics", canonical(topics));
  requireEqualSurface(options.member, "aliases", canonical(aliases));
  requireEqualSurface(options.member, "hiddenAliases", canonical(hiddenAliases));
  requireEqualSurface(options.member, "hooks", canonical(hooks));
}

async function verifyManagerMember(options: {
  member: ControllerOfficialMember;
  memberRoot: string;
  packageManifest: JsonRecord;
}): Promise<void> {
  const oclif = options.packageManifest.oclif;
  if (oclif !== undefined && !isRecord(oclif)) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_INVALID: native manager oclif field");
  }
  await verifyPublicExports(
    options.memberRoot,
    options.packageManifest.exports,
    `${options.member.packageId}.exports`,
  );
  if (
    isRecord(oclif)
    && (oclif.commands !== undefined || oclif.plugins !== undefined || oclif.devPlugins !== undefined)
  ) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_INVALID: native manager discovery is enabled");
  }
  for (const manifestName of ["oclif.manifest.json", ".oclif.manifest.json"]) {
    try {
      await lstat(join(options.memberRoot, manifestName));
      throw new Error("CONTROLLER_OFFICIAL_SURFACE_INVALID: native manager command manifest is present");
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
  const hooksConfig = isRecord(oclif) && isRecord(oclif.hooks) ? oclif.hooks : {};
  await verifyHookTargets(options.memberRoot, hooksConfig, `${options.member.packageId}.hooks`);
  const hooks = Object.keys(hooksConfig);
  requireEqualSurface(options.member, "commandIds", []);
  requireEqualSurface(options.member, "topics", []);
  requireEqualSurface(options.member, "aliases", []);
  requireEqualSurface(options.member, "hiddenAliases", []);
  requireEqualSurface(options.member, "hooks", canonical(hooks));
}

export async function requireVerifiedOfficialControllerRelease(input: {
  releaseRoot: string;
  expectedDigest: string;
}): Promise<VerifiedControllerRelease> {
  const release = await requireVerifiedControllerRelease(input);
  const members = release.envelope.manifest.officialMembers;
  await verifyProductionApp(release.releaseRoot, members);
  const managers = members.filter((member) => member.role === "native-manager");
  if (
    managers.length !== 1
    || managers[0]?.packageId !== "@oclif/plugin-plugins"
    || members.find((member) => member.packageId === "@rawr/cli")?.role !== "command"
  ) {
    throw new Error("CONTROLLER_OFFICIAL_SURFACE_MISMATCH: release-owned member roles");
  }
  for (const member of members) {
    const memberRoot = resolve(release.releaseRoot, member.root);
    assertContained(release.releaseRoot, memberRoot, `${member.packageId}.root`);
    if (await realpath(memberRoot) !== memberRoot || !(await lstat(memberRoot)).isDirectory()) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_INVALID: member root ${member.packageId}`);
    }
    const packageManifest = JSON.parse(
      await readFile(join(memberRoot, "package.json"), "utf8"),
    ) as JsonRecord;
    if (packageManifest.name !== member.packageId || packageManifest.version !== member.version) {
      throw new Error(`CONTROLLER_OFFICIAL_SURFACE_MISMATCH: package identity ${member.packageId}`);
    }
    if (member.packageId === "@rawr/cli") {
      const oclif = packageManifest.oclif;
      const expectedPlugins = members
        .filter((candidate) => candidate.role === "command" && candidate.packageId !== "@rawr/cli")
        .map((candidate) => candidate.packageId)
        .sort();
      if (!isRecord(oclif) || !equalSet(stringArray(oclif.plugins, "@rawr/cli.plugins"), expectedPlugins)) {
        throw new Error("CONTROLLER_OFFICIAL_SURFACE_MISMATCH: @rawr/cli.plugins");
      }
    }
    if (member.role === "command") {
      await verifyCommandMember({ member, memberRoot, packageManifest });
    } else {
      await verifyManagerMember({ member, memberRoot, packageManifest });
    }
  }
  return release;
}
