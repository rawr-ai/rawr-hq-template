import {
  createExactGitBlobPointer,
  parseCanonicalId,
  parseRepository,
  type ExactGitBlobPointer,
  type GitLocator,
  type HostedApprovalObservation,
} from "@rawr/agent-plugin-lifecycle/ports/governance";

export const REPOSITORY = "git:github.com/example/personal-rawr-hq";
export const MAIN_REF = "refs/heads/main";

export function oid(hex: string): string {
  return hex.repeat(40);
}

export function pointer(input: {
  readonly ref: string;
  readonly commit: string;
  readonly tree: string;
  readonly path: string;
  readonly blob: string;
}): ExactGitBlobPointer {
  const result = createExactGitBlobPointer({
    repositoryIdentity: REPOSITORY,
    ...input,
  });
  if (!result.ok) {
    throw new Error(result.issues.map((entry) => entry.message).join("; "));
  }
  return result.value;
}

export function promotionFixture() {
  const repository = parseRepository(REPOSITORY, "fixture.repository");
  if (!repository.ok) throw new Error("Fixture repository identity is invalid");
  const locator: GitLocator = {
    workspacePath: "/tmp/rawr-governance-fixture",
    expectedRepositoryIdentity: repository.value,
  };
  const landedInputObject = pointer({
    ref: MAIN_REF,
    commit: oid("c"),
    tree: oid("d"),
    path: "plugins/agents/release-input.json",
    blob: oid("1"),
  });
  const currentInputObject = pointer({
    ref: MAIN_REF,
    commit: oid("e"),
    tree: oid("f"),
    path: "plugins/agents/release-input.json",
    blob: oid("2"),
  });
  const acceptanceObject = pointer({
    ref: MAIN_REF,
    commit: oid("e"),
    tree: oid("f"),
    path: "plugins/agents/.lifecycle/acceptances/accepted.json",
    blob: oid("4"),
  });
  const recordId = parseCanonicalId("approval-1", "fixture.recordId");
  const approver = parseCanonicalId("repository-owner", "fixture.approver");
  if (!recordId.ok || !approver.ok) throw new Error("Fixture approval identity is invalid");
  const observation: HostedApprovalObservation = {
    provider: "github",
    pullRequest: 42,
    recordId: recordId.value,
    object: acceptanceObject,
    approverIdentity: approver.value,
    decision: "approved",
    outcome: "accepted",
  };
  return {
    locator,
    landedInputObject,
    currentInputObject,
    acceptanceObject,
    releaseInputBytes: new TextEncoder().encode("fixture release input\n"),
    approvalReader: { observation },
  };
}
