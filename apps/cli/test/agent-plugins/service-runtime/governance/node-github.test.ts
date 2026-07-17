import {
  createExactGitBlobPointer,
  type HostedApprovalQuery,
} from "@rawr/agent-plugin-lifecycle/ports/governance";
import { describe, expect, it } from "vitest";

import { createHostedApprovalAdapter } from "../../../../src/lib/agent-plugins/service-runtime/governance/adapters/hosted";
import {
  createNodeGithubHostedGovernanceBackend,
  type NodeGithubCommandResult,
  type ReadOnlyNodeGithubCommandRunner,
} from "../../../../src/lib/agent-plugins/service-runtime/governance/adapters/node-github";
import { oid, promotionFixture } from "./fixtures";

const GH_EXECUTABLE = "/opt/rawr/bin/gh";

describe("node GitHub hosted-governance backend", () => {
  it("reads the exact commit-associated PR and policy-named approval with read-only argv", async () => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const runner = new QueueRunner([
      json([[{ number: 42 }]]),
      json([[
        {
          id: 9001,
          state: "APPROVED",
          commit_id: fixture.acceptanceObject.commit,
          user: { login: query.approverIdentity },
        },
      ]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    const result = await adapter.read(query);

    expect(result).toEqual({
      ok: true,
      observation: {
        provider: "github",
        recordId: "github-review-9001",
        object: fixture.acceptanceObject,
        approverIdentity: query.approverIdentity,
        decision: "approved",
        outcome: "accepted",
      },
    });
    expect(runner.calls).toEqual([
      {
        executablePath: GH_EXECUTABLE,
        args: apiArgs(
          `repos/example/personal-rawr-hq/commits/${fixture.acceptanceObject.commit}/pulls?per_page=100`,
        ),
      },
      {
        executablePath: GH_EXECUTABLE,
        args: apiArgs("repos/example/personal-rawr-hq/pulls/42/reviews?per_page=100"),
      },
    ]);
  });

  it.each([
    ["wrong commit", { commit_id: oid("a"), user: { login: "repository-owner" } }],
    ["wrong approver", { commit_id: oid("e"), user: { login: "another-owner" } }],
  ] as const)("treats an otherwise valid approval for the %s as missing", async (_label, replacement) => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const runner = new QueueRunner([
      json([[{ number: 42 }]]),
      json([[
        {
          id: 9001,
          state: "APPROVED",
          commit_id: replacement.commit_id,
          user: replacement.user,
        },
      ]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(query)).toMatchObject({
      ok: false,
      failure: { code: "MissingApproval" },
    });
  });

  it("rejects ambiguous exact approvals instead of selecting one", async () => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const review = {
      state: "APPROVED",
      commit_id: fixture.acceptanceObject.commit,
      user: { login: query.approverIdentity },
    };
    const runner = new QueueRunner([
      json([[{ number: 42 }, { number: 43 }]]),
      json([[{ id: 9001, ...review }]]),
      json([[{ id: 9002, ...review }]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(query)).toMatchObject({
      ok: false,
      failure: { code: "UnavailableApproval" },
    });
  });

  it.each([
    ["changes requested", "CHANGES_REQUESTED"],
    ["dismissal", "DISMISSED"],
  ] as const)("treats an exact approval followed by %s as missing", async (_label, state) => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const review = {
      commit_id: fixture.acceptanceObject.commit,
      user: { login: query.approverIdentity },
    };
    const runner = new QueueRunner([
      json([[{ number: 42 }]]),
      json([[
        { id: 9001, state: "APPROVED", ...review },
        { id: 9002, state, ...review },
      ]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(query)).toMatchObject({
      ok: false,
      failure: { code: "MissingApproval" },
    });
  });

  it("admits the latest exact approval after an earlier changes request", async () => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const review = {
      commit_id: fixture.acceptanceObject.commit,
      user: { login: query.approverIdentity },
    };
    const runner = new QueueRunner([
      json([[{ number: 42 }]]),
      json([[
        { id: 9001, state: "CHANGES_REQUESTED", ...review },
        { id: 9002, state: "APPROVED", ...review },
      ]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(query)).toMatchObject({
      ok: true,
      observation: { recordId: "github-review-9002", decision: "approved" },
    });
  });

  it.each([
    ["comment", "COMMENTED"],
    ["pending draft", "PENDING"],
  ] as const)("retains the latest exact approval after a later %s", async (_label, state) => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const review = {
      commit_id: fixture.acceptanceObject.commit,
      user: { login: query.approverIdentity },
    };
    const runner = new QueueRunner([
      json([[{ number: 42 }]]),
      json([[
        { id: 9001, state: "APPROVED", ...review },
        { id: 9002, state, ...review },
      ]]),
    ]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(query)).toMatchObject({
      ok: true,
      observation: { recordId: "github-review-9001", decision: "approved" },
    });
  });

  it("returns missing without review queries when no PR is associated with the commit", async () => {
    const fixture = promotionFixture();
    const runner = new QueueRunner([json([[]])]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(approvalQuery(fixture))).toMatchObject({
      ok: false,
      failure: { code: "MissingApproval" },
    });
    expect(runner.calls).toHaveLength(1);
  });

  it.each([
    ["invalid JSON", [{ exitCode: 0, stdout: "not-json", stderr: "" }]],
    ["unsupported page shape", [json([{ number: 42 }])]],
    ["nonzero GitHub CLI exit", [{ exitCode: 1, stdout: "", stderr: "authentication failed" }]],
    [
      "malformed review",
      [json([[{ number: 42 }]]), json([[{
        id: 9001,
        state: "APPROVED",
        commit_id: oid("e"),
        user: null,
      }]])],
    ],
  ] as const)("fails closed when GitHub returns %s", async (_label, responses) => {
    const fixture = promotionFixture();
    const runner = new QueueRunner(responses);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read(approvalQuery(fixture))).toMatchObject({
      ok: false,
      failure: { code: "UnavailableApproval" },
    });
  });

  it("rejects non-GitHub repository identities before invoking the CLI", async () => {
    const fixture = promotionFixture();
    const query = approvalQuery(fixture);
    const object = createExactGitBlobPointer({
      ...fixture.acceptanceObject,
      repositoryIdentity: "git:gitlab.com/example/personal-rawr-hq",
    });
    if (!object.ok) throw new Error("Expected a valid non-GitHub fixture pointer");
    const runner = new QueueRunner([]);
    const adapter = createHostedApprovalAdapter(createNodeGithubHostedGovernanceBackend({
      githubExecutable: GH_EXECUTABLE,
      runner,
    }));

    expect(await adapter.read({ ...query, object: object.value })).toMatchObject({
      ok: false,
      failure: { code: "UnavailableApproval" },
    });
    expect(runner.calls).toEqual([]);
  });

  it.each(["gh", "relative/gh", "/"])("requires an explicit absolute executable instead of %s", (candidate) => {
    expect(() => createNodeGithubHostedGovernanceBackend({
      githubExecutable: candidate,
      runner: new QueueRunner([]),
    })).toThrow("explicit normalized absolute path");
  });
});

class QueueRunner implements ReadOnlyNodeGithubCommandRunner {
  readonly calls: Array<Readonly<{ executablePath: string; args: readonly string[] }>> = [];
  private readonly responses: NodeGithubCommandResult[];

  constructor(responses: readonly NodeGithubCommandResult[]) {
    this.responses = [...responses];
  }

  run = async (executablePath: string, args: readonly string[]): Promise<NodeGithubCommandResult> => {
    this.calls.push(Object.freeze({ executablePath, args: Object.freeze([...args]) }));
    const response = this.responses.shift();
    if (response === undefined) throw new Error("Unexpected GitHub CLI query");
    return response;
  };
}

function approvalQuery(fixture: ReturnType<typeof promotionFixture>): HostedApprovalQuery {
  const approval = fixture.approvalReader.observation;
  if (approval === undefined) throw new Error("Expected fixture approval");
  return {
    object: fixture.acceptanceObject,
    approverIdentity: approval.approverIdentity,
    outcome: "accepted",
  };
}

function json(value: unknown): NodeGithubCommandResult {
  return { exitCode: 0, stdout: JSON.stringify(value), stderr: "" };
}

function apiArgs(endpoint: string): readonly string[] {
  return [
    "api",
    "--hostname",
    "github.com",
    "--method",
    "GET",
    "--header",
    "Accept: application/vnd.github+json",
    "--header",
    "X-GitHub-Api-Version: 2022-11-28",
    "--paginate",
    "--slurp",
    endpoint,
  ];
}
