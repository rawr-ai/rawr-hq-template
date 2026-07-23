import {
  type ArtifactDigest,
  type PayloadDigest,
  type ReleaseDigest,
  type ReleaseInputDigest,
  type ReleaseSetDigest,
} from "../../../src/service/shared/release";

declare const releaseInputDigest: ReleaseInputDigest;
declare const payloadDigest: PayloadDigest;
declare const releaseDigest: ReleaseDigest;
declare const artifactDigest: ArtifactDigest;
declare const releaseSetDigest: ReleaseSetDigest;

function acceptsReleaseDigest(_value: ReleaseDigest): void {}
function acceptsArtifactDigest(_value: ArtifactDigest): void {}
function acceptsReleaseInputDigest(_value: ReleaseInputDigest): void {}
function acceptsPayloadDigest(_value: PayloadDigest): void {}
function acceptsReleaseSetDigest(_value: ReleaseSetDigest): void {}

acceptsReleaseInputDigest(releaseInputDigest);
acceptsPayloadDigest(payloadDigest);
acceptsReleaseDigest(releaseDigest);
acceptsArtifactDigest(artifactDigest);
acceptsReleaseSetDigest(releaseSetDigest);

// @ts-expect-error Payload identity cannot substitute for release identity.
acceptsReleaseDigest(payloadDigest);
// @ts-expect-error Release-input identity cannot substitute for release identity.
acceptsReleaseDigest(releaseInputDigest);
// @ts-expect-error Artifact identity cannot substitute for release identity.
acceptsReleaseDigest(artifactDigest);
// @ts-expect-error Release identity cannot substitute for artifact identity.
acceptsArtifactDigest(releaseDigest);
// @ts-expect-error Payload identity cannot substitute for release-input identity.
acceptsReleaseInputDigest(payloadDigest);
// @ts-expect-error Release identity cannot substitute for payload identity.
acceptsPayloadDigest(releaseDigest);
// @ts-expect-error Set identity cannot substitute for artifact identity.
acceptsArtifactDigest(releaseSetDigest);
// @ts-expect-error Release-input identity cannot substitute for set identity.
acceptsReleaseSetDigest(releaseInputDigest);
// @ts-expect-error Distinct digest authorities cannot be compared as one domain.
releaseDigest === artifactDigest;
