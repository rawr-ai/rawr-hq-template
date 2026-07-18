import { readFile, realpath } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  createExactGitBlobPointer,
  createResourceExactGitReader,
  parseRepository,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";

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
});
