import type {
  CanonicalChannelReader,
  MechanicalEvidencePublisher,
  ProviderUndoWriter,
  ProviderDeploymentRequest,
  ProviderTargetMutator,
  ProviderTargetReader,
  TargetReceiptReader,
  VerifiedReleaseReader,
} from "../../../src/bindings/providers";
import type { CanonicalStatusDependencies } from "../../../src/service/modules/providers/router/canonical-status.router";

declare const channel: CanonicalChannelReader;
declare const releases: VerifiedReleaseReader;
declare const provider: ProviderTargetReader;
declare const receipts: TargetReceiptReader;
declare const providerMutator: ProviderTargetMutator;
declare const capsule: ProviderUndoWriter;
declare const evidence: MechanicalEvidencePublisher;

const statusDependencies: CanonicalStatusDependencies = {
  channel,
  releases,
  provider,
  receipts,
};
void statusDependencies;

const statusCannotReceiveMutation = {
  channel,
  releases,
  provider,
  receipts,
  // @ts-expect-error status has no native mutation port
  providerMutator,
} satisfies CanonicalStatusDependencies;
void statusCannotReceiveMutation;

const statusCannotReceiveCapsule = {
  channel,
  releases,
  provider,
  receipts,
  // @ts-expect-error status has no controller capsule port
  capsule,
} satisfies CanonicalStatusDependencies;
void statusCannotReceiveCapsule;

const statusCannotReceiveEvidencePublisher = {
  channel,
  releases,
  provider,
  receipts,
  // @ts-expect-error status has no mechanical evidence publication port
  evidence,
} satisfies CanonicalStatusDependencies;
void statusCannotReceiveEvidencePublisher;

export function exactModeNarrowing(request: ProviderDeploymentRequest): string {
  switch (request.kind) {
    case "targeted-test":
      return request.releases[0]?.releaseDigest ?? request.requestDigest;
    case "complete-test":
      return request.releaseSet.releaseSetDigest;
    case "canonical-sync":
      return request.channel;
  }
}
