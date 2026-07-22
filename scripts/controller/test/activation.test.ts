import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { decodeControllerSelection } from "@rawr/controller-release";

import { activateControllerRelease } from "../activate.ts";
import { installStableControllerLauncher } from "../install-launcher.ts";
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerReleasePath,
  controllerSelectorPath,
} from "../layout.ts";
import type { AtomicWritePhase } from "../lib/filesystem.ts";
import { createNodeControllerSelectorStore } from "../selector-store.ts";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

async function temporaryDirectory(label: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `rawr-${label}-`));
  cleanup.push(path);
  return path;
}

async function candidateRelease(dataRoot: string, digest: string): Promise<string> {
  const releaseRoot = controllerReleasePath(dataRoot, digest);
  const runtime = join(releaseRoot, CONTROLLER_RUNTIME_PATH);
  const entry = join(releaseRoot, CONTROLLER_ENTRY_PATH);
  await mkdir(dirname(runtime), { recursive: true });
  await mkdir(dirname(entry), { recursive: true });
  await writeFile(runtime, "fixture runtime\n");
  await chmod(runtime, 0o755);
  await writeFile(join(releaseRoot, CONTROLLER_RUNTIME_LICENSE_PATH), "fixture Bun license\n");
  await writeFile(join(releaseRoot, CONTROLLER_DEPENDENCY_LOCK_PATH), "fixture lock\n");
  await writeFile(entry, "fixture entry\n");
  return await realpath(releaseRoot);
}

describe("controller activation", () => {
  test("selects atomically and performs no selector write when converged", async () => {
    const dataRoot = await temporaryDirectory("activation");
    const digest = "1".repeat(64);
    const releaseRoot = await candidateRelease(dataRoot, digest);
    const canonicalReleaseRoot = await realpath(releaseRoot);
    let verificationCount = 0;
    const verifyRelease = async (observedRoot: string, observedDigest: string) => {
      expect({ observedRoot, observedDigest }).toEqual({
        observedRoot: canonicalReleaseRoot,
        observedDigest: digest,
      });
      verificationCount += 1;
    };

    const activated = await activateControllerRelease({
      dataRoot,
      controllerDigest: digest,
      verifyRelease,
    });
    const selectorPath = controllerSelectorPath(dataRoot);
    const before = await stat(selectorPath);
    const beforeBytes = await readFile(selectorPath);
    const converged = await activateControllerRelease({
      dataRoot,
      controllerDigest: digest,
      verifyRelease,
    });
    const after = await stat(selectorPath);

    expect(activated).toMatchObject({ kind: "activated", replaced: "missing" });
    expect(converged).toMatchObject({ kind: "converged", replaced: null });
    expect(verificationCount).toBe(2);
    expect(await readFile(selectorPath)).toEqual(beforeBytes);
    expect({ inode: after.ino, mtime: after.mtimeMs }).toEqual({
      inode: before.ino,
      mtime: before.mtimeMs,
    });
  });

  test("retains the prior selector when candidate verification fails", async () => {
    const dataRoot = await temporaryDirectory("rollback");
    const firstDigest = "2".repeat(64);
    const secondDigest = "3".repeat(64);
    await candidateRelease(dataRoot, firstDigest);
    await candidateRelease(dataRoot, secondDigest);
    await activateControllerRelease({
      dataRoot,
      controllerDigest: firstDigest,
      verifyRelease: async () => {},
    });
    const selectorPath = controllerSelectorPath(dataRoot);
    const before = await readFile(selectorPath);
    const beforeStatus = await stat(selectorPath);

    await expect(
      activateControllerRelease({
        dataRoot,
        controllerDigest: secondDigest,
        verifyRelease: async () => {
          throw new Error("mixed controller fixture");
        },
      })
    ).rejects.toThrow("mixed controller fixture");

    expect(await readFile(selectorPath)).toEqual(before);
    const afterStatus = await stat(selectorPath);
    expect({ inode: afterStatus.ino, mtime: afterStatus.mtimeMs }).toEqual({
      inode: beforeStatus.ino,
      mtime: beforeStatus.mtimeMs,
    });
  });

  for (const aliasKind of ["symlink", "hardlink"] as const) {
    test(`replaces a byte-identical ${aliasKind} selector instead of converging`, async () => {
      const dataRoot = await temporaryDirectory(`selector-${aliasKind}`);
      const digest = "8".repeat(64);
      await candidateRelease(dataRoot, digest);
      await activateControllerRelease({
        dataRoot,
        controllerDigest: digest,
        verifyRelease: async () => {},
      });
      const selectorPath = controllerSelectorPath(dataRoot);
      const selectionBytes = await readFile(selectorPath);
      const outsidePath = join(await temporaryDirectory(`${aliasKind}-outside`), "current");
      await writeFile(outsidePath, selectionBytes);
      await rm(selectorPath);
      if (aliasKind === "symlink") await symlink(outsidePath, selectorPath);
      else await link(outsidePath, selectorPath);

      const result = await activateControllerRelease({
        dataRoot,
        controllerDigest: digest,
        verifyRelease: async () => {},
      });

      expect(result).toMatchObject({
        kind: "activated",
        replaced: "invalid",
        selectorDurability: "confirmed",
      });
      const status = await lstat(selectorPath);
      expect(status.isFile()).toBe(true);
      expect(status.nlink).toBe(1);
      await writeFile(outsidePath, `${"9".repeat(64)}\n`);
      expect(await readFile(selectorPath)).toEqual(selectionBytes);
    });
  }

  test("refuses an aliased controller parent without writing the current selector outside", async () => {
    const dataRoot = await temporaryDirectory("selector-parent-alias");
    const outsideRoot = await temporaryDirectory("selector-parent-outside");
    const digest = "c".repeat(64);
    await symlink(outsideRoot, join(dataRoot, "controller"));
    await candidateRelease(dataRoot, digest);
    const outsideSelector = join(outsideRoot, "current");

    await expect(
      activateControllerRelease({
        dataRoot,
        controllerDigest: digest,
        verifyRelease: async () => {
          throw new Error("verification must remain unreachable");
        },
      })
    ).rejects.toThrow("must be a canonical directory");

    await expect(lstat(outsideSelector)).rejects.toMatchObject({ code: "ENOENT" });
  });

  for (const phase of [
    "temporary-created",
    "temporary-written",
    "temporary-flushed",
    "before-replace",
  ] as const satisfies readonly AtomicWritePhase[]) {
    test(`retains exact prior selection when atomic replacement fails at ${phase}`, async () => {
      const dataRoot = await temporaryDirectory(`selector-${phase}`);
      const firstDigest = "6".repeat(64);
      const secondDigest = "7".repeat(64);
      await candidateRelease(dataRoot, firstDigest);
      await candidateRelease(dataRoot, secondDigest);
      await activateControllerRelease({
        dataRoot,
        controllerDigest: firstDigest,
        verifyRelease: async () => {},
      });
      const selectorPath = controllerSelectorPath(dataRoot);
      const before = await readFile(selectorPath);
      const beforeStatus = await stat(selectorPath);

      await expect(
        activateControllerRelease({
          dataRoot,
          controllerDigest: secondDigest,
          verifyRelease: async () => {},
          selectorStore: createNodeControllerSelectorStore((observed) => {
            if (observed === phase) throw new Error(`selector failpoint: ${phase}`);
          }),
        })
      ).rejects.toThrow(`selector failpoint: ${phase}`);

      expect(await readFile(selectorPath)).toEqual(before);
      const afterStatus = await stat(selectorPath);
      expect({ inode: afterStatus.ino, mtime: afterStatus.mtimeMs }).toEqual({
        inode: beforeStatus.ino,
        mtime: beforeStatus.mtimeMs,
      });
    });
  }

  test("preserves both selector write and temporary-cleanup failures", async () => {
    const dataRoot = await temporaryDirectory("selector-primary-and-cleanup");
    const digest = "8".repeat(64);
    await candidateRelease(dataRoot, digest);
    const selectorParent = dirname(controllerSelectorPath(dataRoot));
    let observed: unknown;

    try {
      await activateControllerRelease({
        dataRoot,
        controllerDigest: digest,
        verifyRelease: async () => {},
        selectorStore: createNodeControllerSelectorStore(async (phase) => {
          if (phase !== "temporary-created") return;
          const temporaryName = (await readdir(selectorParent)).find((name) =>
            name.startsWith("current.tmp-")
          );
          if (temporaryName === undefined) throw new Error("fixture selector temporary missing");
          const temporaryPath = join(selectorParent, temporaryName);
          await rm(temporaryPath);
          await mkdir(temporaryPath);
          throw new Error("fixture selector primary failure");
        }),
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(AggregateError);
    expect((observed as AggregateError).errors.map(String).join("\n")).toContain(
      "fixture selector primary failure"
    );
    expect((observed as AggregateError).errors).toHaveLength(2);
  });

  test("reports a committed selector when failure occurs after atomic replacement", async () => {
    const dataRoot = await temporaryDirectory("selector-post-commit");
    const firstDigest = "a".repeat(64);
    const secondDigest = "b".repeat(64);
    await candidateRelease(dataRoot, firstDigest);
    await candidateRelease(dataRoot, secondDigest);
    await activateControllerRelease({
      dataRoot,
      controllerDigest: firstDigest,
      verifyRelease: async () => {},
    });

    const result = await activateControllerRelease({
      dataRoot,
      controllerDigest: secondDigest,
      verifyRelease: async () => {},
      selectorStore: createNodeControllerSelectorStore((phase) => {
        if (phase === "after-replace") throw new Error("directory sync unavailable");
      }),
    });

    expect(result).toMatchObject({
      kind: "activated",
      controllerDigest: secondDigest,
      selectorDurability: "unconfirmed",
    });
    const decoded = decodeControllerSelection(
      new Uint8Array(await readFile(controllerSelectorPath(dataRoot)))
    );
    expect(decoded).toMatchObject({
      ok: true,
      value: { controllerDigest: secondDigest },
    });
  });

  test("concurrent activation leaves one complete canonical selection", async () => {
    const dataRoot = await temporaryDirectory("concurrent");
    const firstDigest = "4".repeat(64);
    const secondDigest = "5".repeat(64);
    await candidateRelease(dataRoot, firstDigest);
    await candidateRelease(dataRoot, secondDigest);

    await Promise.all([
      activateControllerRelease({
        dataRoot,
        controllerDigest: firstDigest,
        verifyRelease: async () => {},
      }),
      activateControllerRelease({
        dataRoot,
        controllerDigest: secondDigest,
        verifyRelease: async () => {},
      }),
    ]);

    const bytes = new Uint8Array(await readFile(controllerSelectorPath(dataRoot)));
    const selection = decodeControllerSelection(bytes);
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;
    expect([firstDigest, secondDigest]).toContain(selection.value.controllerDigest);
  });

  test("stable launcher installation converges without metadata churn", async () => {
    const dataRoot = await temporaryDirectory("launcher-install");
    const first = await installStableControllerLauncher({ dataRoot });
    const before = await lstat(first.path);
    const second = await installStableControllerLauncher({ dataRoot });
    const after = await lstat(second.path);

    expect(first.kind).toBe("installed");
    expect(second.kind).toBe("converged");
    expect(after.isFile()).toBe(true);
    expect(after.mode & 0o111).not.toBe(0);
    expect({ inode: after.ino, mtime: after.mtimeMs }).toEqual({
      inode: before.ino,
      mtime: before.mtimeMs,
    });
  });

  test("refuses a symlinked launcher parent without writing outside the data root", async () => {
    const dataRoot = await temporaryDirectory("launcher-parent-alias");
    const outsideRoot = await temporaryDirectory("launcher-parent-outside");
    await mkdir(join(dataRoot, "controller"), { recursive: true });
    await symlink(outsideRoot, join(dataRoot, "controller", "bin"));

    await expect(installStableControllerLauncher({ dataRoot })).rejects.toThrow(
      "must be a canonical directory"
    );

    expect(await readdir(outsideRoot)).toEqual([]);
  });

  test("replaces a byte-identical launcher hardlink with an independent file", async () => {
    const dataRoot = await temporaryDirectory("launcher-hardlink");
    const first = await installStableControllerLauncher({ dataRoot });
    const launcherBytes = await readFile(first.path);
    const outsidePath = join(await temporaryDirectory("launcher-hardlink-outside"), "rawr");
    await writeFile(outsidePath, launcherBytes, { mode: 0o755 });
    await rm(first.path);
    await link(outsidePath, first.path);

    const repaired = await installStableControllerLauncher({ dataRoot });

    expect(repaired.kind).toBe("installed");
    const repairedStatus = await lstat(repaired.path);
    expect(repairedStatus.isFile()).toBe(true);
    expect(repairedStatus.nlink).toBe(1);
    await writeFile(outsidePath, "#!/bin/sh\nexit 99\n", { mode: 0o755 });
    expect(await readFile(repaired.path)).toEqual(launcherBytes);
  });
});
