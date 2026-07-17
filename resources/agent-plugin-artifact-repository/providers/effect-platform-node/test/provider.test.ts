import { link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, rmdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";
import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";

import type {
  ArtifactCommitDecision,
  ArtifactObjectAddress,
  ArtifactRepositoryFailure,
  ArtifactTreeEntry,
} from "../../../contract";
import {
  makeArtifactRepositoryResource,
  runNodeArtifactRepository,
  type NodeArtifactRepositoryResult,
} from "../index";

const FIXTURE_PREFIX = "rawr-artifact-repository-test-";
const LIMITS = Object.freeze({ maxEntries: 20, maxBytes: 16 * 1024 });

interface OwnedFixture {
  readonly root: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

const fixtures: OwnedFixture[] = [];

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await removeOwnedFixture(fixture);
});

describe("Effect Platform Node artifact repository provider", () => {
  test("locates one fully admitted tree at its exact canonical destination", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-location");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("location"),
      limits: LIMITS,
    })));
    const destination = path.join(address.repositoryRoot, ...address.namespace, address.objectId);

    const located = unwrap(await runNodeArtifactRepository(resource.locateTree({ address, limits: LIMITS })));

    expect(located.kind).toBe("Present");
    if (located.kind === "Present") {
      expect(located.address).toEqual(address);
      expect(located.location).toBe(await realpath(destination));
    }
  });

  test("reports a missing tree without creating repository state", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-missing-location");
    const resource = makeArtifactRepositoryResource();

    const located = unwrap(await runNodeArtifactRepository(resource.locateTree({ address, limits: LIMITS })));

    expect(located).toEqual({ kind: "Missing", address });
    expect(await Bun.file(address.repositoryRoot).exists()).toBe(false);
  });

  test("refuses aliased and hard-linked trees as locations", async () => {
    const parent = await createFixture();
    const repositoryRoot = path.join(parent, "repository");
    const resource = makeArtifactRepositoryResource();

    const aliasedAddress = artifactAddress(repositoryRoot, "artifact-aliased-location");
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address: aliasedAddress,
      entries: releaseEntries("aliased-location"),
      limits: LIMITS,
    })));
    const aliasedDestination = path.join(repositoryRoot, ...aliasedAddress.namespace, aliasedAddress.objectId);
    const preserved = `${aliasedDestination}.preserved`;
    await rename(aliasedDestination, preserved);
    await symlink(preserved, aliasedDestination, "dir");

    const aliased = unwrap(await runNodeArtifactRepository(resource.locateTree({
      address: aliasedAddress,
      limits: LIMITS,
    })));
    expect(aliased).toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "AliasedEntry" }],
    });

    const linkedAddress = artifactAddress(repositoryRoot, "artifact-linked-location");
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address: linkedAddress,
      entries: releaseEntries("linked-location"),
      limits: LIMITS,
    })));
    const linkedDestination = path.join(repositoryRoot, ...linkedAddress.namespace, linkedAddress.objectId);
    await link(
      path.join(linkedDestination, "release.json"),
      path.join(linkedDestination, "release-copy.json"),
    );

    const linked = unwrap(await runNodeArtifactRepository(resource.locateTree({
      address: linkedAddress,
      limits: LIMITS,
    })));
    expect(linked.kind).toBe("Mismatch");
    if (linked.kind === "Mismatch") {
      expect(linked.issues.some((candidate) =>
        candidate.code === "SharedInode" && candidate.path === "release-copy.json")).toBe(true);
    }
  });

  test("reports identity drift instead of issuing a location", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-drifting-location");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("drifting-location"),
      limits: LIMITS,
    })));
    const target = path.join(address.repositoryRoot, ...address.namespace, address.objectId, "payload", "tool.sh");
    let targetStats = 0;

    const attempted = await runWithFileSystem(resource.locateTree({ address, limits: LIMITS }), (base) =>
      fileSystemProxy(base, {
        stat(candidate) {
          return base.stat(candidate).pipe(Effect.map((info) =>
            candidate === target && ++targetStats === 2
              ? Object.freeze({ ...info, dev: info.dev + 1 })
              : info));
        },
      }));

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "IdentityChanged", path: "payload/tool.sh" }],
    });
  });

  test("reports nested directory substitution instead of issuing a location", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-substituted-location");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("substituted-location"),
      limits: LIMITS,
    })));
    const target = path.join(address.repositoryRoot, ...address.namespace, address.objectId, "payload");
    const preserved = `${target}.preserved`;
    let substituted = false;

    const attempted = await runWithFileSystem(resource.locateTree({ address, limits: LIMITS }), (base) =>
      fileSystemProxy(base, {
        readDirectory(candidate) {
          if (candidate !== target || substituted) return base.readDirectory(candidate);
          substituted = true;
          return Effect.promise(async () => {
            await rename(target, preserved);
            await mkdir(target);
          }).pipe(Effect.zipRight(base.readDirectory(candidate)));
        },
      }));

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "IdentityChanged", path: "payload" }],
    });
    expect((await lstat(target)).isDirectory()).toBe(true);
    expect((await lstat(preserved)).isDirectory()).toBe(true);
  });

  test("reports artifact root substitution instead of issuing a location", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-substituted-root");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("substituted-root"),
      limits: LIMITS,
    })));
    const target = path.join(address.repositoryRoot, ...address.namespace, address.objectId);
    const preserved = `${target}.preserved`;
    let substituted = false;

    const attempted = await runWithFileSystem(resource.locateTree({ address, limits: LIMITS }), (base) =>
      fileSystemProxy(base, {
        readDirectory(candidate) {
          if (candidate !== target || substituted) return base.readDirectory(candidate);
          substituted = true;
          return Effect.promise(async () => {
            await rename(target, preserved);
            await mkdir(target);
          }).pipe(Effect.zipRight(base.readDirectory(candidate)));
        },
      }));

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "IdentityChanged" }],
    });
    expect((await lstat(target)).isDirectory()).toBe(true);
    expect((await lstat(preserved)).isDirectory()).toBe(true);
  });

  test("repeated location is read-only and preserves tree metadata", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-location-repeat");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("location-repeat"),
      limits: LIMITS,
    })));
    const destination = path.join(address.repositoryRoot, ...address.namespace, address.objectId);
    const payload = path.join(destination, "payload", "tool.sh");
    const beforeTree = await lstat(destination, { bigint: true });
    const beforePayload = await lstat(payload, { bigint: true });

    const first = unwrap(await runNodeArtifactRepository(resource.locateTree({ address, limits: LIMITS })));
    const second = unwrap(await runNodeArtifactRepository(resource.locateTree({ address, limits: LIMITS })));
    const afterTree = await lstat(destination, { bigint: true });
    const afterPayload = await lstat(payload, { bigint: true });

    expect(first.kind).toBe("Present");
    expect(second).toEqual(first);
    expect(stableMetadata(afterTree)).toEqual(stableMetadata(beforeTree));
    expect(stableMetadata(afterPayload)).toEqual(stableMetadata(beforePayload));
  });

  test("publishes and reads one contained immutable tree", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-a");
    const entries = releaseEntries("first");
    const resource = makeArtifactRepositoryResource();

    const published = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries,
      limits: LIMITS,
    })));
    expect(published.kind).toBe("Published");

    const observed = unwrap(await runNodeArtifactRepository(resource.readTree({ address, limits: LIMITS })));
    expect(observed.kind).toBe("Present");
    if (observed.kind === "Present") {
      expect(observed.snapshot.entries.map((entry) => [entry.path, entry.mode])).toEqual([
        ["payload/tool.sh", 0o755],
        ["release.json", 0o444],
      ]);
      expect(observed.snapshot.directories).toEqual([
        { path: "payload", mode: 0o700 },
      ]);
      expect(text(observed.snapshot.entries[0]?.bytes)).toBe("#!/bin/sh\necho first\n");
      expect(text(observed.snapshot.entries[1]?.bytes)).toBe('{"release":"first"}\n');
    }

    const storedEnvelope = path.join(
      address.repositoryRoot,
      ...address.namespace,
      address.objectId,
      "release.json",
    );
    expect(await readFile(storedEnvelope, "utf8")).toBe('{"release":"first"}\n');
  });

  test("returns a read-only converged result without rewriting the object", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-converged");
    const entries = releaseEntries("stable");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({ address, entries, limits: LIMITS })));
    const destination = path.join(address.repositoryRoot, ...address.namespace, address.objectId);
    const before = await lstat(destination, { bigint: true });

    const repeated = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries,
      limits: LIMITS,
    })));
    const after = await lstat(destination, { bigint: true });

    expect(repeated.kind).toBe("ReadOnlyConverged");
    expect(after.dev).toBe(before.dev);
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeNs).toBe(before.mtimeNs);
  });

  test("uses native no-replace publication when two candidates race", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-race");
    let waiting = 0;
    let releaseBarrier: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    const beforeCommit = async (): Promise<ArtifactCommitDecision> => {
      waiting += 1;
      if (waiting === 2) releaseBarrier?.();
      await barrier;
      return Object.freeze({ kind: "Proceed" });
    };
    const firstResource = makeArtifactRepositoryResource();
    const secondResource = makeArtifactRepositoryResource();

    const results = await Promise.all([
      runNodeArtifactRepository(firstResource.publishTree({
        address,
        entries: releaseEntries("candidate-a"),
        limits: LIMITS,
        control: { beforeCommit },
      })),
      runNodeArtifactRepository(secondResource.publishTree({
        address,
        entries: releaseEntries("candidate-b"),
        limits: LIMITS,
        control: { beforeCommit },
      })),
    ]);
    const values = results.map(unwrap);
    expect(values.map((result) => result.kind).sort()).toEqual(["Occupied", "Published"]);

    const observed = unwrap(await runNodeArtifactRepository(firstResource.readTree({ address, limits: LIMITS })));
    expect(observed.kind).toBe("Present");
    if (observed.kind === "Present") {
      const envelope = text(observed.snapshot.entries.find((entry) => entry.path === "release.json")?.bytes);
      expect(["candidate-a", "candidate-b"].some((candidate) => envelope.includes(candidate))).toBe(true);
    }
  });

  test("stores bounded mechanical evidence bytes through the same immutable repository", async () => {
    const parent = await createFixture();
    const address = evidenceAddress(path.join(parent, "repository"), "me1_abc123");
    const bytes = new TextEncoder().encode('{"evidence":1}\n');
    const resource = makeArtifactRepositoryResource();

    const published = unwrap(await runNodeArtifactRepository(resource.publishEvidence({
      address,
      bytes,
      maxBytes: 1024,
    })));
    const repeated = unwrap(await runNodeArtifactRepository(resource.publishEvidence({
      address,
      bytes,
      maxBytes: 1024,
    })));
    const observed = unwrap(await runNodeArtifactRepository(resource.readEvidence({ address, maxBytes: 1024 })));

    expect(published.kind).toBe("Published");
    expect(repeated.kind).toBe("ReadOnlyConverged");
    expect(observed.kind).toBe("Present");
    if (observed.kind === "Present") expect(text(observed.bytes)).toBe('{"evidence":1}\n');
  });

  test("exposes empty directories so semantic owners can reject unexpected tree shape", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-directory-shape");
    const resource = makeArtifactRepositoryResource();
    unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("shape"),
      limits: LIMITS,
    })));
    await mkdir(path.join(address.repositoryRoot, ...address.namespace, address.objectId, "unexpected"));

    const observed = unwrap(await runNodeArtifactRepository(resource.readTree({ address, limits: LIMITS })));

    expect(observed).toMatchObject({
      kind: "Present",
      snapshot: {
        directories: [
          { path: "payload" },
          { path: "unexpected" },
        ],
      },
    });
  });

  test("rejects path escape input before creating repository state", async () => {
    const parent = await createFixture();
    const repositoryRoot = path.join(parent, "repository");
    const resource = makeArtifactRepositoryResource();
    const result = await runNodeArtifactRepository(resource.publishTree({
      address: Object.freeze({
        repositoryRoot,
        namespace: ["releases", "sha256"],
        objectId: "../outside",
      }),
      entries: releaseEntries("escape"),
      limits: LIMITS,
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reason).toBe("InvalidInput");
    expect(await Bun.file(path.join(parent, "outside")).exists()).toBe(false);
    expect(await Bun.file(repositoryRoot).exists()).toBe(false);
  });

  test("cleans private staging when preparation fails and permits a clean retry", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-cleanup");
    const failing = makeArtifactRepositoryResource({
      onEvent(event) {
        if (event.kind === "AfterStagingWrite") throw new Error("injected staging failure");
      },
    });
    const failed = unwrap(await runNodeArtifactRepository(failing.publishTree({
      address,
      entries: releaseEntries("retry"),
      limits: LIMITS,
    })));
    expect(failed).toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("injected staging failure"),
    });

    const staging = path.join(address.repositoryRoot, ".staging");
    expect(await readdir(staging)).toEqual([]);
    const successful = unwrap(await runNodeArtifactRepository(
      makeArtifactRepositoryResource().publishTree({
        address,
        entries: releaseEntries("retry"),
        limits: LIMITS,
      }),
    ));
    expect(successful.kind).toBe("Published");
  });

  test("preserves a substituted private allocation and reports cleanup truth before a clean retry", async () => {
    const parent = await createFixture();
    const repositoryRoot = path.join(parent, "repository");
    const address = artifactAddress(repositoryRoot, "artifact-substituted-cleanup");
    let replacement: string | undefined;
    let preserved: string | undefined;
    let substituted = false;
    const resource = makeArtifactRepositoryResource({
      async onEvent(event) {
        if (event.kind !== "AfterNoReplacePublication" || substituted) return;
        substituted = true;
        const staging = path.join(repositoryRoot, ".staging");
        const [allocation] = await readdir(staging);
        if (allocation === undefined) throw new Error("Expected one private staging allocation");
        replacement = path.join(staging, allocation);
        preserved = `${replacement}.preserved`;
        await rename(replacement, preserved);
        await mkdir(replacement, { mode: 0o700 });
      },
    });

    const result = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("substituted"),
      limits: LIMITS,
    })));

    expect(result).toMatchObject({
      kind: "Unsettled",
      observation: "Present",
      cleanupFailure: expect.stringContaining("identity changed"),
    });
    if (replacement === undefined || preserved === undefined) throw new Error("Expected substituted paths");
    expect((await lstat(replacement)).isDirectory()).toBe(true);
    expect((await lstat(preserved)).isDirectory()).toBe(true);

    await rmdir(replacement);
    await rmdir(preserved);
    const retry = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address: artifactAddress(repositoryRoot, "artifact-clean-retry"),
      entries: releaseEntries("clean-retry"),
      limits: LIMITS,
    })));
    expect(retry.kind).toBe("Published");
  });

  test("cleans an allocation whose admission fails and permits a clean retry", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-admission-retry");
    const resource = makeArtifactRepositoryResource();
    let allocationStats = 0;

    const attempted = await runWithFileSystem(resource.publishTree({
      address,
      entries: releaseEntries("admission-retry"),
      limits: LIMITS,
    }), (base) => fileSystemProxy(base, {
      stat(candidate) {
        if (isPrivateAllocation(candidate) && ++allocationStats === 2) {
          return Effect.fail(injectedFileSystemFailure("stat", candidate, "admission probe"));
        }
        return base.stat(candidate);
      },
    }));

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("admission probe"),
    });
    const staging = path.join(address.repositoryRoot, ".staging");
    expect(await readdir(staging)).toEqual([]);

    const retry = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("admission-retry"),
      limits: LIMITS,
    })));
    expect(retry.kind).toBe("Published");
  });

  test("reports cleanup failure when a failed admission cannot re-admit its allocation", async () => {
    const parent = await createFixture();
    const address = artifactAddress(path.join(parent, "repository"), "artifact-admission-cleanup-failure");
    const resource = makeArtifactRepositoryResource();
    let allocationStats = 0;

    const attempted = await runWithFileSystem(resource.publishTree({
      address,
      entries: releaseEntries("admission-cleanup-failure"),
      limits: LIMITS,
    }), (base) => fileSystemProxy(base, {
      stat(candidate) {
        if (isPrivateAllocation(candidate) && ++allocationStats >= 2) {
          return Effect.fail(injectedFileSystemFailure("stat", candidate, "persistent admission probe"));
        }
        return base.stat(candidate);
      },
    }));

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("persistent admission probe"),
      cleanupFailure: expect.stringContaining("persistent admission probe"),
    });
    const staging = path.join(address.repositoryRoot, ".staging");
    const [orphan] = await readdir(staging);
    expect(orphan?.startsWith("rawr-agent-plugin-artifact-")).toBe(true);
    if (orphan === undefined) throw new Error("Expected an explicitly unsettled private allocation");
    await rmdir(path.join(staging, orphan));

    const retry = unwrap(await runNodeArtifactRepository(resource.publishTree({
      address,
      entries: releaseEntries("admission-cleanup-failure"),
      limits: LIMITS,
    })));
    expect(retry.kind).toBe("Published");
  });
});

function artifactAddress(repositoryRoot: string, objectId: string): ArtifactObjectAddress {
  return Object.freeze({
    repositoryRoot,
    namespace: ["releases", "sha256"],
    objectId,
  });
}

function evidenceAddress(repositoryRoot: string, objectId: string): ArtifactObjectAddress {
  return Object.freeze({
    repositoryRoot,
    namespace: ["mechanical-evidence", "sha256"],
    objectId,
  });
}

function releaseEntries(value: string): readonly ArtifactTreeEntry[] {
  return Object.freeze([
    Object.freeze({
      path: "release.json",
      mode: 0o444,
      bytes: new TextEncoder().encode(`{"release":"${value}"}\n`),
    }),
    Object.freeze({
      path: "payload/tool.sh",
      mode: 0o755,
      bytes: new TextEncoder().encode(`#!/bin/sh\necho ${value}\n`),
    }),
  ]);
}

function unwrap<A>(result: NodeArtifactRepositoryResult<A>): A {
  if (!result.ok) throw new Error(`${result.failure.reason}: ${result.failure.detail}`);
  return result.value;
}

function text(bytes: Uint8Array | undefined): string {
  if (bytes === undefined) throw new Error("Expected bytes");
  return new TextDecoder().decode(bytes);
}

function stableMetadata(info: Awaited<ReturnType<typeof lstat>>): object {
  return Object.freeze({
    dev: info.dev,
    ino: info.ino,
    mode: info.mode,
    mtimeMs: info.mtimeMs,
    ctimeMs: info.ctimeMs,
  });
}

async function createFixture(): Promise<string> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), FIXTURE_PREFIX)));
  const info = await lstat(root, { bigint: true });
  fixtures.push(Object.freeze({ root, dev: info.dev, ino: info.ino }));
  return root;
}

async function removeOwnedFixture(fixture: OwnedFixture): Promise<void> {
  const parent = await realpath(tmpdir());
  const canonical = await realpath(fixture.root);
  const info = await lstat(fixture.root, { bigint: true });
  if (
    path.dirname(canonical) !== parent
    || !path.basename(canonical).startsWith(FIXTURE_PREFIX)
    || info.dev !== fixture.dev
    || info.ino !== fixture.ino
  ) {
    throw new Error(`Refusing to remove unowned artifact repository fixture: ${fixture.root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}

async function runWithFileSystem<A>(
  operation: Effect.Effect<A, ArtifactRepositoryFailure, FileSystem.FileSystem | Path.Path>,
  transform: (base: FileSystem.FileSystem) => FileSystem.FileSystem,
) {
  return Effect.runPromise(Effect.gen(function* () {
    const base = yield* FileSystem.FileSystem;
    return yield* operation.pipe(
      Effect.provideService(FileSystem.FileSystem, transform(base)),
      Effect.either,
    );
  }).pipe(Effect.provide(NodeContext.layer)));
}

function fileSystemProxy(
  base: FileSystem.FileSystem,
  overrides: Partial<FileSystem.FileSystem>,
): FileSystem.FileSystem {
  return new Proxy(base, {
    get(target, property, receiver) {
      return property in overrides
        ? Reflect.get(overrides, property, receiver)
        : Reflect.get(target, property, receiver);
    },
  });
}

function isPrivateAllocation(candidate: string): boolean {
  return path.basename(candidate).startsWith("rawr-agent-plugin-artifact-");
}

function injectedFileSystemFailure(method: string, candidate: string, description: string): SystemError {
  return new SystemError({
    reason: "Unknown",
    module: "FileSystem",
    method,
    pathOrDescriptor: candidate,
    description,
  });
}
