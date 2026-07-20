import { describe, expect, it } from "vitest";

import {
  canonicalSerializeAgentPluginReleaseInput,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import {
  CURRENT_MAIN_V2_RECORD_PATH,
  CURRENT_MAIN_V2_RELEASE_INPUT_PATH,
  createExactGitBlobPointer,
  encodeCurrentMainBodyV2,
  parseCanonicalRef,
  type CurrentMainBodyV2,
  type ExactGitBlobObservation,
  type GitBlobSelection,
  type GitLocator,
} from "../../../src/service/modules/governance/model";
import type {
  ExactGitReader,
  GitReadFailure,
  RepositoryInspection,
} from "../../../src/service/modules/governance/ports";
import { resolveCurrentMainSelection } from "../../../src/service/modules/governance/router/current-main-selection.router";
import { CONTENT_AUTHORITY, REPOSITORY, releaseInputFixture } from "./fixtures";

const MAIN_REF = "refs/heads/main";
const HEAD_COMMIT = oid("a");
const HEAD_TREE = oid("b");
const SOURCE_COMMIT = oid("c");
const SOURCE_TREE = oid("d");
const GIT_READ_FAILURE_PARTITION: ReadonlyArray<readonly [
  GitReadFailure["code"],
  "STALE_RECORD" | "FORGED_RECORD",
]> = [
  ["MissingObject", "STALE_RECORD"],
  ["UnreachableObject", "STALE_RECORD"],
  ["ReadFailed", "STALE_RECORD"],
  ["WrongObject", "FORGED_RECORD"],
  ["ObjectTooLarge", "FORGED_RECORD"],
];
const GIT_READ_TARGETS: readonly ("record" | "selected-input")[] = ["record", "selected-input"];

describe("observed-Git current-main v2 selection", () => {
  it("returns one exact selection from the reviewed record and selected release input", async () => {
    const fixture = selectionFixture();

    const result = await resolveCurrentMainSelection(fixture.git, fixture.locator);

    expect(result).toEqual({
      kind: "CURRENT_ELIGIBLE",
      selection: {
        currentMainDigest: fixture.currentMainDigest,
        contentAuthority: fixture.body.contentAuthority,
        sourceRepositoryIdentity: fixture.body.sourceRepositoryIdentity,
        sourceCommit: fixture.body.sourceCommit,
        sourceTree: fixture.body.sourceTree,
        releaseInputDigest: fixture.body.releaseInputDigest,
        releaseSetDigest: fixture.body.releaseSetDigest,
        evaluationProfile: fixture.body.evaluationProfile,
        projections: fixture.body.projections,
      },
    });
    expect(fixture.git.calls).toEqual({ inspect: 2, readBlob: 2, isAncestor: 0, listChangedPaths: 0 });
  });

  it("keeps an older reviewed source selected when later unselected content is on main", async () => {
    const fixture = selectionFixture({
      headCommit: oid("e"),
      headTree: oid("f"),
      sourceCommit: SOURCE_COMMIT,
      sourceTree: SOURCE_TREE,
    });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator))
      .resolves.toMatchObject({ kind: "CURRENT_ELIGIBLE" });

    expect(fixture.git.reads.map((selection) => ({
      commit: selection.commit,
      tree: selection.tree,
      path: selection.path,
    }))).toEqual([
      {
        commit: oid("e"),
        tree: oid("f"),
        path: CURRENT_MAIN_V2_RECORD_PATH,
      },
      {
        commit: SOURCE_COMMIT,
        tree: SOURCE_TREE,
        path: CURRENT_MAIN_V2_RELEASE_INPUT_PATH,
      },
    ]);
    expect(fixture.git.calls.listChangedPaths).toBe(0);
  });

  it("refuses once when canonical main changes before the selection closes", async () => {
    const fixture = selectionFixture();
    fixture.git.inspections = [
      ready(HEAD_COMMIT, HEAD_TREE),
      ready(oid("e"), oid("f")),
    ];

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "UNREACHABLE_REPOSITORY",
      reason: "Canonical main changed during current-main selection",
    });
    expect(fixture.git.calls.inspect).toBe(2);
  });

  it("rejects a record that selects another repository before reading its source input", async () => {
    const fixture = selectionFixture({ sourceRepositoryIdentity: "git:github.com/example/other" });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator))
      .resolves.toMatchObject({ kind: "WRONG_REPOSITORY" });
    expect(fixture.git.calls.readBlob).toBe(1);
  });

  it("rejects a valid selected release input owned by another content authority", async () => {
    const fixture = selectionFixture({ selectedContentAuthority: "other-content-authority" });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected release input declares another content authority",
    });
  });

  it.each(GIT_READ_FAILURE_PARTITION)(
    "classifies %s consistently for record and selected-input reads",
    async (code, expectedKind) => {
      for (const target of GIT_READ_TARGETS) {
        const fixture = selectionFixture();
        const selection = target === "record" ? fixture.recordSelection : fixture.sourceSelection;
        const reason = `${code} ${target}`;
        fixture.git.fail(selection, { code, message: reason });

        await expect(resolveCurrentMainSelection(fixture.git, fixture.locator))
          .resolves.toEqual({ kind: expectedKind, reason });
      }
    },
  );

  it.each([
    ["invalid input", new TextEncoder().encode("not-json\n"), "invalid or noncanonical"],
    [
      "digest mismatch",
      canonicalSerializeAgentPluginReleaseInput(releaseInputFixture("different\n")),
      "release-input digest differs",
    ],
  ])("rejects a selected %s", async (_label, bytes, reason) => {
    const fixture = selectionFixture();
    fixture.git.add(fixture.sourceSelection, bytes);

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toMatchObject({
      kind: "FORGED_RECORD",
      reason: expect.stringContaining(reason),
    });
  });
});

interface SelectionFixtureOptions {
  readonly headCommit?: string;
  readonly headTree?: string;
  readonly sourceCommit?: string;
  readonly sourceTree?: string;
  readonly sourceRepositoryIdentity?: string;
  readonly selectedContentAuthority?: string;
}

function selectionFixture(options: SelectionFixtureOptions = {}) {
  const headCommit = commit(options.headCommit ?? HEAD_COMMIT);
  const headTree = tree(options.headTree ?? HEAD_TREE);
  const sourceCommit = commit(options.sourceCommit ?? SOURCE_COMMIT);
  const sourceTree = tree(options.sourceTree ?? SOURCE_TREE);
  const repositoryIdentity = repository(REPOSITORY);
  const releaseInput = releaseInputFixture(
    "selected\n",
    options.selectedContentAuthority ?? CONTENT_AUTHORITY,
  );
  const body: CurrentMainBodyV2 = {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: CONTENT_AUTHORITY,
    sourceRepositoryIdentity: options.sourceRepositoryIdentity ?? REPOSITORY,
    sourceCommit,
    sourceTree,
    releaseInputDigest: releaseInput.releaseInputDigest,
    releaseSetDigest: `rs1_${"1".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"2".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"3".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"4".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"5".repeat(64)}`,
      },
    ],
  };
  const encoded = encodeCurrentMainBodyV2(body);
  if (!encoded.ok) throw new Error(encoded.failure.message);
  const locator: GitLocator = {
    workspacePath: "/tmp/personal-rawr-hq",
    expectedRepositoryIdentity: repositoryIdentity,
  };
  const recordSelection: GitBlobSelection = {
    repositoryIdentity,
    ref: canonicalRef(MAIN_REF),
    commit: headCommit,
    tree: headTree,
    path: relativePath(CURRENT_MAIN_V2_RECORD_PATH),
  };
  const sourceSelection: GitBlobSelection = {
    repositoryIdentity,
    ref: canonicalRef(MAIN_REF),
    commit: sourceCommit,
    tree: sourceTree,
    path: relativePath(CURRENT_MAIN_V2_RELEASE_INPUT_PATH),
  };
  const git = new SelectionGitReader([ready(headCommit, headTree)]);
  git.add(recordSelection, encoded.value.bytes);
  git.add(sourceSelection, canonicalSerializeAgentPluginReleaseInput(releaseInput));
  return {
    body,
    currentMainDigest: encoded.value.currentMainDigest,
    git,
    locator,
    recordSelection,
    sourceSelection,
  };
}

class SelectionGitReader implements ExactGitReader {
  readonly calls = { inspect: 0, readBlob: 0, isAncestor: 0, listChangedPaths: 0 };
  readonly reads: GitBlobSelection[] = [];
  inspections: RepositoryInspection[];
  private readonly objects = new Map<string, ExactGitBlobObservation>();
  private readonly failures = new Map<string, GitReadFailure>();

  constructor(inspections: RepositoryInspection[]) {
    this.inspections = inspections;
  }

  add(selection: GitBlobSelection, bytes: Uint8Array): void {
    const pointer = createExactGitBlobPointer({ ...selection, blob: oid("9") });
    if (!pointer.ok) throw new Error("Invalid Git selection fixture");
    this.objects.set(selectionKey(selection), Object.freeze({ pointer: pointer.value, bytes }));
  }

  fail(selection: GitBlobSelection, failure: GitReadFailure): void {
    this.failures.set(selectionKey(selection), failure);
  }

  inspect: ExactGitReader["inspect"] = async () => {
    this.calls.inspect += 1;
    return this.inspections[Math.min(this.calls.inspect - 1, this.inspections.length - 1)]
      ?? { kind: "UnreachableRepository", reason: "missing inspection fixture" };
  };

  readBlob: ExactGitReader["readBlob"] = async (_locator, selection) => {
    this.calls.readBlob += 1;
    this.reads.push(selection);
    const failure = this.failures.get(selectionKey(selection));
    if (failure !== undefined) return { ok: false, failure };
    const observation = this.objects.get(selectionKey(selection));
    return observation === undefined
      ? { ok: false, failure: { code: "MissingObject", message: "missing fixture object" } }
      : { ok: true, observation };
  };

  isAncestor: ExactGitReader["isAncestor"] = async () => {
    this.calls.isAncestor += 1;
    return unavailable("separate ancestry read");
  };

  listChangedPaths: ExactGitReader["listChangedPaths"] = async () => {
    this.calls.listChangedPaths += 1;
    return unavailable("changed-path read");
  };
}

function ready(sourceCommit: string, sourceTree: string): RepositoryInspection {
  return {
    kind: "Ready",
    repositoryIdentity: repository(REPOSITORY),
    canonicalRef: canonicalRef(MAIN_REF),
    headCommit: commit(sourceCommit),
    headTree: tree(sourceTree),
  };
}

function commit(value: string) {
  const parsed = parseGitCommitId(value);
  if (!parsed.ok) throw new Error("Invalid commit fixture");
  return parsed.value;
}

function tree(value: string) {
  const parsed = parseGitTreeId(value);
  if (!parsed.ok) throw new Error("Invalid tree fixture");
  return parsed.value;
}

function repository(value: string) {
  const parsed = parseRepositoryIdentity(value);
  if (!parsed.ok) throw new Error("Invalid repository fixture");
  return parsed.value;
}

function canonicalRef(value: string) {
  const parsed = parseCanonicalRef(value, "fixture.ref");
  if (!parsed.ok) throw new Error("Invalid canonical ref fixture");
  return parsed.value;
}

function relativePath(value: string) {
  const parsed = parseReleaseRelativePath(value, "fixture.path");
  if (!parsed.ok) throw new Error("Invalid relative path fixture");
  return parsed.value;
}

function selectionKey(selection: GitBlobSelection): string {
  return [
    selection.repositoryIdentity,
    selection.ref,
    selection.commit,
    selection.tree,
    selection.path,
  ].join("\u0000");
}

function oid(character: string): string {
  return character.repeat(40);
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access`);
}
