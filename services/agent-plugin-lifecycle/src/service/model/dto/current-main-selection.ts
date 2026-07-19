/** The explicit content workspace and repository identity inspected for current-main. */
export interface CurrentMainSelectionLocator {
  readonly workspacePath: string;
  readonly expectedRepositoryIdentity: string;
}

type CurrentMainProviderProjection<TProvider extends "claude" | "codex"> = {
  provider: TProvider;
  projectionDigest: string;
  rendererProtocol: string;
  adapterProtocol: string;
  capabilityProfileDigest: string;
};

/** Governance-owned observation consumed by provider convergence. */
type CanonicalChannelSelectionValue = {
  currentMainDigest: string;
  contentAuthority: string;
  sourceRepositoryIdentity: string;
  sourceCommit: string;
  sourceTree: string;
  releaseInputDigest: string;
  releaseSetDigest: string;
  evaluationProfile: string;
  projections: readonly [
    CurrentMainProviderProjection<"claude">,
    CurrentMainProviderProjection<"codex">,
  ];
};

export type CanonicalChannelSelection = Readonly<CanonicalChannelSelectionValue>;

export type CurrentMainSelectionFailureKind =
  | "DIRTY_REPOSITORY"
  | "WRONG_REPOSITORY"
  | "UNREACHABLE_REPOSITORY"
  | "STALE_RECORD"
  | "FORGED_RECORD";

export type CurrentMainSelectionResult =
  | Readonly<{
    kind: "CURRENT_ELIGIBLE";
    selection: CanonicalChannelSelectionValue;
  }>
  | {
    [TKind in CurrentMainSelectionFailureKind]: Readonly<{
      kind: TKind;
      reason: string;
    }>;
  }[CurrentMainSelectionFailureKind];
