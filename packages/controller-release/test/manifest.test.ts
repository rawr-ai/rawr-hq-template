import { describe, expect, it } from "vitest";

import {
  canonicalSerializeControllerPayloadManifest,
  computeControllerDigest,
  computeControllerMemberPayloadDigest,
  createControllerOfficialSetManifest,
  createControllerPayloadManifest,
  verifyControllerPayload,
  type ControllerPayloadManifestInput,
} from "../src";
import {
  controllerManifestInput,
  controllerObservedPayloadEntries,
  DIGEST_A,
  DIGEST_B,
} from "./fixtures";

function requireManifest(input: ControllerPayloadManifestInput = controllerManifestInput()) {
  const result = createControllerPayloadManifest(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

describe("controller payload manifest", () => {
  it("normalizes set ordering into one deterministic manifest identity", () => {
    const baselineInput = controllerManifestInput();
    const permutedInput: ControllerPayloadManifestInput = {
      ...baselineInput,
      officialMembers: [...baselineInput.officialMembers].reverse().map((member) => ({
        ...member,
        commandIds: [...member.commandIds].reverse(),
        topics: [...member.topics].reverse(),
        aliases: [...member.aliases].reverse(),
        hiddenAliases: [...member.hiddenAliases].reverse(),
        hooks: [...member.hooks].reverse(),
      })),
      buildInterfaces: [...baselineInput.buildInterfaces].reverse(),
      entries: [...baselineInput.entries].reverse(),
    };

    const baseline = requireManifest(baselineInput);
    const permuted = requireManifest(permutedInput);
    expect(canonicalSerializeControllerPayloadManifest(permuted)).toEqual(
      canonicalSerializeControllerPayloadManifest(baseline)
    );
    expect(computeControllerDigest(permuted)).toBe(computeControllerDigest(baseline));
  });

  it("changes controller identity when official membership, command ownership, or payload bytes change", () => {
    const input = controllerManifestInput();
    const baselineDigest = computeControllerDigest(requireManifest(input));
    const withoutDevops = requireManifest({
      ...input,
      officialMembers: input.officialMembers.slice(0, 1),
    });
    const substitutedCommand = requireManifest({
      ...input,
      officialMembers: input.officialMembers.map((member) =>
        member.packageId === "@rawr/plugin-devops" ? { ...member, commandIds: ["deploy"] } : member
      ),
    });
    const substitutedPayload = requireManifest({
      ...input,
      entries: input.entries.map((entry) =>
        entry.path === "app/rawr.mjs" && entry.kind === "file"
          ? { ...entry, digest: DIGEST_B }
          : entry
      ),
    });

    expect(computeControllerDigest(withoutDevops)).not.toBe(baselineDigest);
    expect(computeControllerDigest(substitutedCommand)).not.toBe(baselineDigest);
    expect(computeControllerDigest(substitutedPayload)).not.toBe(baselineDigest);
  });

  it("binds bundled runtime provenance into identity and to its inventoried file", () => {
    const input = controllerManifestInput();
    const baselineDigest = computeControllerDigest(requireManifest(input));
    const changedRuntime = requireManifest({
      ...input,
      runtime: { ...input.runtime, version: "1.3.15" },
    });
    const mismatchedRuntime = createControllerPayloadManifest({
      ...input,
      runtime: { ...input.runtime, digest: DIGEST_A },
    });

    expect(computeControllerDigest(changedRuntime)).not.toBe(baselineDigest);
    expect(mismatchedRuntime).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "RUNTIME_DIGEST_MISMATCH" }),
      ]),
    });

    expect(
      createControllerPayloadManifest({
        ...input,
        runtime: { ...input.runtime, revision: "ABC" },
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_STRING", path: "manifest.runtime.revision" }),
      ]),
    });
    expect(
      createControllerPayloadManifest({
        ...input,
        runtime: { ...input.runtime, platform: "freebsd" },
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "INVALID_PLATFORM" })]),
    });
  });

  it("derives and checks every official member digest from its canonical inventory subtree", () => {
    const input = controllerManifestInput();
    const cliDigest = computeControllerMemberPayloadDigest(input.entries, "app/cli");
    const changedCliDigest = computeControllerMemberPayloadDigest(
      input.entries.map((entry) =>
        entry.path === "app/cli/index.mjs" && entry.kind === "file"
          ? { ...entry, digest: DIGEST_B }
          : entry
      ),
      "app/cli"
    );
    const unrelatedRuntimeDigest = computeControllerMemberPayloadDigest(
      input.entries.map((entry) =>
        entry.path === "runtime/bun" && entry.kind === "file"
          ? { ...entry, digest: DIGEST_A }
          : entry
      ),
      "app/cli"
    );
    expect(cliDigest.ok && changedCliDigest.ok && unrelatedRuntimeDigest.ok).toBe(true);
    if (!cliDigest.ok || !changedCliDigest.ok || !unrelatedRuntimeDigest.ok) return;
    expect(cliDigest.value).toBe(
      "6db24b058547d600a56787013b6a83548192a08c63a2bac1ebf28cc99c3448f0"
    );
    expect(changedCliDigest.value).not.toBe(cliDigest.value);
    expect(unrelatedRuntimeDigest.value).toBe(cliDigest.value);

    const mismatch = createControllerPayloadManifest({
      ...input,
      officialMembers: input.officialMembers.map((member) =>
        member.packageId === "@rawr/cli" ? { ...member, payloadDigest: DIGEST_A } : member
      ),
    });
    expect(mismatch).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "MEMBER_PAYLOAD_DIGEST_MISMATCH" }),
      ]),
    });
  });

  it("binds dependency-lock provenance to one inventoried file", () => {
    const input = controllerManifestInput();
    expect(
      createControllerPayloadManifest({
        ...input,
        dependencyLock: { ...input.dependencyLock, digest: DIGEST_A },
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "DEPENDENCY_LOCK_DIGEST_MISMATCH" }),
      ]),
    });
    expect(
      createControllerPayloadManifest({
        ...input,
        dependencyLock: { ...input.dependencyLock, path: "meta/missing.lock" },
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "MISSING_PAYLOAD_ENTRY" })]),
    });
  });

  it("rejects missing official bytes, overlapping owners, and command collisions", () => {
    const input = controllerManifestInput();
    const missingMemberBytes = createControllerPayloadManifest({
      ...input,
      entries: input.entries.filter((entry) => !entry.path.startsWith("app/plugins/devops/")),
    });
    const overlappingRoot = createControllerPayloadManifest({
      ...input,
      officialMembers: input.officialMembers.map((member) =>
        member.packageId === "@rawr/plugin-devops" ? { ...member, root: "app/cli/nested" } : member
      ),
      entries: [
        ...input.entries,
        { kind: "file", path: "app/cli/nested/index.mjs", mode: 0o644, digest: DIGEST_A },
      ],
    });
    const commandCollision = createControllerPayloadManifest({
      ...input,
      officialMembers: input.officialMembers.map((member) =>
        member.packageId === "@rawr/plugin-devops"
          ? { ...member, aliases: ["doctor:global"] }
          : member
      ),
    });

    expect(missingMemberBytes).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "MISSING_PAYLOAD_ENTRY" })]),
    });
    expect(overlappingRoot).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "SURFACE_COLLISION" })]),
    });
    expect(commandCollision).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "SURFACE_COLLISION" })]),
    });
  });

  it("validates the closed official set before payload construction without claiming shared topic ownership", () => {
    const members = controllerManifestInput().officialMembers.map((member) => ({
      ...member,
      topics: ["shared-topic"],
    }));
    const result = createControllerOfficialSetManifest(members);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.map((member) => member.packageId)).toEqual([
      "@rawr/cli",
      "@rawr/plugin-devops",
    ]);
  });

  it("rejects an entrypoint not present as a file and rejects uncontained link targets", () => {
    const input = controllerManifestInput();
    expect(
      createControllerPayloadManifest({ ...input, entrypoint: "app/missing.mjs" })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "MISSING_PAYLOAD_ENTRY" })]),
    });
    expect(
      createControllerPayloadManifest({
        ...input,
        entries: input.entries.map((entry) =>
          entry.kind === "link" ? { ...entry, target: "outside/missing.mjs" } : entry
        ),
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "UNSAFE_LINK_TARGET" })]),
    });
  });

  it("verifies complete observed inventory independent of enumeration order", () => {
    const manifest = requireManifest();
    expect(
      verifyControllerPayload(manifest, controllerObservedPayloadEntries().reverse())
    ).toMatchObject({ ok: true });
  });

  it("rejects a payload file whose inode is shared through a hardlink", () => {
    const manifest = requireManifest();
    const observed = controllerObservedPayloadEntries().map((entry) =>
      entry.path === "node_modules/shared/index.mjs" ? { ...entry, nlink: 2 } : entry
    );

    expect(verifyControllerPayload(manifest, observed)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "SHARED_PAYLOAD_INODE",
          path: "observedEntries[6].nlink",
          expected: 1,
          actual: 2,
        }),
      ]),
    });
  });

  it("reports missing, unexpected, mode, and digest substitution independently", () => {
    const manifest = requireManifest();
    const observed = controllerObservedPayloadEntries()
      .filter((entry) => entry.path !== "runtime/bun")
      .map((entry) =>
        entry.path === "app/rawr.mjs" && entry.kind === "file"
          ? { ...entry, mode: 0o644, digest: DIGEST_B }
          : entry
      );
    observed.push({
      kind: "file",
      path: "unexpected.txt",
      mode: 0o644,
      digest: DIGEST_A,
      nlink: 1,
    });

    const result = verifyControllerPayload(manifest, observed);
    expect(result).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PAYLOAD_ENTRY",
          path: "observedEntries.runtime/bun",
        }),
        expect.objectContaining({
          code: "PAYLOAD_MODE_MISMATCH",
          path: "observedEntries.app/rawr.mjs.mode",
        }),
        expect.objectContaining({
          code: "PAYLOAD_DIGEST_MISMATCH",
          path: "observedEntries.app/rawr.mjs.digest",
        }),
        expect.objectContaining({
          code: "UNEXPECTED_PAYLOAD_ENTRY",
          path: "observedEntries.unexpected.txt",
        }),
      ]),
    });
  });

  it("rejects ignored manifest fields rather than creating an alternate identity projection", () => {
    expect(
      createControllerPayloadManifest({
        ...controllerManifestInput(),
        fallbackController: "/tmp/other-controller",
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_FIELD", path: "manifest.fallbackController" }),
      ]),
    });
  });
});
