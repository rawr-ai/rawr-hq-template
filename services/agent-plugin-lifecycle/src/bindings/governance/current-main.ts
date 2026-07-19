import type { GitLocatorInput } from "../../service/modules/governance/model/dto/boundary";
import type { CurrentMainSelectionResult } from "../../service/modules/governance/model/dto/current-main";
import { decodeGitLocator } from "../../service/modules/governance/model/dto/boundary";
import type { GovernanceLifecycleRuntime } from "../../service/modules/governance/ports";
import { resolveCurrentMainSelection } from "../../service/modules/governance/router/current-main-selection.router";

export interface GovernanceCurrentMainResolver {
  resolve(input: GitLocatorInput): Promise<CurrentMainSelectionResult>;
}

/** Exposes the governance-owned current-main selector through a narrow internal port. */
export function createGovernanceCurrentMainResolver(
  governance: Pick<GovernanceLifecycleRuntime, "git">,
): GovernanceCurrentMainResolver {
  return Object.freeze({
    async resolve(input: GitLocatorInput): Promise<CurrentMainSelectionResult> {
      const locator = decodeGitLocator(input);
      return locator.ok
        ? resolveCurrentMainSelection(governance.git, locator.value)
        : { kind: "WRONG_REPOSITORY", reason: locator.reason };
    },
  });
}
