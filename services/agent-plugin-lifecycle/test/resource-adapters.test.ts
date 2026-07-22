import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";

import type { AgentPluginPackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import { coworkV1PackageDigest } from "../src/service/modules/packaging/model/helpers/cowork-v1";
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
import { createLifecycleTestClient, testInvocation } from "./support/client";
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

  it.runIf("Bun" in globalThis)(
    "packages verified artifact bytes and converges without rewriting the canonical output",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const application = createPackageAgentPluginApplication({
        artifactRepository: setup.repository,
        artifactRepositoryRoot: setup.artifactRoot,
      });
      const outputPath = join(setup.root, "alpha.cowork.zip");
      const request = {
        artifactRef: setup.fixture.alphaSnapshot.ref,
        format: "cowork-v1",
        outputPath,
      };

      const first = await application.package(request);
      expect(first).toMatchObject({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
      if (first.kind !== "OutputReplacedVerified") return;
      expect(first.packageDigest).toBe(coworkV1PackageDigest(await readFile(outputPath)));
      expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
      const before = await lstat(outputPath, { bigint: true });

      await expect(application.package(request)).resolves.toMatchObject({
        kind: "ReadOnlyConverged",
        packageDigest: first.packageDigest,
      });
      const after = await lstat(outputPath, { bigint: true });
      expect({ ino: after.ino, mtimeNs: after.mtimeNs }).toEqual({
        ino: before.ino,
        mtimeNs: before.mtimeNs,
      });
    }
  );

  it.runIf("Bun" in globalThis)(
    "maps a provider failpoint to a closed pre-mutation package refusal",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const packageOutput = makeNodePackageOutputAsyncPort({
        failpoints: {
          async hit(point) {
            if (point === "BeforeCommit") throw new Error("package commit refused");
          },
        },
      });
      const result = await createPackageAgentPluginApplication({
        artifactRepository: setup.repository,
        artifactRepositoryRoot: setup.artifactRoot,
        packageOutput,
      }).package({
        artifactRef: setup.fixture.alphaSnapshot.ref,
        format: "cowork-v1",
        outputPath: join(setup.root, "refused.cowork.zip"),
      });

      expect(result).toMatchObject({
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: {
          code: "FailpointFailed",
          message: expect.stringContaining("package commit refused"),
        },
      });
    }
  );

  it.runIf("Bun" in globalThis)(
    "relays each real package-output transition exactly once",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const points: string[] = [];
      const packageOutput = makeNodePackageOutputAsyncPort({
        failpoints: {
          async hit(point) {
            points.push(point);
          },
        },
      });

      await expect(
        createPackageAgentPluginApplication({
          artifactRepository: setup.repository,
          artifactRepositoryRoot: setup.artifactRoot,
          packageOutput,
        }).package({
          artifactRef: setup.fixture.alphaSnapshot.ref,
          format: "cowork-v1",
          outputPath: join(setup.root, "four-transitions.cowork.zip"),
        })
      ).resolves.toMatchObject({ kind: "OutputReplacedVerified" });
      expect(points).toEqual([
        "AfterOutputObserved",
        "BeforeCommit",
        "AfterCommit",
        "BeforeFinalVerification",
      ]);
    }
  );

  async function outputSetup() {
    fixtureRoot = await createOwnedFixtureRoot();
    const artifactRoot = join(fixtureRoot.path, "artifacts-v1");
    const repository = new MemoryArtifactRepository();
    const binding = { repositoryRoot: artifactRoot, repository };
    return Object.freeze({
      fixture: packagingArtifactFixture(),
      root: fixtureRoot.path,
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

function createPackageAgentPluginApplication(
  options: Readonly<{
    artifactRepository: ArtifactRepositoryAsyncPort;
    artifactRepositoryRoot: string;
    packageOutput?: AgentPluginPackageOutputAsyncPort;
  }>
) {
  const client = createLifecycleTestClient({
    artifactRepository: options.artifactRepository,
    artifactRepositoryRoot: options.artifactRepositoryRoot,
    packageOutput: options.packageOutput ?? makeNodePackageOutputAsyncPort(),
  });
  return Object.freeze({
    package: (request: unknown) => client.packaging.package(request as never, testInvocation),
  });
}
