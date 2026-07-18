import {
  createExactGitBlobPointer,
  type HostedApprovalHistory,
  type HostedApprovalHistoryQuery,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  make: vi.fn(),
  observe: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@rawr/resource-hosted-governance/providers/github-cli-effect-platform-node", () => ({
  makeDeferredGithubCliHostedGovernanceResource: provider.make,
  runNodeHostedGovernance: provider.run,
}));

import { createGithubHostedApprovalHistoryReader } from "../../../../src/lib/agent-plugins/bindings/governance";

const EXECUTABLE = "/opt/rawr/bin/gh";
const REVISION = "e".repeat(40);
const ACCEPTANCE_OBJECT = createExactGitBlobPointer({
  repositoryIdentity: "git:github.com/example/personal-rawr-hq",
  ref: "refs/heads/candidate",
  commit: REVISION,
  tree: "f".repeat(40),
  path: "plugins/agents/.lifecycle/acceptances/accepted.json",
  blob: "d".repeat(40),
});
if (!ACCEPTANCE_OBJECT.ok) throw new Error("Expected a valid hosted-governance fixture object");
const QUERY: HostedApprovalHistoryQuery = {
  provider: "github",
  repositoryIdentity: ACCEPTANCE_OBJECT.value.repositoryIdentity,
  pullRequest: 42,
  revision: ACCEPTANCE_OBJECT.value.commit,
};
const HISTORY: HostedApprovalHistory = {
  provider: "github",
  selector: QUERY,
  order: "oldest-to-newest",
  observations: [{
    recordId: 9001,
    state: "APPROVED",
    revision: REVISION,
    actorIdentity: "repository-owner",
  }],
};

describe("hosted-governance resource binding", () => {
  beforeEach(() => {
    provider.make.mockReset();
    provider.observe.mockReset();
    provider.run.mockReset();
    provider.make.mockReturnValue({ observeApprovalHistory: provider.observe });
  });

  it("passes the explicit selector to the resource and returns raw history without policy", async () => {
    const resourceOperation = Symbol("hosted-history-operation");
    const acquireGithubExecutable = vi.fn(() => EXECUTABLE);
    provider.observe.mockReturnValue(resourceOperation);
    provider.run.mockResolvedValue({ ok: true, value: HISTORY });
    const reader = createGithubHostedApprovalHistoryReader({ acquireGithubExecutable });

    expect(acquireGithubExecutable).not.toHaveBeenCalled();

    const result = await reader.read(QUERY);

    expect(provider.make).toHaveBeenCalledWith({ acquireGithubExecutable });
    expect(provider.observe).toHaveBeenCalledWith(QUERY);
    expect(provider.run).toHaveBeenCalledWith(resourceOperation);
    expect(result).toEqual({ ok: true, history: HISTORY });
    expect(result).not.toHaveProperty("observation");
  });

  it("maps a typed provider failure without manufacturing approval semantics", async () => {
    provider.observe.mockReturnValue(Symbol("hosted-history-operation"));
    provider.run.mockResolvedValue({
      ok: false,
      failure: {
        _tag: "HostedGovernanceFailure",
        operation: "observe-approval-history",
        reason: "CommandFailed",
        detail: "authentication failed",
      },
    });
    const reader = createGithubHostedApprovalHistoryReader({
      acquireGithubExecutable: () => EXECUTABLE,
    });

    const result = await reader.read(QUERY);

    expect(result).toEqual({
      ok: false,
      failure: {
        code: "UnavailableApproval",
        message: "CommandFailed: authentication failed",
      },
    });
  });
});
