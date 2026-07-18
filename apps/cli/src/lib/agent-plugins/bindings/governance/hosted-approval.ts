import type {
  HostedApprovalHistoryReader,
  HostedApprovalHistoryQuery,
} from "@rawr/agent-plugin-lifecycle/ports/governance";
import type { HostedApprovalSelector } from "@rawr/resource-hosted-governance";
import {
  makeDeferredGithubCliHostedGovernanceResource,
  runNodeHostedGovernance,
} from "@rawr/resource-hosted-governance/providers/github-cli-effect-platform-node";

export interface GithubHostedApprovalBindingOptions {
  readonly acquireGithubExecutable: () => string;
}

/** Binds explicit GitHub CLI acquisition without interpreting approval policy. */
export function createGithubHostedApprovalHistoryReader(
  options: GithubHostedApprovalBindingOptions,
): HostedApprovalHistoryReader {
  const resource = makeDeferredGithubCliHostedGovernanceResource({
    acquireGithubExecutable: options.acquireGithubExecutable,
  });
  return Object.freeze({
    async read(query: HostedApprovalHistoryQuery) {
      const result = await runNodeHostedGovernance(
        resource.observeApprovalHistory(resourceSelector(query)),
      );
      return result.ok
        ? Object.freeze({ ok: true as const, history: result.value })
        : Object.freeze({
          ok: false as const,
          failure: Object.freeze({
            code: "UnavailableApproval" as const,
            message: `${result.failure.reason}: ${result.failure.detail}`,
          }),
        });
    },
  });
}

function resourceSelector(query: HostedApprovalHistoryQuery): HostedApprovalSelector {
  return Object.freeze({
    provider: query.provider,
    repositoryIdentity: query.repositoryIdentity,
    pullRequest: query.pullRequest,
    revision: query.revision,
  });
}
