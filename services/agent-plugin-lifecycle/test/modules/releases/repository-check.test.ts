import { createHash } from "node:crypto";
import type {
  ContentWorkspaceNodeAsyncPort,
  ContentWorkspaceFailure,
  GitStagedIndexObservation,
  GitWorkspaceAnchor,
  GitWorkspaceEvidence,
} from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";

import type { ResourceContentWorkspaceStagedReadPort } from "../../../src/service/modules/releases/repository/staged-content-workspace";
import type {
  ContentWorkspaceInspection,
  StagedIndexObservationResult,
} from "../../../src/service/model/dependencies/releases";
import {
  addStagedObservationByteLimits,
  classifyStagedObservationFailure,
  MAX_STAGED_MATERIALIZED_BLOB_BYTES,
} from "../../../src/service/modules/releases/model/policy/staged-content-workspace";
import {
  parseContentAuthority,
  canonicalSerializeAgentPluginReleaseInput,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  parseGitCommitId,
  parseGitTreeId,
  payloadEntryBytes,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableArtifactRepository,
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
      stagedEntry(releaseInputPath, "1".repeat(40), 0o644, canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)),
      stagedEntry("plugins/agent/alpha/agents/alpha.md", "2".repeat(40), 0o644, bytes("agent alpha\n")),
      stagedEntry("plugins/agent/alpha/skills/alpha/SKILL.md", "3".repeat(40), 0o644, bytes("alpha\n")),
      stagedEntry("plugins/agent/beta/scripts/check.sh", "4".repeat(40), 0o755, bytes("#!/bin/sh\nexit 0\n")),
      stagedEntry("plugins/agent/beta/skills/beta/SKILL.md", "5".repeat(40), 0o644, bytes("beta\n")),
      stagedEntry("unrelated/large.bin", "6".repeat(40), 0o644, bytes("x".repeat(1024))),
    ].sort((left, right) => left.path.localeCompare(right.path));
    const indexEntries = bytes(stagedEntries.map((entry) => (
      `${entry.mode === 0o755 ? "100755" : "100644"} ${entry.objectId} 0\t${entry.path}\0`
    )).join(""));
    const selections: Array<Readonly<{ paths: readonly string[]; roots: readonly string[] }>> = [];
    const blobLimits: number[] = [];
    let fullMaterializations = 0;
    const rawPort: ResourceContentWorkspaceStagedReadPort = {
      observeGitStagedIndex: async (input) => {
        selections.push({ paths: input.materializedPaths, roots: input.materializedRoots });
        blobLimits.push(input.maxBlobBytes);
        const selected = stagedEntries.filter((entry) => (
          input.materializedPaths.includes(entry.path)
          || input.materializedRoots.some((root) => entry.path === root || entry.path.startsWith(`${root}/`))
        ));
        if (input.materializedRoots.length > 0) fullMaterializations += 1;
        const observed = fullMaterializations === 2 ? [...selected].reverse() : selected;
        return {
          opening: { anchor: stagedAnchor(), indexEntries },
          blobs: observed.map((entry) => ({ objectId: entry.objectId, bytes: entry.bytes })),
          closing: { anchor: stagedAnchor(), indexEntries },
        };
      },
    };
    const client = createLifecycleTestClient({
      contentWorkspace: { ...unavailableContentWorkspace(), ...rawPort },
      artifactRepository: unavailableArtifactRepository(() => {
        throw new Error("staged repository check acquired artifact authority");
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "staged",
      contentWorkspace: stagedPolicy(),
    }, testInvocation)).resolves.toMatchObject({
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
    expect(blobLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_STAGED_MATERIALIZED_BLOB_BYTES,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_STAGED_MATERIALIZED_BLOB_BYTES,
    ]);
  });

  it("returns SourceChanged once for a mixed staged observation and performs zero writes", async () => {
    let observations = 0;
    let writes = 0;
    const opening = stagedAnchor();
    const rawObservation: GitStagedIndexObservation = {
      opening: { anchor: opening, indexEntries: bytes("100644 " + "c".repeat(40) + " 0\tbad\0") },
      blobs: [],
      closing: { anchor: opening, indexEntries: bytes("malformed-new-index\0") },
    };
    const rawPort = {
      observeGitStagedIndex: async () => {
        observations += 1;
        return rawObservation;
      },
      capture: async () => {
        writes += 1;
        throw new Error("staged validation acquired capture authority");
      },
      apply: async () => {
        writes += 1;
        throw new Error("staged validation acquired write authority");
      },
      restore: async () => {
        writes += 1;
        throw new Error("staged validation acquired restore authority");
      },
      settle: async () => {
        writes += 1;
        throw new Error("staged validation acquired settlement authority");
      },
      release: async () => {
        writes += 1;
        throw new Error("staged validation acquired release authority");
      },
    };
    const client = createLifecycleTestClient({
      contentWorkspace: { ...unavailableContentWorkspace(), ...rawPort },
      artifactRepository: unavailableArtifactRepository(() => {
        writes += 1;
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "staged",
      contentWorkspace: stagedPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(observations).toBe(1);
    expect(writes).toBe(0);
  });

  it("maps dependency errors with ambient codes to the closed GitFailure result", async () => {
    const dependencyFailure = Object.assign(new Error("staged index read failed"), { code: "EIO" });
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => {
          throw dependencyFailure;
        },
      },
      artifactRepository: unavailableArtifactRepository(() => {
        throw new Error("staged repository check acquired artifact authority");
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "staged",
      contentWorkspace: stagedPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code: "GitFailure", detail: "staged index read failed" }],
    });
  });

  it("keeps aliased, invalid, and overflow provider failures distinct", async () => {
    const cases = [
      { reason: "Aliased", code: "AliasedLocator" },
      { reason: "InvalidInput", code: "InvalidTree" },
      { reason: "LimitExceeded", code: "ReleaseInputMismatch" },
    ] as const;

    for (const fixture of cases) {
      const client = createLifecycleTestClient({
        contentWorkspace: {
          ...unavailableContentWorkspace(),
          observeGitStagedIndex: async () => {
            throw contentWorkspaceFailure(fixture.reason, `${fixture.reason} fixture`);
          },
        },
        artifactRepository: unavailableArtifactRepository(() => {
          throw new Error("staged repository check acquired artifact authority");
        }),
      });

      await expect(client.releases.checkRepository({
        kind: "staged",
        contentWorkspace: stagedPolicy(),
      }, testInvocation)).resolves.toEqual({
        kind: "RepositoryIneligible",
        mode: "staged",
        issues: [{ code: fixture.code, detail: `${fixture.reason} fixture` }],
      });
    }

    expect(classifyStagedObservationFailure("LimitExceeded", "payload overflow", "payloads")).toEqual({
      kind: "StagedContentWorkspaceIneligible",
      issues: [{ code: "PayloadMismatch", detail: "payload overflow" }],
    });
  });

  it("admits the maximum release-input envelope plus aggregate payload without unsafe overflow", () => {
    expect(addStagedObservationByteLimits(
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_RELEASE_SET_PAYLOAD_BYTES,
    )).toEqual({ ok: true, value: MAX_STAGED_MATERIALIZED_BLOB_BYTES });
    expect(MAX_STAGED_MATERIALIZED_BLOB_BYTES).toBe(
      MAX_RELEASE_INPUT_ENVELOPE_BYTES + MAX_RELEASE_SET_PAYLOAD_BYTES,
    );
    expect(addStagedObservationByteLimits(Number.MAX_SAFE_INTEGER, 1)).toEqual({ ok: false });
    expect(addStagedObservationByteLimits(-1, MAX_RELEASE_SET_PAYLOAD_BYTES)).toEqual({ ok: false });
  });

  it("returns only the clean mismatch after final exact revalidation", async () => {
    let artifactWrites = 0;
    const fixture = productFixture();
    const eligible: Extract<ContentWorkspaceInspection, { kind: "Eligible" }> = {
      kind: "Eligible",
      snapshot: {
        repositoryIdentity,
        sourceCommit: headCommit,
        sourceTree: headTree,
        releaseInput: fixture.releaseInput,
        payloads: [
          { pluginId: fixture.alphaRelease.artifactBody.releaseBody.pluginId, payload: fixture.alphaPayload },
          { pluginId: fixture.betaRelease.artifactBody.releaseBody.pluginId, payload: fixture.betaPayload },
        ],
        objectBindings: [],
        eligibilityBinding: "clean-binding-v1",
      },
    };
    let cleanReads = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: cleanContentWorkspace(eligible, {
        onInspect: () => {
          cleanReads += 1;
        },
        treeAfterFirstInspect: "c".repeat(40),
      }),
      artifactRepository: unavailableArtifactRepository(() => {
        artifactWrites += 1;
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "clean",
      contentWorkspace: cleanPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "clean",
      issues: [{ code: "WrongTree", detail: expect.stringContaining("observed") }],
    });
    expect(cleanReads).toBe(2);
    expect(artifactWrites).toBe(0);
  });

  it("returns the clean result while staged and artifact ports remain cold", async () => {
    let cleanReads = 0;
    let stagedReads = 0;
    let artifactAccesses = 0;
    const fixture = productFixture();
    const eligible: Extract<ContentWorkspaceInspection, { kind: "Eligible" }> = {
      kind: "Eligible",
      snapshot: {
        repositoryIdentity,
        sourceCommit: headCommit,
        sourceTree: headTree,
        releaseInput: fixture.releaseInput,
        payloads: [
          { pluginId: fixture.alphaRelease.artifactBody.releaseBody.pluginId, payload: fixture.alphaPayload },
          { pluginId: fixture.betaRelease.artifactBody.releaseBody.pluginId, payload: fixture.betaPayload },
        ],
        objectBindings: [],
        eligibilityBinding: "clean-binding-v1",
      },
    };
    const client = createLifecycleTestClient({
      contentWorkspace: cleanContentWorkspace(eligible, {
        onInspect: () => {
          cleanReads += 1;
        },
        onStagedObserve: () => {
          stagedReads += 1;
        },
      }),
      artifactRepository: unavailableArtifactRepository(() => {
        artifactAccesses += 1;
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "clean",
      contentWorkspace: cleanPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "CleanRepositoryEligible",
      repositoryIdentity,
      refName: "refs/heads/main",
      sourceCommit: headCommit,
      sourceTree: headTree,
      eligibilityBinding: expect.any(String),
    });
    expect(cleanReads).toBe(2);
    expect(stagedReads).toBe(0);
    expect(artifactAccesses).toBe(0);
  });

  it("reports a final staged revalidation race once without retry or write authority", async () => {
    let writes = 0;
    let observations = 0;
    const [releaseInputObservation, materializationObservation] = validStagedObservationResults();
    const changedObservation = sourceChangedObservation(releaseInputObservation);
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => {
          observations += 1;
          if (observations === 1) return rawStagedObservation(releaseInputObservation);
          if (observations === 2) return rawStagedObservation(materializationObservation);
          return rawStagedObservation(changedObservation);
        },
      },
      artifactRepository: unavailableArtifactRepository(() => {
        writes += 1;
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "staged",
      contentWorkspace: stagedPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(observations).toBe(3);
    expect(writes).toBe(0);
  });

  it("returns the dedicated staged result without build or release authority", async () => {
    let writes = 0;
    let observations = 0;
    const observationResults = validStagedObservationResults();
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => {
          const observation = observationResults[observations % observationResults.length];
          observations += 1;
          if (observation === undefined) throw new Error("Missing staged observation fixture");
          return rawStagedObservation(observation);
        },
      },
      artifactRepository: unavailableArtifactRepository(() => {
        writes += 1;
      }),
    });

    await expect(client.releases.checkRepository({
      kind: "staged",
      contentWorkspace: stagedPolicy(),
    }, testInvocation)).resolves.toEqual({
      kind: "StagedRepositoryEligible",
      repositoryIdentity,
      refName: "refs/heads/main",
      headCommit,
      headTree,
      stagedBinding: expect.any(String),
    });
    expect(observations).toBe(4);
    expect(writes).toBe(0);
  });
});

function validStagedObservationResults(): readonly [
  StagedIndexObservationResult,
  StagedIndexObservationResult,
] {
  const fixture = productFixture();
  const entries = [
    stagedEntry(releaseInputPath, "1".repeat(40), 0o644, canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)),
    stagedEntry("plugins/agent/alpha/agents/alpha.md", "2".repeat(40), 0o644, bytes("agent alpha\n")),
    stagedEntry("plugins/agent/alpha/skills/alpha/SKILL.md", "3".repeat(40), 0o644, bytes("alpha\n")),
    stagedEntry("plugins/agent/beta/scripts/check.sh", "4".repeat(40), 0o755, bytes("#!/bin/sh\nexit 0\n")),
    stagedEntry("plugins/agent/beta/skills/beta/SKILL.md", "5".repeat(40), 0o644, bytes("beta\n")),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const indexEntries = bytes(entries.map((entry) => (
    `${entry.mode === 0o755 ? "100755" : "100644"} ${entry.objectId} 0\t${entry.path}\0`
  )).join(""));
  const binding = Object.freeze({ anchor: stagedAnchor(), indexEntries });
  const observe = (selected: readonly typeof entries[number][]): StagedIndexObservationResult => Object.freeze({
    kind: "Observed",
    observation: Object.freeze({
      opening: binding,
      blobs: Object.freeze(selected.map((entry) => Object.freeze({
        objectId: entry.objectId,
        bytes: entry.bytes,
      }))),
      closing: binding,
    }),
  });
  const releaseInputEntry = entries.find((entry) => entry.path === releaseInputPath);
  if (releaseInputEntry === undefined) throw new Error("Missing staged release-input fixture");
  return Object.freeze([
    observe([releaseInputEntry]),
    observe(entries),
  ]);
}

function sourceChangedObservation(result: StagedIndexObservationResult): StagedIndexObservationResult {
  if (result.kind !== "Observed") throw new Error("Expected observed staged fixture");
  return Object.freeze({
    kind: "Observed",
    observation: Object.freeze({
      opening: result.observation.opening,
      blobs: result.observation.blobs,
      closing: Object.freeze({
        anchor: result.observation.closing.anchor,
        indexEntries: bytes("changed staged index\0"),
      }),
    }),
  });
}

function contentWorkspaceFailure(
  reason: "Aliased" | "InvalidInput" | "LimitExceeded",
  detail: string,
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

function stagedEntry(
  path: string,
  objectId: string,
  mode: 0o644 | 0o755,
  entryBytes: Uint8Array,
) {
  return Object.freeze({ path, objectId, mode, bytes: entryBytes });
}

function cleanContentWorkspace(
  eligible: Extract<ContentWorkspaceInspection, { kind: "Eligible" }>,
  options: Readonly<{
    onInspect?: () => void;
    onStagedObserve?: () => void;
    treeAfterFirstInspect?: string;
  }> = {},
): ContentWorkspaceNodeAsyncPort {
  const blobs = new Map<string, Uint8Array>();
  const entries: Array<Readonly<{
    path: string;
    mode: 0o644 | 0o755;
    objectId: string;
  }>> = [];
  const addBlob = (path: string, mode: 0o644 | 0o755, value: Uint8Array) => {
    const objectId = gitBlobId(value);
    blobs.set(objectId, value);
    entries.push(Object.freeze({ path, mode, objectId }));
  };

  addBlob(releaseInputPath, 0o644, canonicalSerializeAgentPluginReleaseInput(eligible.snapshot.releaseInput));
  for (const member of eligible.snapshot.payloads) {
    for (const entry of member.payload.entries) {
      addBlob(
        `${pluginRoot}/${member.pluginId}/${entry.path}`,
        entry.mode,
        payloadEntryBytes(entry),
      );
    }
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  const treeBytes = bytes(entries.map((entry) => (
    `${entry.mode === 0o755 ? "100755" : "100644"} blob ${entry.objectId}\t${entry.path}\0`
  )).join(""));
  let inspections = 0;

  const contentWorkspace: ContentWorkspaceNodeAsyncPort = {
    ...unavailableContentWorkspace(),
    async inspectGitWorkspace() {
      inspections += 1;
      options.onInspect?.();
      return inspections > 1 && options.treeAfterFirstInspect !== undefined
        ? Object.freeze({ ...stagedAnchor(), tree: options.treeAfterFirstInspect })
        : stagedAnchor();
    },
    async readGitTree() {
      return treeBytes;
    },
    async readGitBlob(input) {
      const value = blobs.get(input.blob);
      if (value === undefined) throw new Error(`Missing clean Git blob ${input.blob}`);
      return new Uint8Array(value);
    },
    async captureGitWorkspaceEvidence(input): Promise<GitWorkspaceEvidence> {
      const trackedFlags = bytes(input.admittedPaths.map((path) => `H ${path}\0`).join(""));
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
        indexEntries: treeBytes,
        closingAnchor: stagedAnchor(),
        closingStatus: new Uint8Array(),
        closingTrackedFlags: trackedFlags,
      });
    },
    async observeGitStagedIndex() {
      options.onStagedObserve?.();
      return unavailableAsync("staged observation");
    },
  };
  return Object.freeze(contentWorkspace);
}

function rawStagedObservation(result: StagedIndexObservationResult): GitStagedIndexObservation {
  if (result.kind !== "Observed") throw new Error(`Expected observed staged result, received ${result.kind}`);
  return Object.freeze({
    opening: result.observation.opening,
    blobs: result.observation.blobs,
    closing: result.observation.closing,
  });
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

async function unavailableAsync(label: string): Promise<never> {
  throw new Error(`Unexpected ${label}`);
}
