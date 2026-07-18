import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  opendir,
  readFile,
  readdir,
  realpath,
  rename,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, posix } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createReleaseArtifactRef } from "@rawr/agent-plugin-lifecycle/release";
import type {
  ArtifactStore,
  ArtifactStoreFailpoint,
  ContentWorkspaceSnapshotReader,
} from "@rawr/agent-plugin-lifecycle/ports/releases";

import type {
  BuildFailpoint,
} from "../../../../../../services/agent-plugin-lifecycle/src/service/modules/releases/model/dto/release-lifecycle";
import {
  createLifecycleTestClient,
  testInvocation,
} from "../../../../../../services/agent-plugin-lifecycle/test/support/client";
import { createGitContentWorkspaceSnapshotReader } from "../../../../src/lib/agent-plugins/service-runtime/releases";
import {
  createArtifactRepositoryReader,
  createArtifactRepositoryStore,
} from "../../../../src/lib/agent-plugins/bindings/output/artifact-repository";
import type { ArtifactStoreRoot } from "../../../../src/lib/agent-plugins/layout";
import {
  createGitObjectSnapshotReader,
  type GitWorkspaceMetadataReader,
} from "../../../../src/lib/agent-plugins/service-runtime/releases/git/object-snapshot";
import {
  createGitCommandRunner,
  type GitCommandRunner,
} from "../../../../src/lib/agent-plugins/service-runtime/releases/git/process";
import {
  GIT_EXECUTABLE,
  commitGeneratedGitRepository,
  createGeneratedGitRepository,
  createGeneratedMultiMemberGitRepository,
  git,
  installMisleadingExecutableFiles,
  unsafeFixturePolicy,
} from "./fixtures/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

describe("build application and append-only artifact store", () => {
  let fixture: OwnedFixtureRoot | undefined;
  let extraFixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    if (extraFixture !== undefined) await removeOwnedFixtureRoot(extraFixture);
    fixture = undefined;
    extraFixture = undefined;
  });

  it("initializes a fresh branded root, publishes exact bytes, and converges without metadata writes", async () => {
    const setup = await buildSetup();
    const mode = { kind: "targeted", pluginId: setup.repository.pluginId } as const;
    const first = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
    expect(first.kind).toBe("Published");
    if (first.kind !== "Published" || first.ref.kind !== "release") return;

    const artifactReader = createArtifactRepositoryReader(setup.artifactRoot);
    const read = await artifactReader.read(first.ref);
    expect(read.kind).toBe("Verified");
    if (read.kind !== "Verified" || read.snapshot.kind !== "release") return;
    expect(new TextDecoder().decode(read.snapshot.files[0]!.bytes)).toContain("Generated fixture-plugin");
    const before = await snapshotTree(setup.artifactRoot);

    const repeated = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
    expect(repeated).toMatchObject({ kind: "ReadOnlyConverged", ref: first.ref });
    expect(await snapshotTree(setup.artifactRoot)).toEqual(before);

    read.snapshot.files[0]!.bytes.fill(0);
    const reread = await artifactReader.read(first.ref);
    expect(reread.kind).toBe("Verified");
    if (reread.kind === "Verified" && reread.snapshot.kind === "release") {
      expect(reread.snapshot.files[0]!.bytes.some((byte) => byte !== 0)).toBe(true);
      const heldBytes = new Uint8Array(reread.snapshot.files[0]!.bytes);
      const payloadPath = join(
        setup.artifactRoot,
        "releases",
        "sha256",
        first.ref.artifactDigest,
        "payload",
        "skills",
        "example",
        "SKILL.md",
      );
      const tamperedBytes = new Uint8Array(heldBytes);
      tamperedBytes[0] = tamperedBytes[0]! ^ 1;
      await writeFile(payloadPath, tamperedBytes);
      expect(reread.snapshot.files[0]!.bytes).toEqual(heldBytes);
      await expect(artifactReader.read(first.ref)).resolves.toMatchObject({
        kind: "Mismatch",
        issues: [{ code: "DigestMismatch" }],
      });
    }
  });

  it("publishes complete-set members first, reports an exact incomplete result, and retries only the marker", async () => {
    const setup = await buildSetup();
    const mode = { kind: "complete-set" } as const;
    const interrupted = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode,
      failpoint(event) {
        if (event.kind === "AfterMemberPublication") throw new Error("stop after member commit");
      },
    });
    expect(interrupted).toMatchObject({
      kind: "PublicationIncomplete",
      requestedSetRefAbsent: true,
      newlyPublished: [{ kind: "release" }],
    });
    expect(await directoryNames(join(setup.artifactRoot, "sets", "sha256"))).toEqual([]);

    const retried = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
    expect(retried.kind).toBe("Published");
    if (retried.kind !== "Published" || retried.ref.kind !== "complete-set") return;
    expect(retried.newlyPublished).toEqual([]);
    expect(retried.preExisting).toHaveLength(1);
    const verified = await createArtifactRepositoryReader(setup.artifactRoot).read(retried.ref);
    expect(verified).toMatchObject({ kind: "Verified", snapshot: { kind: "complete-set" } });
  });

  it("keeps a multi-member set invisible when a later member fails, then converges deterministically", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(fixture);
    const artifactRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
    const source = await realSource();
    const artifacts = createArtifactRepositoryStore(artifactRoot);
    const applications = createReleaseLifecycleApplications({ source, artifacts });
    const mode = { kind: "complete-set" } as const;
    const checked = await applications.check({ contentWorkspace: repository.policy, mode });
    expect(checked).toMatchObject({ kind: "EligibleReport", candidate: { kind: "complete-set" } });
    if (checked.kind !== "EligibleReport" || checked.candidate.kind !== "complete-set") return;

    let publicationAttempts = 0;
    const partial = await applications.build({
      contentWorkspace: repository.policy,
      mode,
      artifactFailpoint(event) {
        if (event.kind !== "BeforeNoReplacePublication") return;
        publicationAttempts += 1;
        if (publicationAttempts === 2) throw new Error("reject the later member before commit");
      },
    });

    expect(publicationAttempts).toBe(2);
    expect(partial).toMatchObject({
      kind: "PublicationIncomplete",
      requestedSetRefAbsent: true,
      newlyPublished: [{ kind: "release" }],
      preExisting: [],
      issues: [{ kind: "ArtifactStore", detail: expect.stringContaining("later member") }],
    });
    if (partial.kind !== "PublicationIncomplete") return;
    expect("ref" in partial).toBe(false);
    await expect(createArtifactRepositoryReader(artifactRoot).read(checked.candidate)).resolves.toMatchObject({
      kind: "Missing",
    });
    expect(await directoryNames(join(artifactRoot, "sets", "sha256"))).toEqual([]);
    expect(await directoryNames(join(artifactRoot, "releases", "sha256"))).toHaveLength(1);

    const firstRef = partial.newlyPublished[0]!;
    const firstReleaseRoot = join(artifactRoot, "releases", "sha256", firstRef.artifactDigest);
    const firstReleaseBeforeRetry = await snapshotTree(firstReleaseRoot);
    await expect(createArtifactRepositoryReader(artifactRoot).read(firstRef)).resolves.toMatchObject({
      kind: "Verified",
      snapshot: { kind: "release" },
    });

    const retried = await applications.build({ contentWorkspace: repository.policy, mode });
    expect(retried).toMatchObject({
      kind: "Published",
      ref: checked.candidate,
      newlyPublished: [{ kind: "release" }],
      preExisting: [firstRef],
    });
    expect(await snapshotTree(firstReleaseRoot)).toEqual(firstReleaseBeforeRetry);
    const complete = await createArtifactRepositoryReader(artifactRoot).read(checked.candidate);
    expect(complete).toMatchObject({
      kind: "Verified",
      snapshot: { kind: "complete-set", members: [{}, {}] },
    });

    const completeTree = await snapshotTree(artifactRoot);
    await expect(applications.build({ contentWorkspace: repository.policy, mode })).resolves.toEqual({
      kind: "ReadOnlyConverged",
      mode,
      ref: checked.candidate,
    });
    expect(await snapshotTree(artifactRoot)).toEqual(completeTree);
  });

  it("rejects an open skill ownership plan before any complete-set artifact operation", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const releaseInput = JSON.parse(await readFile(repository.releaseInputFile, "utf8")) as any;
    releaseInput.body.ownershipClaims = [];
    await writeFile(repository.releaseInputFile, `${JSON.stringify(releaseInput)}\n`);
    const policy = await commitGeneratedGitRepository(repository, "remove skill ownership claim");

    let artifactOperations = 0;
    const artifacts: ArtifactStore = {
      async read(ref) {
        artifactOperations += 1;
        return { kind: "Missing", ref };
      },
      async publishRelease() {
        artifactOperations += 1;
        throw new Error("release publication must stay closed");
      },
      async publishReleaseSet() {
        artifactOperations += 1;
        throw new Error("set publication must stay closed");
      },
    };
    const result = await createReleaseLifecycleApplications({ source: await realSource(), artifacts }).build({
      contentWorkspace: policy,
      mode: { kind: "complete-set" },
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforePublication",
      issues: [{
        kind: "SourceEligibility",
        issue: {
          code: "ReleaseInputMismatch",
          detail: expect.stringContaining("SKILL_OWNERSHIP_MISMATCH"),
        },
      }],
    });
    expect(artifactOperations).toBe(0);
  });

  it("rejects a relabeled toolkit agent-pack payload before any complete-set artifact operation", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const releaseInput = JSON.parse(await readFile(repository.releaseInputFile, "utf8")) as any;
    releaseInput.body.members[0].payload.manifest[0].path = "agent-pack/skills/example/SKILL.md";
    await writeFile(repository.releaseInputFile, `${JSON.stringify(releaseInput)}\n`);
    const policy = await commitGeneratedGitRepository(repository, "relabel toolkit agent pack as agent plugin");

    let artifactOperations = 0;
    const artifacts: ArtifactStore = {
      async read(ref) {
        artifactOperations += 1;
        return { kind: "Missing", ref };
      },
      async publishRelease() {
        artifactOperations += 1;
        throw new Error("release publication must stay closed");
      },
      async publishReleaseSet() {
        artifactOperations += 1;
        throw new Error("set publication must stay closed");
      },
    };
    const result = await createReleaseLifecycleApplications({ source: await realSource(), artifacts }).build({
      contentWorkspace: policy,
      mode: { kind: "complete-set" },
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforePublication",
      issues: [{
        kind: "SourceEligibility",
        issue: {
          code: "ReleaseInputMismatch",
          detail: expect.stringContaining("FORBIDDEN_UNIT_KIND"),
        },
      }],
    });
    expect(artifactOperations).toBe(0);
  });

  it("revalidates after staging and rejects a source race without a durable digest path", async () => {
    const setup = await buildSetup();
    const mode = { kind: "targeted", pluginId: setup.repository.pluginId } as const;
    const check = await setup.applications.check({ contentWorkspace: setup.repository.policy, mode });
    expect(check.kind).toBe("EligibleReport");
    if (check.kind !== "EligibleReport" || check.candidate.kind !== "release") return;

    const result = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode,
      async failpoint(event) {
        if (event.kind === "BeforeFinalRevalidation") {
          await writeFile(setup.repository.payloadFile, "changed during final gate\n");
        }
      },
    });
    expect(result.kind).toBe("RejectedBeforePublication");
    await expect(lstat(join(
      setup.artifactRoot,
      "releases",
      "sha256",
      check.candidate.artifactDigest,
    ))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await directoryNames(join(setup.artifactRoot, ".staging"))).toEqual([]);
  });

  it("rejects a payload mutation injected during the final closing Git evidence pass", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const artifactRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
    const delegate = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    let armed = false;
    let mutated = false;
    const racingRunner: GitCommandRunner = {
      async run(cwd, args, limits) {
        const result = await delegate.run(cwd, args, limits);
        if (armed && !mutated && args[0] === "ls-files" && args[1] === "--stage") {
          mutated = true;
          await writeFile(repository.payloadFile, "mutated during closing evidence\n");
        }
        return result;
      },
    };
    const applications = createReleaseLifecycleApplications({
      source: createGitObjectSnapshotReader(racingRunner),
      artifacts: createArtifactRepositoryStore(artifactRoot),
    });
    const mode = { kind: "targeted", pluginId: repository.pluginId } as const;
    const checked = await applications.check({ contentWorkspace: repository.policy, mode });
    expect(checked.kind).toBe("EligibleReport");
    if (checked.kind !== "EligibleReport" || checked.candidate.kind !== "release") return;

    const result = await applications.build({
      contentWorkspace: repository.policy,
      mode,
      failpoint(event) {
        if (event.kind === "BeforeFinalRevalidation") armed = true;
      },
    });
    expect(mutated).toBe(true);
    expect(result).toMatchObject({
      kind: "RejectedBeforePublication",
      issues: [{ kind: "ArtifactStore", detail: expect.stringContaining("SourceChanged") }],
    });
    await expect(lstat(join(
      artifactRoot,
      "releases",
      "sha256",
      checked.candidate.artifactDigest,
    ))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await directoryNames(join(artifactRoot, ".staging"))).toEqual([]);
  });

  it("rejects a payload mutation after the final build revalidation anchor", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const artifactRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
    const delegate = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    let treeObservations = 0;
    let mutated = false;
    const racingRunner: GitCommandRunner = {
      async run(cwd, args, limits) {
        const result = await delegate.run(cwd, args, limits);
        if (args[0] === "rev-parse" && args.at(-1) === "HEAD^{tree}") {
          treeObservations += 1;
          if (treeObservations === 15) {
            mutated = true;
            await writeFile(repository.payloadFile, "mutated after final build anchor\n");
          }
        }
        return result;
      },
    };
    const applications = createReleaseLifecycleApplications({
      source: createGitObjectSnapshotReader(racingRunner),
      artifacts: createArtifactRepositoryStore(artifactRoot),
    });

    const result = await applications.build({
      contentWorkspace: repository.policy,
      mode: { kind: "targeted", pluginId: repository.pluginId },
    });

    expect(mutated).toBe(true);
    expect(result).toMatchObject({
      kind: "RejectedBeforePublication",
      issues: [{ kind: "ArtifactStore", detail: expect.stringContaining("SourceChanged") }],
    });
    expect(await directoryNames(join(artifactRoot, "releases", "sha256"))).toEqual([]);
    expect(await directoryNames(join(artifactRoot, ".staging"))).toEqual([]);
  });

  it.each(["assume-unchanged", "skip-worktree"] as const)(
    "rejects a late %s transition after the final build revalidation anchor",
    async (flag) => {
      fixture = await createOwnedFixtureRoot();
      const repository = await createGeneratedGitRepository(fixture);
      const artifactRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
      const delegate = await createGitCommandRunner({
        gitExecutable: GIT_EXECUTABLE,
        pathEnvironment: "/usr/bin:/bin",
      });
      const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
      let treeObservations = 0;
      let changed = false;
      const racingRunner: GitCommandRunner = {
        async run(cwd, args, limits) {
          const result = await delegate.run(cwd, args, limits);
          if (args[0] === "rev-parse" && args.at(-1) === "HEAD^{tree}") {
            treeObservations += 1;
            if (treeObservations === 15) {
              changed = true;
              await git(repository.root, ["update-index", `--${flag}`, relativePayload]);
            }
          }
          return result;
        },
      };
      const applications = createReleaseLifecycleApplications({
        source: createGitObjectSnapshotReader(racingRunner),
        artifacts: createArtifactRepositoryStore(artifactRoot),
      });

      const result = await applications.build({
        contentWorkspace: repository.policy,
        mode: { kind: "targeted", pluginId: repository.pluginId },
      });

      expect(changed).toBe(true);
      expect(result).toMatchObject({
        kind: "RejectedBeforePublication",
        issues: [{ kind: "ArtifactStore", detail: expect.stringContaining("SourceChanged") }],
      });
      expect(await directoryNames(join(artifactRoot, "releases", "sha256"))).toEqual([]);
      expect(await directoryNames(join(artifactRoot, ".staging"))).toEqual([]);
    },
  );

  it.each(["untracked", "ignored"] as const)(
    "rejects a late %s consumed path at the final status linearization point",
    async (kind) => {
      fixture = await createOwnedFixtureRoot();
      const repository = await createGeneratedGitRepository(fixture);
      const artifactRoot = join(fixture.path, "state", "artifacts-v1") as ArtifactStoreRoot;
      const delegate = await createGitCommandRunner({
        gitExecutable: GIT_EXECUTABLE,
        pathEnvironment: "/usr/bin:/bin",
      });
      let armed = false;
      let finalIndexObservations = 0;
      let mutated = false;
      const racingRunner: GitCommandRunner = {
        async run(cwd, args, limits) {
          const result = await delegate.run(cwd, args, limits);
          if (armed && args[0] === "ls-files" && args[1] === "--stage") {
            finalIndexObservations += 1;
            if (finalIndexObservations === 2) {
              mutated = true;
              const path = kind === "ignored"
                ? repository.ignoredFile
                : join(repository.root, "plugins", "agent", repository.pluginId, "late-untracked.txt");
              await writeFile(path, `${kind} appeared after the final index evidence\n`);
            }
          }
          return result;
        },
      };
      const applications = createReleaseLifecycleApplications({
        source: createGitObjectSnapshotReader(racingRunner),
        artifacts: createArtifactRepositoryStore(artifactRoot),
      });

      const result = await applications.build({
        contentWorkspace: repository.policy,
        mode: { kind: "targeted", pluginId: repository.pluginId },
        failpoint(event) {
          if (event.kind === "BeforeFinalRevalidation") armed = true;
        },
      });

      expect(finalIndexObservations).toBe(2);
      expect(mutated).toBe(true);
      expect(result).toMatchObject({
        kind: "RejectedBeforePublication",
        issues: [{ kind: "ArtifactStore", detail: expect.stringContaining("SourceChanged") }],
      });
      expect(await directoryNames(join(artifactRoot, "releases", "sha256"))).toEqual([]);
      expect(await directoryNames(join(artifactRoot, ".staging"))).toEqual([]);
    },
  );

  it("keeps a published artifact usable after its source checkout is removed", async () => {
    fixture = await createOwnedFixtureRoot();
    extraFixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const artifactRoot = join(extraFixture.path, "controller", "artifacts-v1") as ArtifactStoreRoot;
    const applications = createReleaseLifecycleApplications({
      source: await realSource(),
      artifacts: createArtifactRepositoryStore(artifactRoot),
    });
    const mode = { kind: "targeted", pluginId: repository.pluginId } as const;
    const built = await applications.build({ contentWorkspace: repository.policy, mode });
    expect(built.kind).toBe("Published");
    if (built.kind !== "Published") return;

    await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
    const before = await snapshotTree(artifactRoot);
    await expect(createArtifactRepositoryReader(artifactRoot).read(built.ref)).resolves.toMatchObject({ kind: "Verified" });
    await expect(applications.build({ contentWorkspace: repository.policy, mode })).resolves.toMatchObject({
      kind: "RejectedBeforePublication",
    });
    expect(await snapshotTree(artifactRoot)).toEqual(before);
  });

  it("treats personal-like executable files as unread inert Git metadata with no adjacent output", async () => {
    fixture = await createOwnedFixtureRoot();
    const generated = await createGeneratedGitRepository(fixture);
    const repository = await installMisleadingExecutableFiles(generated);
    const artifactRoot = join(fixture.path, "controller", "artifacts-v1") as ArtifactStoreRoot;
    const forbiddenObjectIds = new Set(await Promise.all([
      repository.misleadingExecutableRepositoryPath,
      repository.misleadingPackageRepositoryPath,
    ].map(async (path) => await git(repository.root, ["rev-parse", `HEAD:${path}`]))));
    const admittedRepositoryPaths = [
      repository.policy.releaseInputPath,
      `${repository.policy.pluginRoot}/${repository.pluginId}/skills/example/SKILL.md`,
    ];
    const admittedObjectIds = new Set(await Promise.all(admittedRepositoryPaths.map(
      async (path) => await git(repository.root, ["rev-parse", `HEAD:${path}`]),
    )));
    const observedGitCommands: string[][] = [];
    const delegate = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    const gitRunner: GitCommandRunner = {
      async run(cwd, args, limits) {
        observedGitCommands.push([...args]);
        if (args[0] === "cat-file" && forbiddenObjectIds.has(args.at(-1)!)) {
          throw new Error("content checkout executable blob must remain unread");
        }
        return await delegate.run(cwd, args, limits);
      },
    };
    const metadataPaths: string[] = [];
    const metadata: GitWorkspaceMetadataReader = {
      async lstat(candidate) {
        metadataPaths.push(candidate);
        if (candidate !== repository.root) throw new Error(`unexpected source filesystem read: ${candidate}`);
        return await lstat(candidate, { bigint: true });
      },
      async realpath(candidate) {
        metadataPaths.push(candidate);
        if (candidate !== repository.root) throw new Error(`unexpected source filesystem read: ${candidate}`);
        return await realpath(candidate);
      },
    };
    const source = createGitObjectSnapshotReader(gitRunner, metadata);
    const applications = createReleaseLifecycleApplications({
      source,
      artifacts: createArtifactRepositoryStore(artifactRoot),
    });
    const mode = { kind: "targeted", pluginId: repository.pluginId } as const;

    const checked = await applications.check({ contentWorkspace: repository.policy, mode });
    expect(checked).toMatchObject({ kind: "EligibleReport", candidate: { kind: "release" } });
    await expect(lstat(artifactRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(repository.misleadingAdjacentOutput)).rejects.toMatchObject({ code: "ENOENT" });

    const built = await applications.build({ contentWorkspace: repository.policy, mode });
    expect(built).toMatchObject({ kind: "Published", ref: checked.kind === "EligibleReport" ? checked.candidate : {} });
    if (built.kind !== "Published" || built.ref.kind !== "release") return;
    await expect(lstat(repository.misleadingAdjacentOutput)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await git(repository.root, ["status", "--porcelain"])).toBe("");
    await expect(createArtifactRepositoryReader(artifactRoot).read(built.ref)).resolves.toMatchObject({
      kind: "Verified",
      snapshot: {
        kind: "release",
        files: [{ path: "skills/example/SKILL.md" }],
      },
    });

    const blobReads = observedGitCommands
      .filter((args) => args[0] === "cat-file")
      .map((args) => args.at(-1)!);
    expect(new Set(blobReads)).toEqual(admittedObjectIds);
    expect(blobReads.some((objectId) => forbiddenObjectIds.has(objectId))).toBe(false);
    const worktreeHashPaths = observedGitCommands
      .filter((args) => args.includes("hash-object"))
      .map((args) => args.at(-1)!);
    expect(new Set(worktreeHashPaths)).toEqual(new Set(admittedRepositoryPaths));
    expect(new Set(metadataPaths)).toEqual(new Set([repository.root]));
  });

  it("rejects mode tampering and returns no usable payload snapshot", async () => {
    const setup = await buildSetup();
    const mode = { kind: "targeted", pluginId: setup.repository.pluginId } as const;
    const built = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
    expect(built.kind).toBe("Published");
    if (built.kind !== "Published" || built.ref.kind !== "release") return;
    const payload = join(
      setup.artifactRoot,
      "releases",
      "sha256",
      built.ref.artifactDigest,
      "payload",
      "skills",
      "example",
      "SKILL.md",
    );
    await chmod(payload, 0o600);
    const read = await createArtifactRepositoryReader(setup.artifactRoot).read(built.ref);
    expect(read).toMatchObject({ kind: "Mismatch", issues: [{ code: "ModeMismatch" }] });
  });

  it("rejects extra entries, shared inodes, and symlink substitutions", async () => {
    const setup = await buildSetup();
    const built = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode: { kind: "targeted", pluginId: setup.repository.pluginId },
    });
    expect(built.kind).toBe("Published");
    if (built.kind !== "Published" || built.ref.kind !== "release") return;
    const reader = createArtifactRepositoryReader(setup.artifactRoot);
    const releaseRoot = join(setup.artifactRoot, "releases", "sha256", built.ref.artifactDigest);
    const payload = join(releaseRoot, "payload", "skills", "example", "SKILL.md");

    const foreign = join(releaseRoot, "foreign.txt");
    await writeFile(foreign, "foreign\n");
    await expect(reader.read(built.ref)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "UnexpectedEntry" }],
    });
    await unlink(foreign);

    const shared = join(releaseRoot, "shared-payload");
    await link(payload, shared);
    await expect(reader.read(built.ref)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "SharedInode" }, { code: "SharedInode" }],
    });
    await unlink(shared);

    const preserved = `${payload}.preserved`;
    await rename(payload, preserved);
    await symlink(preserved, payload);
    await expect(reader.read(built.ref)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "InvalidEntryType" }],
    });
  });

  it("blocks a complete-set read when any transitive member is tampered", async () => {
    const setup = await buildSetup();
    const built = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode: { kind: "complete-set" },
    });
    expect(built.kind).toBe("Published");
    if (built.kind !== "Published" || built.ref.kind !== "complete-set") return;
    const reader = createArtifactRepositoryReader(setup.artifactRoot);
    const initial = await reader.read(built.ref);
    expect(initial.kind).toBe("Verified");
    if (initial.kind !== "Verified" || initial.snapshot.kind !== "complete-set") return;
    const memberRef = initial.snapshot.members[0]!.ref;
    await chmod(join(
      setup.artifactRoot,
      "releases",
      "sha256",
      memberRef.artifactDigest,
      "payload",
      "skills",
      "example",
      "SKILL.md",
    ), 0o600);
    await expect(reader.read(built.ref)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "ReferenceMismatch" }],
    });
  });

  it("publishes the set marker last and truthfully reports both marker failpoint sides", async () => {
    const setup = await buildSetup();
    const mode = { kind: "complete-set" } as const;
    const beforeMarker = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode,
      failpoint(event) {
        if (event.kind === "BeforeSetPublication") throw new Error("stop before marker");
      },
    });
    expect(beforeMarker).toMatchObject({
      kind: "PublicationIncomplete",
      requestedSetRefAbsent: true,
      newlyPublished: [{ kind: "release" }],
    });
    expect(await directoryNames(join(setup.artifactRoot, "sets", "sha256"))).toEqual([]);

    const afterMarker = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode,
      failpoint(event) {
        if (event.kind === "AfterSetPublication") throw new Error("stop after marker");
      },
    });
    expect(afterMarker).toMatchObject({
      kind: "Published",
      ref: { kind: "complete-set" },
      newlyPublished: [],
      preExisting: [{ kind: "release" }],
    });
    const converged = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
    expect(converged).toMatchObject({ kind: "ReadOnlyConverged", ref: { kind: "complete-set" } });
  });

  it("reports an after-set interruption as unsettled only when the committed set cannot be observed", async () => {
    const setup = await buildSetup();
    let setPublished = false;
    const unreadableAfterPublication: ArtifactStore = {
      async read(ref) {
        if (setPublished && ref.kind === "complete-set") {
          throw new Error("injected post-publication set read failure");
        }
        return await setup.artifacts.read(ref);
      },
      async publishRelease(release, options) {
        return await setup.artifacts.publishRelease(release, options);
      },
      async publishReleaseSet(releaseSet, options) {
        const result = await setup.artifacts.publishReleaseSet(releaseSet, options);
        setPublished = true;
        return result;
      },
    };
    const applications = createReleaseLifecycleApplications({
      source: setup.source,
      artifacts: unreadableAfterPublication,
    });

    const result = await applications.build({
      contentWorkspace: setup.repository.policy,
      mode: { kind: "complete-set" },
      failpoint(event) {
        if (event.kind === "AfterSetPublication") throw new Error("stop after marker");
      },
    });

    expect(setPublished).toBe(true);
    expect(result).toMatchObject({
      kind: "PublicationUnsettled",
      requestedFinalCommit: "Unknown",
      observedVerifiedReleases: [{ kind: "release" }],
      issues: [
        { kind: "ReleaseConstruction", detail: "stop after marker" },
        { kind: "ArtifactStore", detail: expect.stringContaining("set-marker read failed") },
      ],
    });
  });

  it.each(["AfterMemberPublication", "BeforeSetPublication"] as const)(
    "classifies a concurrent exact set winner at %s as final success",
    async (boundary) => {
      const setup = await buildSetup();
      const mode = { kind: "complete-set" } as const;
      let concurrentResult: Awaited<ReturnType<typeof setup.applications.build>> | undefined;
      const first = await setup.applications.build({
        contentWorkspace: setup.repository.policy,
        mode,
        async failpoint(event) {
          if (event.kind !== boundary) return;
          concurrentResult = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
          throw new Error(`first builder stopped at ${boundary}`);
        },
      });
      expect(concurrentResult).toMatchObject({ kind: "Published", ref: { kind: "complete-set" } });
      expect(first).toMatchObject({
        kind: "Published",
        ref: concurrentResult?.kind === "Published" ? concurrentResult.ref : undefined,
        newlyPublished: [{ kind: "release" }],
      });
      expect("requestedSetRefAbsent" in first).toBe(false);
    },
  );

  it("reclassifies a rejected member path when a concurrent builder commits the exact set", async () => {
    const setup = await buildSetup();
    const mode = { kind: "complete-set" } as const;
    const seeded = await setup.applications.build({
      contentWorkspace: setup.repository.policy,
      mode,
      failpoint(event) {
        if (event.kind === "AfterMemberPublication") throw new Error("leave only the member");
      },
    });
    expect(seeded).toMatchObject({ kind: "PublicationIncomplete", requestedSetRefAbsent: true });

    let concurrentResult: Awaited<ReturnType<typeof setup.applications.build>> | undefined;
    const rejectingArtifacts: ArtifactStore = {
      async read(ref) {
        return await setup.artifacts.read(ref);
      },
      async publishRelease(release) {
        concurrentResult = await setup.applications.build({ contentWorkspace: setup.repository.policy, mode });
        return {
          kind: "Rejected",
          ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
          failure: "injected stale rejection",
        };
      },
      async publishReleaseSet(releaseSet, options) {
        return await setup.artifacts.publishReleaseSet(releaseSet, options);
      },
    };
    const racingApplication = createReleaseLifecycleApplications({
      source: setup.source,
      artifacts: rejectingArtifacts,
    });
    const result = await racingApplication.build({ contentWorkspace: setup.repository.policy, mode });
    expect(concurrentResult).toMatchObject({ kind: "Published", ref: { kind: "complete-set" } });
    expect(result).toMatchObject({ kind: "ReadOnlyConverged", ref: { kind: "complete-set" } });
    expect("requestedSetRefAbsent" in result).toBe(false);
  });

  it.each(["mismatch", "read-failure"] as const)(
    "reports a %s while classifying an incomplete set as unsettled, never absent",
    async (outcome) => {
      fixture = await createOwnedFixtureRoot();
      const repository = await createGeneratedGitRepository(fixture);
      const inspected = await (await realSource()).inspect(repository.policy);
      if (inspected.kind !== "Eligible") throw new Error("generated source fixture was not eligible");
      const source: ContentWorkspaceSnapshotReader = {
        async inspect() {
          return inspected;
        },
        async revalidate() {
          return inspected;
        },
      };
      let setReads = 0;
      const artifacts: ArtifactStore = {
        async read(ref) {
          if (ref.kind === "release") return { kind: "Missing", ref };
          setReads += 1;
          if (setReads === 1) return { kind: "Missing", ref };
          if (outcome === "read-failure") throw new Error("injected set-marker read failure");
          return {
            kind: "Mismatch",
            ref,
            issues: [{ code: "ReadFailure", detail: "injected set-marker mismatch" }],
          };
        },
        async publishRelease(release) {
          return {
            kind: "Rejected",
            ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
            failure: "injected member rejection",
          };
        },
        async publishReleaseSet() {
          throw new Error("set publication must remain closed");
        },
      };
      const result = await createReleaseLifecycleApplications({ source, artifacts }).build({
        contentWorkspace: repository.policy,
        mode: { kind: "complete-set" },
      });
      expect(result).toMatchObject({
        kind: "PublicationUnsettled",
        requestedFinalCommit: "Unknown",
        issues: [
          { kind: "ArtifactStore", detail: "injected member rejection" },
          { kind: "ArtifactStore", detail: expect.stringContaining("set-marker") },
        ],
      });
      expect("requestedSetRefAbsent" in result).toBe(false);
    },
  );

  it("keeps protected-path knowledge in a test-only source trap and never opens Git or artifacts", async () => {
    fixture = await createOwnedFixtureRoot();
    const analogous = await createGeneratedGitRepository(fixture, "fixture-orpc-inngest");
    const real = await realSource();
    await expect(real.inspect(analogous.policy)).resolves.toMatchObject({ kind: "Eligible" });

    let gitCalls = 0;
    let artifactCalls = 0;
    const git: GitCommandRunner = {
      async run() {
        gitCalls += 1;
        return { exitCode: 1, stdout: new Uint8Array(), stderr: new Uint8Array() };
      },
    };
    const delegate = createGitObjectSnapshotReader(git);
    const protectedLocator = join(
      "/",
      "Users",
      "mateicanavra",
      "Documents",
      ".nosync",
      "DEV",
      "habitat",
      "rawr-hq",
    );
    const trapped: ContentWorkspaceSnapshotReader = {
      async inspect(policy) {
        if (policy.locator === protectedLocator) {
          return { kind: "Ineligible", issues: [{ code: "AliasedLocator", detail: "test policy denied" }] };
        }
        return await delegate.inspect(policy);
      },
      async revalidate(policy, binding) {
        return await delegate.revalidate(policy, binding);
      },
    };
    const artifacts: ArtifactStore = {
      async read(ref) {
        artifactCalls += 1;
        return { kind: "Missing", ref };
      },
      async publishRelease() {
        artifactCalls += 1;
        throw new Error("artifact publication must stay closed");
      },
      async publishReleaseSet() {
        artifactCalls += 1;
        throw new Error("artifact publication must stay closed");
      },
    };
    const applications = createReleaseLifecycleApplications({ source: trapped, artifacts });
    const result = await applications.build({
      contentWorkspace: unsafeFixturePolicy({ locator: protectedLocator }),
      mode: { kind: "targeted", pluginId: analogous.pluginId },
    });
    expect(result.kind).toBe("RejectedBeforePublication");
    expect(gitCalls).toBe(0);
    expect(artifactCalls).toBe(0);
  });

  async function buildSetup() {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const artifactRoot = join(fixture.path, "fresh", "controller", "artifacts-v1") as ArtifactStoreRoot;
    const source = await realSource();
    const artifacts = createArtifactRepositoryStore(artifactRoot);
    return {
      repository,
      artifactRoot,
      source,
      artifacts,
      applications: createReleaseLifecycleApplications({ source, artifacts }),
    };
  }

  async function realSource(): Promise<ContentWorkspaceSnapshotReader> {
    return await createGitContentWorkspaceSnapshotReader({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
  }
});

function createReleaseLifecycleApplications(options: {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly artifacts: ArtifactStore;
}) {
  const client = createLifecycleTestClient({ releases: options });
  type BuildRequest = Parameters<typeof client.releases.build>[0] & Readonly<{
    failpoint?: BuildFailpoint;
    artifactFailpoint?: ArtifactStoreFailpoint;
  }>;
  return Object.freeze({
    check: (request: Parameters<typeof client.releases.check>[0]) => (
      client.releases.check(request, testInvocation)
    ),
    build: (request: BuildRequest) => {
      const { failpoint, artifactFailpoint, ...input } = request;
      const buildClient = createLifecycleTestClient({
        releases: {
          ...options,
          controls: {
            ...(failpoint === undefined ? {} : { buildFailpoint: failpoint }),
            ...(artifactFailpoint === undefined ? {} : { artifactFailpoint }),
          },
        },
      });
      return buildClient.releases.build(input, testInvocation);
    },
  });
}

async function directoryNames(path: string): Promise<readonly string[]> {
  try {
    return (await readdir(path)).sort();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

interface SnapshotTreeEntry {
  readonly path: string;
  readonly kind: "directory" | "file";
  readonly mode: bigint;
  readonly mtimeNs: bigint;
  readonly ino: bigint;
  readonly digest?: string;
}

async function snapshotTree(root: string): Promise<readonly SnapshotTreeEntry[]> {
  const result: SnapshotTreeEntry[] = [];
  await walk(root, "", result);
  return result;
}

async function walk(root: string, parent: string, result: SnapshotTreeEntry[]): Promise<void> {
  const directoryPath = parent === "" ? root : join(root, ...parent.split("/"));
  const directory = await opendir(directoryPath);
  for await (const entry of directory) {
    const relativePath = parent === "" ? entry.name : posix.join(parent, entry.name);
    const path = join(root, ...relativePath.split("/"));
    const status = await lstat(path, { bigint: true });
    if (status.isDirectory()) {
      result.push({ path: relativePath, kind: "directory", mode: status.mode, mtimeNs: status.mtimeNs, ino: status.ino });
      await walk(root, relativePath, result);
    } else {
      const bytes = await readFile(path);
      result.push({
        path: relativePath,
        kind: "file",
        mode: status.mode,
        mtimeNs: status.mtimeNs,
        ino: status.ino,
        digest: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  result.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
