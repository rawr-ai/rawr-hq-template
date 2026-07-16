import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  NativeExternalEntry,
  NativeRegistryProjection,
  QuarantinedExternalExtension,
  StaticExternalExtension,
} from "../../src/lib/external-extensions/model";
import { commandTopics } from "../../src/lib/external-extensions/reserved-surface";

export const fixtureRoots: string[] = [];
const CANONICAL_TEMP_ROOT = realpathSync(os.tmpdir());
const FIXTURE_PREFIX = "rawr-";

export function removeFixtureRoots(): void {
  while (fixtureRoots.length > 0) {
    const root = fixtureRoots.pop();
    if (!root || !existsSync(root)) continue;
    const canonicalRoot = realpathSync(root);
    const status = lstatSync(root);
    if (
      !status.isDirectory()
      || status.isSymbolicLink()
      || canonicalRoot !== root
      || path.dirname(canonicalRoot) !== CANONICAL_TEMP_ROOT
      || !path.basename(canonicalRoot).startsWith(FIXTURE_PREFIX)
    ) {
      throw new Error(`refusing to remove invalid external-extension fixture root: ${root}`);
    }
    rmSync(canonicalRoot, { recursive: true, force: true });
  }
}

export function tempRoot(label: string): string {
  if (!/^[a-z0-9-]+$/u.test(label)) {
    throw new Error(`invalid external-extension fixture label: ${label}`);
  }
  const root = realpathSync(mkdtempSync(path.join(CANONICAL_TEMP_ROOT, `${FIXTURE_PREFIX}${label}-`)));
  fixtureRoots.push(root);
  return root;
}

type ExtensionFixtureInput = {
  root?: string;
  packageId?: string;
  version?: string;
  commandId?: string;
  commandsRoot?: string;
  includeIsESM?: boolean;
  aliases?: readonly string[];
  hiddenAliases?: readonly string[];
  hooks?: Readonly<Record<string, string | Readonly<{ target: string; identifier?: string }>>>;
  topics?: unknown;
  nestedPlugins?: readonly string[];
  manifestVersion?: string;
  omitCommandManifest?: boolean;
  malformedCommandManifest?: boolean;
  omitCommandModule?: boolean;
  sentinelPath?: string;
};

export function writeExtensionFixture(input: ExtensionFixtureInput = {}): string {
  const root = input.root ?? tempRoot("external-extension");
  const packageId = input.packageId ?? "@fixture/external";
  const version = input.version ?? "1.0.0";
  const commandId = input.commandId ?? "fixture:hello";
  const commandPath = ["dist", "commands", "hello.js"];
  const hooks = input.hooks ?? {};

  mkdirSync(path.join(root, "dist", "commands"), { recursive: true });
  mkdirSync(path.join(root, "dist", "hooks"), { recursive: true });
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: packageId,
        version,
        oclif: {
          commands: input.commandsRoot ?? "./dist/commands",
          ...(input.topics === undefined ? {} : { topics: input.topics }),
          ...(input.nestedPlugins ? { plugins: input.nestedPlugins } : {}),
          ...(Object.keys(hooks).length > 0 ? { hooks } : {}),
        },
      },
      null,
      2,
    ),
  );
  if (!input.omitCommandModule) {
    const sentinel = input.sentinelPath
      ? `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(input.sentinelPath)}, "loaded");`
      : "export default class FixtureCommand {}";
    writeFileSync(path.join(root, ...commandPath), sentinel);
  }
  for (const declaration of Object.values(hooks)) {
    const target = typeof declaration === "string" ? declaration : declaration.target;
    const targetPath = path.resolve(root, target);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, "export default async function fixtureHook() {}\n");
  }
  if (!input.omitCommandManifest) {
    writeFileSync(
      path.join(root, "oclif.manifest.json"),
      input.malformedCommandManifest
        ? "{not-json"
        : JSON.stringify(
            {
              version: input.manifestVersion ?? version,
              commands: {
                [commandId]: {
                  id: commandId,
                  ...(input.includeIsESM === false ? {} : { isESM: true }),
                  aliases: input.aliases ?? [],
                  hiddenAliases: input.hiddenAliases ?? [],
                  relativePath: commandPath,
                },
              },
            },
            null,
            2,
          ),
    );
  }
  return root;
}

export function staticExtension(input: {
  packageId?: string;
  root?: string;
  fingerprint?: string;
  commandId?: string;
} = {}): StaticExternalExtension {
  const packageId = input.packageId ?? "@fixture/external";
  const root = input.root ?? "/external/fixture";
  const commandId = input.commandId ?? "fixture:hello";
  return {
    packageId,
    version: "1.0.0",
    root,
    canonicalRoot: root,
    fingerprint: input.fingerprint ?? "a".repeat(64),
    moduleType: "module",
    commandRoot: ["dist", "commands"],
    topics: [],
    commands: [
      {
        id: commandId,
        isESM: true,
        topics: commandTopics(commandId),
        aliases: [],
        hiddenAliases: [],
        relativePath: ["dist", "commands", "hello.js"],
        metadata: {
          id: commandId,
          isESM: true,
          aliases: [],
          hiddenAliases: [],
          relativePath: ["dist", "commands", "hello.js"],
        },
      },
    ],
    hooks: [],
    hookManifests: [],
  };
}

export function activeState(
  extension: StaticExternalExtension,
  entry: NativeExternalEntry = {
    name: extension.packageId,
    type: "user",
    tag: "latest",
    dependencySpec: extension.version,
  },
): NativeRegistryProjection {
  return {
    registryPath: "/native/package.json",
    status: "valid",
    hasResidue: true,
    active: [{ entry, extension }],
    quarantined: [],
  };
}

export function emptyState(): NativeRegistryProjection {
  return {
    registryPath: "/native/package.json",
    status: "missing",
    hasResidue: false,
    active: [],
    quarantined: [],
  };
}

export function quarantinedState(
  quarantine: QuarantinedExternalExtension,
): NativeRegistryProjection {
  return {
    registryPath: "/native/package.json",
    status: "valid",
    hasResidue: true,
    active: [],
    quarantined: [quarantine],
  };
}
