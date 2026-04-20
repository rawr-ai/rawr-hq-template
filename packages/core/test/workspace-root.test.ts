import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { findWorkspaceRoot } from "../src/workspace-root";

const tempDirs: string[] = [];

async function createWorkspaceRoot(name: string): Promise<string> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
  tempDirs.push(tempRoot);
  const workspaceRoot = path.join(tempRoot, "repo");
  await fs.mkdir(path.join(workspaceRoot, "plugins"), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, "package.json"), JSON.stringify({ private: true }, null, 2), "utf8");
  return workspaceRoot;
}

async function createPlainDir(name: string): Promise<string> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
  tempDirs.push(tempRoot);
  const dir = path.join(tempRoot, "plain");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("findWorkspaceRoot", () => {
  it("prefers RAWR_WORKSPACE_ROOT over RAWR_HQ_ROOT", async () => {
    const workspaceRoot = await createWorkspaceRoot("rawr-core-workspace-root");
    const hqRoot = await createWorkspaceRoot("rawr-core-hq-root");

    await expect(
      withEnv({ RAWR_WORKSPACE_ROOT: workspaceRoot, RAWR_HQ_ROOT: hqRoot }, () => findWorkspaceRoot(path.join(hqRoot, "plugins"))),
    ).resolves.toBe(workspaceRoot);
  });

  it("uses RAWR_HQ_ROOT when RAWR_WORKSPACE_ROOT is absent", async () => {
    const workspaceRoot = await createWorkspaceRoot("rawr-core-hq-only");

    await expect(
      withEnv({ RAWR_WORKSPACE_ROOT: undefined, RAWR_HQ_ROOT: workspaceRoot }, () => findWorkspaceRoot(os.tmpdir())),
    ).resolves.toBe(workspaceRoot);
  });

  it("searches upward from the start directory", async () => {
    const workspaceRoot = await createWorkspaceRoot("rawr-core-upward");
    const nested = path.join(workspaceRoot, "plugins", "cli", "demo", "src");
    await fs.mkdir(nested, { recursive: true });

    await expect(withEnv({ RAWR_WORKSPACE_ROOT: undefined, RAWR_HQ_ROOT: undefined }, () => findWorkspaceRoot(nested))).resolves.toBe(
      workspaceRoot,
    );
  });

  it("returns null when no workspace root is found", async () => {
    const plain = await createPlainDir("rawr-core-no-root");

    await expect(withEnv({ RAWR_WORKSPACE_ROOT: undefined, RAWR_HQ_ROOT: undefined }, () => findWorkspaceRoot(plain))).resolves.toBeNull();
  });
});
