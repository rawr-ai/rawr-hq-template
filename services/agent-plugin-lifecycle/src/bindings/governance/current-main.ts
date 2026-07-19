import type { ContentWorkspaceGitReadAsyncPort } from "@rawr/resource-content-workspace";

import type { CurrentMainSelectionResult } from "../../service/modules/governance/model/dto/current-main";
import type { CurrentMainSelectionReader } from "../../service/modules/providers/ports/current-main";
import { decodeGitLocator } from "../../service/modules/governance/model/dto/boundary";
import { createResourceExactGitReader } from "../../service/modules/governance/repository/content-workspace";
import { resolveCurrentMainSelection } from "../../service/modules/governance/router/current-main-selection.router";

/** Temporarily projects governance's sole selector into provider convergence. */
export function createGovernanceCurrentMainSelectionReader(
  contentWorkspace: ContentWorkspaceGitReadAsyncPort,
): CurrentMainSelectionReader {
  const git = createResourceExactGitReader({ contentWorkspace });
  return Object.freeze({
    async resolve(
      input: Parameters<CurrentMainSelectionReader["resolve"]>[0],
    ): Promise<CurrentMainSelectionResult> {
      const locator = decodeGitLocator({
        workspacePath: input.workspaceRoot,
        expectedRepositoryIdentity: input.repositoryIdentity,
      });
      return locator.ok
        ? resolveCurrentMainSelection(git, locator.value)
        : { kind: "WRONG_REPOSITORY", reason: locator.reason };
    },
  });
}
