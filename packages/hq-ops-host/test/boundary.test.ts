import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeHqOpsBoundary } from "../src/boundary";
import { createNodeRepoStateStore } from "../src/repo-state-store";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("hq-ops host boundary", () => {
  it("creates the full hq-ops boundary with concrete runtime deps", () => {
    const boundary = createNodeHqOpsBoundary({
      repoRoot: "/tmp/workspace",
    });

    expect(boundary.scope.repoRoot).toBe("/tmp/workspace");
    expect(typeof boundary.deps.logger.info).toBe("function");
    expect(typeof boundary.deps.analytics.track).toBe("function");
    expect(typeof boundary.deps.configStore.getLayeredConfig).toBe("function");
    expect(typeof boundary.deps.repoStateStore.enablePlugin).toBe("function");
    expect(typeof boundary.deps.journalStore.writeSnippet).toBe("function");
    expect(typeof boundary.deps.securityRuntime.securityCheck).toBe("function");
  });

  it("stores repo state under one authority root across canonical and alias paths", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hq-ops-host-authority-"));
    const aliasRoot = `${repoRoot}-alias`;
    tempDirs.push(repoRoot, aliasRoot);

    await fs.symlink(repoRoot, aliasRoot);

    const store = createNodeRepoStateStore();
    await store.enablePlugin(repoRoot, "@rawr/plugin-canonical");
    await store.enablePlugin(aliasRoot, "@rawr/plugin-alias");

    const response = await store.getStateWithAuthority(repoRoot);
    expect(response.state.plugins.enabled).toEqual(["@rawr/plugin-alias", "@rawr/plugin-canonical"]);
    expect(response.authorityRepoRoot).toBe(await fs.realpath(repoRoot));
  });
});
