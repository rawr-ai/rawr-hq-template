import type {
  CollisionClass,
  ExternalExtensionCollision,
  ReservedControllerSurface,
  ReservedIdentityClass,
  StaticExternalExtension,
} from "./model";

export const RESERVED_MANAGER_LIFECYCLE_HOOKS = [
  "plugins:postinstall",
  "plugins:postuninstall",
  "plugins:preinstall",
  "update",
] as const;

type ReservedControllerSurfaceInput = {
  packageIds?: Iterable<string>;
  commandIds?: Iterable<string>;
  topics?: Iterable<string>;
  aliases?: Iterable<string>;
  hiddenAliases?: Iterable<string>;
  hooks?: Iterable<string>;
};

export function createReservedControllerSurface(
  input: ReservedControllerSurfaceInput
): ReservedControllerSurface {
  return {
    packageIds: normalizedSet(input.packageIds),
    commandIds: normalizedCommandSet(input.commandIds),
    topics: normalizedCommandSet(input.topics),
    aliases: normalizedCommandSet(input.aliases),
    hiddenAliases: normalizedCommandSet(input.hiddenAliases),
    hooks: new Set([...normalizedSet(input.hooks), ...RESERVED_MANAGER_LIFECYCLE_HOOKS]),
  };
}

export function findReservedSurfaceCollisions(
  extension: StaticExternalExtension,
  reserved: ReservedControllerSurface
): readonly ExternalExtensionCollision[] {
  const collisions: ExternalExtensionCollision[] = [];

  if (reserved.packageIds.has(extension.packageId)) {
    collisions.push({
      collisionClass: "package",
      value: extension.packageId,
      reservedAs: ["package"],
    });
  }

  for (const topic of extension.topics) {
    collectCommandCollision(collisions, "topic", topic, reserved);
  }

  for (const command of extension.commands) {
    collectCommandCollision(collisions, "command", command.id, reserved);
    for (const topic of command.topics)
      collectCommandCollision(collisions, "topic", topic, reserved);
    for (const alias of command.aliases)
      collectCommandCollision(collisions, "alias", alias, reserved);
    for (const alias of command.hiddenAliases) {
      collectCommandCollision(collisions, "hidden-alias", alias, reserved);
    }
  }

  for (const hook of extension.hooks) {
    if (reserved.hooks.has(hook)) {
      collisions.push({ collisionClass: "hook", value: hook, reservedAs: ["hook"] });
    }
  }

  return uniqueCollisions(collisions).sort(compareCollision);
}

function collectCommandCollision(
  target: ExternalExtensionCollision[],
  collisionClass: Exclude<CollisionClass, "package" | "hook">,
  value: string,
  reserved: ReservedControllerSurface
): void {
  const reservedAs: ReservedIdentityClass[] = [];
  if (reserved.commandIds.has(value)) reservedAs.push("command");
  if (reserved.topics.has(value)) reservedAs.push("topic");
  if (reserved.aliases.has(value)) reservedAs.push("alias");
  if (reserved.hiddenAliases.has(value)) reservedAs.push("hidden-alias");
  if (reservedAs.length > 0) target.push({ collisionClass, value, reservedAs });
}

function normalizedSet(values: Iterable<string> | undefined): Set<string> {
  return new Set(
    [...(values ?? [])]
      .map((value) => value.trim())
      .filter(Boolean)
      .sort()
  );
}

function normalizedCommandSet(values: Iterable<string> | undefined): Set<string> {
  return new Set(
    [...(values ?? [])]
      .map(normalizeCommandId)
      .filter((value): value is string => value !== null)
      .sort()
  );
}

export function normalizeCommandId(value: string): string | null {
  const parts = value
    .trim()
    .split(/[\s:]+/u)
    .filter(Boolean);
  if (parts.length === 0 || parts.some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(part))) {
    return null;
  }
  return parts.join(":");
}

export function commandTopics(commandId: string): readonly string[] {
  const parts = commandId.split(":");
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join(":"));
}

function uniqueCollisions(
  collisions: readonly ExternalExtensionCollision[]
): ExternalExtensionCollision[] {
  const seen = new Set<string>();
  return collisions.filter((collision) => {
    const key = `${collision.collisionClass}\0${collision.value}\0${collision.reservedAs.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareCollision(
  left: ExternalExtensionCollision,
  right: ExternalExtensionCollision
): number {
  return (
    left.collisionClass.localeCompare(right.collisionClass) ||
    left.value.localeCompare(right.value) ||
    left.reservedAs.join(",").localeCompare(right.reservedAs.join(","))
  );
}
