import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  enablePlugin,
  getRepoState,
  mutateRepoStateAtomically,
  stateLockPath,
  statePath,
} from "../src/repo-state";

const tempDirs: string[] = [];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function findNonRunningPid(): number {
  const start = Math.max(50_000, process.pid + 10_000);
  const end = start + 20_000;

  for (let pid = start; pid < end; pid += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ESRCH") return pid;
    }
  }

  throw new Error("Unable to find a non-running PID for stale lock test.");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("@rawr/state repo-state concurrency", () => {
  it("serializes concurrent atomic mutations without corrupting persisted state", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-concurrency-"));
    tempDirs.push(repoRoot);

    const pluginIds = Array.from({ length: 40 }, (_, idx) => `@rawr/plugin-${String(idx).padStart(2, "0")}`);

    await Promise.all(
      pluginIds.map((pluginId, idx) =>
        mutateRepoStateAtomically(repoRoot, async (current) => {
          if (idx % 3 === 0) await sleep(5);
          return {
            ...current,
            plugins: {
              ...current.plugins,
              enabled: [...current.plugins.enabled, pluginId],
              lastUpdatedAt: new Date().toISOString(),
            },
          };
        }),
      ),
    );

    const state = await getRepoState(repoRoot);
    expect(state.plugins.enabled).toEqual([...pluginIds].sort());

    const persistedRaw = await fs.readFile(statePath(repoRoot), "utf8");
    expect(() => JSON.parse(persistedRaw)).not.toThrow();
    await expect(fs.stat(stateLockPath(repoRoot))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("takes over stale lock files deterministically when lock-holder pid is no longer alive", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-stale-lock-"));
    tempDirs.push(repoRoot);

    const lockPath = stateLockPath(repoRoot);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    const deadPid = findNonRunningPid();
    await fs.writeFile(lockPath, `${JSON.stringify({ pid: deadPid, acquiredAt: new Date().toISOString() })}\n`, "utf8");
    const staleTime = new Date(Date.now() - 5 * 60_000);
    await fs.utimes(lockPath, staleTime, staleTime);

    const result = await mutateRepoStateAtomically(
      repoRoot,
      async (current) => ({
        ...current,
        plugins: {
          ...current.plugins,
          enabled: [...current.plugins.enabled, "@rawr/plugin-stale-lock"],
          lastUpdatedAt: new Date().toISOString(),
        },
      }),
      {
        lockTimeoutMs: 1_000,
        retryDelayMs: 5,
        staleLockMs: 10,
      },
    );

    expect(result.state.plugins.enabled).toEqual(["@rawr/plugin-stale-lock"]);
    const persisted = await getRepoState(repoRoot);
    expect(persisted.plugins.enabled).toEqual(["@rawr/plugin-stale-lock"]);
  });

  it("does not reclaim stale-aged lock files when the lock-holder pid is still alive", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-active-lock-"));
    tempDirs.push(repoRoot);

    const lockPath = stateLockPath(repoRoot);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(
      lockPath,
      `${JSON.stringify({ pid: process.pid, acquiredAt: new Date(Date.now() - 5 * 60_000).toISOString() })}\n`,
      "utf8",
    );
    const staleTime = new Date(Date.now() - 5 * 60_000);
    await fs.utimes(lockPath, staleTime, staleTime);

    await expect(
      mutateRepoStateAtomically(
        repoRoot,
        async (current) => ({
          ...current,
          plugins: {
            ...current.plugins,
            enabled: [...current.plugins.enabled, "@rawr/plugin-should-not-write"],
            lastUpdatedAt: new Date().toISOString(),
          },
        }),
        {
          lockTimeoutMs: 75,
          retryDelayMs: 5,
          staleLockMs: 10,
        },
      ),
    ).rejects.toThrow("Timed out waiting for repo state lock");

    const lockPayload = await fs.readFile(lockPath, "utf8");
    expect(lockPayload).toContain(`\"pid\":${process.pid}`);
    await expect(fs.stat(statePath(repoRoot))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the public enablePlugin API stable under high contention", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-enable-concurrent-"));
    tempDirs.push(repoRoot);

    const pluginIds = Array.from({ length: 24 }, (_, idx) => `@rawr/plugin-enable-${idx}`);
    await Promise.all(pluginIds.map((pluginId) => enablePlugin(repoRoot, pluginId)));

    const state = await getRepoState(repoRoot);
    expect(state.plugins.enabled).toEqual([...pluginIds].sort());
  });
});
