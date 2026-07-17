import { describe, expect, it } from "vitest";

import { createReadOnlyGitAdapter } from "../../../../src/lib/agent-plugins/service-runtime/governance/adapters/git";
import { createHostedApprovalAdapter } from "../../../../src/lib/agent-plugins/service-runtime/governance/adapters/hosted";
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

describe("hosted-governance adapter", () => {
  it("returns approval only when repository/ref/commit/tree/path/blob/outcome all match", async () => {
    const fixture = promotionFixture();
    const approval = fixture.approvalReader.observation;
    if (approval === undefined) throw new Error("Expected fixture approval");
    const adapter = createHostedApprovalAdapter({ readApproval: async () => approval });

    const result = await adapter.read({
      object: fixture.acceptanceObject,
      approverIdentity: approval.approverIdentity,
      outcome: "accepted",
    });

    expect(result).toMatchObject({ ok: true, observation: { decision: "approved" } });
  });

  it.each([
    ["repository", { repositoryIdentity: "git:github.com/example/other" }],
    ["ref", { ref: "refs/heads/other" }],
    ["commit", { commit: oid("1") }],
    ["tree", { tree: oid("2") }],
    ["path", { path: "plugins/agents/.lifecycle/acceptances/other.json" }],
    ["blob", { blob: oid("3") }],
  ] as const)("rejects approval bound to another %s", async (_label, replacement) => {
    const fixture = promotionFixture();
    const approval = fixture.approvalReader.observation;
    if (approval === undefined) throw new Error("Expected fixture approval");
    const adapter = createHostedApprovalAdapter({
      readApproval: async () => ({
        ...approval,
        object: { ...approval.object, ...replacement },
      }),
    });

    const result = await adapter.read({
      object: fixture.acceptanceObject,
      approverIdentity: approval.approverIdentity,
      outcome: "accepted",
    });

    expect(result).toMatchObject({ ok: false, failure: { code: "WrongObject" } });
  });

  it("rejects approval bound to another approver authority", async () => {
    const fixture = promotionFixture();
    const approval = fixture.approvalReader.observation;
    if (approval === undefined) throw new Error("Expected fixture approval");
    const adapter = createHostedApprovalAdapter({
      readApproval: async () => ({ ...approval, approverIdentity: "other-authority" }),
    });

    const result = await adapter.read({
      object: fixture.acceptanceObject,
      approverIdentity: approval.approverIdentity,
      outcome: "accepted",
    });

    expect(result).toMatchObject({ ok: false, failure: { code: "WrongObject" } });
  });

  it("rejects an approval whose outcome is not accepted", async () => {
    const fixture = promotionFixture();
    const approval = fixture.approvalReader.observation;
    if (approval === undefined) throw new Error("Expected fixture approval");
    const adapter = createHostedApprovalAdapter({
      readApproval: async () => ({ ...approval, outcome: "rejected" }),
    });

    expect(await adapter.read({
      object: fixture.acceptanceObject,
      approverIdentity: approval.approverIdentity,
      outcome: "accepted",
    })).toMatchObject({ ok: false, failure: { code: "WrongObject" } });
  });
});
