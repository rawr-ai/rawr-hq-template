import { isDeepStrictEqual } from "node:util";
import {
  type GeneratorCallback,
  installPackagesTask,
  type NxJsonConfiguration,
  readJson,
  type Tree,
  writeJson,
} from "@nx/devkit";
import { initializeHabitatBunRepository } from "../nx/repository-preset.js";
import { habitatConsumerBinding } from "../nx-generators.js";

const PREVIOUS_CHECK_TARGET = {
  cache: false,
  dependsOn: [
    { projects: ["habitat"], target: "lint" },
    "typecheck",
    "verify",
    "check:policy",
    "^check",
  ],
  outputs: [],
};
const FIRST_PRESET_NX_VERSION = "23.1.0";
const CURRENT_NX_VERSION = "23.1.1";

function normalizeFirstPresetNxVersions(tree: Tree): void {
  const packageJson = readJson<{
    readonly devDependencies?: Readonly<Record<string, string>>;
  }>(tree, "package.json");
  const previousNx = packageJson.devDependencies?.nx === FIRST_PRESET_NX_VERSION;
  const previousWorkspace =
    packageJson.devDependencies?.["@nx/workspace"] === FIRST_PRESET_NX_VERSION;
  if (!previousNx && !previousWorkspace) return;

  const devDependencies = { ...packageJson.devDependencies };
  if (previousNx) devDependencies.nx = CURRENT_NX_VERSION;
  if (previousWorkspace) devDependencies["@nx/workspace"] = CURRENT_NX_VERSION;
  writeJson(tree, "package.json", { ...packageJson, devDependencies });
}

function removePreviousCheckTarget(tree: Tree): void {
  const nxJson = readJson<NxJsonConfiguration>(tree, "nx.json");
  if (!isDeepStrictEqual(nxJson.targetDefaults?.check, PREVIOUS_CHECK_TARGET)) return;

  const targetDefaults = { ...nxJson.targetDefaults };
  delete targetDefaults.check;
  writeJson(tree, "nx.json", { ...nxJson, targetDefaults });
}

/** Advances an existing Bun/Nx consumer through Habitat's canonical preset. */
export default function migrateRepositoryFoundation(tree: Tree): GeneratorCallback | undefined {
  normalizeFirstPresetNxVersions(tree);
  removePreviousCheckTarget(tree);
  const result = initializeHabitatBunRepository(tree, habitatConsumerBinding, {
    packageManager: "bun",
  });
  if (!result.packageChanged) return undefined;
  return () => installPackagesTask(tree, false, "", "bun");
}
