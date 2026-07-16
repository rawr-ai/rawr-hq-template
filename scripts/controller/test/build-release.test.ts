import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { decodeControllerReleaseEnvelope } from "@rawr/controller-release";

import { buildControllerRelease } from "../build-release.ts";
import {
  CONTROLLER_ENVELOPE_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  CONTROLLER_STAGING_DIRECTORY,
  controllerDirectory,
} from "../layout.ts";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

async function temporaryDirectory(label: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `rawr-${label}-`));
  cleanup.push(path);
  return path;
}

describe("controller release builder", () => {
  test("derives one payload identity and converges on its verified release", async () => {
    const dataRoot = await temporaryDirectory("build-data");
    const workspaceRoot = await temporaryDirectory("build-workspace");
    const runtimeSource = join(workspaceRoot, "dist", "bun");
    const licenseSource = join(workspaceRoot, "dist", "BUN-LICENSE.txt");
    const entrySource = join(workspaceRoot, "dist", "rawr.mjs");
    const lockPath = join(workspaceRoot, "bun.lock");
    await mkdir(dirname(runtimeSource), { recursive: true });
    await writeFile(runtimeSource, "fixture runtime\n");
    await chmod(runtimeSource, 0o755);
    await writeFile(licenseSource, "fixture Bun license\n");
    await writeFile(entrySource, "console.log('rawr');\n");
    await writeFile(lockPath, "fixture lock\n");

    const input = {
      dataRoot,
      workspaceRoot,
      allowedSourceRoots: [workspaceRoot],
      sourceRevision: "a".repeat(40),
      dependencyLockPath: lockPath,
      runtime: {
        version: "1.3.14",
        revision: "0d9b296af33f2b851fcbf4df3e9ec89751734ba4",
        platform: "darwin" as const,
        architecture: "arm64" as const,
      },
      officialMembers: [
        {
          packageId: "@rawr/cli",
          role: "command",
          version: "1.0.0",
          root: "app",
          commandIds: ["doctor"],
          topics: [],
          aliases: [],
          hiddenAliases: [],
          hooks: [],
        },
      ],
      buildInterfaces: [{ name: "fixture-builder", version: "1" }],
      nxGraph: {
        graph: {
          nodes: {
            "@rawr/cli": { data: { root: "apps/cli" } },
            "@rawr/core": { data: { root: "packages/core" } },
          },
          dependencies: {
            "@rawr/cli": [{ target: "@rawr/core" }],
            "@rawr/core": [],
          },
        },
      },
      nxRootProjectNames: ["@rawr/cli"],
      sources: [
        {
          kind: "file" as const,
          sourcePath: runtimeSource,
          releasePath: CONTROLLER_RUNTIME_PATH,
          mode: 0o755,
        },
        {
          kind: "file" as const,
          sourcePath: licenseSource,
          releasePath: CONTROLLER_RUNTIME_LICENSE_PATH,
          mode: 0o644,
        },
        {
          kind: "file" as const,
          sourcePath: entrySource,
          releasePath: CONTROLLER_ENTRY_PATH,
          mode: 0o644,
        },
      ],
    };

    const first = await buildControllerRelease(input);
    const stagingParent = join(controllerDirectory(dataRoot), CONTROLLER_STAGING_DIRECTORY);
    const before = await stat(stagingParent);
    const second = await buildControllerRelease(input);
    const after = await stat(stagingParent);
    const envelope = decodeControllerReleaseEnvelope(
      new Uint8Array(await readFile(join(first.releaseRoot, CONTROLLER_ENVELOPE_PATH))),
      {
        controllerDigest: first.controllerDigest,
        releaseDirectoryName: first.controllerDigest,
      },
    );

    expect(first.kind).toBe("materialized");
    expect(second).toMatchObject({
      kind: "converged",
      controllerDigest: first.controllerDigest,
      releaseRoot: first.releaseRoot,
    });
    expect(envelope.ok).toBe(true);
    expect({ inode: after.ino, mtime: after.mtimeMs }).toEqual({
      inode: before.ino,
      mtime: before.mtimeMs,
    });
  });
});
