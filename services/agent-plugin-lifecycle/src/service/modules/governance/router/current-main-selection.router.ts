import { decodeGitLocator } from "#agent-plugin-lifecycle-service/model/policy/current-main-locator";
import { resolveCurrentMainSelection } from "#agent-plugin-lifecycle-service/model/policy/current-main-selection";
import { awaitDependencyPromise } from "../../../base";
import { module } from "../module";

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
