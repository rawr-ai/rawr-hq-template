import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createExactGitBlobPointer,
  createResourceExactGitReader,
  parseRepository,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import {
  decodeAgentPluginReleaseInput,
} from "@rawr/agent-plugin-lifecycle/release";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";

import {
  createLifecycleTestClient,
  testInvocation,
} from "../../../../../../services/agent-plugin-lifecycle/test/support/client";
import {
  resolveCurrentMainSelection,
} from "../../../../../../services/agent-plugin-lifecycle/src/service/modules/governance/router/current-main-selection.router";

import {
  GIT_EXECUTABLE,
  createGeneratedGitRepository,
  git,
} from "../releases/fixtures/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../releases/owned-fixture-root";

const REPOSITORY_IDENTITY = "git:github.com/example/personal-rawr-hq";
const REMOTE_URL = "https://github.com/example/personal-rawr-hq.git";
const CURRENT_MAIN_RECORD_PATH = "plugins/agents/.lifecycle/channels/current-main.json";

describe("governance exact-Git resource selection", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
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
    await expect(reader.readBlob(locator, {
      repositoryIdentity: pointer.value.repositoryIdentity,
      ref: pointer.value.ref,
      commit: pointer.value.commit,
      tree: pointer.value.tree,
      path: pointer.value.path,
    })).resolves.toEqual({
      ok: true,
      observation: {
        pointer: pointer.value,
        bytes: new Uint8Array(await readFile(repository.releaseInputFile)),
      },
    });
  });

  it("refuses a present selected commit that is unreachable from canonical main", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await git(repository.root, ["remote", "set-url", "origin", REMOTE_URL]);
    const repositoryIdentity = parseRepository(REPOSITORY_IDENTITY, "fixture.repositoryIdentity");
    if (!repositoryIdentity.ok) throw new Error(repositoryIdentity.issues[0].message);
    const selectedTree = await git(repository.root, ["rev-parse", "HEAD^{tree}"]);
    const selectedCommit = await git(repository.root, [
      "commit-tree",
      selectedTree,
      "-m",
      "unreachable selected release input",
    ]);
    const releaseInput = decodeAgentPluginReleaseInput(
      new Uint8Array(await readFile(repository.releaseInputFile)),
    );
    if (!releaseInput.ok) throw new Error(releaseInput.issues[0].message);
    const encoded = await createLifecycleTestClient().governance.currentMainRecord({
      kind: "encode-body",
      body: {
        schemaVersion: 2,
        channel: "current-main",
        contentAuthority: releaseInput.value.body.contentAuthority,
        sourceRepositoryIdentity: REPOSITORY_IDENTITY,
        sourceCommit: selectedCommit,
        sourceTree: selectedTree,
        releaseInputDigest: releaseInput.value.releaseInputDigest,
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
      },
    }, testInvocation);
    if (!encoded.ok) throw new Error(encoded.failure.message);
    const recordFile = join(repository.root, ...CURRENT_MAIN_RECORD_PATH.split("/"));
    await mkdir(dirname(recordFile), { recursive: true });
    await writeFile(recordFile, encoded.value.bytes);
    await git(repository.root, ["add", CURRENT_MAIN_RECORD_PATH]);
    await git(repository.root, ["commit", "-m", "record unreachable source selection"]);
    const reader = createResourceExactGitReader({
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
    });

    await expect(resolveCurrentMainSelection(reader, {
      workspacePath: repository.root,
      expectedRepositoryIdentity: repositoryIdentity.value,
    })).resolves.toMatchObject({
      kind: "STALE_RECORD",
      reason: expect.stringContaining("not reachable from the selected ref"),
    });
  });
});
