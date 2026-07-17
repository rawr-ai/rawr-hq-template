import { lstatSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { link, lstat, mkdir, readFile, readdir, rename, symlink, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  EXPORT_LEDGER_FILENAME,
  exportInverseActionDigest,
  verifyExportLedgerBytes,
  type ExportAgentPluginsRequest,
  type ExportFailpoints,
  type KnownNativeHomesReader,
  type UndoApplyingSession,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
import { PAYLOAD_TEMP_PREFIX } from "../../../../src/lib/agent-plugins/service-runtime/exports/node-filesystem";
import {
  executeExportInverseAction,
} from "../../../../src/lib/agent-plugins/service-runtime/exports/runtime";
import {
  alphaOnlyArtifactFixture,
  exportArtifactFixture,
} from "../../../../../../services/agent-plugin-lifecycle/test/modules/exports/artifact-fixture";
import { FakeArtifactReader, FakeKnownNativeHomesReader, FakeUndoWriter, knownHomes } from "./fakes";
import { OneSlotUndoWriter } from "./one-slot-undo-writer";
import { createExportTestClient } from "./lifecycle-client";
import { createOwnedFixtureRoot, type OwnedFixtureRoot } from "./owned-fixture-root";

describe("agent-plugin explicit destination export", () => {
  let root: OwnedFixtureRoot;

  beforeEach(async () => {
    root = await createOwnedFixtureRoot();
  });

  afterEach(async () => {
    await root.cleanup();
  });

  it("rejects a non-closed or modeless request before every reader and destination access", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const homes = new FakeKnownNativeHomesReader(knownHomes());
    const undo = new FakeUndoWriter();
    const destination = join(root.path, "missing-destination");
    const client = createExportTestClient({ artifactReader: artifacts, knownNativeHomesReader: homes, undoWriter: undo });

    // @ts-expect-error The service boundary must reject a modeless raw request.
    await expect(client.exports.apply({
      protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
      artifactRef: fixture.alpha.ref,
      layout: "codex-v1",
      destinations: [destination],
    })).rejects.toThrow(/Input validation failed/u);

    expect(artifacts.reads).toBe(0);
    expect(homes.reads).toBe(0);
    expect(undo.beginCalls).toBe(0);
    await expect(lstat(destination)).rejects.toMatchObject({ code: "ENOENT" });

    const overlapping = await client.exports.apply({
      ...request(fixture.alpha.ref, "targeted-release", root.path),
      destinations: [root.path, join(root.path, "nested-owner")],
    });
    expect(overlapping.kind).toBe("RejectedBeforeMutation");
    expect(artifacts.reads).toBe(0);
    expect(homes.reads).toBe(0);
  });

  it("blocks malformed native-home evidence and overlap before artifact or destination access", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = join(root.path, "native", "child");
    const invalidReader: KnownNativeHomesReader = {
      async readCompleteSnapshot() {
        return {
          kind: "Verified",
          snapshot: {
            protocolVersion: 1,
            completeness: "complete",
            homes: [],
            snapshotDigest: `nh1_${"0".repeat(64)}`,
          },
        };
      },
    };
    const invalid = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: invalidReader,
      undoWriter: new FakeUndoWriter(),
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(invalid.kind).toBe("RejectedBeforeMutation");
    expect(artifacts.reads).toBe(0);

    const nativeRoot = join(root.path, "native");
    const overlapReader = new FakeKnownNativeHomesReader(knownHomes([{ provider: "codex", canonicalPath: nativeRoot }]));
    const overlap = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: overlapReader,
      undoWriter: new FakeUndoWriter(),
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(overlap.kind).toBe("RejectedBeforeMutation");
    expect(overlap.destinations[0]?.kind).toBe("RejectedBeforeMutation");
    await expect(lstat(destination)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed when the native-home reader is absent and rejects caller home overrides", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = join(root.path, "native-reader-absent");
    const undo = new FakeUndoWriter();
    const absent = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: undefined as unknown as KnownNativeHomesReader,
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(absent.kind).toBe("RejectedBeforeMutation");
    expect(artifacts.reads).toBe(0);
    expect(undo.preflightCalls).toBe(0);
    await expect(lstat(destination)).rejects.toMatchObject({ code: "ENOENT" });

    const homes = new FakeKnownNativeHomesReader(knownHomes());
    await expect(createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: homes,
      undoWriter: undo,
    }).exports.apply({
      ...request(fixture.alpha.ref, "targeted-release", destination),
      // @ts-expect-error The service boundary must reject caller-owned home evidence.
      knownNativeHomes: [],
    })).rejects.toThrow(/Input validation failed/u);
    expect(homes.reads).toBe(0);
    expect(artifacts.reads).toBe(0);
  });

  it("settles a complete deterministic layout and repeats as a byte-and-mtime read-only no-op", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.complete);
    const undo = new FakeUndoWriter();
    const destination = await destinationAt(root, "complete");
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    });

    const first = await client.exports.apply(request(fixture.complete.ref, "complete-set", destination));
    expect(first.kind).toBe("MutatedSettled");
    const alphaPath = join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md");
    const betaPath = join(destination, "codex/plugins/beta/agents/beta.md");
    expect(await readFile(alphaPath, "utf8")).toBe("alpha-v1\n");
    expect(await readFile(betaPath, "utf8")).toBe("beta-v1\n");
    const ledgerPath = join(destination, EXPORT_LEDGER_FILENAME);
    const before = await Promise.all([lstat(alphaPath, { bigint: true }), lstat(betaPath, { bigint: true }), lstat(ledgerPath, { bigint: true })]);
    const portCalls = [undo.preflightCalls, undo.beginCalls, undo.stageCalls, undo.markCalls, undo.settleCalls, undo.discardCalls];

    const second = await client.exports.apply(request(fixture.complete.ref, "complete-set", destination));
    const after = await Promise.all([lstat(alphaPath, { bigint: true }), lstat(betaPath, { bigint: true }), lstat(ledgerPath, { bigint: true })]);
    expect(second.kind).toBe("ReadOnlyConverged");
    expect([undo.preflightCalls, undo.beginCalls, undo.stageCalls, undo.markCalls, undo.settleCalls, undo.discardCalls])
      .toEqual(portCalls);
    expect(after.map((entry) => [entry.dev, entry.ino, entry.mode, entry.mtimeNs, entry.ctimeNs]))
      .toEqual(before.map((entry) => [entry.dev, entry.ino, entry.mode, entry.mtimeNs, entry.ctimeNs]));
  });

  it("updates one targeted scope, retires only its old claim, and preserves its peer scope", async () => {
    const firstFixture = exportArtifactFixture();
    const secondFixture = exportArtifactFixture("alpha-v2\n", "beta-v1\n", "skills/alpha-v2/SKILL.md");
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstFixture.complete);
    artifacts.add(secondFixture.alpha);
    const destination = await destinationAt(root, "targeted");
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
    });
    expect((await client.exports.apply(request(firstFixture.complete.ref, "complete-set", destination))).kind).toBe("MutatedSettled");
    const betaPath = join(destination, "codex/plugins/beta/agents/beta.md");
    const betaBefore = await lstat(betaPath, { bigint: true });

    const updated = await client.exports.apply(request(secondFixture.alpha.ref, "targeted-release", destination));
    expect(updated.kind).toBe("MutatedSettled");
    await expect(lstat(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(join(destination, "codex/plugins/alpha/skills/alpha-v2/SKILL.md"), "utf8")).toBe("alpha-v2\n");
    const betaAfter = await lstat(betaPath, { bigint: true });
    expect([betaAfter.dev, betaAfter.ino, betaAfter.mtimeNs, betaAfter.ctimeNs])
      .toEqual([betaBefore.dev, betaBefore.ino, betaBefore.mtimeNs, betaBefore.ctimeNs]);
    const ledgerBytes = new Uint8Array(await readFile(join(destination, EXPORT_LEDGER_FILENAME)));
    const verified = verifyExportLedgerBytes(ledgerBytes, destination);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.ledger.body.completeSet).toBeNull();
      expect(verified.ledger.body.scopes.map((scope) => scope.pluginId)).toEqual(["alpha", "beta"]);
      expect(verified.ledger.body.scopes.find((scope) => scope.pluginId === "beta")?.releaseDigest)
        .toBe(firstFixture.beta.release.releaseDigest);
    }
  });

  it("re-establishes full-set truth after a targeted update clears the prior complete-set claim", async () => {
    const firstSet = exportArtifactFixture();
    const secondSet = exportArtifactFixture("alpha-v2\n", "beta-v1\n", "skills/alpha-v2/SKILL.md");
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstSet.complete);
    artifacts.add(secondSet.alpha);
    artifacts.add(secondSet.complete);
    const destination = await destinationAt(root, "full-targeted-full");
    const undo = new FakeUndoWriter();
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    });

    expect((await client.exports.apply(request(firstSet.complete.ref, "complete-set", destination))).kind)
      .toBe("MutatedSettled");
    const firstLedger = await verifiedLedger(destination);
    expect(firstLedger.body.completeSet).toEqual({
      releaseSetDigest: firstSet.complete.ref.releaseSetDigest,
      members: [
        { pluginId: "alpha", releaseDigest: firstSet.alpha.release.releaseDigest },
        { pluginId: "beta", releaseDigest: firstSet.beta.release.releaseDigest },
      ],
    });
    const betaPath = join(destination, "codex/plugins/beta/agents/beta.md");
    const betaAfterFirstSet = await fileIdentityAndMetadata(betaPath);

    expect((await client.exports.apply(request(secondSet.alpha.ref, "targeted-release", destination))).kind)
      .toBe("MutatedSettled");
    const targetedLedger = await verifiedLedger(destination);
    expect(targetedLedger.body.completeSet).toBeNull();
    expect(targetedLedger.body.scopes.map(({ pluginId, releaseDigest }) => ({ pluginId, releaseDigest }))).toEqual([
      { pluginId: "alpha", releaseDigest: secondSet.alpha.release.releaseDigest },
      { pluginId: "beta", releaseDigest: firstSet.beta.release.releaseDigest },
    ]);
    expect(await fileIdentityAndMetadata(betaPath)).toEqual(betaAfterFirstSet);
    await expect(lstat(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md")))
      .rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(join(destination, "codex/plugins/alpha/skills/alpha-v2/SKILL.md"), "utf8"))
      .toBe("alpha-v2\n");

    expect((await client.exports.apply(request(secondSet.complete.ref, "complete-set", destination))).kind)
      .toBe("MutatedSettled");
    const secondLedger = await verifiedLedger(destination);
    expect(secondLedger.body.completeSet).toEqual({
      releaseSetDigest: secondSet.complete.ref.releaseSetDigest,
      members: [
        { pluginId: "alpha", releaseDigest: secondSet.alpha.release.releaseDigest },
        { pluginId: "beta", releaseDigest: secondSet.beta.release.releaseDigest },
      ],
    });
    expect(secondLedger.body.scopes.map(({ pluginId, releaseDigest }) => ({ pluginId, releaseDigest }))).toEqual([
      { pluginId: "alpha", releaseDigest: secondSet.alpha.release.releaseDigest },
      { pluginId: "beta", releaseDigest: secondSet.beta.release.releaseDigest },
    ]);
    expect(await fileIdentityAndMetadata(betaPath)).toEqual(betaAfterFirstSet);

    const treeBeforeRepeat = await snapshotDestinationTree(destination);
    const undoCallsBeforeRepeat = [
      undo.preflightCalls,
      undo.beginCalls,
      undo.stageCalls,
      undo.discardCalls,
      undo.markCalls,
      undo.settleCalls,
      undo.abortCalls,
      undo.suspendCalls,
    ];
    const repeated = await client.exports.apply(request(secondSet.complete.ref, "complete-set", destination));
    expect(repeated.kind).toBe("ReadOnlyConverged");
    expect([
      undo.preflightCalls,
      undo.beginCalls,
      undo.stageCalls,
      undo.discardCalls,
      undo.markCalls,
      undo.settleCalls,
      undo.abortCalls,
      undo.suspendCalls,
    ]).toEqual(undoCallsBeforeRepeat);
    expect(await snapshotDestinationTree(destination)).toEqual(treeBeforeRepeat);
  });

  it("treats a later complete set as closed-world only for ledger claims and preserves unmanaged descendants", async () => {
    const firstFixture = exportArtifactFixture();
    const alphaOnly = alphaOnlyArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstFixture.complete);
    artifacts.add(alphaOnly.complete);
    const destination = await destinationAt(root, "closed-world");
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
    });
    expect((await client.exports.apply(request(firstFixture.complete.ref, "complete-set", destination))).kind).toBe("MutatedSettled");
    const unmanaged = join(destination, "codex/plugins/beta/unmanaged.txt");
    await writeFile(unmanaged, "preserve-me\n");

    const settled = await client.exports.apply(request(alphaOnly.complete.ref, "complete-set", destination));
    expect(settled.kind).toBe("MutatedSettled");
    await expect(lstat(join(destination, "codex/plugins/beta/agents/beta.md"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(destination, "codex/plugins/beta/skills/beta/SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(unmanaged, "utf8")).toBe("preserve-me\n");
    const ledger = verifyExportLedgerBytes(new Uint8Array(await readFile(join(destination, EXPORT_LEDGER_FILENAME))), destination);
    expect(ledger.ok && ledger.ledger.body.scopes.map((scope) => scope.pluginId)).toEqual(["alpha"]);
  });

  it("renders the explicit Claude layout without creating a Codex projection", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "claude-layout");
    const undo = new FakeUndoWriter();
    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", destination), layout: "claude-v1" });
    expect(result.kind).toBe("MutatedSettled");
    expect(await readFile(join(destination, "claude/plugins/alpha/skills/alpha/SKILL.md"), "utf8")).toBe("alpha-v1\n");
    await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves unmanaged collisions by default and performs exact reversible replace-planned adoption", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "collision");
    const target = join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md");
    await makeDirectoryChain(destination, ["codex", "plugins", "alpha", "skills", "alpha"]);
    await writeFile(target, "unmanaged\n", { mode: 0o600 });
    const undo = new FakeUndoWriter();
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    });

    const blockedResult = await client.exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(blockedResult.kind).toBe("RejectedBeforeMutation");
    expect(await readFile(target, "utf8")).toBe("unmanaged\n");
    expect(undo.beginCalls).toBe(0);

    const adopted = await client.exports.apply({
      ...request(fixture.alpha.ref, "targeted-release", destination),
      overwritePolicy: "replace-planned",
    });
    expect(adopted.kind).toBe("MutatedSettled");
    expect(await readFile(target, "utf8")).toBe("alpha-v1\n");
    const actions = [...undo.committed].reverse();
    for (const entry of actions) {
      const replay = await executeExportInverseAction(entry.action, entry.observation, { operationId: () => `inverse${"x".repeat(12)}` });
      expect(replay.kind).toBe("RevertedVerified");
    }
    expect(await readFile(target, "utf8")).toBe("unmanaged\n");
    expect((await lstat(target)).mode & 0o777).toBe(0o600);
    await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("cleans its exact replay temporary when a target race blocks inverse publication before mutation", async () => {
    const firstFixture = exportArtifactFixture();
    const secondFixture = exportArtifactFixture("alpha-replay-race-v2\n");
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstFixture.alpha);
    artifacts.add(secondFixture.alpha);
    const destination = await destinationAt(root, "inverse-target-race-cleanup");
    const client = (undoWriter: UndoWriter) => createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter,
    });
    expect((await client(new FakeUndoWriter()).exports.apply(
      request(firstFixture.alpha.ref, "targeted-release", destination),
    )).kind).toBe("MutatedSettled");
    const undo = new FakeUndoWriter();
    expect((await client(undo).exports.apply(
      request(secondFixture.alpha.ref, "targeted-release", destination),
    )).kind).toBe("MutatedSettled");
    const ledger = undo.committed.find((entry) => entry.action.mutation === "write-ledger");
    const payload = undo.committed.find((entry) => (
      entry.action.mutation === "write-payload" && entry.action.relativePath.endsWith("SKILL.md")
    ));
    if (ledger === undefined || payload === undefined) throw new Error("Expected update inverse actions were not committed");
    expect((await executeExportInverseAction(ledger.action, ledger.observation, {
      operationId: () => "inverseledger0001",
    })).kind).toBe("RevertedVerified");

    const target = join(destination, payload.action.relativePath);
    const operationInode = (await lstat(target, { bigint: true })).ino;
    let foreignInode: bigint | undefined;
    const replay = await executeExportInverseAction(payload.action, payload.observation, {
      operationId: () => {
        const replacement = join(dirname(target), ".inverse-target-race-foreign");
        writeFileSync(replacement, readFileSync(target), { mode: 0o644 });
        foreignInode = lstatSync(replacement, { bigint: true }).ino;
        renameSync(replacement, target);
        return "inversecleanup0001";
      },
    });

    expect(replay).toMatchObject({ kind: "Blocked", failures: { kind: "PrimaryOnly" } });
    expect(foreignInode).not.toBe(operationInode);
    expect((await lstat(target, { bigint: true })).ino).toBe(foreignInode);
    await expect(lstat(join(dirname(target), `${PAYLOAD_TEMP_PREFIX}inversecleanup0001`)))
      .rejects.toMatchObject({ code: "ENOENT" });
  });

  it("settles an independent destination while another destination rejects before mutation", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const good = await destinationAt(root, "good");
    const blocked = await destinationAt(root, "blocked");
    const collision = join(blocked, "codex/plugins/alpha/skills/alpha/SKILL.md");
    await makeDirectoryChain(blocked, ["codex", "plugins", "alpha", "skills", "alpha"]);
    await writeFile(collision, "foreign\n");
    const undo = new FakeUndoWriter();
    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", good), destinations: [good, blocked] });

    expect(result.kind).toBe("MutatedSettled");
    expect(result.destinations.map((entry) => entry.kind)).toEqual(["MutatedSettled", "RejectedBeforeMutation"]);
    expect(await readFile(join(good, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8")).toBe("alpha-v1\n");
    expect(await readFile(collision, "utf8")).toBe("foreign\n");
    for (const [index, entry] of [...undo.committed].reverse().entries()) {
      const replay = await executeExportInverseAction(entry.action, entry.observation, {
        operationId: () => `independentx${index.toString().padStart(4, "0")}`,
      });
      expect(replay.kind).toBe("RevertedVerified");
    }
    await expect(lstat(join(good, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preflights the complete multi-destination candidate and blocks every mutation when the aggregate is overbound", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "preflight-a");
    const second = await destinationAt(root, "preflight-b");
    const undo = new FakeUndoWriter({ preflightActionLimit: 1 });

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", second), destinations: [second, first] });

    expect(result.kind).toBe("RejectedBeforeMutation");
    expect(undo.preflightCalls).toBe(1);
    expect(undo.beginCalls).toBe(0);
    expect(undo.preflightInputs[0]?.targets.map((target) => target.canonicalTarget)).toEqual([first, second]);
    expect(undo.preflightInputs[0]?.actions.length).toBeGreaterThan(1);
    const permutedUndo = new FakeUndoWriter({ preflightActionLimit: 1 });
    await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: permutedUndo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", first), destinations: [first, second] });
    expect(permutedUndo.preflightInputs[0]?.targets).toEqual(undo.preflightInputs[0]?.targets);
    expect(permutedUndo.preflightInputs[0]?.actions.map((entry) => exportInverseActionDigest(entry.action)))
      .toEqual(undo.preflightInputs[0]?.actions.map((entry) => exportInverseActionDigest(entry.action)));
    await expect(lstat(join(first, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(second, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(first, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(second, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("aborts a malformed accepted admission exactly once without suspending it again", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "malformed-admission");
    const base = new FakeUndoWriter();
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin(input) {
        const admitted = await base.begin(input);
        if (admitted.kind !== "Accepted") return admitted;
        return Object.freeze({
          ...admitted,
          admittedActions: null as unknown as typeof admitted.admittedActions,
        });
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: { code: "UndoAdmissionFailed" },
      synchronization: { kind: "Released" },
    });
    expect(base.abortCalls).toBe(1);
    expect(base.suspendCalls).toBe(0);
    expect(base.settleCalls).toBe(0);
    expect(base.stageCalls).toBe(0);
    await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("suspends exactly once when accepted-admission validation throws unexpectedly", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "admission-validation-exception");
    const base = new FakeUndoWriter();
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin(input) {
        const admitted = await base.begin(input);
        if (admitted.kind !== "Accepted") return admitted;
        return new Proxy(admitted, {
          get(target, property, receiver) {
            if (property === "admittedActions") throw new Error("injected admission validation failure");
            return Reflect.get(target, property, receiver);
          },
        });
      },
    };

    await expect(createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination)))
      .rejects.toThrow("injected admission validation failure");

    expect(base.suspendCalls).toBe(1);
    expect(base.abortCalls).toBe(0);
    expect(base.settleCalls).toBe(0);
    expect(base.stageCalls).toBe(0);
    await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("settles two destinations through one canonical one-slot candidate while preserving request result order", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "one-slot-a");
    const second = await destinationAt(root, "one-slot-b");
    const undo = new OneSlotUndoWriter();

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", second), destinations: [second, first] });

    expect(result.kind).toBe("MutatedSettled");
    expect(result.destinations.map((entry) => entry.destination)).toEqual([second, first]);
    expect(result.destinations.map((entry) => entry.kind)).toEqual(["MutatedSettled", "MutatedSettled"]);
    expect(undo.beginCalls).toBe(1);
    expect(undo.settleCalls).toBe(1);
    expect(undo.settled?.input.targets.map((target) => target.canonicalTarget)).toEqual([first, second]);
    const candidateDestinations = undo.settled?.input.actions.map((entry) => entry.action.canonicalDestination) ?? [];
    const firstSecondAction = candidateDestinations.indexOf(second);
    expect(firstSecondAction).toBeGreaterThan(0);
    expect(candidateDestinations.slice(0, firstSecondAction).every((destination) => destination === first)).toBe(true);
    expect(candidateDestinations.slice(firstSecondAction).every((destination) => destination === second)).toBe(true);
    expect(new Set(undo.settled?.applied.map((entry) => entry.action.canonicalDestination))).toEqual(new Set([first, second]));
  });

  it("settles only A's exact applied subset when B rejects and blocks C inside one aggregate candidate", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "one-slot-partial-a");
    const second = await destinationAt(root, "one-slot-partial-b");
    const third = await destinationAt(root, "one-slot-partial-c");
    const undo = new OneSlotUndoWriter();
    let failed = false;
    const failpoints: ExportFailpoints = {
      async hit(point, context) {
        if (point === "AfterInverseStaged" && context.destination === second && !failed) {
          failed = true;
          throw new Error("reject B before its first mutation");
        }
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
      failpoints,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", first), destinations: [first, second, third] });

    expect(result.kind).toBe("MutatedSettled");
    expect(result.destinations.map((entry) => entry.kind)).toEqual([
      "MutatedSettled",
      "RejectedBeforeMutation",
      "RejectedBeforeMutation",
    ]);
    expect(undo.beginCalls).toBe(1);
    expect(undo.settleCalls).toBe(1);
    expect(undo.abortCalls).toBe(0);
    expect(new Set(undo.settled?.input.actions.map((entry) => entry.action.canonicalDestination)))
      .toEqual(new Set([first, second, third]));
    expect(new Set(undo.settled?.applied.map((entry) => entry.action.canonicalDestination))).toEqual(new Set([first]));
    await expect(readFile(join(first, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8")).resolves.toBe("alpha-v1\n");
    await expect(lstat(join(second, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(third, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("surfaces an unsettled begin generation and blocks later destinations before external mutation", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "begin-unsettled-a");
    const second = await destinationAt(root, "begin-unsettled-b");
    const base = new FakeUndoWriter();
    let beginCalls = 0;
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin() {
        beginCalls += 1;
        return {
          kind: "Unsettled",
          generation: "fake-begin-unsettled",
          failure: {
            code: "StatePublicationFailed",
            phase: "fake-begin",
            message: "begin publication cannot be classified as prior or next",
          },
          recoveryRequired: true,
          synchronization: Object.freeze({
            kind: "ReleaseFailed",
            failure: {
              code: "AdmissionUnsafe",
              phase: "fake-begin-release",
              message: "begin lease release could not be confirmed",
            },
          }),
        };
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({ ...request(fixture.alpha.ref, "targeted-release", first), destinations: [first, second] });

    expect(result.kind).toBe("MutatedUnsettled");
    expect(result.destinations.map((entry) => entry.kind)).toEqual(["MutatedUnsettled", "RejectedBeforeMutation"]);
    if (result.kind === "MutatedUnsettled") {
      expect(result.pendingCapsuleGeneration).toBe("fake-begin-unsettled");
      expect(result.synchronization).toMatchObject({
        kind: "ReleaseFailed",
        failure: { phase: "undo-release:AdmissionUnsafe" },
      });
      const firstResult = result.destinations[0];
      expect(firstResult?.kind).toBe("MutatedUnsettled");
      if (firstResult?.kind === "MutatedUnsettled") {
        expect(firstResult.failures.primary).toMatchObject({
          code: "UndoAdmissionFailed",
          message: "begin publication cannot be classified as prior or next",
        });
      }
    }
    expect(base.preflightCalls).toBe(1);
    expect(beginCalls).toBe(1);
    await expect(lstat(join(first, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(second, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves a rejected begin failure alongside its release failure", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "begin-rejected-release-failure");
    const base = new FakeUndoWriter();
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin() {
        return Object.freeze({
          kind: "Rejected",
          failure: {
            code: "StateBlocked",
            phase: "fake-begin",
            message: "prior applying state remains authoritative",
          },
          synchronization: Object.freeze({
            kind: "ReleaseFailed",
            failure: {
              code: "AdmissionUnsafe",
              phase: "fake-begin-release",
              message: "begin lease release could not be confirmed",
            },
          }),
        });
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "UndoAdmissionFailed",
        message: "prior applying state remains authoritative",
      },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { phase: "undo-release:AdmissionUnsafe" },
      },
    });
    await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps settled export truth when the terminal lease release fails", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "settled-release-failure");
    const base = new FakeUndoWriter();
    const releaseFailure = Object.freeze({
      code: "AdmissionUnsafe",
      phase: "fake-settle-release",
      message: "terminal lease release could not be confirmed",
    });
    let suspendCalls = 0;
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin(input) {
        const admitted = await base.begin(input);
        if (admitted.kind !== "Accepted") return admitted;
        const baseSession = admitted.session;
        const session: UndoApplyingSession = Object.freeze({
          stage: (stageInput: Parameters<UndoApplyingSession["stage"]>[0]) => baseSession.stage(stageInput),
          discardStaged: (discardInput: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
            baseSession.discardStaged(discardInput),
          markApplied: (markInput: Parameters<UndoApplyingSession["markApplied"]>[0]) =>
            baseSession.markApplied(markInput),
          async settle() {
            const lifecycle = await baseSession.settle();
            return Object.freeze({
              ...lifecycle,
              synchronization: Object.freeze({ kind: "ReleaseFailed" as const, failure: releaseFailure }),
            });
          },
          abort: () => baseSession.abort(),
          async suspend() {
            suspendCalls += 1;
            return Object.freeze({ kind: "Rejected" as const, failure: releaseFailure });
          },
        });
        return Object.freeze({ ...admitted, session });
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result).toMatchObject({
      kind: "MutatedSettled",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { phase: "undo-release:AdmissionUnsafe" },
      },
    });
    expect(suspendCalls).toBe(0);
    await expect(readFile(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8"))
      .resolves.toBe("alpha-v1\n");
  });

  it("does not suspend a second time when terminal settlement throws after finalization starts", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "settlement-exception");
    const base = new FakeUndoWriter();
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin(input) {
        const admitted = await base.begin(input);
        if (admitted.kind !== "Accepted") return admitted;
        const baseSession = admitted.session;
        const session: UndoApplyingSession = Object.freeze({
          stage: (stageInput: Parameters<UndoApplyingSession["stage"]>[0]) => baseSession.stage(stageInput),
          discardStaged: (discardInput: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
            baseSession.discardStaged(discardInput),
          markApplied: (markInput: Parameters<UndoApplyingSession["markApplied"]>[0]) =>
            baseSession.markApplied(markInput),
          async settle() {
            await baseSession.settle();
            throw new Error("injected post-settlement exception");
          },
          abort: () => baseSession.abort(),
          suspend: () => baseSession.suspend(),
        });
        return Object.freeze({ ...admitted, session });
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result).toMatchObject({
      kind: "MutatedUnsettled",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { phase: "undo-settle-release" },
      },
    });
    expect(base.settleCalls).toBe(1);
    expect(base.suspendCalls).toBe(0);
    expect(base.abortCalls).toBe(0);
    await expect(readFile(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8"))
      .resolves.toBe("alpha-v1\n");
  });

  it("keeps A and B in one pending aggregate when B becomes applied-unsettled, then blocks C", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "partial-a");
    const second = await destinationAt(root, "partial-b");
    const third = await destinationAt(root, "partial-c");
    await makeDirectoryChain(second, ["codex", "plugins", "alpha", "skills", "alpha"]);
    await makeDirectoryChain(join(second, "codex/plugins/alpha"), ["scripts"]);
    const base = new FakeUndoWriter();
    const destinationByHandle = new Map<string, string>();
    let wrapperSuspendCalls = 0;
    const undo: UndoWriter = {
      preflight: (input) => base.preflight(input),
      async begin(input) {
        const result = await base.begin(input);
        if (result.kind !== "Accepted") return result;
        result.admittedActions.forEach((entry, index) => {
          destinationByHandle.set(entry.actionHandle, input.actions[index]!.action.canonicalDestination);
        });
        const baseSession = result.session;
        const session: UndoApplyingSession = Object.freeze({
          stage: (stageInput: Parameters<UndoApplyingSession["stage"]>[0]) => baseSession.stage(stageInput),
          discardStaged: (discardInput: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
            baseSession.discardStaged(discardInput),
          async markApplied(markInput: Parameters<UndoApplyingSession["markApplied"]>[0]) {
            if (destinationByHandle.get(markInput.actionHandle) === second) {
              const suspended = await baseSession.suspend();
              return Object.freeze({
                kind: "Unsettled",
                generation: "fake-b-applied-unsettled",
                failure: {
                  code: "StatePublicationFailed",
                  phase: "fake-mark",
                  message: "post-publication verification is uncertain",
                },
                recoveryRequired: true,
                synchronization: Object.freeze({
                  kind: "ReleaseFailed" as const,
                  failure: {
                    code: "AdmissionUnsafe",
                    phase: "fake-mark-release",
                    message: suspended.kind === "Released"
                      ? "injected nonterminal release diagnostic"
                      : suspended.failure.message,
                  },
                }),
              });
            }
            return baseSession.markApplied(markInput);
          },
          settle: () => baseSession.settle(),
          abort: () => baseSession.abort(),
          suspend: () => {
            wrapperSuspendCalls += 1;
            return baseSession.suspend();
          },
        });
        return Object.freeze({ ...result, session });
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
    }).exports.apply({
      ...request(fixture.alpha.ref, "targeted-release", first),
      destinations: [first, second, third],
    });

    expect(result.kind).toBe("MutatedUnsettled");
    expect(result.destinations.map((entry) => entry.kind)).toEqual([
      "MutatedSettled",
      "MutatedUnsettled",
      "RejectedBeforeMutation",
    ]);
    if (result.kind === "MutatedUnsettled") {
      expect(result.pendingCapsuleGeneration).toBe("fake-b-applied-unsettled");
      expect(result.synchronization).toMatchObject({
        kind: "ReleaseFailed",
        failure: { phase: "undo-release:AdmissionUnsafe" },
      });
    }
    expect(base.preflightCalls).toBe(1);
    expect(base.beginCalls).toBe(1);
    expect(base.settleCalls).toBe(0);
    expect(wrapperSuspendCalls).toBe(0);
    expect(await readFile(join(first, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8")).toBe("alpha-v1\n");
    const secondResult = result.destinations[1];
    expect(secondResult?.kind).toBe("MutatedUnsettled");
    if (secondResult?.kind === "MutatedUnsettled") {
      expect(secondResult.applied).toHaveLength(1);
      expect(secondResult.applied[0]).toMatchObject({ mutation: "WritePayload" });
      expect((await lstat(join(second, secondResult.applied[0]!.relativePath))).isFile()).toBe(true);
    }
    await expect(lstat(join(second, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(third, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["after-create-failpoint", "during-observed-binding"] as const)(
    "does not settle or claim an operation-created directory replaced %s",
    async (boundary) => {
      const fixture = exportArtifactFixture();
      const artifacts = new FakeArtifactReader();
      artifacts.add(fixture.alpha);
      const destination = await destinationAt(root, `directory-identity-${boundary}`);
      const base = new FakeUndoWriter();
      let operationInode: bigint | undefined;
      let foreignInode: bigint | undefined;
      const replaceCreatedDirectory = async (): Promise<void> => {
        if (foreignInode !== undefined) return;
        const path = join(destination, "codex");
        operationInode = (await lstat(path, { bigint: true })).ino;
        await rename(path, join(destination, "codex-operation-created"));
        await mkdir(path, { mode: 0o755 });
        foreignInode = (await lstat(path, { bigint: true })).ino;
      };
      let undoWriter: UndoWriter = base;
      let failpoints: ExportFailpoints | undefined;
      if (boundary === "after-create-failpoint") {
        failpoints = {
          async hit(point, context) {
            if (point === "AfterDirectoriesCreated" && context.relativePath === "codex") {
              await replaceCreatedDirectory();
            }
          },
        };
      } else {
        const actionByHandle = new Map<string, Readonly<{ mutation: string; relativePath: string }>>();
        undoWriter = {
          preflight: (input) => base.preflight(input),
          async begin(input) {
            const admitted = await base.begin(input);
            if (admitted.kind !== "Accepted") return admitted;
            admitted.admittedActions.forEach((entry, index) => {
              const action = input.actions[index]!.action;
              actionByHandle.set(entry.actionHandle, action);
            });
            const baseSession = admitted.session;
            const session: UndoApplyingSession = Object.freeze({
              stage: (stageInput: Parameters<UndoApplyingSession["stage"]>[0]) => baseSession.stage(stageInput),
              discardStaged: (discardInput: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
                baseSession.discardStaged(discardInput),
              async markApplied(markInput: Parameters<UndoApplyingSession["markApplied"]>[0]) {
                const action = actionByHandle.get(markInput.actionHandle);
                if (action?.mutation === "create-directory" && action.relativePath === "codex") {
                  await replaceCreatedDirectory();
                }
                return baseSession.markApplied(markInput);
              },
              settle: () => baseSession.settle(),
              abort: () => baseSession.abort(),
              suspend: () => baseSession.suspend(),
            });
            return Object.freeze({ ...admitted, session });
          },
        };
      }

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter,
        ...(failpoints === undefined ? {} : { failpoints }),
      }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(foreignInode).not.toBe(operationInode);
      expect((await lstat(join(destination, "codex"), { bigint: true })).ino).toBe(foreignInode);
      expect(base.settleCalls).toBe(0);
      const destinationResult = result.destinations[0];
      expect(destinationResult?.kind).toBe("MutatedUnsettled");
      if (destinationResult?.kind === "MutatedUnsettled") {
        expect(destinationResult.applied.some((event) => (
          event.mutation === "CreateDirectory" && event.relativePath === "codex"
        ))).toBe(boundary === "during-observed-binding");
      }
      await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it.each(["BeforeFinalVerify", "BeforeLedgerCommit"] as const)(
    "does not settle or ledger-claim a foreign directory substituted at the late %s boundary",
    async (pointToReplace) => {
      const fixture = exportArtifactFixture();
      const artifacts = new FakeArtifactReader();
      artifacts.add(fixture.alpha);
      const destination = await destinationAt(root, `directory-late-identity-${pointToReplace}`);
      const undo = new FakeUndoWriter();
      const target = join(destination, "codex");
      let operationInode: bigint | undefined;
      let foreignInode: bigint | undefined;
      const failpoints: ExportFailpoints = {
        async hit(point) {
          if (point !== pointToReplace || foreignInode !== undefined) return;
          operationInode = (await lstat(target, { bigint: true })).ino;
          await rename(target, join(destination, `codex-operation-created-${pointToReplace}`));
          await mkdir(target, { mode: 0o755 });
          foreignInode = (await lstat(target, { bigint: true })).ino;
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: undo,
        failpoints,
      }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(foreignInode).not.toBe(operationInode);
      expect((await lstat(target, { bigint: true })).ino).toBe(foreignInode);
      expect(undo.settleCalls).toBe(0);
      await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("blocks hardlinked ledger authority without replacing either link", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "ledger-hardlink");
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
    });
    expect((await client.exports.apply(request(fixture.alpha.ref, "targeted-release", destination))).kind).toBe("MutatedSettled");
    const ledger = join(destination, EXPORT_LEDGER_FILENAME);
    const peer = join(root.path, "ledger-peer.json");
    await link(ledger, peer);
    const bytes = await readFile(peer);

    const result = await client.exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(result.kind).toBe("RejectedBeforeMutation");
    expect(await readFile(ledger)).toEqual(bytes);
    expect(await readFile(peer)).toEqual(bytes);
    expect((await lstat(ledger)).nlink).toBe(2);
  });

  it.each(["symlink", "hardlink"] as const)(
    "preserves a %s substituted for a captured managed payload before commit",
    async (substitution) => {
      const firstFixture = exportArtifactFixture();
      const secondFixture = exportArtifactFixture("alpha-substitution-v2\n");
      const artifacts = new FakeArtifactReader();
      artifacts.add(firstFixture.alpha);
      artifacts.add(secondFixture.alpha);
      const destination = await destinationAt(root, `payload-${substitution}`);
      const target = join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md");
      const foreign = join(root.path, `payload-${substitution}-foreign.txt`);
      await writeFile(foreign, "foreign-payload\n");
      const initial = createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
      });
      expect((await initial.exports.apply(request(firstFixture.alpha.ref, "targeted-release", destination))).kind)
        .toBe("MutatedSettled");
      let substituted = false;
      const failpoints: ExportFailpoints = {
        async hit(point) {
          if (point !== "AfterInverseStaged" || substituted) return;
          substituted = true;
          await unlink(target);
          if (substitution === "symlink") await symlink(foreign, target);
          else await link(foreign, target);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
        failpoints,
      }).exports.apply(request(secondFixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(await readFile(foreign, "utf8")).toBe("foreign-payload\n");
      const live = await lstat(target);
      if (substitution === "symlink") expect(live.isSymbolicLink()).toBe(true);
      else expect(live.nlink).toBe(2);
    },
  );

  it("blocks absent-target publication when its captured parent is moved and replaced by an outside alias", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "parent-alias-destination");
    await makeDirectoryChain(destination, ["codex", "plugins", "alpha", "skills", "alpha"]);
    await makeDirectoryChain(join(destination, "codex/plugins/alpha"), ["scripts"]);
    const outside = join(root.path, "outside-parent-alias");
    await mkdir(outside);
    let movedParent: string | undefined;
    let aliasedParent: string | undefined;
    let escapedTarget: string | undefined;
    let movedTemporary: string | undefined;
    const failpoints: ExportFailpoints = {
      async hit(point, context) {
        if (
          point !== "BeforePayloadCommit"
          || context.relativePath === undefined
          || context.temporaryPath === undefined
          || movedParent !== undefined
        ) return;
        const target = join(destination, context.relativePath);
        const parent = dirname(target);
        aliasedParent = parent;
        movedParent = join(outside, `moved-${basename(parent)}`);
        escapedTarget = join(movedParent, basename(target));
        movedTemporary = join(movedParent, basename(context.temporaryPath));
        await rename(parent, movedParent);
        await symlink(movedParent, parent);
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    expect(movedParent).toBeDefined();
    await expect(lstat(escapedTarget!)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await lstat(movedTemporary!)).isFile()).toBe(true);
    expect((await lstat(aliasedParent!)).isSymbolicLink()).toBe(true);
    await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["symlink", "hardlink"] as const)(
    "preserves a %s substituted for the private publication link at final unlink admission",
    async (substitution) => {
      const fixture = exportArtifactFixture();
      const artifacts = new FakeArtifactReader();
      artifacts.add(fixture.alpha);
      const destination = await destinationAt(root, `publication-finalize-${substitution}`);
      const foreign = join(root.path, `publication-finalize-${substitution}-foreign.txt`);
      await writeFile(foreign, "do-not-unlink\n");
      let temporaryPath: string | undefined;
      const failpoints: ExportFailpoints = {
        async hit(point, context) {
          if (point !== "BeforePublicationFinalize" || context.temporaryPath === undefined || temporaryPath !== undefined) return;
          temporaryPath = context.temporaryPath;
          await unlink(temporaryPath);
          if (substitution === "symlink") await symlink(foreign, temporaryPath);
          else await link(foreign, temporaryPath);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
        failpoints,
      }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(await readFile(foreign, "utf8")).toBe("do-not-unlink\n");
      expect(temporaryPath).toBeDefined();
      const live = await lstat(temporaryPath!);
      if (substitution === "symlink") expect(live.isSymbolicLink()).toBe(true);
      else expect(live.nlink).toBe(2);
      await expect(lstat(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("preserves a substituted private temporary at the cleanup unlink boundary", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "temporary-cleanup-boundary");
    const foreign = join(root.path, "temporary-cleanup-boundary-foreign.txt");
    await writeFile(foreign, "do-not-clean\n");
    let temporaryPath: string | undefined;
    const failpoints: ExportFailpoints = {
      async hit(point, context) {
        if (point === "BeforePayloadCommit") throw new Error("force guarded cleanup");
        if (point !== "BeforeTemporaryCleanup" || context.temporaryPath === undefined || temporaryPath !== undefined) return;
        temporaryPath = context.temporaryPath;
        await unlink(temporaryPath);
        await symlink(foreign, temporaryPath);
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    expect(temporaryPath).toBeDefined();
    expect((await lstat(temporaryPath!)).isSymbolicLink()).toBe(true);
    expect(await readFile(foreign, "utf8")).toBe("do-not-clean\n");
    await expect(lstat(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["symlink", "hardlink"] as const)(
    "preserves a %s substituted for a ledger-owned orphan before retirement",
    async (substitution) => {
      const initialFixture = exportArtifactFixture();
      const nextFixture = alphaOnlyArtifactFixture("alpha-v1\n");
      const artifacts = new FakeArtifactReader();
      artifacts.add(initialFixture.complete);
      artifacts.add(nextFixture.complete);
      const destination = await destinationAt(root, `orphan-${substitution}`);
      const initial = createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
      });
      expect((await initial.exports.apply(request(initialFixture.complete.ref, "complete-set", destination))).kind)
        .toBe("MutatedSettled");
      const foreign = join(root.path, `orphan-${substitution}-foreign.txt`);
      await writeFile(foreign, "foreign-orphan\n");
      let target: string | undefined;
      const failpoints: ExportFailpoints = {
        async hit(point, context) {
          if (point !== "BeforeRetirement" || target !== undefined || context.relativePath === undefined) return;
          target = join(destination, context.relativePath);
          await unlink(target);
          if (substitution === "symlink") await symlink(foreign, target);
          else await link(foreign, target);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
        failpoints,
      }).exports.apply(request(nextFixture.complete.ref, "complete-set", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(target).toBeDefined();
      expect(await readFile(foreign, "utf8")).toBe("foreign-orphan\n");
      const live = await lstat(target!);
      if (substitution === "symlink") expect(live.isSymbolicLink()).toBe(true);
      else expect(live.nlink).toBe(2);
    },
  );

  it.each(["nonempty", "symlink"] as const)(
    "preserves a recorded directory that becomes %s before exact nonrecursive retirement",
    async (substitution) => {
      const initialFixture = exportArtifactFixture();
      const nextFixture = alphaOnlyArtifactFixture("alpha-v1\n");
      const artifacts = new FakeArtifactReader();
      artifacts.add(initialFixture.complete);
      artifacts.add(nextFixture.complete);
      const destination = await destinationAt(root, `directory-${substitution}`);
      const client = createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
      });
      expect((await client.exports.apply(request(initialFixture.complete.ref, "complete-set", destination))).kind)
        .toBe("MutatedSettled");
      const directory = join(destination, "codex/plugins/beta/skills/beta");
      const preserved = join(directory, "preserved.txt");
      const foreignDirectory = join(root.path, `directory-${substitution}-foreign`);
      let changed = false;
      const failpoints: ExportFailpoints = {
        async hit(point, context) {
          if (
            point !== "BeforeDirectoryRetirement"
            || context.relativePath !== "codex/plugins/beta/skills/beta"
            || changed
          ) return;
          changed = true;
          if (substitution === "nonempty") {
            await writeFile(preserved, "preserve-directory\n");
            return;
          }
          const savedDirectory = join(root.path, "recorded-directory-saved");
          await mkdir(foreignDirectory);
          await writeFile(join(foreignDirectory, "foreign.txt"), "foreign-directory\n");
          await rename(directory, savedDirectory);
          await symlink(foreignDirectory, directory);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: new FakeUndoWriter(),
        failpoints,
      }).exports.apply(request(nextFixture.complete.ref, "complete-set", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(changed).toBe(true);
      if (substitution === "nonempty") {
        expect(await readFile(preserved, "utf8")).toBe("preserve-directory\n");
      } else {
        expect((await lstat(directory)).isSymbolicLink()).toBe(true);
        expect(await readFile(join(foreignDirectory, "foreign.txt"), "utf8")).toBe("foreign-directory\n");
      }
      const ledger = verifyExportLedgerBytes(
        new Uint8Array(await readFile(join(destination, EXPORT_LEDGER_FILENAME))),
        destination,
      );
      expect(ledger.ok && ledger.ledger.body.scopes.map((scope) => scope.pluginId)).toEqual(["alpha", "beta"]);
    },
  );

  it("rejects a stale ledger generation before applying the staged payload action", async () => {
    const firstFixture = exportArtifactFixture();
    const secondFixture = exportArtifactFixture("alpha-race-winner\n");
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstFixture.alpha);
    artifacts.add(secondFixture.alpha);
    const destination = await destinationAt(root, "generation-race");
    const initialUndo = new FakeUndoWriter();
    const initialClient = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: initialUndo,
    });
    expect((await initialClient.exports.apply(request(firstFixture.alpha.ref, "targeted-release", destination))).kind).toBe("MutatedSettled");
    const ledgerPath = join(destination, EXPORT_LEDGER_FILENAME);
    let raced = false;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point !== "AfterInverseStaged" || raced) return;
        raced = true;
        const replacement = join(destination, ".external-ledger-replacement.json");
        await writeFile(replacement, await readFile(ledgerPath), { mode: 0o644 });
        await rename(replacement, ledgerPath);
      },
    };
    const raceUndo = new FakeUndoWriter();
    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: raceUndo,
      failpoints,
    }).exports.apply(request(secondFixture.alpha.ref, "targeted-release", destination));
    expect(result.kind).toBe("RejectedBeforeMutation");
    expect(await readFile(join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"), "utf8")).toBe("alpha-v1\n");
    expect(raceUndo.markCalls).toBe(0);
    expect(raceUndo.abortCalls).toBe(1);
    expect(raceUndo.suspendCalls).toBe(0);
  });

  it("leaves the prior ledger generation in place when its publication identity changes at commit", async () => {
    const firstFixture = exportArtifactFixture();
    const secondFixture = exportArtifactFixture("alpha-ledger-race-v2\n");
    const artifacts = new FakeArtifactReader();
    artifacts.add(firstFixture.alpha);
    artifacts.add(secondFixture.alpha);
    const destination = await destinationAt(root, "ledger-publication-race");
    const initial = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
    });
    expect((await initial.exports.apply(request(firstFixture.alpha.ref, "targeted-release", destination))).kind)
      .toBe("MutatedSettled");
    const ledgerPath = join(destination, EXPORT_LEDGER_FILENAME);
    const priorBytes = await readFile(ledgerPath);
    const priorIdentity = await lstat(ledgerPath, { bigint: true });
    let raced = false;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point !== "BeforeLedgerCommit" || raced) return;
        raced = true;
        const replacement = join(destination, ".ledger-race-replacement.json");
        await writeFile(replacement, priorBytes, { mode: 0o644 });
        await rename(replacement, ledgerPath);
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(secondFixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    expect(await readFile(ledgerPath)).toEqual(priorBytes);
    expect((await lstat(ledgerPath, { bigint: true })).ino).not.toBe(priorIdentity.ino);
  });

  it.each(["AfterPayloadCommit", "BeforePayloadVerify"] as const)(
    "does not mark or claim a same-content foreign payload inode substituted at %s",
    async (pointToReplace) => {
      const fixture = exportArtifactFixture();
      const artifacts = new FakeArtifactReader();
      artifacts.add(fixture.alpha);
      const destination = await destinationAt(root, `payload-inode-${pointToReplace}`);
      const undo = new FakeUndoWriter();
      let target: string | undefined;
      let replacedRelativePath: string | undefined;
      let publishedInode: bigint | undefined;
      let foreignInode: bigint | undefined;
      let markCallsAtReplacement: number | undefined;
      const failpoints: ExportFailpoints = {
        async hit(point, context) {
          if (point !== pointToReplace || target !== undefined || context.relativePath === undefined) return;
          replacedRelativePath = context.relativePath;
          target = join(destination, context.relativePath);
          const bytes = await readFile(target);
          const published = await lstat(target, { bigint: true });
          const replacement = join(dirname(target), `.same-content-foreign-${pointToReplace}`);
          await writeFile(replacement, bytes, { mode: Number(published.mode & 0o777n) });
          const foreign = await lstat(replacement, { bigint: true });
          publishedInode = published.ino;
          foreignInode = foreign.ino;
          markCallsAtReplacement = undo.markCalls;
          await rename(replacement, target);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: undo,
        failpoints,
      }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(target).toBeDefined();
      expect(foreignInode).not.toBe(publishedInode);
      expect((await lstat(target!, { bigint: true })).ino).toBe(foreignInode);
      expect(undo.markCalls).toBe(markCallsAtReplacement);
      const destinationResult = result.destinations[0];
      expect(destinationResult?.kind).toBe("MutatedUnsettled");
      if (destinationResult?.kind === "MutatedUnsettled") {
        expect(destinationResult.applied.some((event) => event.relativePath === replacedRelativePath)).toBe(false);
      }
    },
  );

  it.each(["BeforeFinalVerify", "BeforeLedgerCommit"] as const)(
    "does not settle or ledger-claim a same-content foreign payload substituted at %s",
    async (pointToReplace) => {
      const fixture = exportArtifactFixture();
      const artifacts = new FakeArtifactReader();
      artifacts.add(fixture.alpha);
      const destination = await destinationAt(root, `payload-final-identity-${pointToReplace}`);
      const undo = new FakeUndoWriter();
      const target = join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md");
      let operationInode: bigint | undefined;
      let foreignInode: bigint | undefined;
      const failpoints: ExportFailpoints = {
        async hit(point) {
          if (point !== pointToReplace || foreignInode !== undefined) return;
          const bytes = await readFile(target);
          const operation = await lstat(target, { bigint: true });
          const replacement = join(dirname(target), `.same-content-final-${pointToReplace}`);
          await writeFile(replacement, bytes, { mode: Number(operation.mode & 0o777n) });
          const foreign = await lstat(replacement, { bigint: true });
          operationInode = operation.ino;
          foreignInode = foreign.ino;
          await rename(replacement, target);
        },
      };

      const result = await createExportTestClient({
        artifactReader: artifacts,
        knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
        undoWriter: undo,
        failpoints,
      }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

      expect(result.kind).toBe("MutatedUnsettled");
      expect(foreignInode).not.toBe(operationInode);
      expect((await lstat(target, { bigint: true })).ino).toBe(foreignInode);
      expect(undo.settleCalls).toBe(0);
      await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("does not mark or claim a same-content foreign ledger inode substituted after ledger commit", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "ledger-inode-after-commit");
    const undo = new FakeUndoWriter();
    let foreignInode: bigint | undefined;
    let publishedInode: bigint | undefined;
    let markCallsAtReplacement: number | undefined;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point !== "AfterLedgerCommit" || foreignInode !== undefined) return;
        const ledgerPath = join(destination, EXPORT_LEDGER_FILENAME);
        const bytes = await readFile(ledgerPath);
        const published = await lstat(ledgerPath, { bigint: true });
        const replacement = join(destination, ".same-content-foreign-ledger.json");
        await writeFile(replacement, bytes, { mode: Number(published.mode & 0o777n) });
        const foreign = await lstat(replacement, { bigint: true });
        publishedInode = published.ino;
        foreignInode = foreign.ino;
        markCallsAtReplacement = undo.markCalls;
        await rename(replacement, ledgerPath);
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: undo,
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    expect(foreignInode).not.toBe(publishedInode);
    expect((await lstat(join(destination, EXPORT_LEDGER_FILENAME), { bigint: true })).ino).toBe(foreignInode);
    expect(undo.markCalls).toBe(markCallsAtReplacement);
    const destinationResult = result.destinations[0];
    if (destinationResult?.kind === "MutatedUnsettled") {
      expect(destinationResult.applied.some((event) => event.mutation === "WriteLedger")).toBe(false);
    }
  });

  it("reports a committed next ledger as applied when post-publication verification fails", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "ledger-post-publication");
    let failed = false;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point === "AfterLedgerCommit" && !failed) {
          failed = true;
          throw new Error("generated ledger post-publication failure");
        }
      },
    };

    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    const destinationResult = result.destinations[0];
    expect(destinationResult?.kind).toBe("MutatedUnsettled");
    if (destinationResult?.kind === "MutatedUnsettled") {
      expect(destinationResult.applied.at(-1)).toMatchObject({ mutation: "WriteLedger" });
    }
    const ledger = verifyExportLedgerBytes(
      new Uint8Array(await readFile(join(destination, EXPORT_LEDGER_FILENAME))),
      destination,
    );
    expect(ledger.ok && ledger.ledger.body.scopes.map((scope) => scope.pluginId)).toEqual(["alpha"]);
  });

  it("reports a definitely committed payload in the unsettled applied sequence while leaving the ledger prior", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "post-commit-failure");
    await makeDirectoryChain(destination, ["codex", "plugins", "alpha", "scripts"]);
    await makeDirectoryChain(join(destination, "codex/plugins/alpha"), ["skills", "alpha"]);
    let failed = false;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point === "AfterPayloadCommit" && !failed) {
          failed = true;
          throw new Error("generated post-commit failure");
        }
      },
    };
    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));
    expect(result.kind).toBe("MutatedUnsettled");
    const destinationResult = result.destinations[0];
    expect(destinationResult?.kind).toBe("MutatedUnsettled");
    if (destinationResult?.kind === "MutatedUnsettled") {
      expect(destinationResult.applied).toHaveLength(1);
      expect(destinationResult.applied[0]).toMatchObject({ mutation: "WritePayload" });
    }
    await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves and reports a substituted private temporary without following its alias", async () => {
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "temp-substitution");
    const foreign = join(root.path, "foreign.txt");
    await writeFile(foreign, "do-not-touch\n");
    let substitutedPath: string | undefined;
    const failpoints: ExportFailpoints = {
      async hit(point, context) {
        if (point !== "AfterTemporaryCreated" || context.temporaryPath === undefined || substitutedPath !== undefined) return;
        substitutedPath = context.temporaryPath;
        await unlink(context.temporaryPath);
        await symlink(foreign, context.temporaryPath);
      },
    };
    const result = await createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: new FakeUndoWriter(),
      failpoints,
    }).exports.apply(request(fixture.alpha.ref, "targeted-release", destination));

    expect(result.kind).toBe("MutatedUnsettled");
    expect(await readFile(foreign, "utf8")).toBe("do-not-touch\n");
    expect(substitutedPath).toBeDefined();
    expect((await lstat(substitutedPath!)).isSymbolicLink()).toBe(true);
    await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

function request(
  artifactRef: ExportAgentPluginsRequest["artifactRef"],
  mode: ExportAgentPluginsRequest["mode"],
  destination: string,
): ExportAgentPluginsRequest {
  return {
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    artifactRef,
    mode,
    layout: "codex-v1",
    destinations: [destination],
    overwritePolicy: "managed-only",
  };
}

async function destinationAt(root: OwnedFixtureRoot, name: string): Promise<string> {
  const destination = join(root.path, name);
  await mkdir(destination);
  return destination;
}

async function makeDirectoryChain(root: string, segments: readonly string[]): Promise<void> {
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    await mkdir(current);
  }
}

async function verifiedLedger(destination: string) {
  const verified = verifyExportLedgerBytes(
    new Uint8Array(await readFile(join(destination, EXPORT_LEDGER_FILENAME))),
    destination,
  );
  expect(verified.ok).toBe(true);
  if (!verified.ok) throw new Error(verified.message);
  return verified.ledger;
}

async function fileIdentityAndMetadata(path: string): Promise<readonly bigint[]> {
  const status = await lstat(path, { bigint: true });
  return Object.freeze([
    status.dev,
    status.ino,
    status.mode,
    status.nlink,
    status.size,
    status.mtimeNs,
    status.ctimeNs,
  ]);
}

interface DestinationTreeEntry {
  readonly relativePath: string;
  readonly kind: "directory" | "file" | "other";
  readonly identityAndMetadata: readonly bigint[];
  readonly bytes?: Uint8Array;
}

async function snapshotDestinationTree(root: string): Promise<readonly DestinationTreeEntry[]> {
  const entries: DestinationTreeEntry[] = [];
  await walk(root, ".");
  return Object.freeze(entries);

  async function walk(path: string, relativePath: string): Promise<void> {
    const status = await lstat(path, { bigint: true });
    const kind = status.isDirectory() ? "directory" : status.isFile() ? "file" : "other";
    entries.push(Object.freeze({
      relativePath,
      kind,
      identityAndMetadata: await fileIdentityAndMetadata(path),
      ...(kind === "file" ? { bytes: new Uint8Array(await readFile(path)) } : {}),
    }));
    if (kind !== "directory") return;
    for (const name of (await readdir(path)).sort()) {
      await walk(join(path, name), relativePath === "." ? name : `${relativePath}/${name}`);
    }
  }
}
