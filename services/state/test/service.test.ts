import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src";
import { createClientOptions, invocation } from "./helpers";

const tempPaths: string[] = [];

afterEach(async () => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      await fs.rm(tempPath, { recursive: true, force: true });
    }
  }
});

describe("state service", () => {
  it("returns the canonical authority root even when called through an alias repo path", async () => {
    const authorityRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-authority-"));
    const aliasRepoRoot = `${authorityRepoRoot}-alias`;
    tempPaths.push(authorityRepoRoot);
    tempPaths.push(aliasRepoRoot);

    await fs.symlink(authorityRepoRoot, aliasRepoRoot);

    const client = createClient(createClientOptions({
      repoRoot: aliasRepoRoot,
    }));

    const result = await client.state.getState({}, invocation("trace-state-authority"));

    expect(result.authorityRepoRoot).toBe(await fs.realpath(authorityRepoRoot));
  });
});
