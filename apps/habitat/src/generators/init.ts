import { execSync } from "node:child_process";

import {
  detectPackageManager,
  type GeneratorCallback,
  getPackageManagerCommand,
  installPackagesTask,
  runTasksInSerial,
  type Tree,
} from "@nx/devkit";
import { initializeHabitatConsumer } from "../nx/initialization.js";
import { habitatConsumerBinding } from "../nx-generators.js";

/** Initializes the installed Habitat package inside one Nx consumer. */
export default function initializeHabitat(tree: Tree): GeneratorCallback {
  const packageManager = detectPackageManager(tree.root);
  if (packageManager === "yarn") {
    throw new Error("Habitat Husky initialization supports npm, pnpm, and Bun consumers.");
  }
  const result = initializeHabitatConsumer(tree, habitatConsumerBinding);
  const activateHusky = () => {
    const command = `${getPackageManagerCommand(packageManager).exec} husky`;
    execSync(command, {
      cwd: tree.root,
      stdio: "inherit",
    });
  };

  if (!result.packageChanged) return activateHusky;
  return runTasksInSerial(() => installPackagesTask(tree), activateHusky);
}
