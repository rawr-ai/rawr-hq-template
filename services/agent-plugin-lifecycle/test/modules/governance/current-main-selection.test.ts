import type { ContentWorkspaceFailure } from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
  type CurrentMainBodyV3,
} from "../../../src/service/model/dto/current-main";
import {
  createExactGitBlobPointer,
  type ExactGitBlobObservation,
  type GitBlobSelection,
  type GitLocator,
} from "../../../src/service/model/dto/current-main-git";
import { parseCanonicalRef } from "../../../src/service/model/dto/current-main-primitives";
import { MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH } from "../../../src/service/model/dto/current-main-selection";
import { encodeCurrentMainBodyV3 } from "../../../src/service/model/policy/current-main-record";
import { resolveCurrentMainSelection } from "../../../src/service/model/policy/current-main-selection";
import type {
  ExactGitReader,
  GitReadFailure,
  RepositoryInspection,
} from "../../../src/service/model/repositories/current-main-exact-git";
import {
  type AgentPluginReleaseInput,
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type ReleaseResult,
} from "../../../src/service/shared/release";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";

const encoder = new TextEncoder();
const REPOSITORY = repository("git:github.com/example/personal-rawr-hq");
const REPOSITORY_URL = "https://github.com/example/personal-rawr-hq.git";
const CONTENT_AUTHORITY = contentAuthority("personal-rawr-hq");
const MAIN_REF = "refs/heads/main";
const CONTENT_REF = "refs/tags/agent-plugins/content-2026-07-22";
const HEAD_COMMIT = oid("a");
const HEAD_TREE = oid("b");
const CONTENT_COMMIT = oid("c");
const CONTENT_TREE = oid("d");

describe("observed-Git current-main v3 selection", () => {
  it("returns the exact reviewed record after resolving its content ref and release input", async () => {
    const fixture = selectionFixture();

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "CURRENT_ELIGIBLE",
      selection: fixture.record,
    });
    expect(fixture.git.calls).toEqual({ inspect: 2, readFileAtRevision: 2, isAncestor: 1 });
    expect(fixture.git.reads).toEqual([fixture.recordRevision, fixture.contentRevision]);
  });

  it("rejects v2 record bytes without a compatibility reader", async () => {
    const fixture = selectionFixture();
    fixture.git.add(
      fixture.recordRevision,
      encoder.encode(
        `${JSON.stringify({
          schemaVersion: 2,
          channel: "current-main",
          contentAuthority: CONTENT_AUTHORITY,
          sourceRepositoryIdentity: REPOSITORY,
          sourceCommit: CONTENT_COMMIT,
          sourceTree: CONTENT_TREE,
          releaseInputDigest: fixture.record.releaseInputDigest,
        })}\n`
      )
    );

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toMatchObject({
      kind: "FORGED_RECORD",
      reason: expect.stringContaining("v3 is invalid"),
    });
    expect(fixture.git.calls.readFileAtRevision).toBe(1);
  });

  it("rejects a record that selects its containing commit before reading content", async () => {
    const fixture = selectionFixture({ contentCommit: HEAD_COMMIT });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Current-main cannot select its containing record commit",
    });
    expect(fixture.git.calls.readFileAtRevision).toBe(1);
  });

  it("rejects a qualified source ref that resolves to another commit", async () => {
    const fixture = selectionFixture();
    fixture.git.fail(fixture.contentRevision, {
      code: "WrongObject",
      message: "Selected Git ref resolves to another commit",
    });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected Git ref resolves to another commit",
    });
  });

  it("rejects selected content that is not reachable from reviewed main", async () => {
    const fixture = selectionFixture();
    fixture.git.ancestor = false;

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "STALE_RECORD",
      reason: "Selected content commit is not reachable from canonical main",
    });
    expect(fixture.git.calls.readFileAtRevision).toBe(1);
  });

  it("rejects a content revision whose commit tree differs", async () => {
    const fixture = selectionFixture();
    fixture.git.fail(fixture.contentRevision, {
      code: "WrongObject",
      message: "Commit tree differs",
    });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Commit tree differs",
    });
  });

  it("rejects release input bytes whose digest differs from the record", async () => {
    const fixture = selectionFixture();
    fixture.git.add(
      fixture.contentRevision,
      canonicalSerializeAgentPluginReleaseInput(releaseInputFixture("different\n"))
    );

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected release-input digest differs from current-main",
    });
  });

  it("rejects a record that binds another repository URL", async () => {
    const fixture = selectionFixture({
      sourceRepositoryUrl: "https://github.com/example/other.git",
    });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toMatchObject({
      kind: "FORGED_RECORD",
      reason: expect.stringContaining("v3 is invalid"),
    });
  });

  it("fails closed when the main record binding changes before return", async () => {
    const fixture = selectionFixture();
    fixture.git.inspections = [ready(HEAD_COMMIT, HEAD_TREE), ready(oid("e"), oid("f"))];

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toEqual({
      kind: "UNREACHABLE_REPOSITORY",
      reason: "Canonical main changed during current-main selection",
    });
  });

  it("rejects a record that selects another repository before reading content", async () => {
    const fixture = selectionFixture({
      sourceRepositoryIdentity: "git:github.com/example/other",
      sourceRepositoryUrl: "https://github.com/example/other.git",
    });

    await expect(resolveCurrentMainSelection(fixture.git, fixture.locator)).resolves.toMatchObject({
      kind: "WRONG_REPOSITORY",
    });
    expect(fixture.git.calls.readFileAtRevision).toBe(1);
  });

  it("retains and deterministically bounds a content-workspace diagnostic", async () => {
    const suffix = "...[truncated]";
    const detail = `content-workspace unavailable: ${"x".repeat(
      MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH
    )}`;
    const failure = Object.freeze({
      _tag: "ContentWorkspaceFailure",
      operation: "inspect-git-ref",
      reason: "GitFailed",
      path: "/tmp/personal-rawr-hq",
      detail,
    }) satisfies ContentWorkspaceFailure;
    const client = createLifecycleTestClient({
      contentWorkspace: Object.freeze({
        ...unavailableContentWorkspace(),
        inspectGitRef: async () => {
          throw failure;
        },
      }),
    });

    const result = await client.governance.currentMainSelection(
      {
        locator: {
          workspacePath: "/tmp/personal-rawr-hq",
          expectedRepositoryIdentity: REPOSITORY,
        },
      },
      testInvocation
    );

    expect(result).toEqual({
      kind: "UNREACHABLE_REPOSITORY",
      reason: `${detail.slice(
        0,
        MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH - suffix.length
      )}${suffix}`,
    });
  });
});

interface SelectionFixtureOptions {
  readonly contentCommit?: string;
  readonly contentTree?: string;
  readonly sourceRepositoryIdentity?: string;
  readonly sourceRepositoryUrl?: string;
}

function selectionFixture(options: SelectionFixtureOptions = {}) {
  const headCommit = commit(HEAD_COMMIT);
  const headTree = tree(HEAD_TREE);
  const contentCommit = commit(options.contentCommit ?? CONTENT_COMMIT);
  const contentTree = tree(options.contentTree ?? CONTENT_TREE);
  const repositoryIdentity = repository(REPOSITORY);
  const releaseInput = releaseInputFixture("selected\n");
  const record: CurrentMainBodyV3 = {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: CONTENT_AUTHORITY,
    sourceRepositoryIdentity:
      options.sourceRepositoryIdentity === undefined
        ? REPOSITORY
        : repository(options.sourceRepositoryIdentity),
    sourceRepositoryUrl: options.sourceRepositoryUrl ?? REPOSITORY_URL,
    sourceRef: CONTENT_REF,
    contentCommit,
    contentTree,
    releaseInputDigest: releaseInput.releaseInputDigest,
  };
  const encoded = encodeCurrentMainBodyV3(record);
  if (!encoded.ok) {
    const bytes = encoder.encode(`${JSON.stringify(record)}\n`);
    return fixtureFromBytes(
      record,
      bytes,
      releaseInput,
      headCommit,
      headTree,
      contentCommit,
      contentTree
    );
  }
  return fixtureFromBytes(
    record,
    encoded.value.bytes,
    releaseInput,
    headCommit,
    headTree,
    contentCommit,
    contentTree
  );
}

function fixtureFromBytes(
  record: CurrentMainBodyV3,
  recordBytes: Uint8Array,
  releaseInput: AgentPluginReleaseInput,
  headCommit: ReturnType<typeof commit>,
  headTree: ReturnType<typeof tree>,
  contentCommit: ReturnType<typeof commit>,
  contentTree: ReturnType<typeof tree>
) {
  const repositoryIdentity = repository(REPOSITORY);
  const locator: GitLocator = {
    workspacePath: "/tmp/personal-rawr-hq",
    expectedRepositoryIdentity: repositoryIdentity,
  };
  const recordRevision: GitBlobSelection = {
    repositoryIdentity,
    ref: canonicalRef(MAIN_REF),
    commit: headCommit,
    tree: headTree,
    path: relativePath(CURRENT_MAIN_V3_RECORD_PATH),
  };
  const contentRevision: GitBlobSelection = {
    repositoryIdentity,
    ref: canonicalRef(CONTENT_REF),
    commit: contentCommit,
    tree: contentTree,
    path: relativePath(CURRENT_MAIN_V3_RELEASE_INPUT_PATH),
  };
  const git = new SelectionGitReader([ready(headCommit, headTree)]);
  git.add(recordRevision, recordBytes);
  git.add(contentRevision, canonicalSerializeAgentPluginReleaseInput(releaseInput));
  return { record, git, locator, recordRevision, contentRevision };
}

class SelectionGitReader implements ExactGitReader {
  readonly calls = { inspect: 0, readFileAtRevision: 0, isAncestor: 0 };
  readonly reads: GitBlobSelection[] = [];
  inspections: RepositoryInspection[];
  ancestor = true;
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
    return (
      this.inspections[Math.min(this.calls.inspect - 1, this.inspections.length - 1)] ?? {
        kind: "UnreachableRepository",
        reason: "missing inspection fixture",
      }
    );
  };

  readFileAtRevision: ExactGitReader["readFileAtRevision"] = async (_locator, selection) => {
    this.calls.readFileAtRevision += 1;
    this.reads.push(selection);
    const failure = this.failures.get(selectionKey(selection));
    if (failure !== undefined) return { ok: false, failure };
    const observation = this.objects.get(selectionKey(selection));
    return observation === undefined
      ? {
          ok: false,
          failure: { code: "MissingObject", message: "missing fixture object" },
        }
      : { ok: true, observation };
  };

  isAncestor: ExactGitReader["isAncestor"] = async () => {
    this.calls.isAncestor += 1;
    return this.ancestor;
  };
}

function releaseInputFixture(payloadText: string): AgentPluginReleaseInput {
  const payload = mustRelease(
    createAgentPluginPayload([
      {
        path: "skills/alpha/SKILL.md",
        mode: 0o644,
        bytes: encoder.encode(payloadText),
      },
    ])
  );
  return mustRelease(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: CONTENT_AUTHORITY,
      members: [
        {
          kind: "agent-plugin",
          pluginId: "alpha",
          skillInventory: [{ identity: "alpha-skill", manifestPath: "skills/alpha/SKILL.md" }],
          payload: {
            protocolVersion: payload.protocolVersion,
            manifest: payload.manifest,
            payloadDigest: payload.payloadDigest,
          },
          vendor: [
            {
              id: "vendor-alpha",
              protocol: "vendor-v1",
              contentDigest: contentDigest(encoder.encode("vendor\n")),
            },
          ],
          curation: [],
        },
      ],
      ownershipClaims: [{ kind: "skill", identity: "alpha-skill", ownerPluginId: "alpha" }],
      locks: [],
      qualityPolicies: [],
    })
  );
}

function mustRelease<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok)
    throw new Error(`Expected release fixture success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function ready(headCommit: string, headTree: string): RepositoryInspection {
  return {
    kind: "Ready",
    repositoryIdentity: repository(REPOSITORY),
    canonicalRef: canonicalRef(MAIN_REF),
    headCommit: commit(headCommit),
    headTree: tree(headTree),
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

function contentAuthority(value: string) {
  const parsed = parseContentAuthority(value);
  if (!parsed.ok) throw new Error("Invalid content authority fixture");
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
