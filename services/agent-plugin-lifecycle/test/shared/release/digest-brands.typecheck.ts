import {
  type PayloadDigest,
  type ReleaseDigest,
  type ReleaseInputDigest,
  type ReleaseSetDigest,
} from "../../../src/service/shared/release/primitives";

declare const releaseInputDigest: ReleaseInputDigest;
declare const payloadDigest: PayloadDigest;
declare const releaseDigest: ReleaseDigest;
declare const releaseSetDigest: ReleaseSetDigest;

function acceptsReleaseDigest(_value: ReleaseDigest): void {}
function acceptsReleaseInputDigest(_value: ReleaseInputDigest): void {}
function acceptsPayloadDigest(_value: PayloadDigest): void {}
function acceptsReleaseSetDigest(_value: ReleaseSetDigest): void {}

acceptsReleaseInputDigest(releaseInputDigest);
acceptsPayloadDigest(payloadDigest);
acceptsReleaseDigest(releaseDigest);
acceptsReleaseSetDigest(releaseSetDigest);

// @ts-expect-error Payload identity cannot substitute for release identity.
acceptsReleaseDigest(payloadDigest);
// @ts-expect-error Release-input identity cannot substitute for release identity.
acceptsReleaseDigest(releaseInputDigest);
// @ts-expect-error Payload identity cannot substitute for release-input identity.
acceptsReleaseInputDigest(payloadDigest);
// @ts-expect-error Release identity cannot substitute for payload identity.
acceptsPayloadDigest(releaseDigest);
// @ts-expect-error Release-input identity cannot substitute for set identity.
acceptsReleaseSetDigest(releaseInputDigest);
// @ts-expect-error Distinct digest authorities cannot be compared as one domain.
releaseDigest === releaseSetDigest;
