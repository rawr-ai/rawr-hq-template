import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
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
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  CONTROLLER_STAGING_DIRECTORY,
  controllerDirectory,
} from "../layout.ts";
import { removeCanonicalDirectChildDirectory } from "../lib/filesystem.ts";
import {
  type ControllerMaterializationPlan,
  type ControllerReleaseFinalizer,
  materializeControllerRelease,
} from "../materialize.ts";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

async function temporaryDirectory(label: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `rawr-${label}-`));
  cleanup.push(path);
  return path;
}

async function fixturePlan(
  workspaceRoot: string,
  digest: string
): Promise<ControllerMaterializationPlan> {
  const runtimeSource = join(workspaceRoot, "build", "bun");
  const licenseSource = join(workspaceRoot, "build", "BUN-LICENSE.txt");
  const entrySource = join(workspaceRoot, "build", "rawr.mjs");
  const lockSource = join(workspaceRoot, "build", "bun.lock");
  await mkdir(dirname(runtimeSource), { recursive: true });
  await writeFile(runtimeSource, "fixture bun\n");
  await chmod(runtimeSource, 0o755);
  await writeFile(licenseSource, "fixture Bun license\n");
  await writeFile(entrySource, "console.log('fixture');\n");
  await writeFile(lockSource, "fixture lock\n");
  return Object.freeze({
    controllerDigest: digest,
    sources: Object.freeze([
      Object.freeze({
        kind: "file" as const,
        sourcePath: lockSource,
        releasePath: CONTROLLER_DEPENDENCY_LOCK_PATH,
        mode: 0o644,
      }),
      Object.freeze({
        kind: "file" as const,
        sourcePath: licenseSource,
        releasePath: CONTROLLER_RUNTIME_LICENSE_PATH,
        mode: 0o644,
      }),
      Object.freeze({
        kind: "file" as const,
        sourcePath: runtimeSource,
        releasePath: CONTROLLER_RUNTIME_PATH,
        mode: 0o755,
      }),
      Object.freeze({
        kind: "file" as const,
        sourcePath: entrySource,
        releasePath: CONTROLLER_ENTRY_PATH,
        mode: 0o644,
      }),
    ]),
  });
}

function fixtureFinalizer(digest: string): ControllerReleaseFinalizer {
  return {
    async writeEnvelope(stagingRoot) {
      await writeFile(
        join(stagingRoot, "controller-envelope.json"),
        `${JSON.stringify({ digest })}\n`
      );
    },
    async verifyRelease(releaseRoot, expectedDigest) {
      const envelope = JSON.parse(
        await readFile(join(releaseRoot, "controller-envelope.json"), "utf8")
      ) as { digest?: unknown };
      expect(envelope.digest).toBe(expectedDigest);
      expect((await lstat(join(releaseRoot, CONTROLLER_RUNTIME_PATH))).isFile()).toBe(true);
      expect((await lstat(join(releaseRoot, CONTROLLER_ENTRY_PATH))).isFile()).toBe(true);
    },
  };
}

describe("controller release materialization", () => {
  test("refuses recursive cleanup through an aliased operation child", async () => {
    const stagingParent = await realpath(await temporaryDirectory("cleanup-parent"));
    const outsideRoot = await realpath(await temporaryDirectory("cleanup-outside"));
    const operationId = "11111111-1111-4111-8111-111111111111";
    const operationRoot = join(stagingParent, operationId);
    await writeFile(join(outsideRoot, "keep"), "outside state\n");
    await symlink(outsideRoot, operationRoot);

    await expect(
      removeCanonicalDirectChildDirectory(
        stagingParent,
        operationRoot,
        operationId,
        "controller staging cleanup"
      )
    ).rejects.toThrow("must be a non-aliased directory");

    expect(await readFile(join(outsideRoot, "keep"), "utf8")).toBe("outside state\n");
  });

  test("final-moves a complete release and converges without staging writes", async () => {
    const dataRoot = await temporaryDirectory("materialize-data");
    const workspaceRoot = await temporaryDirectory("materialize-workspace");
    const digest = "6".repeat(64);
    const plan = await fixturePlan(workspaceRoot, digest);
    const finalizer = fixtureFinalizer(digest);

    const first = await materializeControllerRelease({
      dataRoot,
      workspaceRoot,
      allowedSourceRoots: [workspaceRoot],
      plan,
      finalizer,
    });
    const stagingParent = join(controllerDirectory(dataRoot), CONTROLLER_STAGING_DIRECTORY);
    const before = await stat(stagingParent);
    const second = await materializeControllerRelease({
      dataRoot,
      workspaceRoot,
      allowedSourceRoots: [workspaceRoot],
      plan,
      finalizer,
    });
    const after = await stat(stagingParent);

    expect(first.kind).toBe("materialized");
    expect(second.kind).toBe("converged");
    expect(await readFile(join(first.releaseRoot, CONTROLLER_ENTRY_PATH), "utf8")).toContain(
      "fixture"
    );
    expect(await readdir(stagingParent)).toEqual([]);
    expect({ inode: after.ino, mtime: after.mtimeMs }).toEqual({
      inode: before.ino,
      mtime: before.mtimeMs,
    });
  });

  test("reports a committed release whose parent durability is unconfirmed", async () => {
    const dataRoot = await temporaryDirectory("materialize-unconfirmed-data");
    const workspaceRoot = await temporaryDirectory("materialize-unconfirmed-workspace");
    const digest = "d".repeat(64);
    const plan = await fixturePlan(workspaceRoot, digest);

    const result = await materializeControllerRelease({
      dataRoot,
      workspaceRoot,
      allowedSourceRoots: [workspaceRoot],
      plan,
      finalizer: fixtureFinalizer(digest),
      observe: (phase) => {
        if (phase === "after-final-replace")
          throw new Error("fixture release parent fsync failure");
      },
    });

    expect(result).toMatchObject({
      kind: "materialized",
      durability: "unconfirmed",
      cleanup: "completed",
      postCommitError: "fixture release parent fsync failure",
    });
    expect(await readFile(join(result.releaseRoot, CONTROLLER_ENTRY_PATH), "utf8")).toContain(
      "fixture"
    );
  });

  test("reports postcommit staging cleanup failure without losing the materialized release", async () => {
    const dataRoot = await temporaryDirectory("materialize-cleanup-data");
    const workspaceRoot = await temporaryDirectory("materialize-cleanup-workspace");
    const digest = "e".repeat(64);
    const plan = await fixturePlan(workspaceRoot, digest);
    let cleanupAttempts = 0;

    const result = await materializeControllerRelease({
      dataRoot,
      workspaceRoot,
      allowedSourceRoots: [workspaceRoot],
      plan,
      finalizer: fixtureFinalizer(digest),
      observe: (phase) => {
        if (phase === "before-staging-cleanup") {
          cleanupAttempts += 1;
          throw new Error("fixture staging cleanup failure");
        }
      },
    });

    expect(result).toMatchObject({
      kind: "materialized",
      durability: "confirmed",
      cleanup: "failed",
      cleanupError: "fixture staging cleanup failure",
    });
    expect(cleanupAttempts).toBe(1);
    expect(await readFile(join(result.releaseRoot, CONTROLLER_ENTRY_PATH), "utf8")).toContain(
      "fixture"
    );
    expect(
      await readdir(join(controllerDirectory(dataRoot), CONTROLLER_STAGING_DIRECTORY))
    ).toHaveLength(1);
  });

  test("removes a partial staging release when verification fails", async () => {
    const dataRoot = await temporaryDirectory("partial-data");
    const workspaceRoot = await temporaryDirectory("partial-workspace");
    const digest = "7".repeat(64);
    const plan = await fixturePlan(workspaceRoot, digest);

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: {
          async writeEnvelope(stagingRoot) {
            await writeFile(join(stagingRoot, "controller-envelope.json"), "partial\n");
          },
          async verifyRelease() {
            throw new Error("incomplete controller");
          },
        },
      })
    ).rejects.toThrow("incomplete controller");

    const stagingParent = join(controllerDirectory(dataRoot), CONTROLLER_STAGING_DIRECTORY);
    expect(await readdir(stagingParent)).toEqual([]);
  });

  test.each([
    "staging",
    "releases",
  ] as const)("refuses an aliased %s parent without writing outside the data root", async (directory) => {
    const dataRoot = await temporaryDirectory(`aliased-${directory}-data`);
    const workspaceRoot = await temporaryDirectory(`aliased-${directory}-workspace`);
    const outsideRoot = await temporaryDirectory(`aliased-${directory}-outside`);
    const digest = "b".repeat(64);
    const plan = await fixturePlan(workspaceRoot, digest);
    await mkdir(controllerDirectory(dataRoot), { recursive: true });
    await symlink(outsideRoot, join(controllerDirectory(dataRoot), directory));

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: fixtureFinalizer(digest),
      })
    ).rejects.toThrow("must be a canonical directory");

    expect(await readdir(outsideRoot)).toEqual([]);
  });

  test("rejects a release plan without the bundled Bun license", async () => {
    const dataRoot = await temporaryDirectory("license-data");
    const workspaceRoot = await temporaryDirectory("license-workspace");
    const digest = "a".repeat(64);
    const fixture = await fixturePlan(workspaceRoot, digest);
    const plan: ControllerMaterializationPlan = {
      ...fixture,
      sources: fixture.sources.filter(
        (source) => source.releasePath !== CONTROLLER_RUNTIME_LICENSE_PATH
      ),
    };

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: fixtureFinalizer(digest),
      })
    ).rejects.toThrow(`missing required file: ${CONTROLLER_RUNTIME_LICENSE_PATH}`);
    await expect(lstat(controllerDirectory(dataRoot))).rejects.toThrow();
  });

  test("rejects protected workspace roots before creating staging state", async () => {
    const dataRoot = await temporaryDirectory("protected-data");
    const workspaceRoot = await temporaryDirectory("protected-workspace");
    const protectedSource = join(workspaceRoot, "plugins", "agents", "fixture.txt");
    const entrySource = join(workspaceRoot, "build", "rawr.mjs");
    const licenseSource = join(workspaceRoot, "build", "BUN-LICENSE.txt");
    const lockSource = join(workspaceRoot, "build", "bun.lock");
    await mkdir(dirname(protectedSource), { recursive: true });
    await mkdir(dirname(entrySource), { recursive: true });
    await writeFile(protectedSource, "fixture-only protected bytes\n");
    await writeFile(licenseSource, "fixture Bun license\n");
    await writeFile(lockSource, "fixture lock\n");
    await writeFile(entrySource, "fixture entry\n");
    const plan: ControllerMaterializationPlan = {
      controllerDigest: "8".repeat(64),
      sources: [
        {
          kind: "file",
          sourcePath: lockSource,
          releasePath: CONTROLLER_DEPENDENCY_LOCK_PATH,
        },
        {
          kind: "file",
          sourcePath: licenseSource,
          releasePath: CONTROLLER_RUNTIME_LICENSE_PATH,
        },
        {
          kind: "file",
          sourcePath: protectedSource,
          releasePath: CONTROLLER_RUNTIME_PATH,
          mode: 0o755,
        },
        {
          kind: "file",
          sourcePath: entrySource,
          releasePath: CONTROLLER_ENTRY_PATH,
        },
      ],
    };

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: fixtureFinalizer(plan.controllerDigest),
      })
    ).rejects.toThrow("protected workspace path");
    await expect(lstat(controllerDirectory(dataRoot))).rejects.toThrow();
  });

  test("rejects a file reached through an aliased source parent before staging or finalization", async () => {
    const dataRoot = await temporaryDirectory("aliased-source-data");
    const workspaceRoot = await temporaryDirectory("aliased-source-workspace");
    const digest = "c".repeat(64);
    const fixture = await fixturePlan(workspaceRoot, digest);
    const protectedRoot = join(workspaceRoot, "plugins", "agents", "candidate");
    const aliasParent = join(workspaceRoot, "build", "candidate-alias");
    await mkdir(protectedRoot, { recursive: true });
    await writeFile(join(protectedRoot, "bun"), "protected runtime bytes\n");
    await symlink(protectedRoot, aliasParent);
    const plan: ControllerMaterializationPlan = {
      ...fixture,
      sources: fixture.sources.map((source) =>
        source.releasePath === CONTROLLER_RUNTIME_PATH
          ? { ...source, sourcePath: join(aliasParent, "bun") }
          : source
      ),
    };
    let finalizerCalls = 0;

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: {
          async writeEnvelope() {
            finalizerCalls += 1;
          },
          async verifyRelease() {
            finalizerCalls += 1;
          },
        },
      })
    ).rejects.toThrow("traverses an aliased path");

    expect(finalizerCalls).toBe(0);
    await expect(lstat(controllerDirectory(dataRoot))).rejects.toThrow();
  });

  test("rejects a payload link that escapes the one release", async () => {
    const dataRoot = await temporaryDirectory("link-data");
    const workspaceRoot = await temporaryDirectory("link-workspace");
    const digest = "9".repeat(64);
    const fixture = await fixturePlan(workspaceRoot, digest);
    const plan: ControllerMaterializationPlan = {
      ...fixture,
      sources: [
        ...fixture.sources,
        {
          kind: "link",
          releasePath: "node_modules/dependency",
          target: "../sibling-release/dependency",
        },
      ],
    };

    await expect(
      materializeControllerRelease({
        dataRoot,
        workspaceRoot,
        allowedSourceRoots: [workspaceRoot],
        plan,
        finalizer: fixtureFinalizer(digest),
      })
    ).rejects.toThrow("controller payload link target contains an unsafe segment");
  });
});
