import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getRepoStateWithAuthority,
  mutateRepoStateAtomically,
  stateLockPath,
  statePath,
} from "../../../services/hq-ops/src/service/modules/repo-state/helpers/storage";
import { createTestHqOpsResources } from "../../../services/hq-ops/test/helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

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

describe("server hq-ops repo-state store", () => {
  it("serializes concurrent atomic mutations without corrupting persisted state", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-concurrency-"));
    tempDirs.push(repoRoot);
    const resources = createTestHqOpsResources();

    const pluginIds = Array.from({ length: 40 }, (_, idx) => `@rawr/plugin-${String(idx).padStart(2, "0")}`);

    await Promise.all(
      pluginIds.map((pluginId, idx) =>
        mutateRepoStateAtomically(resources, repoRoot, async (current) => {
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

    const { state } = await getRepoStateWithAuthority(resources, repoRoot);
    expect(state.plugins.enabled).toEqual([...pluginIds].sort());
    const persistedRaw = await fs.readFile(statePath(resources, repoRoot), "utf8");
    expect(() => JSON.parse(persistedRaw)).not.toThrow();
    await expect(fs.stat(stateLockPath(resources, repoRoot))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("takes over stale lock files deterministically when lock-holder pid is no longer alive", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-stale-lock-"));
    tempDirs.push(repoRoot);
    const resources = createTestHqOpsResources();

    const lockPath = stateLockPath(resources, repoRoot);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    const deadPid = findNonRunningPid();
    await fs.writeFile(lockPath, `${JSON.stringify({ pid: deadPid, acquiredAt: new Date().toISOString() })}\n`, "utf8");
    const staleTime = new Date(Date.now() - 5 * 60_000);
    await fs.utimes(lockPath, staleTime, staleTime);

    const result = await mutateRepoStateAtomically(
      resources,
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

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.plugins.enabled).toEqual(["@rawr/plugin-stale-lock"]);
    const { state: persisted } = await getRepoStateWithAuthority(resources, repoRoot);
    expect(persisted.plugins.enabled).toEqual(["@rawr/plugin-stale-lock"]);
  });

  it("does not reclaim stale-aged lock files when the lock-holder pid is still alive", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-active-lock-"));
    tempDirs.push(repoRoot);
    const resources = createTestHqOpsResources();

    const lockPath = stateLockPath(resources, repoRoot);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(
      lockPath,
      `${JSON.stringify({ pid: process.pid, acquiredAt: new Date(Date.now() - 5 * 60_000).toISOString() })}\n`,
      "utf8",
    );
    const staleTime = new Date(Date.now() - 5 * 60_000);
    await fs.utimes(lockPath, staleTime, staleTime);

    const lockResult = await mutateRepoStateAtomically(
      resources,
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
    );

    const authorityRoot = await fs.realpath(repoRoot);
    expect(lockResult).toMatchObject({
      ok: false,
      code: "REPO_STATE_LOCK_TIMEOUT",
      lockPath: stateLockPath(resources, authorityRoot),
    });

    const lockPayload = await fs.readFile(lockPath, "utf8");
    expect(lockPayload).toContain(`\"pid\":${process.pid}`);
    await expect(fs.stat(statePath(resources, repoRoot))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps service-style enable mutations stable under high contention", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-enable-concurrent-"));
    tempDirs.push(repoRoot);
    const resources = createTestHqOpsResources();

    const pluginIds = Array.from({ length: 24 }, (_, idx) => `@rawr/plugin-enable-${idx}`);

    await Promise.all(pluginIds.map((pluginId) =>
      mutateRepoStateAtomically(resources, repoRoot, async (current) => ({
        ...current,
        plugins: {
          ...current.plugins,
          enabled: Array.from(new Set([...current.plugins.enabled, pluginId])).sort(),
          lastUpdatedAt: new Date().toISOString(),
        },
      })),
    ));
    const { state } = await getRepoStateWithAuthority(resources, repoRoot);
    expect(state.plugins.enabled).toEqual([...pluginIds].sort());
  });

  it("uses one authority root across canonical and alias repo paths", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-alias-seam-"));
    const aliasRoot = `${repoRoot}-alias`;
    tempDirs.push(repoRoot);
    tempDirs.push(aliasRoot);

    await fs.symlink(repoRoot, aliasRoot);
    const resources = createTestHqOpsResources();

    await mutateRepoStateAtomically(resources, repoRoot, async (current) => ({
      ...current,
      plugins: {
        ...current.plugins,
        enabled: [...current.plugins.enabled, "@rawr/plugin-canonical"],
        lastUpdatedAt: new Date().toISOString(),
      },
    }));

    const aliasMutation = await mutateRepoStateAtomically(resources, aliasRoot, async (current) => ({
      ...current,
      plugins: {
        ...current.plugins,
        enabled: [...current.plugins.enabled, "@rawr/plugin-alias"],
        lastUpdatedAt: new Date().toISOString(),
      },
    }));

    const authorityRoot = await fs.realpath(repoRoot);
    expect(aliasMutation.ok).toBe(true);
    if (!aliasMutation.ok) return;
    expect(aliasMutation.statePath).toBe(statePath(resources, authorityRoot));
    expect(aliasMutation.lockPath).toBe(stateLockPath(resources, authorityRoot));

    const { state } = await getRepoStateWithAuthority(resources, repoRoot);
    expect(state.plugins.enabled).toEqual(["@rawr/plugin-alias", "@rawr/plugin-canonical"]);
    await expect(fs.stat(stateLockPath(resources, authorityRoot))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
