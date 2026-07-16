import path from "node:path";

import type { QuarantineCode, StaticCommandManifest } from "./model";
import { isCanonicalPackageId } from "./package-id";
import { commandTopics, normalizeCommandId } from "./reserved-surface";

export type ParsedPackageManifest = {
  packageId: string;
  version: string;
  moduleType: "commonjs" | "module";
  commandRoot: readonly string[];
  topics: readonly string[];
  hooks: readonly HookDeclaration[];
};

export type HookDeclaration = {
  event: string;
  identifier: string;
  target: readonly string[];
};

export type ParsedCommandManifest = {
  version: string;
  commands: readonly StaticCommandManifest[];
};

export type ManifestParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string; code: QuarantineCode };

export function parsePackageManifest(text: string): ManifestParseResult<ParsedPackageManifest> {
  const parsed = parseObject(text, "package-manifest-malformed", "Package manifest");
  if (!parsed.ok) return parsed;
  const packageId = nonEmptyString(parsed.value.name);
  const version = nonEmptyString(parsed.value.version);
  if (!packageId || !isCanonicalPackageId(packageId)) {
    return malformed("package-manifest-malformed", "Package manifest has an invalid name");
  }
  if (!version) {
    return malformed("package-manifest-malformed", "Package manifest has no static version");
  }
  if (!isRecord(parsed.value.oclif)) {
    return malformed("package-manifest-malformed", "Package manifest has no static oclif object");
  }

  for (const field of ["plugins", "devPlugins"] as const) {
    const declaration = parsed.value.oclif[field];
    if (declaration === undefined) continue;
    if (!Array.isArray(declaration) || declaration.length > 0) {
      return malformed(
        "nested-plugin-declaration",
        `External extension declares nested oclif.${field}`,
      );
    }
  }

  const commandRoot = parsePathString(parsed.value.oclif.commands);
  if (!commandRoot.ok) {
    return malformed(
      "package-manifest-malformed",
      "External extension requires one bounded static oclif.commands directory",
    );
  }
  const topics = parseTopics(parsed.value.oclif.topics);
  if (!topics.ok) return topics;
  const hooks = parseHooks(parsed.value.oclif.hooks);
  if (!hooks.ok) return hooks;
  return {
    ok: true,
    value: {
      packageId,
      version,
      moduleType: parsed.value.type === "module" ? "module" : "commonjs",
      commandRoot: commandRoot.value,
      topics: topics.value,
      hooks: hooks.value,
    },
  };
}

export function parseCommandManifest(text: string): ManifestParseResult<ParsedCommandManifest> {
  const parsed = parseObject(text, "command-manifest-malformed", "Static command manifest");
  if (!parsed.ok) return parsed;
  const version = nonEmptyString(parsed.value.version);
  if (!version || !isRecord(parsed.value.commands)) {
    return malformed(
      "command-manifest-malformed",
      "Static command manifest requires a version and commands object",
    );
  }

  const commands: StaticCommandManifest[] = [];
  const declaredIdentities = new Map<string, string>();
  for (const [manifestKey, value] of Object.entries(parsed.value.commands)) {
    if (!isRecord(value)) {
      return malformed("command-manifest-malformed", `Command ${manifestKey} is not an object`);
    }
    const key = canonicalCommandId(manifestKey);
    const id = typeof value.id === "string" ? canonicalCommandId(value.id) : null;
    if (!key || !id || key !== id) {
      return malformed(
        "command-manifest-malformed",
        `Command key ${manifestKey} does not match a valid static id`,
      );
    }
    const aliases = parseCommandIdArray(value.aliases, `aliases for ${id}`);
    if (!aliases.ok) return aliases;
    const hiddenAliases = parseCommandIdArray(value.hiddenAliases, `hidden aliases for ${id}`);
    if (!hiddenAliases.ok) return hiddenAliases;
    const relativePath = parseRelativePath(value.relativePath);
    if (!relativePath.ok) return relativePath;
    if (typeof value.isESM !== "boolean") {
      return malformed(
        "command-manifest-malformed",
        `Command ${id} lacks the static isESM cache discriminator`,
      );
    }

    const topics = uniqueSorted([
      ...commandTopics(id),
      ...aliases.value.flatMap(commandTopics),
      ...hiddenAliases.value.flatMap(commandTopics),
    ]);
    const command: StaticCommandManifest = {
      id,
      isESM: value.isESM,
      topics,
      aliases: aliases.value,
      hiddenAliases: hiddenAliases.value,
      relativePath: relativePath.value,
      metadata: Object.freeze({ ...value }),
    };
    for (const [kind, values] of [
      ["command", [id]],
      ["alias", aliases.value],
      ["hidden alias", hiddenAliases.value],
    ] as const) {
      for (const identity of values) {
        const prior = declaredIdentities.get(identity);
        if (prior) {
          return malformed(
            "command-manifest-malformed",
            `${kind} ${identity} duplicates ${prior} inside the extension`,
          );
        }
        declaredIdentities.set(identity, `${kind} on ${id}`);
      }
    }
    commands.push(command);
  }

  commands.sort((left, right) => left.id.localeCompare(right.id));
  return { ok: true, value: { version, commands } };
}

function parseHooks(value: unknown): ManifestParseResult<readonly HookDeclaration[]> {
  if (value === undefined) return { ok: true, value: [] };
  if (!isRecord(value)) {
    return malformed("package-manifest-malformed", "oclif.hooks must be a static object");
  }
  const hooks: HookDeclaration[] = [];
  for (const [event, declaration] of Object.entries(value)) {
    if (!event.trim()) {
      return malformed("package-manifest-malformed", "Hook event name cannot be empty");
    }
    const targets = Array.isArray(declaration) ? declaration : [declaration];
    if (targets.length === 0) {
      return malformed("package-manifest-malformed", `Hook ${event} has no target`);
    }
    for (const target of targets) {
      const declarationRecord = isRecord(target) ? target : undefined;
      const rawTarget = typeof target === "string" ? target : declarationRecord?.target;
      const relativePath = parsePathString(rawTarget);
      if (!relativePath.ok) {
        return malformed("package-manifest-malformed", `Hook ${event} has an invalid static target`);
      }
      let identifier = "default";
      if (declarationRecord?.identifier !== undefined) {
        const declaredIdentifier = nonEmptyString(declarationRecord.identifier);
        if (
          declaredIdentifier === null
          || declaredIdentifier !== declarationRecord.identifier
        ) {
          return malformed(
            "package-manifest-malformed",
            `Hook ${event} has an invalid static identifier`,
          );
        }
        identifier = declaredIdentifier;
      }
      hooks.push({ event, identifier, target: relativePath.value });
    }
  }
  return { ok: true, value: hooks.sort((left, right) => left.event.localeCompare(right.event)) };
}

function parseTopics(
  value: unknown,
  parent: readonly string[] = [],
): ManifestParseResult<readonly string[]> {
  if (value === undefined) return { ok: true, value: [] };

  const declarations: readonly [string, unknown][] = Array.isArray(value)
    ? value.map((entry, index) => {
        if (!isRecord(entry)) return [`#${index}`, entry] as const;
        return [typeof entry.name === "string" ? entry.name : `#${index}`, entry] as const;
      })
    : isRecord(value)
      ? Object.entries(value)
      : [];
  if (declarations.length === 0 && (Array.isArray(value) || isRecord(value))) {
    return { ok: true, value: [] };
  }
  if (declarations.length === 0) {
    return malformed("package-manifest-malformed", "oclif.topics must be a static object or array");
  }

  const topics: string[] = [];
  for (const [name, declaration] of declarations) {
    if (!isRecord(declaration)) {
      return malformed("package-manifest-malformed", `Topic ${name} must be a static object`);
    }
    const normalizedName = normalizeCommandId(name);
    if (normalizedName === null || normalizedName !== name) {
      return malformed("package-manifest-malformed", `Topic ${name} has a noncanonical name`);
    }
    const topic = [...parent, ...normalizedName.split(":")].join(":");
    topics.push(topic);
    if (declaration.subtopics !== undefined) {
      const nested = parseTopics(declaration.subtopics, topic.split(":"));
      if (!nested.ok) return nested;
      topics.push(...nested.value);
    }
  }
  if (new Set(topics).size !== topics.length) {
    return malformed("package-manifest-malformed", "oclif.topics contains duplicate identities");
  }
  return { ok: true, value: topics.sort() };
}

function parseCommandIdArray(value: unknown, label: string): ManifestParseResult<readonly string[]> {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return malformed("command-manifest-malformed", `${label} must be an array`);
  }
  const normalized: string[] = [];
  for (const entry of value) {
    const commandId = typeof entry === "string" ? canonicalCommandId(entry) : null;
    if (!commandId) {
      return malformed("command-manifest-malformed", `${label} contains an invalid command id`);
    }
    normalized.push(commandId);
  }
  if (new Set(normalized).size !== normalized.length) {
    return malformed("command-manifest-malformed", `${label} contains duplicates`);
  }
  return { ok: true, value: normalized.sort() };
}

function canonicalCommandId(value: string): string | null {
  const normalized = normalizeCommandId(value);
  return normalized === value ? normalized : null;
}

function parseRelativePath(value: unknown): ManifestParseResult<readonly string[]> {
  if (!Array.isArray(value) || value.some((part) => typeof part !== "string")) {
    return malformed(
      "command-manifest-malformed",
      "Command relativePath must be a static string array",
    );
  }
  return parsePathString(value.join("/"));
}

function parsePathString(value: unknown): ManifestParseResult<readonly string[]> {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) {
    return malformed("command-manifest-malformed", "Declared module path must be relative");
  }
  const normalized = value.replace(/^\.([\\/])/u, "");
  const parts = normalized.split(/[\\/]+/u);
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\0"))) {
    return malformed("command-manifest-malformed", "Declared module path is unsafe");
  }
  return { ok: true, value: parts };
}

function parseObject(
  text: string,
  code: QuarantineCode,
  label: string,
): ManifestParseResult<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return malformed(code, `${label} must be a JSON object`);
    return { ok: true, value };
  } catch (error) {
    return malformed(code, `${label} is not valid JSON: ${errorMessage(error)}`);
  }
}

function malformed<T>(code: QuarantineCode, reason: string): ManifestParseResult<T> {
  return { ok: false, code, reason };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
