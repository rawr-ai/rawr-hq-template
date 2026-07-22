import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import type { CanonicalChannelSelection } from "../../../src/service/model/dto/current-main-selection";
import {
  parseAdapterProtocol,
  renderCompleteProjection,
  type AdapterProtocol,
  type AgentProviderProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import { productFixture } from "../../shared/release/fixtures";

export type CompleteSetSnapshot = Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>;

export interface DesiredStateFixture {
  readonly snapshot: CompleteSetSnapshot;
  readonly selection: CanonicalChannelSelection;
  readonly projections: readonly [AgentProviderProjection, AgentProviderProjection];
}

export function desiredStateFixture(): DesiredStateFixture {
  const product = productFixture();
  const snapshot: CompleteSetSnapshot = Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(product.releaseSet.releaseSetDigest),
    releaseSet: product.releaseSet,
    members: Object.freeze([
      releaseSnapshot(product.betaRelease),
      releaseSnapshot(product.alphaRelease),
    ]),
  });
  const claude = mustProjection(
    "claude",
    mustAdapterProtocol("claude-native-adapter@v1"),
    snapshot
  );
  const codex = mustProjection("codex", mustAdapterProtocol("codex-native-adapter@v1"), snapshot);
  const body = product.releaseSet.body;
  const selectedProjections: CanonicalChannelSelection["projections"] = [
    Object.freeze({
      provider: "claude",
      projectionDigest: claude.projectionDigest,
      rendererProtocol: claude.rendererProtocol,
      adapterProtocol: claude.adapterProtocol,
      capabilityProfileDigest: claude.capabilityProfile.capabilityProfileDigest,
    }),
    Object.freeze({
      provider: "codex",
      projectionDigest: codex.projectionDigest,
      rendererProtocol: codex.rendererProtocol,
      adapterProtocol: codex.adapterProtocol,
      capabilityProfileDigest: codex.capabilityProfile.capabilityProfileDigest,
    }),
  ];
  const selection: CanonicalChannelSelection = Object.freeze({
    currentMainDigest: `cm2_${"a".repeat(64)}`,
    contentAuthority: body.contentAuthority,
    sourceRepositoryIdentity: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    releaseSetDigest: product.releaseSet.releaseSetDigest,
    evaluationProfile: "provider-smoke@v1",
    projections: Object.freeze(selectedProjections),
  });
  const projections: DesiredStateFixture["projections"] = [claude, codex];
  return Object.freeze({
    snapshot,
    selection,
    projections: Object.freeze(projections),
  });
}

function mustProjection(
  provider: "claude" | "codex",
  adapterProtocol: AdapterProtocol,
  snapshot: CompleteSetSnapshot
): AgentProviderProjection {
  const rendered = renderCompleteProjection(provider, adapterProtocol, snapshot);
  if (!rendered.ok) throw new Error("fixture projection must render");
  return rendered.value;
}

function mustAdapterProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error("fixture adapter protocol must parse");
  return parsed.value;
}

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: Object.freeze(
      release.artifactBody.payloadEntries.map((entry) =>
        Object.freeze({
          path: entry.path,
          mode: entry.mode,
          contentDigest: entry.contentDigest,
          bytes: payloadEntryBytes(entry),
        })
      )
    ),
  });
}
