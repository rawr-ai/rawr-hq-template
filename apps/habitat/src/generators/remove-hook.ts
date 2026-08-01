import type { Tree } from "@nx/devkit";
import { removeHabitatHook } from "../../../../plugins/nx/habitat/src/initialization.js";
import { habitatConsumerBinding } from "../nx-generators.js";

/** Removes only Habitat's named Codex hook contribution from one Nx consumer. */
export default function removeHook(tree: Tree): void {
  removeHabitatHook(tree, habitatConsumerBinding);
}
