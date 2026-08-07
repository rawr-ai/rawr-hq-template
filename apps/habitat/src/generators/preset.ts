import { type GeneratorCallback, installPackagesTask, type Tree } from "@nx/devkit";
import {
  type HabitatRepositoryPresetOptions,
  initializeHabitatBunRepository,
} from "../nx/repository-preset.js";
import { habitatConsumerBinding } from "../nx-generators.js";

/** Creates Habitat's portable Bun/Nx repository spine before Git initialization. */
export default function createHabitatRepository(
  tree: Tree,
  options: HabitatRepositoryPresetOptions
): GeneratorCallback | undefined {
  const result = initializeHabitatBunRepository(tree, habitatConsumerBinding, options);
  if (!result.packageChanged) return undefined;
  return () => installPackagesTask(tree, false, "", "bun");
}
