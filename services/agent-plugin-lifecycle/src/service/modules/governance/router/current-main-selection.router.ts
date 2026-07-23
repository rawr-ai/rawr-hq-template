import { awaitDependencyPromise } from "../../../base";
import { decodeGitLocator } from "../model/dto/boundary";
import { module } from "../module";
import { resolveCurrentMainSelection } from "./current-main-selection";

export const currentMainSelection = module.currentMainSelection.effect(function* ({
  context,
  input,
}) {
  const locator = decodeGitLocator(input.locator);
  if (!locator.ok) {
    return Object.freeze({ kind: "WRONG_REPOSITORY" as const, reason: locator.reason });
  }
  return yield* awaitDependencyPromise(() =>
    resolveCurrentMainSelection(context.git, locator.value)
  );
});
