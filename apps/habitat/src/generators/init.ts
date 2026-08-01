import { type GeneratorCallback, installPackagesTask, type Tree } from "@nx/devkit";
import { initializeHabitatConsumer } from "../../../../plugins/nx/habitat/src/initialization.js";
import { habitatConsumerBinding } from "../nx-generators.js";

/** Initializes the installed Habitat package inside one Nx consumer. */
export default function initializeHabitat(tree: Tree): GeneratorCallback | void {
  const result = initializeHabitatConsumer(tree, habitatConsumerBinding);
  if (!result.packageChanged) return;
  return () => installPackagesTask(tree);
}
