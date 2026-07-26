import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContentTreeEntry, ContentWorkspaceFailure } from "@rawr/resource-content-workspace";
import { makeNodeContentWorkspaceResource } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { createCleanContentWorkspaceReader } from "../../../src/service/model/policy/clean-content-workspace";
import {
  type CleanContentWorkspaceReader,
  type ResourceContentWorkspaceSnapshotReadPort,
} from "../../../src/service/model/ports/clean-content-workspace";
import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  parseGitTreeId,
} from "../../../src/service/shared/release";
import {
  commitGeneratedGitRepository,
  createGeneratedGitRepository,
  GIT_EXECUTABLE,
  git,
  unsafeFixturePolicy,
} from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

describe("exact Git-object eligibility", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await disposeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("reads a clean generated repository from Git objects and revalidates the exact binding", async () => {
    const repository = await generated();
    const reader = await realReader();
    const inspected = await Effect.runPromise(reader.inspect(repository.policy));
    expect(inspected.kind).toBe("Eligible");
    if (inspected.kind !== "Eligible") return;
    expect(inspected.snapshot.payloads).toHaveLength(1);
    expect(inspected.snapshot.payloads[0]?.pluginId).toBe(repository.pluginId);
    expect(inspected.snapshot.objectBindings.map((entry) => entry.path)).toEqual([
      ".rawr/release-input.json",
      `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`,
    ]);
    await expect(
      Effect.runPromise(reader.revalidate(repository.policy, inspected.snapshot.eligibilityBinding))
    ).resolves.toMatchObject({
      kind: "Eligible",
    });
  });

  it("ignores unrelated status churn while retaining consumed-root change evidence", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let evidenceCaptures = 0;
    const unrelatedChurn = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.map(delegate.captureGitWorkspaceEvidence(input), (evidence) => {
          evidenceCaptures += 1;
          return Object.freeze({
            ...evidence,
            openingStatus: appendStatusRecords(
              evidence.openingStatus,
              `? scratch/open-${evidenceCaptures}.txt`
            ),
            closingStatus: appendStatusRecords(
              evidence.closingStatus,
              `! .cache/close-${evidenceCaptures}.json`
            ),
          });
        }),
    });

    await expect(
      Effect.runPromise(
        createCleanContentWorkspaceReader({
          contentWorkspace: unrelatedChurn,
        }).inspect(repository.policy)
      )
    ).resolves.toMatchObject({ kind: "Eligible" });
    expect(evidenceCaptures).toBe(2);

    const consumedPath = `plugins/agent/${repository.pluginId}/extra.txt`;
    const consumedChurn = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.map(delegate.captureGitWorkspaceEvidence(input), (evidence) =>
          Object.freeze({
            ...evidence,
            closingStatus: appendStatusRecords(evidence.closingStatus, `? ${consumedPath}`),
          })
        ),
    });
    await expect(
      Effect.runPromise(
        createCleanContentWorkspaceReader({
          contentWorkspace: consumedChurn,
        }).inspect(repository.policy)
      )
    ).resolves.toEqual({
      kind: "Ineligible",
      issues: [
        {
          code: "SourceChanged",
          detail: "tracked or consumed-path status changed during the repository evidence capture",
        },
      ],
    });
  });

  it("uses only the exact Git resource port and never requests worktree file reads", async () => {
    const repository = await generated();
    const delegate = await realPort();
    const observed: string[] = [];
    const treeEntryLimits: number[] = [];
    const blobReadLimits: number[] = [];
    const blobBatchLimits: Array<
      Readonly<{
        maxBlobs: number;
        maxBlobBytes: number;
        maxTotalBytes: number;
      }>
    > = [];
    const worktreeFileLimits: number[] = [];
    const worktreeTotalLimits: number[] = [];
    const contentWorkspace = overrideGitReadPort(delegate, {
      inspectGitWorkspace: (input) =>
        Effect.tap(delegate.inspectGitWorkspace(input), () =>
          Effect.sync(() => {
            observed.push("inspectGitWorkspace");
          })
        ),
      readGitTree: (input) =>
        Effect.tap(delegate.readGitTree(input), () =>
          Effect.sync(() => {
            observed.push("readGitTree");
            treeEntryLimits.push(input.maxEntries);
          })
        ),
      readGitBlob: (input) =>
        Effect.tap(delegate.readGitBlob(input), () =>
          Effect.sync(() => {
            observed.push("readGitBlob");
            blobReadLimits.push(input.maxBytes);
          })
        ),
      readGitBlobs: (input) =>
        Effect.tap(delegate.readGitBlobs(input), () =>
          Effect.sync(() => {
            observed.push("readGitBlobs");
            blobBatchLimits.push({
              maxBlobs: input.maxBlobs,
              maxBlobBytes: input.maxBlobBytes,
              maxTotalBytes: input.maxTotalBytes,
            });
          })
        ),
      captureGitWorkspaceEvidence: (input) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.sync(() => {
            observed.push("captureGitWorkspaceEvidence");
            worktreeFileLimits.push(input.maxWorktreeFileBytes);
            worktreeTotalLimits.push(input.maxWorktreeBytes);
          })
        ),
    });

    const inspected = await Effect.runPromise(
      createCleanContentWorkspaceReader({
        contentWorkspace,
      }).inspect(repository.policy)
    );

    expect(inspected.kind).toBe("Eligible");
    expect(new Set(observed)).toEqual(
      new Set([
        "inspectGitWorkspace",
        "readGitTree",
        "readGitBlob",
        "readGitBlobs",
        "captureGitWorkspaceEvidence",
      ])
    );
    expect(blobReadLimits).toEqual([MAX_RELEASE_INPUT_ENVELOPE_BYTES]);
    expect(treeEntryLimits).toEqual([200_000]);
    expect(blobBatchLimits).toEqual([
      {
        maxBlobs: 200_000,
        maxBlobBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
        maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
      },
    ]);
    expect(worktreeFileLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    ]);
    expect(worktreeTotalLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES + MAX_RELEASE_SET_PAYLOAD_BYTES,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES + MAX_RELEASE_SET_PAYLOAD_BYTES,
    ]);
  });

  it("rejects the first canonical undeclared plugin before reading member blobs", async () => {
    const repository = await generated();
    const zuluRoot = join(repository.root, "plugins", "agent", "zulu", "skills", "zulu");
    const aardvarkRoot = join(
      repository.root,
      "plugins",
      "agent",
      "aardvark",
      "skills",
      "aardvark"
    );
    const unrelatedRoot = join(repository.root, "a-unrelated", "skills", "example");
    await mkdir(zuluRoot, { recursive: true, mode: 0o700 });
    await writeFile(join(zuluRoot, "SKILL.md"), "zulu\n");
    await writeFile(join(zuluRoot, "README.md"), "duplicate zulu root witness\n");
    await mkdir(unrelatedRoot, { recursive: true, mode: 0o700 });
    await writeFile(join(unrelatedRoot, "SKILL.md"), "unrelated\n");
    await mkdir(aardvarkRoot, { recursive: true, mode: 0o700 });
    await writeFile(join(aardvarkRoot, "SKILL.md"), "aardvark\n");
    const policy = await commitGeneratedGitRepository(repository, "add undeclared plugin roots");
    const delegate = await realPort();
    let blobReads = 0;
    let blobBatchReads = 0;
    let evidenceCaptures = 0;
    const contentWorkspace = overrideGitReadPort(delegate, {
      readGitBlob: (input) =>
        Effect.tap(delegate.readGitBlob(input), () =>
          Effect.sync(() => {
            blobReads += 1;
          })
        ),
      readGitBlobs: (input) =>
        Effect.tap(delegate.readGitBlobs(input), () =>
          Effect.sync(() => {
            blobBatchReads += 1;
          })
        ),
      captureGitWorkspaceEvidence: (input) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.sync(() => {
            evidenceCaptures += 1;
          })
        ),
    });

    await expect(
      Effect.runPromise(createCleanContentWorkspaceReader({ contentWorkspace }).inspect(policy))
    ).resolves.toEqual({
      kind: "Ineligible",
      issues: [
        {
          code: "PayloadMismatch",
          detail: "plugin tree contains undeclared member aardvark",
        },
      ],
    });
    expect(blobReads).toBe(1);
    expect(blobBatchReads).toBe(0);
    expect(evidenceCaptures).toBe(0);
  });

  it.each([
    {
      name: "the first code-unit-sorted noncanonical plugin directory",
      paths: [
        "plugins/agent/Zulu/skills/zulu/SKILL.md",
        "plugins/agent/Cognition/skills/cognition/SKILL.md",
      ],
      child: "Cognition",
    },
    {
      name: "a root-level file",
      paths: ["plugins/agent/README.md"],
      child: "README.md",
    },
  ])("rejects $name before reading member blobs", async ({ paths, child }) => {
    const repository = await generated();
    for (const relativePath of paths) {
      const segments = relativePath.split("/");
      const file = join(repository.root, ...segments);
      await mkdir(join(repository.root, ...segments.slice(0, -1)), {
        recursive: true,
        mode: 0o700,
      });
      await writeFile(file, `${child}\n`);
    }
    const unrelatedRoot = join(repository.root, "a-unrelated", "skills", "example");
    await mkdir(unrelatedRoot, { recursive: true, mode: 0o700 });
    await writeFile(join(unrelatedRoot, "SKILL.md"), "unrelated\n");
    const policy = await commitGeneratedGitRepository(
      repository,
      "add noncanonical plugin root child"
    );
    const delegate = await realPort();
    let blobReads = 0;
    let blobBatchReads = 0;
    let evidenceCaptures = 0;
    const contentWorkspace = overrideGitReadPort(delegate, {
      readGitBlob: (input) =>
        Effect.tap(delegate.readGitBlob(input), () =>
          Effect.sync(() => {
            blobReads += 1;
          })
        ),
      readGitBlobs: (input) =>
        Effect.tap(delegate.readGitBlobs(input), () =>
          Effect.sync(() => {
            blobBatchReads += 1;
          })
        ),
      captureGitWorkspaceEvidence: (input) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.sync(() => {
            evidenceCaptures += 1;
          })
        ),
    });

    await expect(
      Effect.runPromise(createCleanContentWorkspaceReader({ contentWorkspace }).inspect(policy))
    ).resolves.toEqual({
      kind: "Ineligible",
      issues: [
        {
          code: "PayloadMismatch",
          detail: `plugin tree contains noncanonical child ${child}`,
        },
      ],
    });
    expect(blobReads).toBe(1);
    expect(blobBatchReads).toBe(0);
    expect(evidenceCaptures).toBe(0);
  });

  it("rejects one resource capture whose opening and closing anchors disagree", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let injected = false;
    const inconsistentPort = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.map(delegate.captureGitWorkspaceEvidence(input), (evidence) => {
          if (injected) return evidence;
          injected = true;
          return Object.freeze({
            ...evidence,
            closingAnchor: Object.freeze({
              ...evidence.closingAnchor,
              tree: mutateObjectId(evidence.closingAnchor.tree),
            }),
          });
        }),
    });

    await expect(
      Effect.runPromise(
        createCleanContentWorkspaceReader({
          contentWorkspace: inconsistentPort,
        }).inspect(repository.policy)
      )
    ).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
    expect(injected).toBe(true);
  });

  it("rejects a payload mutation after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let evidenceCaptures = 0;
    let mutated = false;
    const racingPort = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.gen(function* () {
          const result = yield* delegate.captureGitWorkspaceEvidence(input);
          evidenceCaptures += 1;
          if (evidenceCaptures === 1) {
            mutated = true;
            yield* Effect.promise(() =>
              writeFile(repository.payloadFile, "mutated after final repository anchor\n")
            );
          }
          return result;
        }),
    });

    const inspected = await Effect.runPromise(
      createCleanContentWorkspaceReader({
        contentWorkspace: racingPort,
      }).inspect(repository.policy)
    );

    expect(mutated).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it("rejects a branch switch after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let evidenceCaptures = 0;
    let switched = false;
    const racingPort = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.gen(function* () {
          const result = yield* delegate.captureGitWorkspaceEvidence(input);
          evidenceCaptures += 1;
          if (evidenceCaptures === 1) {
            switched = true;
            yield* Effect.promise(() => git(repository.root, ["checkout", "-b", "raced-branch"]));
          }
          return result;
        }),
    });

    const inspected = await Effect.runPromise(
      createCleanContentWorkspaceReader({
        contentWorkspace: racingPort,
      }).inspect(repository.policy)
    );

    expect(switched).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it.each([
    "assume-unchanged",
    "skip-worktree",
  ] as const)("rejects a late %s transition after the final repository anchor", async (flag) => {
    const repository = await generated();
    const delegate = await realPort();
    const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
    let evidenceCaptures = 0;
    let changed = false;
    const racingPort = overrideGitReadPort(delegate, {
      captureGitWorkspaceEvidence: (input) =>
        Effect.gen(function* () {
          const result = yield* delegate.captureGitWorkspaceEvidence(input);
          evidenceCaptures += 1;
          if (evidenceCaptures === 1) {
            changed = true;
            yield* Effect.promise(() =>
              git(repository.root, ["update-index", `--${flag}`, relativePayload])
            );
          }
          return result;
        }),
    });

    const inspected = await Effect.runPromise(
      createCleanContentWorkspaceReader({
        contentWorkspace: racingPort,
      }).inspect(repository.policy)
    );

    expect(changed).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it("distinguishes tracked, staged, untracked-consumed, and ignored-consumed state", async () => {
    const reader = await realReader();

    const tracked = await generated();
    await writeFile(tracked.payloadFile, "changed\n");
    await expect(Effect.runPromise(reader.inspect(tracked.policy))).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyTrackedWorktree" }],
    });

    await disposeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const staged = await generated();
    await writeFile(staged.payloadFile, "changed\n");
    await git(staged.root, ["add", staged.payloadFile]);
    await expect(Effect.runPromise(reader.inspect(staged.policy))).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyIndex" }],
    });

    await disposeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const untracked = await generated();
    await writeFile(
      join(untracked.root, "plugins", "agent", untracked.pluginId, "extra.txt"),
      "extra\n"
    );
    await expect(Effect.runPromise(reader.inspect(untracked.policy))).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "UntrackedConsumedPath" }],
    });

    await disposeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const ignored = await generated();
    await writeFile(ignored.ignoredFile, "ignored\n");
    await expect(Effect.runPromise(reader.inspect(ignored.policy))).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "IgnoredConsumedPath" }],
    });
  });

  it("rejects a changed binding", async () => {
    const repository = await generated();
    const reader = await realReader();
    const inspected = await Effect.runPromise(reader.inspect(repository.policy));
    expect(inspected.kind).toBe("Eligible");
    if (inspected.kind !== "Eligible") return;
    await writeFile(repository.payloadFile, "changed after snapshot\n");
    await expect(
      Effect.runPromise(reader.revalidate(repository.policy, inspected.snapshot.eligibilityBinding))
    ).resolves.toMatchObject({
      kind: "Ineligible",
    });
  });

  it("retains canonical release-path policy at the typed resource boundary", async () => {
    const repository = await generated();
    const delegate = await realPort();
    const payloadPath = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
    const payloadBlob = await git(repository.root, ["rev-parse", `HEAD:${payloadPath}`]);
    const cases: readonly Readonly<{
      entry: ContentTreeEntry;
      detail: string;
    }>[] = [
      {
        entry: Object.freeze({ path: payloadPath, mode: "100644", blob: payloadBlob }),
        detail: "duplicate path",
      },
      {
        entry: Object.freeze({
          path: `plugins/agent/${repository.pluginId}/skills/example/skill.md`,
          mode: "100644",
          blob: payloadBlob,
        }),
        detail: "collision",
      },
      {
        entry: Object.freeze({
          path: `plugins/agent/${repository.pluginId}/skills/cafe\u0301/SKILL.md`,
          mode: "100644",
          blob: payloadBlob,
        }),
        detail: "noncanonical release path",
      },
    ];

    for (const fixtureCase of cases) {
      const contentWorkspace = overrideGitReadPort(delegate, {
        readGitTree: (input) =>
          Effect.map(delegate.readGitTree(input), (original) =>
            Object.freeze([...original, fixtureCase.entry])
          ),
      });
      await expect(
        Effect.runPromise(
          createCleanContentWorkspaceReader({ contentWorkspace }).inspect(repository.policy)
        )
      ).resolves.toMatchObject({
        kind: "Ineligible",
        issues: [{ code: "InvalidTree", detail: expect.stringContaining(fixtureCase.detail) }],
      });
    }
  });

  it("classifies an unsupported typed Git tree fact as an invalid release tree", async () => {
    const repository = await generated();
    const delegate = await realPort();
    const failure: ContentWorkspaceFailure = Object.freeze({
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-tree",
      reason: "UnsupportedEntry",
      path: "plugins/agent/link",
      detail: "Git tree contains a non-regular entry",
    });
    const contentWorkspace = overrideGitReadPort(delegate, {
      readGitTree: () => Effect.fail(failure),
    });

    await expect(
      Effect.runPromise(
        createCleanContentWorkspaceReader({ contentWorkspace }).inspect(repository.policy)
      )
    ).resolves.toEqual({
      kind: "Ineligible",
      issues: [
        {
          code: "InvalidTree",
          detail: "Git tree contains a non-regular entry",
        },
      ],
    });
  });

  it("distinguishes wrong repository, wrong tree, wrong ref, and aliased locator policy", async () => {
    const repository = await generated();
    const reader = await realReader();
    await expect(
      Effect.runPromise(
        reader.inspect({
          ...repository.policy,
          remoteUrl: "https://example.invalid/different.git",
        })
      )
    ).resolves.toMatchObject({ kind: "Ineligible", issues: [{ code: "WrongRepository" }] });

    const wrongTree = must(parseGitTreeId(mutateObjectId(repository.policy.sourceTree)));
    await expect(
      Effect.runPromise(reader.inspect({ ...repository.policy, sourceTree: wrongTree }))
    ).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "WrongTree" }],
    });
    await expect(
      Effect.runPromise(reader.inspect({ ...repository.policy, refName: "refs/heads/different" }))
    ).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "WrongRef" }],
    });

    const alias = join(fixture!.path, "repository-alias");
    await symlink(repository.root, alias);
    await expect(
      Effect.runPromise(reader.inspect({ ...repository.policy, locator: alias }))
    ).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "AliasedLocator" }],
    });
  });

  it("does not let assume-unchanged index state hide modified worktree bytes", async () => {
    const repository = await generated();
    const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
    await git(repository.root, ["update-index", "--assume-unchanged", relativePayload]);
    await writeFile(repository.payloadFile, "hidden modification\n");
    const reader = await realReader();
    await expect(Effect.runPromise(reader.inspect(repository.policy))).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyIndex" }],
    });
  });

  it("rejects option-like/cast policy values before invoking Git", async () => {
    let calls = 0;
    const reader = createCleanContentWorkspaceReader({
      contentWorkspace: unreachableGitReadPort(() => {
        calls += 1;
      }),
    });
    await expect(
      Effect.runPromise(reader.inspect(unsafeFixturePolicy({ remoteName: "--origin" })))
    ).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(
      Effect.runPromise(reader.inspect(unsafeFixturePolicy({ refName: "--help" })))
    ).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(
      Effect.runPromise(
        reader.inspect(unsafeFixturePolicy({ releaseInputPath: "../release.json" }))
      )
    ).resolves.toMatchObject({
      kind: "Ineligible",
    });
    expect(calls).toBe(0);
  });

  async function generated() {
    fixture = await createOwnedFixtureRoot();
    return await createGeneratedGitRepository(fixture);
  }

  async function realReader(): Promise<CleanContentWorkspaceReader> {
    return createCleanContentWorkspaceReader({
      contentWorkspace: await realPort(),
    });
  }

  async function realPort(): Promise<ResourceContentWorkspaceSnapshotReadPort> {
    return makeNodeContentWorkspaceResource({ gitExecutable: await realpath(GIT_EXECUTABLE) });
  }
});

function overrideGitReadPort(
  delegate: ResourceContentWorkspaceSnapshotReadPort,
  overrides: Partial<ResourceContentWorkspaceSnapshotReadPort>
): ResourceContentWorkspaceSnapshotReadPort {
  return Object.freeze({ ...delegate, ...overrides });
}

function unreachableGitReadPort(onCall: () => void): ResourceContentWorkspaceSnapshotReadPort {
  const unreachable = () =>
    Effect.sync(() => {
      onCall();
      throw new Error("Git resource must remain unreachable");
    });
  return Object.freeze({
    inspectGitWorkspace: unreachable,
    readGitTree: unreachable,
    readGitBlob: unreachable,
    readGitBlobs: unreachable,
    captureGitWorkspaceEvidence: unreachable,
  });
}

function mutateObjectId(value: string): string {
  const final = value.at(-1) === "0" ? "1" : "0";
  return `${value.slice(0, -1)}${final}`;
}

function appendStatusRecords(status: Uint8Array, ...records: readonly string[]): Uint8Array {
  const appended = new TextEncoder().encode(records.map((record) => `${record}\0`).join(""));
  const result = new Uint8Array(status.byteLength + appended.byteLength);
  result.set(status);
  result.set(appended, status.byteLength);
  return result;
}

function must<T, E>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issues: readonly E[] }
): T {
  if (!result.ok) throw new Error(`Git fixture parse failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}
