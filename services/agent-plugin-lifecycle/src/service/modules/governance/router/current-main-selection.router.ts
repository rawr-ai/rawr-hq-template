import { decodeGitLocator } from "../model/dto/boundary";
import { module } from "../module";
import { resolveCurrentMainSelection } from "./current-main-selection";

export const currentMainSelection = module.currentMainSelection.handler(async ({ context, input }) => {
  const locator = decodeGitLocator(input.locator);
  return locator.ok
    ? resolveCurrentMainSelection(context.git, locator.value)
    : Object.freeze({ kind: "WRONG_REPOSITORY" as const, reason: locator.reason });
});
