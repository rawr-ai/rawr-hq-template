import { isDeepStrictEqual } from "node:util";

import {
  type NxJsonConfiguration,
  type PluginConfiguration,
  readJson,
  readNxJson,
  type Tree,
  updateNxJson,
  writeJson,
} from "@nx/devkit";
import { type Static, Type } from "typebox";
import { Validator } from "typebox/schema";

const NX_CONFIG_PATH = "nx.json";
const PACKAGE_PATH = "package.json";
const CODEX_HOOKS_PATH = ".codex/hooks.json";

const HabitatHookMarkerSchema = Type.Object(
  {
    identity: Type.String({
      minLength: 1,
      description: "Stable package-owned identity for one Habitat hook contribution.",
    }),
    revision: Type.Integer({
      minimum: 0,
      description: "Monotonic payload revision for the named Habitat contribution.",
    }),
  },
  { additionalProperties: false, description: "Habitat hook ownership marker." }
);

const HookGroupSchema = Type.Object(
  {
    _habitat: Type.Optional(HabitatHookMarkerSchema),
    hooks: Type.Array(Type.Unknown(), {
      description: "Ordered command contributions in one Codex hook group.",
    }),
  },
  { additionalProperties: true, description: "One consumer-owned Codex hook group." }
);

const HabitatHookCommandSchema = Type.Object(
  {
    type: Type.Literal("command", {
      description: "Codex hook handler kind owned by the Habitat initializer.",
    }),
    command: Type.String({
      minLength: 1,
      description: "Installed Habitat command executed by the Codex hook.",
    }),
    statusMessage: Type.String({
      minLength: 1,
      description: "Operator-facing status rendered while Habitat checks run.",
    }),
    timeout: Type.Integer({
      minimum: 1,
      description: "Maximum seconds allowed for the Habitat hook command.",
    }),
  },
  { additionalProperties: false, description: "One Habitat-owned Codex hook command." }
);

const HabitatOwnedHookGroupSchema = Type.Object(
  {
    _habitat: HabitatHookMarkerSchema,
    hooks: Type.Array(HabitatHookCommandSchema, {
      minItems: 1,
      description: "Commands contributed by the installed Habitat package.",
    }),
  },
  { additionalProperties: false, description: "The named Habitat Codex hook contribution." }
);

const CodexHooksSchema = Type.Object(
  {
    hooks: Type.Optional(
      Type.Record(Type.String(), Type.Array(HookGroupSchema), {
        description: "Ordered hook groups keyed by Codex event identity.",
      })
    ),
  },
  { additionalProperties: true, description: "Consumer-owned Codex hook configuration." }
);

const ConsumerPackageSchema = Type.Object(
  {
    trustedDependencies: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), {
        description: "Package lifecycle scripts explicitly trusted by the Bun consumer.",
      })
    ),
  },
  { additionalProperties: true, description: "Nx consumer package metadata." }
);

type HookGroup = Static<typeof HookGroupSchema>;
type HabitatOwnedHookGroup = Static<typeof HabitatOwnedHookGroupSchema>;
type CodexHooks = Static<typeof CodexHooksSchema>;
type ConsumerPackage = Static<typeof ConsumerPackageSchema>;
type PlannedValue<T> = Readonly<{ changed: boolean; value: T }>;

const hooksValidator = new Validator({}, CodexHooksSchema);
const packageValidator = new Validator({}, ConsumerPackageSchema);

/** App-owned identities and exact predecessor states consumed by native Nx initialization. */
export type HabitatConsumerBinding = Readonly<{
  gritPackage: string;
  hook: HabitatOwnedHookGroup;
  nxPlugin: string;
  predecessorHooks: readonly HookGroup[];
  predecessorNxPlugins: readonly PluginConfiguration[];
}>;

/** Observable generator decision needed to schedule the consumer package manager once. */
export type HabitatInitializationResult = Readonly<{
  packageChanged: boolean;
}>;

/**
 * Converges one Nx consumer on the app-owned Habitat plugin, hook, and Grit trust.
 *
 * Every admission and compatibility decision completes before the first Tree
 * write, so an incompatible consumer remains byte-for-byte unchanged.
 */
export function initializeHabitatConsumer(
  tree: Tree,
  binding: HabitatConsumerBinding
): HabitatInitializationResult {
  const nxJson = requireNxJson(tree);
  const hooks = readHooks(tree);
  const packageJson = readPackage(tree);
  const nxPlan = planNxInitialization(nxJson, binding);
  const hookPlan = planHookInitialization(hooks, binding);
  const packagePlan = planPackageInitialization(packageJson, binding.gritPackage);

  if (nxPlan.changed) updateNxJson(tree, nxPlan.value);
  if (hookPlan.changed) writeJson(tree, CODEX_HOOKS_PATH, hookPlan.value);
  if (packagePlan.changed) writeJson(tree, PACKAGE_PATH, packagePlan.value);

  return { packageChanged: packagePlan.changed };
}

/** Removes only Habitat's named hook group while preserving installed Nx integration. */
export function removeHabitatHook(tree: Tree, binding: HabitatConsumerBinding): void {
  const hooks = readHooks(tree);
  const hookPlan = planHookRemoval(hooks, binding);
  if (hookPlan.changed) writeJson(tree, CODEX_HOOKS_PATH, hookPlan.value);
}

function requireNxJson(tree: Tree): NxJsonConfiguration {
  const nxJson = readNxJson(tree);
  if (nxJson === null) {
    throw new Error("Habitat initialization requires an Nx workspace with nx.json.");
  }
  return nxJson;
}

function readHooks(tree: Tree): CodexHooks {
  if (!tree.exists(CODEX_HOOKS_PATH)) return { hooks: {} };
  const input: unknown = readJson<Record<string, unknown>>(tree, CODEX_HOOKS_PATH);
  if (!hooksValidator.Check(input)) {
    throw new Error(`${CODEX_HOOKS_PATH} is not a supported Codex hook document.`);
  }
  return input;
}

function readPackage(tree: Tree): ConsumerPackage {
  if (!tree.exists(PACKAGE_PATH)) {
    throw new Error("Habitat initialization requires an Nx workspace package.json.");
  }
  const input: unknown = readJson<Record<string, unknown>>(tree, PACKAGE_PATH);
  if (!packageValidator.Check(input)) {
    throw new Error("package.json is not a supported Nx consumer package document.");
  }
  return input;
}

function planNxInitialization(
  nxJson: NxJsonConfiguration,
  binding: HabitatConsumerBinding
): PlannedValue<NxJsonConfiguration> {
  const plugins = nxJson.plugins ?? [];
  const matches = plugins.filter(
    (plugin) =>
      hasPluginIdentity(plugin, binding.nxPlugin) ||
      binding.predecessorNxPlugins.some((predecessor) =>
        hasPluginIdentity(
          plugin,
          typeof predecessor === "string" ? predecessor : predecessor.plugin
        )
      )
  );
  if (matches.length > 1) {
    throw new Error("nx.json contains multiple Habitat Nx plugin registrations.");
  }

  const match = matches[0];
  if (match === binding.nxPlugin) return { changed: false, value: nxJson };
  if (
    match !== undefined &&
    !binding.predecessorNxPlugins.some((predecessor) => isDeepStrictEqual(predecessor, match))
  ) {
    throw new Error("nx.json contains an incompatible Habitat Nx plugin registration.");
  }

  const nextPlugins =
    match === undefined
      ? [...plugins, binding.nxPlugin]
      : plugins.map((plugin) => (plugin === match ? binding.nxPlugin : plugin));
  return { changed: true, value: { ...nxJson, plugins: nextPlugins } };
}

function planHookInitialization(
  hooks: CodexHooks,
  binding: HabitatConsumerBinding
): PlannedValue<CodexHooks> {
  const location = oneOwnedHookLocation(hooks, binding);
  if (location !== undefined && isDeepStrictEqual(location.group, binding.hook)) {
    return { changed: false, value: hooks };
  }
  if (
    location !== undefined &&
    !binding.predecessorHooks.some((predecessor) => isDeepStrictEqual(predecessor, location.group))
  ) {
    throw new Error(`${CODEX_HOOKS_PATH} contains an incompatible Habitat hook contribution.`);
  }

  const events = hooks.hooks ?? {};
  const stop = events.Stop ?? [];
  const nextStop =
    location === undefined
      ? [...stop, binding.hook]
      : stop.map((group, index) => (index === location.index ? binding.hook : group));
  return {
    changed: true,
    value: { ...hooks, hooks: { ...events, Stop: nextStop } },
  };
}

function planHookRemoval(
  hooks: CodexHooks,
  binding: HabitatConsumerBinding
): PlannedValue<CodexHooks> {
  const location = oneOwnedHookLocation(hooks, binding);
  if (location === undefined) return { changed: false, value: hooks };
  if (
    !isDeepStrictEqual(location.group, binding.hook) &&
    !binding.predecessorHooks.some((predecessor) => isDeepStrictEqual(predecessor, location.group))
  ) {
    throw new Error(`${CODEX_HOOKS_PATH} contains an incompatible Habitat hook contribution.`);
  }

  const events = hooks.hooks ?? {};
  const stop = events.Stop ?? [];
  return {
    changed: true,
    value: {
      ...hooks,
      hooks: { ...events, Stop: stop.filter((_group, index) => index !== location.index) },
    },
  };
}

function planPackageInitialization(
  packageJson: ConsumerPackage,
  gritPackage: string
): PlannedValue<ConsumerPackage> {
  const trusted = packageJson.trustedDependencies ?? [];
  const matches = trusted.filter((dependency) => dependency === gritPackage);
  if (matches.length > 1) {
    throw new Error(`package.json contains duplicate ${gritPackage} trust entries.`);
  }
  if (matches.length === 1) return { changed: false, value: packageJson };
  return {
    changed: true,
    value: { ...packageJson, trustedDependencies: [...trusted, gritPackage] },
  };
}

function oneOwnedHookLocation(
  hooks: CodexHooks,
  binding: HabitatConsumerBinding
): Readonly<{ group: HookGroup; index: number }> | undefined {
  const identity = binding.hook._habitat.identity;
  const locations = Object.entries(hooks.hooks ?? {}).flatMap(([event, groups]) =>
    groups.flatMap((group, index) => {
      const marked = group._habitat?.identity === identity;
      const predecessor = binding.predecessorHooks.some((candidate) =>
        isDeepStrictEqual(candidate, group)
      );
      return marked || predecessor ? [{ event, group, index }] : [];
    })
  );
  if (locations.length > 1) {
    throw new Error(`${CODEX_HOOKS_PATH} contains multiple Habitat hook contributions.`);
  }
  const location = locations[0];
  if (location !== undefined && location.event !== "Stop") {
    throw new Error(`${CODEX_HOOKS_PATH} contains a Habitat hook contribution outside Stop.`);
  }
  return location;
}

function hasPluginIdentity(plugin: PluginConfiguration, identity: string): boolean {
  return plugin === identity || (typeof plugin === "object" && plugin.plugin === identity);
}
