import { describe, expect, it } from "vitest";

import { parseControllerDigest, parseReleaseRelativePath, parseSha256Digest, sha256 } from "../src";

describe("controller release primitives", () => {
  it("computes and accepts only canonical lowercase SHA-256 values", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(parseSha256Digest("a".repeat(64))).toMatchObject({ ok: true });
    expect(parseControllerDigest("A".repeat(64))).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_CONTROLLER_DIGEST" }],
    });
  });

  it.each([
    "",
    "/absolute",
    "../outside",
    "inside/../outside",
    "inside//file",
    "inside\\file",
    "file:///outside",
    "inside/",
  ])("rejects unsafe or noncanonical release path %j", (value) => {
    expect(parseReleaseRelativePath(value)).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_RELEASE_RELATIVE_PATH" }],
    });
  });

  it("accepts one canonical release-root-relative path", () => {
    expect(parseReleaseRelativePath("node_modules/@scope/package/index.mjs")).toEqual({
      ok: true,
      value: "node_modules/@scope/package/index.mjs",
    });
  });
});
