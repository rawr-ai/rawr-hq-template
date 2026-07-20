import type { ContentWorkspaceGitReadAsyncPort } from "@rawr/resource-content-workspace";

import type { CurrentMainSelectionReader } from "../../service/model/dependencies/current-main";
import type { CurrentMainSelectionResult } from "../../service/model/dto/current-main-selection";
import { decodeGitLocator } from "../../service/modules/governance/model/dto/boundary";
import { createResourceExactGitReader } from "../../service/modules/governance/repository/content-workspace";
import { resolveCurrentMainSelection } from "../../service/modules/governance/router/current-main-selection.router";

/** Temporarily composes governance's sole selector for provider convergence. */
export function createGovernanceCurrentMainSelectionReader(
  contentWorkspace: ContentWorkspaceGitReadAsyncPort,
): CurrentMainSelectionReader {
  const git = createResourceExactGitReader({ contentWorkspace });
  return Object.freeze({
    async resolve(
      input: Parameters<CurrentMainSelectionReader["resolve"]>[0],
    ): Promise<CurrentMainSelectionResult> {
      const locator = decodeGitLocator(input);
      return locator.ok
        ? resolveCurrentMainSelection(git, locator.value)
        : { kind: "WRONG_REPOSITORY", reason: locator.reason };
    },
  });
}
