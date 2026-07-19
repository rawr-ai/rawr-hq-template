import type {
  ContentAuthority,
  GitCommitId,
  GitTreeId,
  ReleaseInputDigest,
  ReleaseSetDigest,
  RepositoryIdentity,
} from "../../../../shared/release";

import type { EvaluationProfile } from "./mode";
import type { AgentProviderProjection } from "../policy/projection";

declare const canonicalDesiredStateBrand: unique symbol;

/** A provider projection already verified against one selected complete set. */
export interface CanonicalDesiredState {
  readonly contentAuthority: ContentAuthority;
  readonly sourceRepositoryIdentity: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInputDigest: ReleaseInputDigest;
  readonly releaseSetDigest: ReleaseSetDigest;
  readonly evaluationProfile: EvaluationProfile;
  readonly projection: AgentProviderProjection;
  readonly [canonicalDesiredStateBrand]: "CanonicalDesiredState";
}
