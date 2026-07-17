import { describe, expect, it } from "vitest";

import { createReadOnlyGitAdapter } from "../../../../src/lib/agent-plugins/service-runtime/governance/adapters/git";
import {
  MAIN_REF,
  REPOSITORY,
  oid,
  pointer,
  promotionFixture,
} from "./fixtures";

describe("read-only Git adapter", () => {
  it("admits exact repository and blob observations and canonicalizes changed paths", async () => {
    const fixture = promotionFixture();
    const backend = {
      inspect: async () => ({
        kind: "Ready",
        repositoryIdentity: REPOSITORY,
        canonicalRef: MAIN_REF,
        headCommit: fixture.currentInputObject.commit,
        headTree: fixture.currentInputObject.tree,
      }),
      readBlob: async () => ({ pointer: fixture.currentInputObject, bytes: fixture.releaseInputBytes }),
      isAncestor: async () => true,
      listChangedPaths: async () => ["z-last.json", "a-first.json"],
    };
    const git = createReadOnlyGitAdapter(backend);

    const inspection = await git.inspect(fixture.locator, fixture.currentInputObject.ref);
    const blob = await git.readBlob(fixture.locator, fixture.currentInputObject);
    const paths = await git.listChangedPaths(
      fixture.locator,
      fixture.landedInputObject.commit,
      fixture.currentInputObject.commit,
    );

    expect(inspection.kind).toBe("Ready");
    expect(blob.ok).toBe(true);
    expect(paths).toMatchObject({ ok: true, paths: ["a-first.json", "z-last.json"] });
  });

  it("rejects a backend observation for another commit before returning bytes", async () => {
    const fixture = promotionFixture();
    const wrong = pointer({
      ref: fixture.currentInputObject.ref,
      commit: oid("1"),
      tree: fixture.currentInputObject.tree,
      path: fixture.currentInputObject.path,
      blob: fixture.currentInputObject.blob,
    });
    const git = createReadOnlyGitAdapter({
      inspect: async () => ({ kind: "UnreachableRepository", reason: "unused" }),
      readBlob: async () => ({ pointer: wrong, bytes: fixture.releaseInputBytes }),
      isAncestor: async () => true,
      listChangedPaths: async () => [],
    });

    const result = await git.readBlob(fixture.locator, fixture.currentInputObject);

    expect(result).toMatchObject({ ok: false, failure: { code: "WrongObject" } });
  });

  it("rejects implicit locators and duplicate changed-path identities", async () => {
    const fixture = promotionFixture();
    const git = createReadOnlyGitAdapter({
      inspect: async () => ({ kind: "Ready" }),
      readBlob: async () => ({ pointer: fixture.currentInputObject, bytes: fixture.releaseInputBytes }),
      isAncestor: async () => true,
      listChangedPaths: async () => ["same.json", "same.json"],
    });
    const relative = { ...fixture.locator, workspacePath: "relative/repository" };

    expect((await git.inspect(relative, fixture.currentInputObject.ref)).kind).toBe("UnreachableRepository");
    expect(await git.listChangedPaths(
      fixture.locator,
      fixture.landedInputObject.commit,
      fixture.currentInputObject.commit,
    )).toMatchObject({ ok: false });
  });
});
