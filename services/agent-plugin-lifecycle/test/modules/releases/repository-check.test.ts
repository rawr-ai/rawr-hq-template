import { createHash } from "node:crypto";
import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
  GitStagedIndexEntry,
  GitStagedIndexObservation,
  GitTrackedPathFlag,
  GitWorkspaceAnchor,
  GitWorkspaceEvidence,
} from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { ContentWorkspaceInspection } from "../../../src/service/model/dto/content-workspace";
import { payloadEntryBytes } from "../../../src/service/model/policy/agent-plugin-payload";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../src/service/model/policy/release-input-codec";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../src/service/model/policy/release-payload-accounting";
import {
  addStagedObservationByteLimits,
  classifyStagedObservationFailure,
  MAX_STAGED_INDEX_BYTES,
  MAX_STAGED_INDEX_ENTRIES,
  MAX_STAGED_MATERIALIZED_BLOB_BYTES,
} from "../../../src/service/modules/releases/model/policy/staged-content-workspace";
import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";

const repositoryIdentity = parsed(parseRepositoryIdentity("git:personal-rawr-hq"));
const contentAuthority = parsed(parseContentAuthority("personal-rawr-hq"));
const headCommit = parsed(parseGitCommitId("a".repeat(40)));
const headTree = parsed(parseGitTreeId("b".repeat(40)));
const releaseInputPath = parsed(parseReleaseRelativePath(".rawr/release-input.json"));
const pluginRoot = parsed(parseReleaseRelativePath("plugins/agent"));
const remoteUrl = "https://example.invalid/rawr-hq.git";

describe("releases.checkRepository", () => {
  it("binds and revalidates one exact staged index and selected blob snapshot", async () => {
    const fixture = productFixture();
    const stagedEntries = [
      stagedEntry(
        releaseInputPath,
        "1".repeat(40),
        0o644,
        canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)
      ),
      stagedEntry(
        "plugins/agent/alpha/agents/alpha.md",
        "2".repeat(40),
        0o644,
        bytes("agent alpha\n")
      ),
      stagedEntry(
        "plugins/agent/alpha/skills/alpha/SKILL.md",
        "3".repeat(40),
        0o644,
        bytes("alpha\n")
      ),
      stagedEntry(
        "plugins/agent/beta/scripts/check.sh",
        "4".repeat(40),
        0o755,
        bytes("#!/bin/sh\nexit 0\n")
      ),
      stagedEntry(
        "plugins/agent/beta/skills/beta/SKILL.md",
        "5".repeat(40),
        0o644,
        bytes("beta\n")
      ),
      stagedEntry("unrelated/large.bin", "6".repeat(40), 0o644, bytes("x".repeat(1024))),
    ].sort((left, right) => left.path.localeCompare(right.path));
    const entries = stagedIndexEntries(stagedEntries);
    const selections: Array<Readonly<{ paths: readonly string[]; roots: readonly string[] }>> = [];
    const entryLimits: number[] = [];
    const indexLimits: number[] = [];
    const blobLimits: number[] = [];
    let fullMaterializations = 0;
    const rawPort: Pick<ContentWorkspaceResource<never>, "observeGitStagedIndex"> = {
      observeGitStagedIndex: (input) =>
        Effect.sync(() => {
          selections.push({ paths: input.materializedPaths, roots: input.materializedRoots });
          entryLimits.push(input.maxEntries);
          indexLimits.push(input.maxIndexBytes);
          blobLimits.push(input.maxBlobBytes);
          const selected = stagedEntries.filter(
            (entry) =>
              input.materializedPaths.includes(entry.path) ||
              input.materializedRoots.some(
                (root) => entry.path === root || entry.path.startsWith(`${root}/`)
              )
          );
          if (input.materializedRoots.length > 0) fullMaterializations += 1;
          const observed = fullMaterializations === 2 ? [...selected].reverse() : selected;
          return {
            opening: { anchor: stagedAnchor(), entries },
            blobs: observed.map((entry) => ({ objectId: entry.objectId, bytes: entry.bytes })),
            closing: { anchor: stagedAnchor(), entries },
          };
        }),
    };
    const client = createLifecycleTestClient({
      contentWorkspace: { ...unavailableContentWorkspace(), ...rawPort },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "StagedRepositoryEligible",
      repositoryIdentity,
      refName: "refs/heads/main",
      headCommit,
      headTree,
      stagedBinding: expect.any(String),
    });
    expect(selections).toEqual([
      { paths: [releaseInputPath], roots: [] },
      { paths: [releaseInputPath], roots: ["plugins/agent/alpha", "plugins/agent/beta"] },
      { paths: [releaseInputPath], roots: [] },
      { paths: [releaseInputPath], roots: ["plugins/agent/alpha", "plugins/agent/beta"] },
    ]);
    expect(selections).toHaveLength(4);
    expect(entryLimits).toEqual([
      MAX_STAGED_INDEX_ENTRIES,
      MAX_STAGED_INDEX_ENTRIES,
      MAX_STAGED_INDEX_ENTRIES,
      MAX_STAGED_INDEX_ENTRIES,
    ]);
    expect(indexLimits).toEqual([
      MAX_STAGED_INDEX_BYTES,
      MAX_STAGED_INDEX_BYTES,
      MAX_STAGED_INDEX_BYTES,
      MAX_STAGED_INDEX_BYTES,
    ]);
    expect(blobLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_STAGED_MATERIALIZED_BLOB_BYTES,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_STAGED_MATERIALIZED_BLOB_BYTES,
    ]);
  });

  it("rejects the first canonical undeclared staged plugin after one read and zero writes", async () => {
    await expectStagedTreeClosureRefusal(
      [
        stagedEntry(
          "plugins/agent/zulu/skills/zulu/SKILL.md",
          "2".repeat(40),
          0o644,
          bytes("zulu\n")
        ),
        stagedEntry(
          "plugins/agent/zulu/agents/zulu.md",
          "3".repeat(40),
          0o644,
          bytes("zulu agent\n")
        ),
        stagedEntry(
          "a-unrelated/skills/example/SKILL.md",
          "4".repeat(40),
          0o644,
          bytes("unrelated\n")
        ),
        stagedEntry(
          "plugins/agent/aardvark/skills/aardvark/SKILL.md",
          "5".repeat(40),
          0o644,
          bytes("aardvark\n")
        ),
      ],
      "plugin tree contains undeclared member aardvark"
    );
  });

  it.each([
    {
      name: "the first code-unit-sorted noncanonical plugin directory",
      entries: [
        stagedEntry(
          "plugins/agent/Zulu/skills/zulu/SKILL.md",
          "2".repeat(40),
          0o644,
          bytes("zulu\n")
        ),
        stagedEntry(
          "plugins/agent/Cognition/skills/cognition/SKILL.md",
          "3".repeat(40),
          0o644,
          bytes("cognition\n")
        ),
        stagedEntry(
          "a-unrelated/skills/example/SKILL.md",
          "4".repeat(40),
          0o644,
          bytes("unrelated\n")
        ),
      ],
      child: "Cognition",
    },
    {
      name: "a root-level file",
      entries: [
        stagedEntry("plugins/agent/README.md", "2".repeat(40), 0o644, bytes("readme\n")),
        stagedEntry("a-unrelated/README.md", "3".repeat(40), 0o644, bytes("unrelated\n")),
      ],
      child: "README.md",
    },
    {
      name: "a root-level file named for a declared plugin",
      entries: [
        stagedEntry(
          "plugins/agent/alpha",
          "2".repeat(40),
          0o644,
          bytes("not a plugin directory\n")
        ),
        stagedEntry("a-unrelated/README.md", "3".repeat(40), 0o644, bytes("unrelated\n")),
      ],
      child: "alpha",
    },
  ])("rejects $name after one read and zero writes", async ({ entries, child }) => {
    await expectStagedTreeClosureRefusal(
      entries,
      `plugin tree contains noncanonical child ${child}`
    );
  });

  it("returns SourceChanged once for a mixed staged observation and performs zero writes", async () => {
    let observations = 0;
    let writes = 0;
    const opening = stagedAnchor();
    const rawObservation: GitStagedIndexObservation = {
      opening: {
        anchor: opening,
        entries: [
          Object.freeze({ path: "bad", mode: "100644", objectId: "c".repeat(40), stage: 0 }),
        ],
      },
      blobs: [],
      closing: {
        anchor: opening,
        entries: [
          Object.freeze({ path: "changed", mode: "100644", objectId: "d".repeat(40), stage: 0 }),
        ],
      },
    };
    const rawPort = {
      observeGitStagedIndex: () =>
        Effect.sync(() => {
          observations += 1;
          return rawObservation;
        }),
      capture: () =>
        Effect.sync(() => {
          writes += 1;
          throw new Error("staged validation acquired capture authority");
        }),
      apply: () =>
        Effect.sync(() => {
          writes += 1;
          throw new Error("staged validation acquired write authority");
        }),
      restore: () =>
        Effect.sync(() => {
          writes += 1;
          throw new Error("staged validation acquired restore authority");
        }),
      settle: () =>
        Effect.sync(() => {
          writes += 1;
          throw new Error("staged validation acquired settlement authority");
        }),
      release: () =>
        Effect.sync(() => {
          writes += 1;
          throw new Error("staged validation acquired release authority");
        }),
    };
    const client = createLifecycleTestClient({
      contentWorkspace: { ...unavailableContentWorkspace(), ...rawPort },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(observations).toBe(1);
    expect(writes).toBe(0);
  });

  it("returns SourceChanged after one read when the closing staged anchor changes", async () => {
    let observations = 0;
    const [releaseInputObservation] = validStagedObservationResults();
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () =>
          Effect.sync(() => {
            observations += 1;
            return anchorChangedObservation(releaseInputObservation);
          }),
      },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(observations).toBe(1);
  });

  it("maps a typed resource failure to the closed GitFailure result", async () => {
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () =>
          Effect.fail(contentWorkspaceFailure("GitFailed", "staged index read failed")),
      },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code: "GitFailure", detail: "staged index read failed" }],
    });
  });

  it("keeps aliased, invalid, and overflow provider failures distinct", async () => {
    const cases = [
      { reason: "Aliased", code: "AliasedLocator" },
      { reason: "InvalidInput", code: "InvalidTree" },
      { reason: "UnsupportedEntry", code: "InvalidTree" },
      { reason: "LimitExceeded", code: "ReleaseInputMismatch" },
    ] as const;

    for (const fixture of cases) {
      const client = createLifecycleTestClient({
        contentWorkspace: {
          ...unavailableContentWorkspace(),
          observeGitStagedIndex: () =>
            Effect.fail(contentWorkspaceFailure(fixture.reason, `${fixture.reason} fixture`)),
        },
      });

      await expect(
        client.releases.checkRepository(
          {
            kind: "staged",
            contentWorkspace: stagedPolicy(),
          },
          testInvocation
        )
      ).resolves.toEqual({
        kind: "RepositoryIneligible",
        mode: "staged",
        issues: [{ code: fixture.code, detail: `${fixture.reason} fixture` }],
      });
    }

    expect(
      classifyStagedObservationFailure(
        contentWorkspaceFailure("LimitExceeded", "payload overflow"),
        "payloads"
      )
    ).toEqual({
      kind: "StagedContentWorkspaceIneligible",
      issues: [{ code: "PayloadMismatch", detail: "payload overflow" }],
    });
  });

  it.each([
    {
      name: "an unmerged conflict stage",
      code: "DirtyIndex",
      entries: (baseline: readonly GitStagedIndexEntry[]): readonly GitStagedIndexEntry[] =>
        baseline.map<GitStagedIndexEntry>((entry, index) =>
          index === 0 ? Object.freeze({ ...entry, stage: 1 }) : entry
        ),
    },
    {
      name: "a nonregular staged mode",
      code: "InvalidTree",
      entries: (baseline: readonly GitStagedIndexEntry[]): readonly GitStagedIndexEntry[] =>
        baseline.map<GitStagedIndexEntry>((entry, index) =>
          index === 0 ? Object.freeze({ ...entry, mode: "160000" }) : entry
        ),
    },
    {
      name: "a nonregular unmerged entry",
      code: "InvalidTree",
      entries: (baseline: readonly GitStagedIndexEntry[]): readonly GitStagedIndexEntry[] =>
        baseline.map<GitStagedIndexEntry>((entry, index) =>
          index === 0 ? Object.freeze({ ...entry, mode: "160000", stage: 2 }) : entry
        ),
    },
    {
      name: "a case-folded path collision",
      code: "InvalidTree",
      entries: (baseline: readonly GitStagedIndexEntry[]): readonly GitStagedIndexEntry[] =>
        Object.freeze([
          ...baseline,
          Object.freeze({
            path: firstStagedIndexEntry(baseline).path.toUpperCase(),
            mode: "100644",
            objectId: "e".repeat(40),
            stage: 0,
          }) satisfies GitStagedIndexEntry,
        ]),
    },
    {
      name: "an NFC-equivalent path collision",
      code: "InvalidTree",
      entries: (baseline: readonly GitStagedIndexEntry[]): readonly GitStagedIndexEntry[] =>
        Object.freeze([
          ...baseline,
          Object.freeze({
            path: "plugins/agent/alpha/café.txt",
            mode: "100644",
            objectId: "e".repeat(40),
            stage: 0,
          }) satisfies GitStagedIndexEntry,
          Object.freeze({
            path: "plugins/agent/alpha/cafe\u0301.txt",
            mode: "100644",
            objectId: "f".repeat(40),
            stage: 0,
          }) satisfies GitStagedIndexEntry,
        ]),
    },
  ])("keeps $name as Releases-owned eligibility policy", async ({ code, entries }) => {
    const [baseline] = validStagedObservationResults();
    const observation = withStagedEntries(baseline, entries(baseline.opening.entries));
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () => Effect.succeed(observation),
      },
    });

    await expect(
      client.releases.checkRepository(
        { kind: "staged", contentWorkspace: stagedPolicy() },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code }],
    });
  });

  it("reports a staged release-input deletion as an absent required source", async () => {
    const [baseline] = validStagedObservationResults();
    const observation = withStagedEntries(
      Object.freeze({ ...baseline, blobs: Object.freeze([]) }),
      baseline.opening.entries.filter((entry) => entry.path !== releaseInputPath)
    );
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () => Effect.succeed(observation),
      },
    });

    await expect(
      client.releases.checkRepository(
        { kind: "staged", contentWorkspace: stagedPolicy() },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [
        {
          code: "MissingReleaseInput",
          detail: `missing staged release input ${releaseInputPath}`,
        },
      ],
    });
  });

  it("admits the maximum release-input envelope plus aggregate payload without unsafe overflow", () => {
    expect(
      addStagedObservationByteLimits(
        MAX_RELEASE_INPUT_ENVELOPE_BYTES,
        MAX_RELEASE_SET_PAYLOAD_BYTES
      )
    ).toEqual({ ok: true, value: MAX_STAGED_MATERIALIZED_BLOB_BYTES });
    expect(MAX_STAGED_MATERIALIZED_BLOB_BYTES).toBe(
      MAX_RELEASE_INPUT_ENVELOPE_BYTES + MAX_RELEASE_SET_PAYLOAD_BYTES
    );
    expect(addStagedObservationByteLimits(Number.MAX_SAFE_INTEGER, 1)).toEqual({ ok: false });
    expect(addStagedObservationByteLimits(-1, MAX_RELEASE_SET_PAYLOAD_BYTES)).toEqual({
      ok: false,
    });
  });

  it("returns only the clean mismatch after final exact revalidation", async () => {
    const eligible = cleanEligibleInspection();
    let cleanReads = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: cleanContentWorkspace(eligible, {
        onInspect: () => {
          cleanReads += 1;
        },
        treeAfterFirstInspect: "c".repeat(40),
      }),
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "clean",
          contentWorkspace: cleanPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "clean",
      issues: [{ code: "WrongTree", detail: expect.stringContaining("observed") }],
    });
    expect(cleanReads).toBe(2);
  });

  it("returns the clean result while the staged port remains cold", async () => {
    let cleanReads = 0;
    let stagedReads = 0;
    const operations: string[] = [];
    const eligible = cleanEligibleInspection();
    const client = createLifecycleTestClient({
      contentWorkspace: cleanContentWorkspace(eligible, {
        onInspect: () => {
          cleanReads += 1;
        },
        onStagedObserve: () => {
          stagedReads += 1;
        },
        onOperation: (operation) => {
          operations.push(operation);
        },
      }),
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "clean",
          contentWorkspace: cleanPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "CleanRepositoryEligible",
      repositoryIdentity,
      refName: "refs/heads/main",
      sourceCommit: headCommit,
      sourceTree: headTree,
      eligibilityBinding: expect.any(String),
    });
    expect(cleanReads).toBe(2);
    expect(stagedReads).toBe(0);
    expect(operations).toEqual([
      "inspectGitWorkspace",
      "readGitTree",
      "readGitBlob",
      "readGitBlobs",
      "captureGitWorkspaceEvidence",
      "captureGitWorkspaceEvidence",
      "inspectGitWorkspace",
      "readGitTree",
      "readGitBlob",
      "readGitBlobs",
      "captureGitWorkspaceEvidence",
      "captureGitWorkspaceEvidence",
    ]);
  });

  it("classifies a binding-only clean revalidation difference as SourceChanged", async () => {
    const eligible = cleanEligibleInspection();
    const client = createLifecycleTestClient({
      contentWorkspace: cleanContentWorkspace(eligible, {
        indexAfterFirstInspect: bytes("changed clean index evidence"),
      }),
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "clean",
          contentWorkspace: cleanPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "clean",
      issues: [
        {
          code: "SourceChanged",
          detail: "repository, ref, index, worktree, or object bindings changed",
        },
      ],
    });
  });

  it("reports a final staged revalidation race once without retry or write authority", async () => {
    let observations = 0;
    const [releaseInputObservation, materializationObservation] = validStagedObservationResults();
    const changedObservation = sourceChangedObservation(releaseInputObservation);
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () =>
          Effect.sync(() => {
            observations += 1;
            if (observations === 1) return releaseInputObservation;
            if (observations === 2) return materializationObservation;
            return changedObservation;
          }),
      },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(observations).toBe(3);
  });

  it("returns the dedicated staged result without mutation authority", async () => {
    let observations = 0;
    const observationResults = validStagedObservationResults();
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: () =>
          Effect.sync(() => {
            const observation = observationResults[observations % observationResults.length];
            observations += 1;
            if (observation === undefined) throw new Error("Missing staged observation fixture");
            return observation;
          }),
      },
    });

    await expect(
      client.releases.checkRepository(
        {
          kind: "staged",
          contentWorkspace: stagedPolicy(),
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "StagedRepositoryEligible",
      repositoryIdentity,
      refName: "refs/heads/main",
      headCommit,
      headTree,
      stagedBinding: expect.any(String),
    });
    expect(observations).toBe(4);
  });
});

async function expectStagedTreeClosureRefusal(
  treeEntries: readonly ReturnType<typeof stagedEntry>[],
  expectedDetail: string
): Promise<void> {
  const fixture = productFixture();
  const releaseInput = stagedEntry(
    releaseInputPath,
    "1".repeat(40),
    0o644,
    canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)
  );
  const stagedEntries = [...treeEntries, releaseInput];
  const binding = Object.freeze({
    anchor: stagedAnchor(),
    entries: stagedIndexEntries(stagedEntries),
  });
  let observations = 0;
  let writes = 0;
  const rawPort = {
    observeGitStagedIndex: (): Effect.Effect<GitStagedIndexObservation> =>
      Effect.sync(() => {
        observations += 1;
        return Object.freeze({
          opening: binding,
          blobs: Object.freeze([{ objectId: releaseInput.objectId, bytes: releaseInput.bytes }]),
          closing: binding,
        });
      }),
    capture: () =>
      Effect.sync(() => {
        writes += 1;
        throw new Error("staged tree closure acquired capture authority");
      }),
    apply: () =>
      Effect.sync(() => {
        writes += 1;
        throw new Error("staged tree closure acquired write authority");
      }),
    restore: () =>
      Effect.sync(() => {
        writes += 1;
        throw new Error("staged tree closure acquired restore authority");
      }),
    settle: () =>
      Effect.sync(() => {
        writes += 1;
        throw new Error("staged tree closure acquired settlement authority");
      }),
    release: () =>
      Effect.sync(() => {
        writes += 1;
        throw new Error("staged tree closure acquired release authority");
      }),
  };
  const client = createLifecycleTestClient({
    contentWorkspace: { ...unavailableContentWorkspace(), ...rawPort },
  });

  await expect(
    client.releases.checkRepository(
      {
        kind: "staged",
        contentWorkspace: stagedPolicy(),
      },
      testInvocation
    )
  ).resolves.toEqual({
    kind: "RepositoryIneligible",
    mode: "staged",
    issues: [{ code: "PayloadMismatch", detail: expectedDetail }],
  });
  expect(observations).toBe(1);
  expect(writes).toBe(0);
}

function validStagedObservationResults(): readonly [
  GitStagedIndexObservation,
  GitStagedIndexObservation,
] {
  const fixture = productFixture();
  const entries = [
    stagedEntry(
      releaseInputPath,
      "1".repeat(40),
      0o644,
      canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)
    ),
    stagedEntry(
      "plugins/agent/alpha/agents/alpha.md",
      "2".repeat(40),
      0o644,
      bytes("agent alpha\n")
    ),
    stagedEntry(
      "plugins/agent/alpha/skills/alpha/SKILL.md",
      "3".repeat(40),
      0o644,
      bytes("alpha\n")
    ),
    stagedEntry(
      "plugins/agent/beta/scripts/check.sh",
      "4".repeat(40),
      0o755,
      bytes("#!/bin/sh\nexit 0\n")
    ),
    stagedEntry("plugins/agent/beta/skills/beta/SKILL.md", "5".repeat(40), 0o644, bytes("beta\n")),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const binding = Object.freeze({
    anchor: stagedAnchor(),
    entries: stagedIndexEntries(entries),
  });
  const observe = (selected: readonly (typeof entries)[number][]): GitStagedIndexObservation =>
    Object.freeze({
      opening: binding,
      blobs: Object.freeze(
        selected.map((entry) =>
          Object.freeze({
            objectId: entry.objectId,
            bytes: entry.bytes,
          })
        )
      ),
      closing: binding,
    });
  const releaseInputEntry = entries.find((entry) => entry.path === releaseInputPath);
  if (releaseInputEntry === undefined) throw new Error("Missing staged release-input fixture");
  return Object.freeze([observe([releaseInputEntry]), observe(entries)]);
}

function sourceChangedObservation(result: GitStagedIndexObservation): GitStagedIndexObservation {
  return Object.freeze({
    opening: result.opening,
    blobs: result.blobs,
    closing: Object.freeze({
      anchor: result.closing.anchor,
      entries: Object.freeze([
        Object.freeze({
          path: "changed",
          mode: "100644",
          objectId: "f".repeat(40),
          stage: 0,
        }),
      ]),
    }),
  });
}

function anchorChangedObservation(result: GitStagedIndexObservation): GitStagedIndexObservation {
  return Object.freeze({
    opening: result.opening,
    blobs: result.blobs,
    closing: Object.freeze({
      anchor: Object.freeze({
        ...result.closing.anchor,
        tree: "c".repeat(40),
      }),
      entries: result.closing.entries,
    }),
  });
}

function withStagedEntries(
  observation: GitStagedIndexObservation,
  entries: readonly GitStagedIndexEntry[]
): GitStagedIndexObservation {
  const binding = Object.freeze({ anchor: observation.opening.anchor, entries });
  return Object.freeze({
    opening: binding,
    blobs: observation.blobs,
    closing: binding,
  });
}

function firstStagedIndexEntry(entries: readonly GitStagedIndexEntry[]): GitStagedIndexEntry {
  const first = entries[0];
  if (first === undefined) throw new Error("Expected a nonempty staged-index fixture");
  return first;
}

function contentWorkspaceFailure(
  reason: ContentWorkspaceFailure["reason"],
  detail: string
): ContentWorkspaceFailure {
  return Object.freeze({
    _tag: "ContentWorkspaceFailure",
    operation: "observe-git-staged-index",
    reason,
    detail,
  });
}

function stagedPolicy() {
  return {
    locator: "/tmp/content-workspace",
    repositoryIdentity,
    contentAuthority,
    remoteName: "origin",
    remoteUrl,
    refName: "refs/heads/main",
    releaseInputPath,
    pluginRoot,
  } as const;
}

function cleanPolicy() {
  return {
    ...stagedPolicy(),
    sourceCommit: headCommit,
    sourceTree: headTree,
  };
}

function stagedAnchor(): GitWorkspaceAnchor {
  return {
    root: "/tmp/content-workspace",
    rootDevice: "1",
    rootInode: "2",
    refName: "refs/heads/main",
    commit: headCommit,
    refCommit: headCommit,
    tree: headTree,
    objectFormat: "sha1",
    remoteUrls: [remoteUrl],
  };
}

function stagedEntry(path: string, objectId: string, mode: 0o644 | 0o755, entryBytes: Uint8Array) {
  return Object.freeze({ path, objectId, mode, bytes: entryBytes });
}

function stagedIndexEntries(
  entries: readonly ReturnType<typeof stagedEntry>[]
): readonly GitStagedIndexEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode === 0o755 ? "100755" : "100644",
        objectId: entry.objectId,
        stage: 0,
      })
    )
  );
}

function cleanContentWorkspace(
  eligible: Extract<ContentWorkspaceInspection, { kind: "Eligible" }>,
  options: Readonly<{
    indexAfterFirstInspect?: Uint8Array;
    onInspect?: () => void;
    onOperation?: (operation: string) => void;
    onStagedObserve?: () => void;
    treeAfterFirstInspect?: string;
  }> = {}
): ContentWorkspaceResource<never> {
  const blobs = new Map<string, Uint8Array>();
  const entries: Array<
    Readonly<{
      path: string;
      mode: 0o644 | 0o755;
      objectId: string;
    }>
  > = [];
  const addBlob = (path: string, mode: 0o644 | 0o755, value: Uint8Array) => {
    const objectId = gitBlobId(value);
    blobs.set(objectId, value);
    entries.push(Object.freeze({ path, mode, objectId }));
  };

  addBlob(
    releaseInputPath,
    0o644,
    canonicalSerializeAgentPluginReleaseInput(eligible.snapshot.releaseInput)
  );
  for (const member of eligible.snapshot.payloads) {
    for (const entry of member.payload.entries) {
      addBlob(
        `${pluginRoot}/${member.pluginId}/${entry.path}`,
        entry.mode,
        payloadEntryBytes(entry)
      );
    }
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  const treeEntries = Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode === 0o755 ? "100755" : "100644",
        blob: entry.objectId,
      })
    )
  );
  const treeBytes = bytes(
    entries
      .map(
        (entry) =>
          `${entry.mode === 0o755 ? "100755" : "100644"} blob ${entry.objectId}\t${entry.path}\0`
      )
      .join("")
  );
  let inspections = 0;

  const contentWorkspace: ContentWorkspaceResource<never> = {
    ...unavailableContentWorkspace(),
    inspectGitWorkspace: () =>
      Effect.sync(() => {
        options.onOperation?.("inspectGitWorkspace");
        inspections += 1;
        options.onInspect?.();
        return inspections > 1 && options.treeAfterFirstInspect !== undefined
          ? Object.freeze({ ...stagedAnchor(), tree: options.treeAfterFirstInspect })
          : stagedAnchor();
      }),
    readGitTree: () =>
      Effect.sync(() => {
        options.onOperation?.("readGitTree");
        return treeEntries;
      }),
    readGitBlob: (input) =>
      Effect.sync(() => {
        options.onOperation?.("readGitBlob");
        const value = blobs.get(input.blob);
        if (value === undefined) throw new Error(`Missing clean Git blob ${input.blob}`);
        return new Uint8Array(value);
      }),
    readGitBlobs: (input) =>
      Effect.sync(() => {
        options.onOperation?.("readGitBlobs");
        return input.blobs.map((blob) => {
          const value = blobs.get(blob);
          if (value === undefined) throw new Error(`Missing clean Git blob ${blob}`);
          return Object.freeze({ blob, bytes: new Uint8Array(value) });
        });
      }),
    captureGitWorkspaceEvidence: (input): Effect.Effect<GitWorkspaceEvidence> =>
      Effect.sync(() => {
        options.onOperation?.("captureGitWorkspaceEvidence");
        const trackedFlags = Object.freeze(
          input.admittedPaths.map(
            (path): GitTrackedPathFlag =>
              Object.freeze({
                path,
                status: "Cached",
                assumeUnchanged: false,
              })
          )
        );
        const worktreeObjectIds = input.admittedPaths.map((path) => {
          const entry = byPath.get(path);
          if (entry === undefined) throw new Error(`Missing admitted clean path ${path}`);
          return Object.freeze({ path, objectId: entry.objectId });
        });
        return Object.freeze({
          openingAnchor: stagedAnchor(),
          openingStatus: new Uint8Array(),
          openingTrackedFlags: trackedFlags,
          worktreeObjectIds: Object.freeze(worktreeObjectIds),
          indexEntries:
            inspections > 1 && options.indexAfterFirstInspect !== undefined
              ? options.indexAfterFirstInspect
              : treeBytes,
          closingAnchor: stagedAnchor(),
          closingStatus: new Uint8Array(),
          closingTrackedFlags: trackedFlags,
        });
      }),
    observeGitStagedIndex: () => {
      options.onOperation?.("observeGitStagedIndex");
      options.onStagedObserve?.();
      return Effect.die(new Error("Unexpected staged observation"));
    },
  };
  return Object.freeze(contentWorkspace);
}

function cleanEligibleInspection(): Extract<ContentWorkspaceInspection, { kind: "Eligible" }> {
  const fixture = productFixture();
  return {
    kind: "Eligible",
    snapshot: {
      repositoryIdentity,
      sourceCommit: headCommit,
      sourceTree: headTree,
      releaseInput: fixture.releaseInput,
      payloads: [
        {
          pluginId: fixture.alphaRelease.body.pluginId,
          payload: fixture.alphaPayload,
        },
        {
          pluginId: fixture.betaRelease.body.pluginId,
          payload: fixture.betaPayload,
        },
      ],
      objectBindings: [],
      eligibilityBinding: "clean-binding-v1",
    },
  };
}

function gitBlobId(value: Uint8Array): string {
  const hash = createHash("sha1");
  hash.update(bytes(`blob ${value.byteLength}\0`));
  hash.update(value);
  return hash.digest("hex");
}

function parsed<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error("Invalid repository-check fixture");
  return result.value;
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
