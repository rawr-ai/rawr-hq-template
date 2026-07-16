import { describe, expect, it } from "vitest";

import { contentDigest, parseReleaseRelativePath } from "@rawr/agent-plugin-release";

import {
  canonicalSerializeExportAppliedObservation,
  canonicalSerializeExportInverseAction,
  createExportAppliedObservation,
  createExportInverseAction,
  createKnownNativeHomesSnapshot,
  decodeExportAppliedObservation,
  decodeExportInverseAction,
  exportInverseActionDigest,
  EXPORT_LEDGER_FILENAME,
  validateExportOwnerActionSequence,
  verifyExportAppliedObservation,
  verifyExportInverseAction,
  verifyKnownNativeHomesSnapshot,
  type ExportInverseActionV1,
} from "../src/index";
import {
  canonicalSerializeExportLedger,
  createExportLedger,
  initialExportLedger,
} from "../src/ledger";
import { exportArtifactFixture } from "./artifact-fixture";

describe("export owner protocols", () => {
  it("validates, sorts, and digest-binds an empty or populated complete native-home read model", () => {
    const empty = createKnownNativeHomesSnapshot([]);
    expect(empty.ok).toBe(true);
    const populated = createKnownNativeHomesSnapshot([
      { provider: "codex", canonicalPath: "/z/native" },
      { provider: "claude", canonicalPath: "/a/native" },
    ]);
    expect(populated.ok).toBe(true);
    if (!populated.ok) return;
    expect(populated.snapshot.homes.map((home) => home.canonicalPath)).toEqual(["/a/native", "/z/native"]);
    expect(verifyKnownNativeHomesSnapshot({ ...populated.snapshot, homes: [...populated.snapshot.homes].reverse() }).ok).toBe(false);
    expect(verifyKnownNativeHomesSnapshot({ ...populated.snapshot, extra: true }).ok).toBe(false);
  });

  it("round-trips closed canonical inverse actions and typed forward/reverted observations", () => {
    const fixture = exportArtifactFixture();
    const destination = "/tmp/generated-export-protocol-destination";
    const ledger = initialExportLedger(destination, "codex-v1");
    const relativePathResult = parseReleaseRelativePath("codex/plugins/alpha/skills/alpha/SKILL.md");
    if (!relativePathResult.ok) throw new Error("generated path failed to parse");
    const action = createExportInverseAction({
      mutation: "write-payload",
      canonicalDestination: destination,
      layout: "codex-v1",
      ledgerGeneration: ledger.body.generation,
      ledgerDigest: ledger.ledgerDigest,
      authority: {
        kind: "planned-adoption",
        pluginId: fixture.alpha.release.artifactBody.releaseBody.pluginId,
        releaseDigest: fixture.alpha.release.releaseDigest,
      },
      relativePath: relativePathResult.value,
      prior: { kind: "Absent" },
      expectedPost: {
        kind: "Present",
        mode: 0o644,
        contentDigest: fixture.alpha.files[0]!.contentDigest,
        bytesBase64: Buffer.from(fixture.alpha.files[0]!.bytes).toString("base64"),
      },
    });
    const digest = exportInverseActionDigest(action);
    const actionBytes = canonicalSerializeExportInverseAction(action);
    expect(decodeExportInverseAction(actionBytes)).toMatchObject({ ok: true, actionDigest: digest });
    expect(verifyExportInverseAction({ ...action, extra: true }).ok).toBe(false);

    const forward = createExportAppliedObservation(digest, {
      kind: "File",
      mode: 0o644,
      dev: "1",
      ino: "2",
      size: String(fixture.alpha.files[0]!.bytes.byteLength),
      mtimeNs: "3",
      ctimeNs: "4",
      contentDigest: fixture.alpha.files[0]!.contentDigest,
    });
    const reverted = createExportAppliedObservation(digest, { kind: "Absent" }, "reverted");
    expect(decodeExportAppliedObservation(canonicalSerializeExportAppliedObservation(forward))).toMatchObject({ ok: true });
    expect(verifyExportAppliedObservation(reverted)).toMatchObject({ ok: true });
    expect(verifyExportAppliedObservation({ ...forward, actionDigest: `eia1_${"0".repeat(64)}` })).toMatchObject({ ok: true });
  });

  it("refuses to mint invalid generations or initial ledgers with ownership", () => {
    const destination = "/tmp/generated-export-ledger-destination";
    expect(() => createExportLedger({
      canonicalDestination: destination,
      layout: "codex-v1",
      generation: Number.MAX_SAFE_INTEGER + 1,
      scopes: [],
      completeSet: null,
    })).toThrow(/generation/u);
    expect(() => createExportLedger({
      canonicalDestination: destination,
      layout: "codex-v1",
      generation: 0,
      scopes: [{
        pluginId: exportArtifactFixture().alpha.release.artifactBody.releaseBody.pluginId,
        releaseDigest: exportArtifactFixture().alpha.release.releaseDigest,
        payloadDigest: exportArtifactFixture().alpha.release.artifactBody.releaseBody.payloadDigest,
        files: [],
        directories: [],
      }],
      completeSet: null,
    })).toThrow(/Initial generation zero/u);
  });

  it("accepts the complete export grammar and every aggregate applied prefix", () => {
    const first = ownerSequenceFixture("/tmp/generated-export-sequence-a");
    const second = ownerSequenceFixture("/tmp/generated-export-sequence-b");
    const aggregate = [...first, ...second];

    expect(() => validateExportOwnerActionSequence({ actions: aggregate, mode: "complete" })).not.toThrow();
    expect(() => validateExportOwnerActionSequence({
      actions: first.slice(0, -1),
      mode: "complete",
    })).not.toThrow();
    for (let length = 1; length <= aggregate.length; length += 1) {
      expect(() => validateExportOwnerActionSequence({
        actions: aggregate.slice(0, length),
        mode: "applied-prefix",
      }), `prefix length ${length}`).not.toThrow();
    }
    expect(() => validateExportOwnerActionSequence({
      actions: first.slice(0, 1),
      mode: "complete",
    })).toThrow(/ends inside a directory-creation prefix/u);
  });

  it("rejects owner-sequence permutations, interleaving, duplicates, and structural gaps", () => {
    const first = ownerSequenceFixture("/tmp/generated-export-sequence-a");
    const second = ownerSequenceFixture("/tmp/generated-export-sequence-b");
    const [createRoot, , writeNested, writeRoot, retireFirst, retireNested, retireNestedDirectory, retireRoot, ledger] = first;
    const [, , secondWriteNested] = second;
    const invalid: ReadonlyArray<Readonly<{ name: string; actions: readonly ExportInverseActionV1[] }>> = [
      { name: "ledger first", actions: [ledger!, writeRoot!] },
      { name: "ledger middle", actions: [writeNested!, ledger!, retireFirst!] },
      { name: "write permutation", actions: [writeRoot!, writeNested!] },
      { name: "phase regression", actions: [retireFirst!, writeRoot!] },
      { name: "payload-retirement permutation", actions: [retireNested!, retireFirst!] },
      { name: "directory-retirement permutation", actions: [retireNested!, retireRoot!, retireNestedDirectory!] },
      { name: "destination interleaving", actions: [writeNested!, secondWriteNested!, writeRoot!] },
      { name: "duplicate action", actions: [writeNested!, writeNested!] },
      { name: "created-directory gap", actions: [createRoot!, writeNested!] },
      { name: "retired-directory gap", actions: [retireNested!, retireRoot!] },
      { name: "ledger-declared write omission", actions: first.filter((action) => action !== writeRoot) },
      { name: "ledger-declared retirement omission", actions: first.filter((action) => action !== retireFirst) },
    ];

    for (const candidate of invalid) {
      expect(() => validateExportOwnerActionSequence({
        actions: candidate.actions,
        mode: "complete",
      }), candidate.name).toThrow();
    }
  });
});

function ownerSequenceFixture(destination: string): readonly ExportInverseActionV1[] {
  const fixture = exportArtifactFixture();
  const file = fixture.alpha.files[0]!;
  const present = Object.freeze({
    kind: "Present" as const,
    mode: file.mode,
    contentDigest: file.contentDigest,
    bytesBase64: Buffer.from(file.bytes).toString("base64"),
  });
  const absent = Object.freeze({ kind: "Absent" as const });
  const plannedAuthority = Object.freeze({
    kind: "planned-adoption" as const,
    pluginId: fixture.alpha.release.artifactBody.releaseBody.pluginId,
    releaseDigest: fixture.alpha.release.releaseDigest,
  });
  const priorAuthority = Object.freeze({ ...plannedAuthority, kind: "plugin-claim" as const });
  const pluginId = fixture.alpha.release.artifactBody.releaseBody.pluginId;
  const releaseDigest = fixture.alpha.release.releaseDigest;
  const payloadDigest = fixture.alpha.release.artifactBody.releaseBody.payloadDigest;
  const priorLedger = createExportLedger({
    canonicalDestination: destination,
    layout: "codex-v1",
    generation: 1,
    scopes: [{
      pluginId,
      releaseDigest,
      payloadDigest,
      files: [
        { relativePath: relativePath("codex/plugins/alpha/old/a.md"), mode: file.mode, contentDigest: file.contentDigest },
        { relativePath: relativePath("codex/plugins/alpha/old/z/file.md"), mode: file.mode, contentDigest: file.contentDigest },
      ],
      directories: [
        relativePath("codex"),
        relativePath("codex/plugins"),
        relativePath("codex/plugins/alpha"),
        relativePath("codex/plugins/alpha/old"),
        relativePath("codex/plugins/alpha/old/z"),
      ],
    }],
    completeSet: null,
  });
  const nextLedger = createExportLedger({
    canonicalDestination: destination,
    layout: "codex-v1",
    generation: 2,
    scopes: [{
      pluginId,
      releaseDigest,
      payloadDigest,
      files: [
        { relativePath: relativePath("codex/plugins/alpha/new/nested/file.md"), mode: file.mode, contentDigest: file.contentDigest },
        { relativePath: relativePath("codex/plugins/alpha/other.md"), mode: file.mode, contentDigest: file.contentDigest },
      ],
      directories: [
        relativePath("codex"),
        relativePath("codex/plugins"),
        relativePath("codex/plugins/alpha"),
        relativePath("codex/plugins/alpha/new"),
        relativePath("codex/plugins/alpha/new/nested"),
      ],
    }],
    completeSet: null,
  });
  const base = {
    canonicalDestination: destination,
    layout: "codex-v1" as const,
    ledgerGeneration: priorLedger.body.generation,
    ledgerDigest: priorLedger.ledgerDigest,
  };
  const directoryPrior = (ino: string) => Object.freeze({
    kind: "Directory" as const,
    mode: 0o755,
    dev: "1",
    ino,
    birthtimeNs: "3",
  });
  const directoryPost = Object.freeze({ kind: "Directory" as const, mode: 0o755 });
  const fileState = (bytes: Uint8Array) => Object.freeze({
    kind: "Present" as const,
    mode: 0o644,
    contentDigest: contentDigest(bytes),
    bytesBase64: Buffer.from(bytes).toString("base64"),
  });
  const action = (
    input: Omit<ExportInverseActionV1, "owner" | "protocolVersion" | keyof typeof base>,
  ): ExportInverseActionV1 => createExportInverseAction({ ...base, ...input } as Omit<
    ExportInverseActionV1,
    "owner" | "protocolVersion"
  >);

  return Object.freeze([
    action({
      mutation: "create-directory",
      authority: plannedAuthority,
      relativePath: relativePath("codex/plugins/alpha/new"),
      prior: absent,
      expectedPost: directoryPost,
    }),
    action({
      mutation: "create-directory",
      authority: plannedAuthority,
      relativePath: relativePath("codex/plugins/alpha/new/nested"),
      prior: absent,
      expectedPost: directoryPost,
    }),
    action({
      mutation: "write-payload",
      authority: plannedAuthority,
      relativePath: relativePath("codex/plugins/alpha/new/nested/file.md"),
      prior: absent,
      expectedPost: present,
    }),
    action({
      mutation: "write-payload",
      authority: plannedAuthority,
      relativePath: relativePath("codex/plugins/alpha/other.md"),
      prior: absent,
      expectedPost: present,
    }),
    action({
      mutation: "retire-payload",
      authority: priorAuthority,
      relativePath: relativePath("codex/plugins/alpha/old/a.md"),
      prior: present,
      expectedPost: absent,
    }),
    action({
      mutation: "retire-payload",
      authority: priorAuthority,
      relativePath: relativePath("codex/plugins/alpha/old/z/file.md"),
      prior: present,
      expectedPost: absent,
    }),
    action({
      mutation: "retire-directory",
      authority: priorAuthority,
      relativePath: relativePath("codex/plugins/alpha/old/z"),
      prior: directoryPrior("4"),
      expectedPost: absent,
    }),
    action({
      mutation: "retire-directory",
      authority: priorAuthority,
      relativePath: relativePath("codex/plugins/alpha/old"),
      prior: directoryPrior("5"),
      expectedPost: absent,
    }),
    action({
      mutation: "write-ledger",
      authority: Object.freeze({
        kind: "destination-ledger",
        nextGeneration: nextLedger.body.generation,
      }),
      relativePath: relativePath(EXPORT_LEDGER_FILENAME),
      prior: fileState(canonicalSerializeExportLedger(priorLedger)),
      expectedPost: fileState(canonicalSerializeExportLedger(nextLedger)),
    }),
  ]);
}

function relativePath(input: string) {
  const parsed = parseReleaseRelativePath(input);
  if (!parsed.ok) throw new Error(`generated sequence path is invalid: ${input}`);
  return parsed.value;
}
