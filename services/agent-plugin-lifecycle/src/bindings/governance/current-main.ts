import type { GovernanceLifecycleRuntime } from "../../service/modules/governance/ports";
import {
  decodeGitLocator,
  type GitLocatorInput,
} from "../../service/modules/governance/model/dto/boundary";
import type { CurrentMainResolution } from "../../service/modules/governance/model/dto/operations";
import { resolveCurrentMain } from "../../service/modules/governance/router/resolve-current-main.router";

export interface GovernanceCurrentMainResolver {
  resolve(input: GitLocatorInput): Promise<CurrentMainResolution>;
}

/** Adapts governance-owned current-main semantics to an internal service port. */
export function createGovernanceCurrentMainResolver(
  governance: GovernanceLifecycleRuntime,
): GovernanceCurrentMainResolver {
  return Object.freeze({
    async resolve(input: GitLocatorInput): Promise<CurrentMainResolution> {
      const locator = decodeGitLocator(input);
      return locator.ok
        ? resolveCurrentMain(governance, { locator: locator.value })
        : { kind: "WRONG_REPOSITORY", reason: locator.reason };
    },
  });
}
