import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
} from "@rawr/agent-plugin-lifecycle/release";
import { describe, expect, it } from "vitest";

import { readGitBlobObject } from "../../../../src/lib/agent-plugins/service-runtime/releases/git/object-snapshot";
import type { GitCommandRunner } from "../../../../src/lib/agent-plugins/service-runtime/releases/git/process";

describe("Git blob protocol bounds", () => {
  it("admits a release-input blob above the payload cap while rejecting it as one payload blob", async () => {
    const bytes = new Uint8Array(MAX_PAYLOAD_BYTES_PER_MEMBER + 1);
    const objectId = "a".repeat(40);
    const observedLimits: number[] = [];
    const runner: GitCommandRunner = {
      async run(_cwd, args, limits) {
        if (args[1] === "-t") {
          return { exitCode: 0, stdout: new TextEncoder().encode("blob\n"), stderr: new Uint8Array() };
        }
        observedLimits.push(limits?.stdoutBytes ?? -1);
        return { exitCode: 0, stdout: bytes, stderr: new Uint8Array() };
      },
    };
    await expect(readGitBlobObject(
      runner,
      "/generated",
      { objectId, path: ".rawr/release-input.json" },
      /^[0-9a-f]{40}$/u,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    )).resolves.toHaveLength(bytes.byteLength);

    await expect(readGitBlobObject(
      runner,
      "/generated",
      { objectId, path: "plugins/agent/example/payload.bin" },
      /^[0-9a-f]{40}$/u,
      MAX_PAYLOAD_BYTES_PER_MEMBER,
    )).rejects.toThrow("exceeds");
    expect(observedLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_PAYLOAD_BYTES_PER_MEMBER,
    ]);
  });
});
