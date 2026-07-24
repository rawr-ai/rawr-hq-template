import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";

import { createServiceProvider } from "../base";
import type { CurrentMainSelectionReader } from "../model/dependencies/current-main";
import { decodeGitLocator } from "../model/policy/current-main-locator";
import { resolveCurrentMainSelection } from "../model/policy/current-main-selection";
import { createResourceExactGitReader } from "../model/repositories/current-main-content-workspace";

/** Derives the shared current-main observation consumed across service modules. */
export const currentMain = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
}>().middleware<{
  currentMain: CurrentMainSelectionReader;
}>(async ({ context, next }) => {
  const git = createResourceExactGitReader({
    contentWorkspace: context.deps.contentWorkspace,
  });
  const reader: CurrentMainSelectionReader = Object.freeze({
    async resolve(input: Parameters<CurrentMainSelectionReader["resolve"]>[0]) {
      const locator = decodeGitLocator(input);
      return locator.ok
        ? resolveCurrentMainSelection(git, locator.value)
        : Object.freeze({ kind: "WRONG_REPOSITORY" as const, reason: locator.reason });
    },
  });

  return next({
    currentMain: reader,
  });
});
