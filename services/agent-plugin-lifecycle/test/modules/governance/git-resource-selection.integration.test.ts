import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V3_RECORD_PATH,
  createExactGitBlobPointer,
  parseRepository,
} from "../../../src/service/modules/governance/model";
import { createResourceExactGitReader } from "../../../src/service/modules/governance/repository/content-workspace";
import {
  decodeAgentPluginReleaseInput,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";

import { createLifecycleTestClient, testInvocation } from "../../support/client";
import { createGeneratedGitRepository, GIT_EXECUTABLE, git } from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

const REPOSITORY_IDENTITY = "git:github.com/example/personal-rawr-hq";
const REMOTE_URL = "https://github.com/example/personal-rawr-hq.git";
const SOURCE_REF = "refs/tags/agent-plugins/integration-content";
const LEGACY_CURRENT_MAIN_RECORD_PATHS = [
  "plugins/agents/.lifecycle/current-main.json",
  "plugins/agents/.lifecycle/channels/current-main.json",
] as const;

describe("governance exact-Git resource selection", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await disposeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("binds a configured Git remote URL to its canonical logical repository identity", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await git(repository.root, ["remote", "set-url", "origin", REMOTE_URL]);
    const repositoryIdentity = parseRepository(REPOSITORY_IDENTITY, "fixture.repositoryIdentity");
    if (!repositoryIdentity.ok) throw new Error(repositoryIdentity.issues[0].message);
    const pointer = createExactGitBlobPointer({
      repositoryIdentity: repositoryIdentity.value,
      ref: repository.policy.refName,
      commit: repository.policy.sourceCommit,
      tree: repository.policy.sourceTree,
      path: repository.policy.releaseInputPath,
      blob: await git(repository.root, ["rev-parse", `HEAD:${repository.policy.releaseInputPath}`]),
    });
    if (!pointer.ok) throw new Error(pointer.issues[0].message);
    const locator = Object.freeze({
      workspacePath: repository.root,
      expectedRepositoryIdentity: repositoryIdentity.value,
    });
    const reader = createResourceExactGitReader({
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
    });

    await expect(reader.inspect(locator, pointer.value.ref)).resolves.toEqual({
      kind: "Ready",
      repositoryIdentity: repositoryIdentity.value,
      canonicalRef: pointer.value.ref,
      headCommit: pointer.value.commit,
      headTree: pointer.value.tree,
    });
    await expect(
      reader.readFileAtRevision(locator, {
        repositoryIdentity: pointer.value.repositoryIdentity,
        ref: pointer.value.ref,
        commit: pointer.value.commit,
        tree: pointer.value.tree,
        path: pointer.value.path,
      })
    ).resolves.toEqual({
      ok: true,
      observation: {
        pointer: pointer.value,
        bytes: new Uint8Array(await readFile(repository.releaseInputFile)),
      },
    });

    await git(repository.root, ["update-ref", SOURCE_REF, repository.policy.sourceCommit]);
    await commitCurrentMainRecord({
      repositoryRoot: repository.root,
      releaseInputFile: repository.releaseInputFile,
      contentCommit: repository.policy.sourceCommit,
      contentTree: repository.policy.sourceTree,
      sourceRef: SOURCE_REF,
      commitMessage: "record eligible source selection",
    });
    await git(repository.root, ["checkout", "-b", "unrelated-worktree"]);
    await writeFile(join(repository.root, "untracked-local-note.txt"), "not lifecycle input\n");
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
    });

    await expect(
      client.governance.currentMainSelection(
        {
          locator: {
            workspacePath: repository.root,
            expectedRepositoryIdentity: repositoryIdentity.value,
          },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "CURRENT_ELIGIBLE",
      selection: {
        sourceRepositoryIdentity: repositoryIdentity.value,
        sourceRef: SOURCE_REF,
        contentCommit: repository.policy.sourceCommit,
        contentTree: repository.policy.sourceTree,
      },
    });
  });

  it("refuses a source tag moved away from the reviewed content commit", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await git(repository.root, ["remote", "set-url", "origin", REMOTE_URL]);
    const repositoryIdentity = parseRepository(REPOSITORY_IDENTITY, "fixture.repositoryIdentity");
    if (!repositoryIdentity.ok) throw new Error(repositoryIdentity.issues[0].message);
    await git(repository.root, ["update-ref", SOURCE_REF, repository.policy.sourceCommit]);
    await commitCurrentMainRecord({
      repositoryRoot: repository.root,
      releaseInputFile: repository.releaseInputFile,
      contentCommit: repository.policy.sourceCommit,
      contentTree: repository.policy.sourceTree,
      sourceRef: SOURCE_REF,
      commitMessage: "record tagged content selection",
    });
    await git(repository.root, ["update-ref", SOURCE_REF, "HEAD"]);
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
    });

    await expect(
      client.governance.currentMainSelection(
        {
          locator: {
            workspacePath: repository.root,
            expectedRepositoryIdentity: repositoryIdentity.value,
          },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "FORGED_RECORD",
      reason: "Selected Git ref resolves to another commit",
    });
  });

  it.each(
    LEGACY_CURRENT_MAIN_RECORD_PATHS
  )("treats an old-path-only record at %s as stale without fallback", async (recordPath) => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await git(repository.root, ["remote", "set-url", "origin", REMOTE_URL]);
    await git(repository.root, ["update-ref", SOURCE_REF, repository.policy.sourceCommit]);
    const repositoryIdentity = parseRepository(REPOSITORY_IDENTITY, "fixture.repositoryIdentity");
    if (!repositoryIdentity.ok) throw new Error(repositoryIdentity.issues[0].message);
    await commitCurrentMainRecord({
      repositoryRoot: repository.root,
      releaseInputFile: repository.releaseInputFile,
      contentCommit: repository.policy.sourceCommit,
      contentTree: repository.policy.sourceTree,
      sourceRef: SOURCE_REF,
      recordPath,
      commitMessage: "record old-path-only source selection",
    });
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
    });

    await expect(
      client.governance.currentMainSelection(
        {
          locator: {
            workspacePath: repository.root,
            expectedRepositoryIdentity: repositoryIdentity.value,
          },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "STALE_RECORD",
    });
  });
});

async function commitCurrentMainRecord(
  input: Readonly<{
    repositoryRoot: string;
    releaseInputFile: string;
    contentCommit: string;
    contentTree: string;
    sourceRef: string;
    recordPath?: string;
    commitMessage: string;
  }>
): Promise<void> {
  const releaseInput = decodeAgentPluginReleaseInput(
    new Uint8Array(await readFile(input.releaseInputFile))
  );
  if (!releaseInput.ok) throw new Error(releaseInput.issues[0].message);
  const encoded = await createLifecycleTestClient().governance.currentMainRecord(
    {
      kind: "encode-body",
      body: {
        schemaVersion: 3,
        channel: "current-main",
        contentAuthority: releaseInput.value.body.contentAuthority,
        sourceRepositoryIdentity: mustParse(parseRepositoryIdentity(REPOSITORY_IDENTITY)),
        sourceRepositoryUrl: REMOTE_URL,
        sourceRef: input.sourceRef,
        contentCommit: mustParse(parseGitCommitId(input.contentCommit)),
        contentTree: mustParse(parseGitTreeId(input.contentTree)),
        releaseInputDigest: releaseInput.value.releaseInputDigest,
      },
    },
    testInvocation
  );
  if (!encoded.ok) throw new Error(encoded.failure.message);
  const recordPath = input.recordPath ?? CURRENT_MAIN_V3_RECORD_PATH;
  const recordFile = join(input.repositoryRoot, ...recordPath.split("/"));
  await mkdir(dirname(recordFile), { recursive: true });
  await writeFile(recordFile, encoded.value.bytes);
  await git(input.repositoryRoot, ["add", recordPath]);
  await git(input.repositoryRoot, ["commit", "-m", input.commitMessage]);
}

function mustParse<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error("Invalid exact-Git fixture value");
  return result.value;
}
