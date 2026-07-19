import type { CurrentMainSelectionResult } from "../../service/modules/governance/model/dto/current-main";
import type { CurrentMainSelectionReader } from "../../service/modules/providers/ports/current-main";

export interface GovernanceCurrentMainResolver {
  resolve(input: Readonly<{
    workspacePath: string;
    expectedRepositoryIdentity: string;
  }>): Promise<CurrentMainSelectionResult>;
}

/** Adapts the governance Git selector without importing its implementation. */
export function createCurrentMainSelectionReader(
  currentMain: GovernanceCurrentMainResolver,
): CurrentMainSelectionReader {
  return Object.freeze({
    resolve: async (locator: Parameters<CurrentMainSelectionReader["resolve"]>[0]) => await currentMain.resolve({
      workspacePath: locator.workspaceRoot,
      expectedRepositoryIdentity: locator.repositoryIdentity,
    }),
  });
}
