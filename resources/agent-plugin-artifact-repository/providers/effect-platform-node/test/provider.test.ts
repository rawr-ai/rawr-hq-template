import { lstat, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";

import type {
  ArtifactCommitDecision,
  ArtifactObjectAddress,
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
    const failed = await runNodeArtifactRepository(failing.publishTree({
      address,
      entries: releaseEntries("retry"),
      limits: LIMITS,
    }));
    expect(failed.ok).toBe(false);

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
