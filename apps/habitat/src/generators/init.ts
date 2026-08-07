import { execSync } from "node:child_process";

import {
  type GeneratorCallback,
  getPackageManagerCommand,
  installPackagesTask,
  runTasksInSerial,
  type Tree,
} from "@nx/devkit";
import { initializeHabitatConsumer } from "../nx/initialization.js";
import { assertHabitatBunConsumer } from "../nx/repository-preset.js";
import { habitatConsumerBinding } from "../nx-generators.js";

/** Initializes the installed Habitat package inside one Nx consumer. */
export default function initializeHabitat(tree: Tree): GeneratorCallback {
  assertHabitatBunConsumer(tree);
  const result = initializeHabitatConsumer(tree, habitatConsumerBinding);
  const activateHusky = () => {
    const command = `${getPackageManagerCommand("bun").exec} husky`;
    execSync(command, {
      cwd: tree.root,
      stdio: "inherit",
    });
  };

  if (!result.packageChanged) return activateHusky;
  return runTasksInSerial(() => installPackagesTask(tree, false, "", "bun"), activateHusky);
}
