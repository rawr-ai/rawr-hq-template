import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  createResourceArtifactReader,
  createResourceArtifactStore,
} from "../src/service/repository/artifact-repository";
import {
  createResourceMechanicalEvidenceReader,
  createResourceMechanicalEvidenceStore,
} from "../src/service/repository/mechanical-evidence";
import {
  createMechanicalEvidenceHandle,
  parseMechanicalEvidenceHandle,
} from "../src/service/shared/release";
import { packagingArtifactFixture } from "./modules/packaging/artifact-fixture";
import { MemoryArtifactRepository } from "./support/artifact-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./support/owned-fixture-root";

describe("agent-plugin lifecycle resource adapters", () => {
  let fixtureRoot: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixtureRoot !== undefined) await disposeOwnedFixtureRoot(fixtureRoot);
    fixtureRoot = undefined;
  });

  it.runIf("Bun" in globalThis)(
    "publishes and verifies exact release and complete-set trees through the generic repository",
    async () => {
      const setup = await outputSetup();
      const first = await setup.store.publishRelease(setup.fixture.alphaRelease);
      expect(first).toMatchObject({ kind: "Published", ref: setup.fixture.alphaSnapshot.ref });
      const repeated = await setup.store.publishRelease(setup.fixture.alphaRelease);
      expect(repeated).toMatchObject({
        kind: "ReadOnlyConverged",
        ref: setup.fixture.alphaSnapshot.ref,
      });
      await setup.store.publishRelease(setup.fixture.betaRelease);
      await expect(setup.store.publishReleaseSet(setup.fixture.releaseSet)).resolves.toMatchObject({
        kind: "Published",
        ref: setup.fixture.setSnapshot.ref,
      });

      const verified = await setup.reader.read(setup.fixture.setSnapshot.ref);
      expect(verified).toMatchObject({
        kind: "Verified",
        snapshot: { kind: "complete-set", members: [{}, {}] },
      });
      if (verified.kind !== "Verified" || verified.snapshot.kind !== "complete-set") return;
      verified.snapshot.members[0]?.files[0]?.bytes.fill(0);
      await expect(setup.reader.read(setup.fixture.setSnapshot.ref)).resolves.toMatchObject({
        kind: "Verified",
        snapshot: { kind: "complete-set" },
      });
    }
  );

  it.runIf("Bun" in globalThis)(
    "rejects an unexpected empty artifact directory instead of accepting byte-only convergence",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      setup.repository.addDirectory(setup.fixture.alphaRelease.artifactDigest, "unexpected-empty");

      await expect(setup.reader.read(setup.fixture.alphaSnapshot.ref)).resolves.toMatchObject({
        kind: "Mismatch",
        issues: [{ code: "UnexpectedEntry", detail: expect.stringContaining("unexpected-empty") }],
      });
      await expect(setup.store.publishRelease(setup.fixture.alphaRelease)).resolves.toMatchObject({
        kind: "Rejected",
        failure: expect.stringContaining("present"),
      });
    }
  );

  it.runIf("Bun" in globalThis)(
    "classifies a post-publication artifact failure as visible but unsettled",
    async () => {
      const setup = await outputSetup();
      const result = await setup.store.publishRelease(setup.fixture.alphaRelease, {
        failpoint(event) {
          if (event.kind === "AfterNoReplacePublication")
            throw new Error("post-commit fixture failure");
        },
      });

      expect(result).toMatchObject({
        kind: "Unsettled",
        observation: "Verified",
        failure: expect.stringContaining("post-commit fixture failure"),
      });
      await expect(setup.reader.read(setup.fixture.alphaSnapshot.ref)).resolves.toMatchObject({
        kind: "Verified",
      });
    }
  );

  it.runIf("Bun" in globalThis)(
    "does not call a merely present post-publication artifact verified",
    async () => {
      const setup = await outputSetup();
      const result = await setup.store.publishRelease(setup.fixture.alphaRelease, {
        async failpoint(event) {
          if (event.kind !== "AfterNoReplacePublication") return;
          setup.repository.replaceEntry(
            setup.fixture.alphaRelease.artifactDigest,
            "release.json",
            new TextEncoder().encode("{}\n")
          );
          throw new Error("post-commit artifact changed");
        },
      });

      expect(result).toMatchObject({
        kind: "Unsettled",
        observation: "Mismatch",
        failure: expect.stringContaining("post-commit artifact changed"),
      });
    }
  );

  it("publishes evidence through the generic repository and converges by service handle", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode('{"schemaVersion":1,"verified":true}\n');
    const handle = createMechanicalEvidenceHandle(bytes);

    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "Published",
      handle,
    });
    const read = await setup.reader.read(handle);
    expect(read).toEqual({ kind: "Verified", handle, bytes });
    if (read.kind === "Verified") read.bytes.fill(0);
    await expect(setup.reader.read(handle)).resolves.toEqual({ kind: "Verified", handle, bytes });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "ReadOnlyConverged",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(1);
    expect(setup.repository.lastEvidenceAddress).toEqual({
      repositoryRoot: setup.root,
      namespace: ["mechanical-evidence", "sha256"],
      objectId: handle.digest,
    });
  });

  it("rejects digest violations before resource publication", async () => {
    const setup = await evidenceSetup();
    const expected = new TextEncoder().encode("expected\n");
    const handle = createMechanicalEvidenceHandle(expected);

    await expect(
      setup.store.publish(handle, new TextEncoder().encode("different\n"))
    ).resolves.toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("do not match"),
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(0);
  });

  it("rejects closed evidence handles before resource access", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("closed handle\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    const closedHandle = { ...handle, extra: true };

    expect(parseMechanicalEvidenceHandle(closedHandle)).toMatchObject({
      ok: false,
      issue: { code: "InvalidHandle" },
    });
    await expect(setup.reader.read(closedHandle)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "InvalidHandle" }],
    });
    await expect(setup.store.publish(closedHandle, bytes)).resolves.toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("closed object"),
    });
    expect(setup.repository.readEvidenceCalls).toBe(0);
    expect(setup.repository.publishedEvidenceCalls).toBe(0);
  });

  it("refuses to repair tampered evidence at an occupied digest address", async () => {
    const setup = await evidenceSetup();
    const canonicalBytes = new TextEncoder().encode("canonical evidence\n");
    const handle = createMechanicalEvidenceHandle(canonicalBytes);
    await expect(setup.store.publish(handle, canonicalBytes)).resolves.toEqual({
      kind: "Published",
      handle,
    });

    setup.repository.replaceEntry(
      handle.digest,
      "evidence.json",
      new TextEncoder().encode("tampered evidence\n")
    );

    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Mismatch", handle });
    await expect(setup.store.publish(handle, canonicalBytes)).resolves.toMatchObject({
      kind: "Rejected",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(1);
    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Mismatch", handle });
  });

  it("retries the exact evidence handle after pre-publication rejection", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("retryable evidence\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    setup.repository.rejectNextEvidencePublication("injected publication outage");

    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "Rejected",
      handle,
      failure: "injected publication outage",
    });
    await expect(setup.reader.read(handle)).resolves.toEqual({ kind: "Missing", handle });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "Published",
      handle,
    });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "ReadOnlyConverged",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(2);
  });

  it("preserves a post-publication failure as verified but unsettled evidence", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("stable mechanical evidence\n");
    const handle = createMechanicalEvidenceHandle(bytes);

    const result = await setup.store.publish(handle, bytes, {
      failpoint(event) {
        if (event.kind === "AfterNoReplacePublication") {
          throw new Error("post-publication evidence fixture failure");
        }
      },
    });

    expect(result).toMatchObject({
      kind: "Unsettled",
      observation: "Verified",
      failure: expect.stringContaining("post-publication evidence fixture failure"),
    });
    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Verified", handle });
  });

  async function outputSetup() {
    fixtureRoot = await createOwnedFixtureRoot();
    const artifactRoot = join(fixtureRoot.path, "artifacts-v1");
    const repository = new MemoryArtifactRepository();
    const binding = { repositoryRoot: artifactRoot, repository };
    return Object.freeze({
      fixture: packagingArtifactFixture(),
      artifactRoot,
      repository,
      store: createResourceArtifactStore(binding),
      reader: createResourceArtifactReader(binding),
    });
  }

  async function evidenceSetup() {
    fixtureRoot = await createOwnedFixtureRoot();
    const root = join(fixtureRoot.path, "artifacts-v1");
    const repository = new MemoryArtifactRepository();
    const binding = { repositoryRoot: root, repository };
    return Object.freeze({
      root,
      repository,
      store: createResourceMechanicalEvidenceStore(binding),
      reader: createResourceMechanicalEvidenceReader(binding),
    });
  }
});
