import { describe, expect, it } from "vitest";
import {
  createExactGitBlobPointer,
  parseGitBlobSelection,
} from "../../src/service/model/policy/current-main-git";

const validSelection = {
  repositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
  ref: "refs/heads/main",
  commit: "a".repeat(40),
  tree: "b".repeat(64),
  path: "agent-plugins/current-main.json",
};
const validPointer = {
  ...validSelection,
  blob: "c".repeat(40),
};

describe("current-main Git policy", () => {
  it("rejects malformed selection and pointer shapes with their exact schema-owned fields", () => {
    const invalidSelection = {
      ...validSelection,
      unexpected: true,
    };
    const invalidPointer = {
      ...validPointer,
      unexpected: true,
    };
    const selectionWithoutPath = {
      repositoryIdentity: validSelection.repositoryIdentity,
      ref: validSelection.ref,
      commit: validSelection.commit,
      tree: validSelection.tree,
    };

    for (const input of [null, [], invalidSelection, selectionWithoutPath]) {
      expect(parseGitBlobSelection(input, "selection")).toEqual({
        ok: false,
        issues: [
          {
            code: "UNKNOWN_FIELD",
            path: "selection",
            message: "Expected exactly: commit, path, ref, repositoryIdentity, tree",
          },
        ],
      });
    }
    for (const input of [null, [], invalidPointer, validSelection]) {
      expect(createExactGitBlobPointer(input)).toEqual({
        ok: false,
        issues: [
          {
            code: "UNKNOWN_FIELD",
            path: "gitObject",
            message: "Expected exactly: blob, commit, path, ref, repositoryIdentity, tree",
          },
        ],
      });
    }
  });

  it("retains ordered primitive diagnostics for exact-shape invalid values", () => {
    const invalidSelection = {
      repositoryIdentity: "",
      ref: "",
      commit: "",
      tree: "",
      path: "",
    };

    expect(parseGitBlobSelection(invalidSelection, "selection")).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_REPOSITORY_IDENTITY",
          path: "selection.repositoryIdentity",
          message: "Repository identity must be logical and path-safe",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "selection.ref",
          message: "Expected a qualified canonical Git ref",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "selection.commit",
          message: "Invalid Git object identity",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "selection.tree",
          message: "Invalid Git object identity",
        },
        {
          code: "INVALID_RELATIVE_PATH",
          path: "selection.path",
          message: "Path must be a canonical POSIX relative path",
        },
      ],
    });
    expect(createExactGitBlobPointer({ ...invalidSelection, blob: "" })).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_REPOSITORY_IDENTITY",
          path: "gitObject.repositoryIdentity",
          message: "Repository identity must be logical and path-safe",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "gitObject.ref",
          message: "Expected a qualified canonical Git ref",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "gitObject.commit",
          message: "Invalid Git object identity",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "gitObject.tree",
          message: "Invalid Git object identity",
        },
        {
          code: "INVALID_RELATIVE_PATH",
          path: "gitObject.path",
          message: "Path must be a canonical POSIX relative path",
        },
        {
          code: "INVALID_GIT_OBJECT_ID",
          path: "gitObject.blob",
          message: "Expected an exact Git blob object ID",
        },
      ],
    });
  });

  it("reconstructs and freezes admitted selections and exact pointers", () => {
    const selectionInput = { ...validSelection };
    const selection = parseGitBlobSelection(selectionInput, "selection");

    expect(selection).toEqual({ ok: true, value: validSelection });
    expect(selection.ok).toBe(true);
    if (!selection.ok) throw new Error("Expected an admitted Git blob selection");
    expect(selection.value).not.toBe(selectionInput);
    expect(Object.isFrozen(selection.value)).toBe(true);

    const pointerInput = { ...validPointer };
    const pointer = createExactGitBlobPointer(pointerInput);

    expect(pointer).toEqual({ ok: true, value: validPointer });
    expect(pointer.ok).toBe(true);
    if (!pointer.ok) throw new Error("Expected an admitted exact Git blob pointer");
    expect(pointer.value).not.toBe(pointerInput);
    expect(Object.isFrozen(pointer.value)).toBe(true);
  });
});
