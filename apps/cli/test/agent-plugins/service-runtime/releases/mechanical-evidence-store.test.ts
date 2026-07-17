import { chmod, lstat, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createFilesystemMechanicalEvidenceStore,
  createMechanicalEvidenceHandle,
  parseMechanicalEvidenceHandle,
  type ArtifactStoreRoot,
  type NoReplacePublisher,
} from "../../../../src/lib/agent-plugins/service-runtime/releases";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

describe("opaque mechanical evidence artifact store", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("publishes once, verifies bytes, and converges without another publication", async () => {
    fixture = await createOwnedFixtureRoot();
    let publicationCalls = 0;
    const store = createFilesystemMechanicalEvidenceStore({
      artifactStoreRoot: join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot,
      noReplacePublisher: renamingPublisher(() => {
        publicationCalls += 1;
      }),
    });
    const bytes = new TextEncoder().encode('{"schemaVersion":1,"verified":true}\n');
    const handle = createMechanicalEvidenceHandle(bytes);

    await expect(store.publish(handle, bytes)).resolves.toEqual({ kind: "Published", handle });
    await expect(store.read(handle)).resolves.toEqual({ kind: "Verified", handle, bytes });
    await expect(store.publish(handle, bytes)).resolves.toEqual({ kind: "ReadOnlyConverged", handle });
    expect(publicationCalls).toBe(1);
  });

  it("rejects closed-handle violations and digest mismatches before creating state", async () => {
    fixture = await createOwnedFixtureRoot();
    let publicationCalls = 0;
    const artifactStoreRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
    const store = createFilesystemMechanicalEvidenceStore({
      artifactStoreRoot,
      noReplacePublisher: renamingPublisher(() => {
        publicationCalls += 1;
      }),
    });
    const expected = new TextEncoder().encode("expected\n");
    const other = new TextEncoder().encode("other\n");
    const handle = createMechanicalEvidenceHandle(expected);

    await expect(store.publish(handle, other)).resolves.toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("do not match"),
    });
    expect(publicationCalls).toBe(0);
    await expect(lstat(artifactStoreRoot)).rejects.toMatchObject({ code: "ENOENT" });
    expect(parseMechanicalEvidenceHandle({ ...handle, extra: true })).toMatchObject({ ok: false });
  });

  it("fails closed on tampered evidence and never repairs the digest path", async () => {
    fixture = await createOwnedFixtureRoot();
    const artifactStoreRoot = join(fixture.path, "artifacts-v1") as ArtifactStoreRoot;
    const store = createFilesystemMechanicalEvidenceStore({
      artifactStoreRoot,
      noReplacePublisher: renamingPublisher(),
    });
    const bytes = new TextEncoder().encode("canonical evidence\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    await expect(store.publish(handle, bytes)).resolves.toMatchObject({ kind: "Published" });

    const evidencePath = join(
      artifactStoreRoot,
      "mechanical-evidence",
      "sha256",
      handle.digest,
      "evidence.json",
    );
    await chmod(evidencePath, 0o644);
    await writeFile(evidencePath, "tampered\n");

    await expect(store.read(handle)).resolves.toMatchObject({ kind: "Mismatch" });
    await expect(store.publish(handle, bytes)).resolves.toMatchObject({ kind: "Rejected" });
    expect(await readdir(join(artifactStoreRoot, "mechanical-evidence", "sha256"))).toEqual([handle.digest]);
  });

  it("keeps publication failure independent and retries the exact handle", async () => {
    fixture = await createOwnedFixtureRoot();
    const artifactStoreRoot = join(fixture.path, "artifacts-v1") as ArtifactStoreRoot;
    const bytes = new TextEncoder().encode("stable final verification facts\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    const blocked = createFilesystemMechanicalEvidenceStore({
      artifactStoreRoot,
      noReplacePublisher: {
        async publish() {
          return { kind: "Unsupported", reason: "injected publication outage" };
        },
      },
    });
    await expect(blocked.publish(handle, bytes)).resolves.toMatchObject({
      kind: "Rejected",
      handle,
      failure: "injected publication outage",
    });

    const retry = createFilesystemMechanicalEvidenceStore({
      artifactStoreRoot,
      noReplacePublisher: renamingPublisher(),
    });
    await expect(retry.publish(handle, bytes)).resolves.toEqual({ kind: "Published", handle });
    await expect(retry.publish(handle, bytes)).resolves.toEqual({ kind: "ReadOnlyConverged", handle });
  });
});

function renamingPublisher(onPublish: () => void = () => undefined): NoReplacePublisher {
  return {
    async publish(publication) {
      onPublish();
      try {
        await lstat(publication.destinationPath);
        return { kind: "Occupied" };
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
      await rename(publication.sourcePath, publication.destinationPath);
      return { kind: "Published" };
    },
  };
}
