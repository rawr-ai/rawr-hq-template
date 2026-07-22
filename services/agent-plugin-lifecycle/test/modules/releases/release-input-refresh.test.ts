import { createHash } from "node:crypto";

import type {
  GitStagedIndexObservation,
  GitWorkspaceAnchor,
} from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";

import {
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  parseContentAuthority,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableArtifactRepository,
  unavailableContentWorkspace,
} from "../../support/client";

const encoder = new TextEncoder();
const memberIds = [
  "cognition",
  "design",
  "dev",
  "docs",
  "habitat",
  "hq",
  "hyperresearch-agent",
  "meta",
  "nx",
  "search",
  "slides",
].map((memberId) => parsed(parsePluginId(memberId)));
const releaseInputPath = parsed(parseReleaseRelativePath(".rawr/release-input.json"));
const pluginRoot = parsed(parseReleaseRelativePath("plugins/agents"));
const remoteUrl = "https://example.invalid/rawr-hq.git";

describe("releases.refreshReleaseInput", () => {
  it("authors and deterministically converges a fresh Personal-shaped closed release input", async () => {
    const entries = personalShapedEntries();
    expect(entries).toHaveLength(1_610);
    const firstObservation = stagedObservation(entries);
    const selections: Array<Readonly<{ paths: readonly string[]; roots: readonly string[] }>> = [];
    let currentObservation = firstObservation;
    let artifactAccesses = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async (input) => {
          selections.push({ paths: input.materializedPaths, roots: input.materializedRoots });
          return currentObservation;
        },
      },
      artifactRepository: unavailableArtifactRepository(() => {
        artifactAccesses += 1;
      }),
    });

    const first = await client.releases.refreshReleaseInput(refreshRequest(), testInvocation);
    expect(first).toMatchObject({
      kind: "ReleaseInputCandidateReady",
      releaseInputDigest: expect.stringMatching(/^ri1_[0-9a-f]{64}$/u),
      byteLength: expect.any(Number),
      bytes: expect.any(Uint8Array),
    });
    if (first.kind !== "ReleaseInputCandidateReady")
      throw new Error("Fresh refresh did not produce a candidate");
    const decoded = decodeAgentPluginReleaseInput(first.bytes);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("Generated refresh bytes did not decode");
    expect(decoded.value.body.members.map((member) => member.pluginId)).toEqual(memberIds);
    expect(
      decoded.value.body.members.flatMap((member) =>
        member.payload.manifest.map((entry) => ({
          pluginId: member.pluginId,
          path: entry.path,
          mode: entry.mode,
          byteLength: entry.byteLength,
          contentDigest: entry.contentDigest,
        }))
      )
    ).toEqual(
      entries
        .map((entry) => {
          const [pluginId, ...relativePath] = entry.path.slice("plugins/agents/".length).split("/");
          return {
            pluginId,
            path: relativePath.join("/"),
            mode: entry.mode,
            byteLength: entry.bytes.byteLength,
            contentDigest: contentDigest(entry.bytes),
          };
        })
        .sort(compareManifestRows)
    );
    expect(
      decoded.value.body.members.every(
        (member) => member.vendor.length === 0 && member.curation.length === 0
      )
    ).toBe(true);
    expect(decoded.value.body.members.flatMap((member) => member.skillInventory)).toHaveLength(100);
    expect(decoded.value.body.ownershipClaims).toHaveLength(100);
    expect(decoded.value.body.ownershipClaims.every((claim) => claim.kind === "skill")).toBe(true);
    expect(decoded.value.body.locks).toEqual([]);
    expect(decoded.value.body.qualityPolicies).toEqual([]);
    expect(decoded.value.ownershipIndex.claims).toHaveLength(111);

    currentObservation = stagedObservation(
      [...entries, stagedEntry(releaseInputPath, first.bytes)].reverse()
    );
    const repeated = await client.releases.refreshReleaseInput(refreshRequest(), testInvocation);
    expect(repeated).toEqual({
      kind: "ReleaseInputReadOnlyConverged",
      releaseInputDigest: first.releaseInputDigest,
      byteLength: first.byteLength,
      bytes: first.bytes,
    });
    expect(selections).toEqual([
      {
        paths: [releaseInputPath],
        roots: memberIds.map((memberId) => `plugins/agents/${memberId}`).sort(codeUnitCompare),
      },
      {
        paths: [releaseInputPath],
        roots: memberIds.map((memberId) => `plugins/agents/${memberId}`).sort(codeUnitCompare),
      },
    ]);
    expect(artifactAccesses).toBe(0);
  });

  it("preserves surviving explicit ancillary bindings without inferring new ones", async () => {
    const entries = oneMemberEntries("cognition");
    const fresh = await refreshWith(entries, ["cognition"]);
    if (fresh.kind !== "ReleaseInputCandidateReady")
      throw new Error("Fresh fixture did not produce a candidate");
    const decoded = decodeAgentPluginReleaseInput(fresh.bytes);
    if (!decoded.ok) throw new Error("Fresh fixture did not decode");
    const binding = {
      id: "personal-provenance",
      protocol: "personal-v1",
      contentDigest: `sha256_${"a".repeat(64)}`,
    } as const;
    const seeded = createAgentPluginReleaseInput({
      ...decoded.value.body,
      members: decoded.value.body.members.map((member) => ({
        ...member,
        vendor: [binding],
        curation: [binding],
      })),
      ownershipClaims: [
        ...decoded.value.body.ownershipClaims,
        { kind: "alias", identity: "thinking", ownerPluginId: "cognition" },
      ],
      locks: [binding],
      qualityPolicies: [binding],
    });
    if (!seeded.ok) throw new Error("Ancillary fixture was invalid");

    const refreshed = await refreshWith(
      [
        ...entries,
        stagedEntry(releaseInputPath, canonicalSerializeAgentPluginReleaseInput(seeded.value)),
      ],
      ["cognition"]
    );
    if (
      refreshed.kind !== "ReleaseInputCandidateReady" &&
      refreshed.kind !== "ReleaseInputReadOnlyConverged"
    )
      throw new Error("Seeded fixture did not refresh");
    const result = decodeAgentPluginReleaseInput(refreshed.bytes);
    if (!result.ok) throw new Error("Refreshed ancillary fixture did not decode");
    expect(result.value.body.members[0]).toMatchObject({ vendor: [binding], curation: [binding] });
    expect(result.value.body.ownershipClaims).toContainEqual({
      kind: "alias",
      identity: "thinking",
      ownerPluginId: "cognition",
    });
    expect(result.value.body.locks).toEqual([binding]);
    expect(result.value.body.qualityPolicies).toEqual([binding]);
  });

  it("refuses malformed existing release-input bytes instead of bootstrapping around them", async () => {
    const result = await refreshWith(
      [
        ...oneMemberEntries("cognition"),
        stagedEntry(releaseInputPath, encoder.encode('{"unexpected":true}\n')),
      ],
      ["cognition"]
    );

    expect(result).toMatchObject({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code: "ReleaseInputMismatch", detail: expect.any(String) }],
    });
  });

  it("refuses an existing release input owned by another content authority", async () => {
    const fresh = await refreshWith(oneMemberEntries("cognition"), ["cognition"]);
    if (fresh.kind !== "ReleaseInputCandidateReady")
      throw new Error("Fresh fixture did not produce a candidate");
    const decoded = decodeAgentPluginReleaseInput(fresh.bytes);
    if (!decoded.ok) throw new Error("Fresh fixture did not decode");
    const wrongAuthority = createAgentPluginReleaseInput({
      ...decoded.value.body,
      contentAuthority: parsed(parseContentAuthority("another-content-owner")),
    });
    if (!wrongAuthority.ok) throw new Error("Wrong-authority fixture was invalid");

    const result = await refreshWith(
      [
        ...oneMemberEntries("cognition"),
        stagedEntry(
          releaseInputPath,
          canonicalSerializeAgentPluginReleaseInput(wrongAuthority.value)
        ),
      ],
      ["cognition"]
    );
    expect(result).toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [
        {
          code: "ReleaseInputMismatch",
          detail: "release input declares a different content authority",
        },
      ],
    });
  });

  it("refuses an undeclared canonical child without materializing that child", async () => {
    const selected = oneMemberEntries("cognition");
    const undeclared = stagedEntry(
      "plugins/agents/tools/skills/tools/SKILL.md",
      encoder.encode("---\nname: tools\n---\n")
    );
    const materializedObjectIds: string[] = [];
    const observation = stagedObservation([...selected, undeclared]);
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async (input) => {
          materializedObjectIds.push(...observation.blobs.map((blob) => blob.objectId));
          expect(input.materializedRoots).toEqual(["plugins/agents/cognition"]);
          return observation;
        },
      },
    });

    await expect(
      client.releases.refreshReleaseInput(refreshRequest(["cognition"]), testInvocation)
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code: "PayloadMismatch", detail: "plugin tree contains undeclared member tools" }],
    });
    expect(materializedObjectIds).not.toContain(undeclared.objectId);
  });

  it("returns SourceChanged for a mixed observation and acquires no mutation owner", async () => {
    const observation = stagedObservation(oneMemberEntries("cognition"));
    const changed: GitStagedIndexObservation = {
      ...observation,
      closing: {
        ...observation.closing,
        indexEntries: encoder.encode("100644 " + "f".repeat(40) + " 0\tchanged\0"),
      },
    };
    let artifactAccesses = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => changed,
      },
      artifactRepository: unavailableArtifactRepository(() => {
        artifactAccesses += 1;
      }),
    });

    await expect(
      client.releases.refreshReleaseInput(refreshRequest(["cognition"]), testInvocation)
    ).resolves.toEqual({
      kind: "SourceChanged",
      mode: "staged",
      detail: "Git HEAD, ref, repository, or index changed during staged observation",
    });
    expect(artifactAccesses).toBe(0);
  });

  it("owns one request snapshot across deferred Git observation", async () => {
    const observation = stagedObservation(oneMemberEntries("cognition"));
    let observationStarted!: () => void;
    let resumeObservation!: () => void;
    const started = new Promise<void>((resolve) => {
      observationStarted = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      resumeObservation = resolve;
    });
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => {
          observationStarted();
          await resume;
          return observation;
        },
      },
    });
    const baseline = refreshRequest(["cognition"]);
    const request = {
      contentWorkspace: { ...baseline.contentWorkspace },
      memberIds: [...baseline.memberIds],
    };

    const pending = client.releases.refreshReleaseInput(request, testInvocation);
    await started;
    request.contentWorkspace.contentAuthority = parsed(parseContentAuthority("mutated-owner"));
    request.memberIds[0] = parsed(parsePluginId("dev"));
    resumeObservation();

    const result = await pending;
    if (result.kind !== "ReleaseInputCandidateReady") {
      throw new Error("Snapshot fixture did not produce a candidate");
    }
    const decoded = decodeAgentPluginReleaseInput(result.bytes);
    if (!decoded.ok) throw new Error("Snapshot fixture did not decode");
    expect(decoded.value.body.contentAuthority).toBe("personal-rawr-hq");
    expect(decoded.value.body.members.map((member) => member.pluginId)).toEqual(["cognition"]);
  });

  it("rejects duplicate-object logical payload amplification before payload construction", async () => {
    const sharedBytes = new Uint8Array(1024 * 1024);
    const objectId = createHash("sha1").update(sharedBytes).digest("hex");
    const entries = Array.from({ length: 65 }, (_, index) =>
      Object.freeze({
        path: `plugins/agents/cognition/references/shared-${String(index).padStart(2, "0")}.bin`,
        objectId,
        mode: 0o644 as const,
        bytes: sharedBytes,
      })
    );
    let artifactAccesses = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => stagedObservation(entries),
      },
      artifactRepository: unavailableArtifactRepository(() => {
        artifactAccesses += 1;
      }),
    });

    const result = await client.releases.refreshReleaseInput(
      refreshRequest(["cognition"]),
      testInvocation
    );
    expect(result).toMatchObject({
      kind: "ReleaseInputRejected",
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path: "releaseInputRefresh.members[0].payloadEntries",
          expected: 64 * 1024 * 1024,
          actual: 65 * 1024 * 1024,
        }),
        expect.objectContaining({
          code: "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path: "releaseInputRefresh.members",
          expected: 64 * 1024 * 1024,
          actual: 65 * 1024 * 1024,
        }),
      ]),
    });
    expect(artifactAccesses).toBe(0);
  });

  it("refuses a noncanonical derived member root before Git observation", async () => {
    let observations = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        observeGitStagedIndex: async () => {
          observations += 1;
          return stagedObservation(oneMemberEntries("cognition"));
        },
      },
    });
    const request = refreshRequest(["cognition"]);

    await expect(
      client.releases.refreshReleaseInput(
        {
          ...request,
          contentWorkspace: {
            ...request.contentWorkspace,
            pluginRoot: parsed(parseReleaseRelativePath("p".repeat(1_024))),
          },
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [
        {
          code: "ReleaseInputMismatch",
          detail: "derived plugin root is not canonical for cognition",
        },
      ],
    });
    expect(observations).toBe(0);
  });
});

function refreshRequest(ids: readonly string[] = memberIds) {
  return {
    contentWorkspace: {
      locator: "/tmp/rawr-release-input-refresh",
      repositoryIdentity: parsed(parseRepositoryIdentity("git:personal-rawr-hq")),
      contentAuthority: parsed(parseContentAuthority("personal-rawr-hq")),
      remoteName: "origin",
      remoteUrl,
      refName: "refs/heads/main",
      releaseInputPath,
      pluginRoot,
    },
    memberIds: ids.map((memberId) => parsed(parsePluginId(memberId))),
  } as const;
}

async function refreshWith(entries: readonly StagedEntry[], ids: readonly string[]) {
  const client = createLifecycleTestClient({
    contentWorkspace: {
      ...unavailableContentWorkspace(),
      observeGitStagedIndex: async () => stagedObservation(entries),
    },
  });
  return client.releases.refreshReleaseInput(refreshRequest(ids), testInvocation);
}

function personalShapedEntries(): StagedEntry[] {
  const entries: StagedEntry[] = [];
  let skillIndex = 0;
  for (const [memberIndex, memberId] of memberIds.entries()) {
    const count = memberIndex === 0 ? 10 : 9;
    for (let index = 0; index < count; index += 1) {
      const identity = `${memberId}-${String(skillIndex).padStart(3, "0")}`;
      entries.push(
        stagedEntry(
          `plugins/agents/${memberId}/skills/${identity}/SKILL.md`,
          encoder.encode(`---\nname: ${identity}\n---\n`)
        )
      );
      skillIndex += 1;
    }
  }
  for (let index = 0; entries.length < 1_610; index += 1) {
    const memberId = memberIds[index % memberIds.length]!;
    entries.push(
      stagedEntry(
        `plugins/agents/${memberId}/references/generated-${String(index).padStart(4, "0")}.md`,
        encoder.encode(`reference ${index}\n`)
      )
    );
  }
  return entries;
}

function oneMemberEntries(memberId: string): StagedEntry[] {
  return [
    stagedEntry(
      `plugins/agents/${memberId}/skills/${memberId}/SKILL.md`,
      encoder.encode(`---\nname: ${memberId}\n---\n`)
    ),
    stagedEntry(
      `plugins/agents/${memberId}/package.json`,
      encoder.encode(`{"name":"${memberId}"}\n`)
    ),
  ];
}

interface StagedEntry {
  readonly path: string;
  readonly objectId: string;
  readonly mode: 0o644 | 0o755;
  readonly bytes: Uint8Array;
}

function stagedEntry(path: string, contents: Uint8Array, mode: 0o644 | 0o755 = 0o644): StagedEntry {
  return Object.freeze({
    path,
    objectId: createHash("sha1").update(path).update(contents).digest("hex"),
    mode,
    bytes: contents,
  });
}

function stagedObservation(entries: readonly StagedEntry[]): GitStagedIndexObservation {
  const sorted = [...entries].sort((left, right) => codeUnitCompare(left.path, right.path));
  const indexEntries = encoder.encode(
    sorted
      .map(
        (entry) =>
          `${entry.mode === 0o755 ? "100755" : "100644"} ${entry.objectId} 0\t${entry.path}\0`
      )
      .join("")
  );
  const binding = Object.freeze({ anchor: stagedAnchor(), indexEntries });
  const blobs = new Map<string, Readonly<{ objectId: string; bytes: Uint8Array }>>();
  for (const entry of sorted.filter(
    (candidate) =>
      candidate.path === releaseInputPath ||
      memberIds.some((memberId) => candidate.path.startsWith(`plugins/agents/${memberId}/`))
  )) {
    if (!blobs.has(entry.objectId)) {
      blobs.set(entry.objectId, Object.freeze({ objectId: entry.objectId, bytes: entry.bytes }));
    }
  }
  return Object.freeze({
    opening: binding,
    blobs: Object.freeze([...blobs.values()]),
    closing: binding,
  });
}

function stagedAnchor(): GitWorkspaceAnchor {
  return Object.freeze({
    root: "/tmp/rawr-release-input-refresh",
    rootDevice: "16777234",
    rootInode: "101",
    refName: "refs/heads/main",
    commit: "a".repeat(40),
    refCommit: "a".repeat(40),
    tree: "b".repeat(40),
    objectFormat: "sha1",
    remoteUrls: Object.freeze([remoteUrl]),
  });
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareManifestRows(
  left: Readonly<{ pluginId: string; path: string }>,
  right: Readonly<{ pluginId: string; path: string }>
): number {
  return codeUnitCompare(left.pluginId, right.pluginId) || codeUnitCompare(left.path, right.path);
}

function parsed<T>(result: Readonly<{ ok: true; value: T }> | Readonly<{ ok: false }>): T {
  if (!result.ok) throw new Error("Invalid refresh test fixture");
  return result.value;
}
