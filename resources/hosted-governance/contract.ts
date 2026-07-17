import type { Effect } from "effect";

export type HostedGovernanceProvider = "github";

export type HostedReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING";

/** Exact hosted identity selected by the semantic owner. */
export interface HostedApprovalSelector {
  readonly provider: HostedGovernanceProvider;
  readonly repositoryIdentity: string;
  readonly pullRequest: number;
  readonly revision: string;
}

/** Mechanical GitHub review row. Approval policy remains service-owned. */
export interface HostedReviewObservation {
  readonly recordId: number;
  readonly state: HostedReviewState;
  readonly revision: string;
  readonly actorIdentity: string;
}

export interface HostedApprovalHistory {
  readonly provider: HostedGovernanceProvider;
  readonly selector: HostedApprovalSelector;
  /** GitHub's List Reviews order, preserved across paginated pages. */
  readonly order: "oldest-to-newest";
  readonly observations: readonly HostedReviewObservation[];
}

export type HostedGovernanceFailureReason =
  | "Refused"
  | "Unavailable"
  | "CommandFailed"
  | "CommandTimedOut"
  | "OutputLimitExceeded"
  | "MalformedResponse";

export interface HostedGovernanceFailure {
  readonly _tag: "HostedGovernanceFailure";
  readonly operation: "observe-approval-history";
  readonly reason: HostedGovernanceFailureReason;
  readonly detail: string;
}

export interface HostedGovernanceResource<R = never> {
  readonly observeApprovalHistory: (
    selector: HostedApprovalSelector,
  ) => Effect.Effect<HostedApprovalHistory, HostedGovernanceFailure, R>;
}
