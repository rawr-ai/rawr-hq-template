import type {
  AcceptanceRequest,
  LifecyclePolicy,
} from "../domain/acceptance";
import type { ExactGitBlobPointer } from "../domain/git";
import { parseCanonicalId } from "../domain/primitives";
import type {
  HostedApprovalHistory,
  HostedApprovalHistoryQuery,
  HostedApprovalObservation,
} from "../ports/index";

export function createHostedApprovalHistoryQuery(
  request: AcceptanceRequest,
  acceptanceObject: ExactGitBlobPointer,
): HostedApprovalHistoryQuery {
  return Object.freeze({
    provider: request.body.hostedApproval.provider,
    repositoryIdentity: request.body.repositoryIdentity,
    pullRequest: request.body.hostedApproval.pullRequest,
    revision: acceptanceObject.commit,
  });
}

export function selectHostedApproval(
  history: HostedApprovalHistory,
  query: HostedApprovalHistoryQuery,
  object: ExactGitBlobPointer,
  approverIdentity: LifecyclePolicy["body"]["humanApproverIdentity"],
):
  | { readonly ok: true; readonly observation: HostedApprovalObservation }
  | { readonly ok: false; readonly reason: string } {
  if (history.order !== "oldest-to-newest") {
    return { ok: false, reason: "Hosted approval history does not preserve oldest-to-newest review order" };
  }
  if (!sameHostedSelector(history, query)) {
    return { ok: false, reason: "Hosted approval history does not bind the governed repository, pull request, and exact acceptance revision" };
  }

  const recordIds = new Set<number>();
  let latestAuthorityReview: HostedApprovalHistory["observations"][number] | undefined;
  for (const observation of history.observations) {
    if (!validHostedReview(observation) || recordIds.has(observation.recordId)) {
      return { ok: false, reason: "Hosted approval history contains a malformed or duplicate review observation" };
    }
    recordIds.add(observation.recordId);
    if (
      observation.actorIdentity === approverIdentity
      && isAuthorityChangingReview(observation.state)
    ) {
      latestAuthorityReview = observation;
    }
  }

  if (latestAuthorityReview === undefined) {
    return { ok: false, reason: "Hosted approval history contains no authority-changing review from the policy-named human" };
  }
  if (
    latestAuthorityReview.state !== "APPROVED"
    || latestAuthorityReview.revision !== query.revision
  ) {
    return { ok: false, reason: "The latest policy-named authority review is not an approval of the exact acceptance revision" };
  }

  const recordId = parseCanonicalId(
    `github-review-${latestAuthorityReview.recordId}`,
    "hostedApproval.recordId",
  );
  if (!recordId.ok) {
    return { ok: false, reason: "Hosted approval history produced a noncanonical review identity" };
  }

  return {
    ok: true,
    observation: Object.freeze({
      provider: "github",
      pullRequest: query.pullRequest,
      recordId: recordId.value,
      object,
      approverIdentity,
      decision: "approved",
      outcome: "accepted",
    }),
  };
}

function sameHostedSelector(
  history: HostedApprovalHistory,
  query: HostedApprovalHistoryQuery,
): boolean {
  return history.provider === query.provider
    && history.selector.provider === query.provider
    && history.selector.repositoryIdentity === query.repositoryIdentity
    && history.selector.pullRequest === query.pullRequest
    && history.selector.revision === query.revision;
}

function validHostedReview(
  observation: HostedApprovalHistory["observations"][number],
): boolean {
  return Number.isSafeInteger(observation.recordId)
    && observation.recordId > 0
    && (
      observation.state === "APPROVED"
      || observation.state === "CHANGES_REQUESTED"
      || observation.state === "COMMENTED"
      || observation.state === "DISMISSED"
      || observation.state === "PENDING"
    )
    && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(observation.revision)
    && /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/u.test(observation.actorIdentity);
}

function isAuthorityChangingReview(
  state: HostedApprovalHistory["observations"][number]["state"],
): boolean {
  return state === "APPROVED" || state === "CHANGES_REQUESTED" || state === "DISMISSED";
}
