import { describe, expect, it } from "vitest";

import {
  canonicalSerializeControllerReleaseEnvelope,
  computeControllerDigest,
  createControllerPayloadManifest,
  createControllerReleaseEnvelope,
  decodeControllerReleaseEnvelope,
  verifyControllerReleaseEnvelope,
} from "../src";
import { controllerManifestInput, DIGEST_A } from "./fixtures";

function releaseFixture() {
  const manifest = createControllerPayloadManifest(controllerManifestInput());
  expect(manifest.ok).toBe(true);
  if (!manifest.ok) throw new Error(JSON.stringify(manifest.issues));
  return { manifest: manifest.value, envelope: createControllerReleaseEnvelope(manifest.value) };
}

describe("controller release envelope", () => {
  it("round-trips one canonical non-circular envelope", () => {
    const { manifest, envelope } = releaseFixture();
    const bytes = canonicalSerializeControllerReleaseEnvelope(envelope);
    const decoded = decodeControllerReleaseEnvelope(bytes, {
      controllerDigest: envelope.controllerDigest,
      releaseDirectoryName: envelope.controllerDigest,
    });

    expect(decoded).toMatchObject({
      ok: true,
      value: { controllerDigest: envelope.controllerDigest },
    });
    expect(envelope.controllerDigest).toBe(computeControllerDigest(manifest));
  });

  it("does not include the claimed digest in its own digest preimage", () => {
    const { manifest, envelope } = releaseFixture();
    const tampered = { ...envelope, controllerDigest: DIGEST_A };

    expect(computeControllerDigest(manifest)).toBe(envelope.controllerDigest);
    expect(computeControllerDigest(tampered.manifest)).toBe(envelope.controllerDigest);
    expect(verifyControllerReleaseEnvelope(tampered)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "CONTROLLER_DIGEST_MISMATCH" }),
      ]),
    });
  });

  it("rejects payload substitution even when the envelope shape remains valid", () => {
    const { envelope } = releaseFixture();
    const tampered = {
      ...envelope,
      manifest: {
        ...envelope.manifest,
        officialMembers: envelope.manifest.officialMembers.map((member) =>
          member.packageId === "@rawr/plugin-devops"
            ? { ...member, commandIds: ["deploy"] }
            : member
        ),
      },
    };

    expect(verifyControllerReleaseEnvelope(tampered)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "CONTROLLER_DIGEST_MISMATCH" }),
      ]),
    });
  });

  it("rejects noncanonical envelope bytes and directory/selection mismatch", () => {
    const { envelope } = releaseFixture();
    const pretty = new TextEncoder().encode(JSON.stringify(envelope, null, 2));
    expect(decodeControllerReleaseEnvelope(pretty)).toMatchObject({
      ok: false,
      issues: [{ code: "NON_CANONICAL_ENVELOPE" }],
    });
    expect(
      verifyControllerReleaseEnvelope(envelope, { releaseDirectoryName: DIGEST_A })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "RELEASE_DIRECTORY_MISMATCH" }),
      ]),
    });
  });

  it("rejects unknown envelope fields", () => {
    const { envelope } = releaseFixture();
    expect(
      verifyControllerReleaseEnvelope({ ...envelope, fallbackPath: "/tmp/source" })
    ).toMatchObject({
      ok: false,
      issues: [{ code: "UNKNOWN_FIELD", path: "envelope.fallbackPath" }],
    });
  });
});
