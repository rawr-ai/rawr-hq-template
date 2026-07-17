import { describe, expect, it } from "vitest";

import * as buildSurface from "../../../../src/lib/agent-plugins/service-runtime/releases";

describe("release runtime adapter surface", () => {
  it("exports one closed Git content reader and no arbitrary command-runner constructor", () => {
    expect(buildSurface.createGitContentWorkspaceSnapshotReader).toBeTypeOf("function");
    expect(buildSurface.MECHANICAL_EVIDENCE_PROTOCOL_VERSION).toBe(1);
    for (const forbidden of [
      "createGitCommandRunner",
      "createGitObjectSnapshotReader",
    ]) {
      expect(Object.hasOwn(buildSurface, forbidden), forbidden).toBe(false);
    }
  });

  it("rejects arbitrary command arguments before executable verification", async () => {
    const invoke = buildSurface.createGitContentWorkspaceSnapshotReader as (
      input: unknown,
    ) => Promise<unknown>;
    await expect(invoke({
      gitExecutable: "/not/consulted/git",
      args: ["status", "--porcelain"],
    })).rejects.toThrow("unknown fields: args");
  });
});
