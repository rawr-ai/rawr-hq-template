import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CONTROLLER_PAYLOAD_SCHEMA_VERSION,
  type ControllerArchitecture,
  type ControllerPayloadEntryInput,
  type ControllerPlatform,
  canonicalSerializeControllerReleaseEnvelope,
  computeControllerMemberPayloadDigest,
  createControllerPayloadManifest,
  createControllerReleaseEnvelope,
  sha256,
} from "@rawr/controller-release";
import { afterEach, describe, expect, it } from "vitest";

import {
  type GlobalDoctorData,
  inspectGlobalController,
} from "../src/lib/controller/global-diagnostics";
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_ENVELOPE_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerLauncherPath,
  controllerReleasePath,
  controllerSelectorPath,
} from "../src/lib/controller/layout";

const temporaryRoots: string[] = [];
const BUN_REVISION = "0d9b296af33f2b851fcbf4df3e9ec89751734ba4";
const HOST_PLATFORM: ControllerPlatform =
  process.platform === "darwin" || process.platform === "win32" ? process.platform : "linux";
const HOST_ARCHITECTURE: ControllerArchitecture = process.arch === "arm64" ? "arm64" : "x64";

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  );
});

describe("rawr doctor global provenance", () => {
  it("reports one verified release after its source tree is gone and performs no writes", async () => {
    const fixture = await controllerFixture();
    await rm(fixture.sourceRoot, { recursive: true });
    const before = await snapshotTree(fixture.dataRoot);

    const diagnostics = await fixture.inspect();

    expect(await snapshotTree(fixture.dataRoot)).toEqual(before);
    expect(diagnostics.healthy).toBe(true);
    expect(diagnostics.invocation).toMatchObject({
      status: "valid",
      controllerDigest: fixture.controllerDigest,
      releaseRoot: fixture.releaseRoot,
      selectorMatchesInvocation: true,
    });
    expect(diagnostics.selector).toMatchObject({
      status: "valid",
      controllerDigest: fixture.controllerDigest,
    });
    expect(diagnostics.release).toMatchObject({
      status: "verified",
      root: fixture.releaseRoot,
      controllerDigest: fixture.controllerDigest,
      entry: { releasePath: CONTROLLER_ENTRY_PATH, verified: true },
      runtime: {
        releasePath: CONTROLLER_RUNTIME_PATH,
        licenseReleasePath: CONTROLLER_RUNTIME_LICENSE_PATH,
        version: "1.3.14",
        revision: BUN_REVISION,
        verified: true,
      },
      dependencyLock: {
        releasePath: CONTROLLER_DEPENDENCY_LOCK_PATH,
        verified: true,
      },
    });
    expect(diagnostics.release.officialMembers).toEqual([
      expect.objectContaining({ packageId: "@rawr/cli", entryCount: 1, verified: true }),
    ]);
    expect(diagnostics.launcher).toMatchObject({ status: "regular", executable: true });
    expect(diagnostics.launcher?.digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(diagnostics.globalResolution.matchesLauncher).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toMatch(/owner|checkout|workspace/iu);
  });

  it("names tampered member bytes and remains read-only", async () => {
    const fixture = await controllerFixture();
    await writeFile(path.join(fixture.releaseRoot, "app/cli/index.mjs"), "tampered\n");
    const before = await snapshotTree(fixture.dataRoot);

    const diagnostics = await fixture.inspect();

    expect(await snapshotTree(fixture.dataRoot)).toEqual(before);
    expect(diagnostics.healthy).toBe(false);
    expect(diagnostics.release.status).toBe("invalid");
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYLOAD_DIGEST_MISMATCH",
          path: "observedEntries.app/cli/index.mjs.digest",
        }),
      ])
    );
  });

  it("names an absent official member without attempting repair", async () => {
    const fixture = await controllerFixture();
    await rm(path.join(fixture.releaseRoot, "app/cli/index.mjs"));
    const before = await snapshotTree(fixture.dataRoot);

    const diagnostics = await fixture.inspect();

    expect(await snapshotTree(fixture.dataRoot)).toEqual(before);
    expect(diagnostics.release.status).toBe("invalid");
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PAYLOAD_ENTRY",
          path: "observedEntries.app/cli/index.mjs",
        }),
      ])
    );
  });

  it("rejects a global rawr resolution whose realpath is not the stable launcher", async () => {
    const fixture = await controllerFixture();
    const foreignBin = path.join(fixture.root, "foreign-bin");
    const foreignRawr = path.join(foreignBin, "rawr");
    await mkdir(foreignBin, { recursive: true });
    await writeFile(foreignRawr, "#!/bin/sh\nexit 0\n");
    await chmod(foreignRawr, 0o755);

    const diagnostics = await fixture.inspect({ PATH: foreignBin });

    expect(diagnostics.release.status).toBe("verified");
    expect(diagnostics.globalResolution).toMatchObject({
      commandPath: foreignRawr,
      commandRealpath: foreignRawr,
      matchesLauncher: false,
    });
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "GLOBAL_RAWR_RESOLUTION_MISMATCH" })])
    );
  });

  it("reports when the running release no longer matches the current selector", async () => {
    const fixture = await controllerFixture();
    await writeFile(controllerSelectorPath(fixture.dataRoot), `${"2".repeat(64)}\n`);

    const diagnostics = await fixture.inspect();

    expect(diagnostics.invocation.selectorMatchesInvocation).toBe(false);
    expect(diagnostics.healthy).toBe(false);
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CONTROLLER_INVOCATION_SELECTION_MISMATCH" }),
      ])
    );
  });

  it("bounds an oversized sparse selector before reading it", async () => {
    const fixture = await controllerFixture();
    await truncate(controllerSelectorPath(fixture.dataRoot), 1024 * 1024);

    const diagnostics = await fixture.inspect();

    expect(diagnostics.healthy).toBe(false);
    expect(diagnostics.selector).toMatchObject({ status: "invalid", controllerDigest: null });
    expect(diagnostics.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_SELECTION_LENGTH",
        expected: 65,
        actual: 1024 * 1024,
      })
    );
  });

  it("rejects a byte-identical hardlinked launcher without mutating it", async () => {
    const fixture = await controllerFixture();
    const launcherPath = controllerLauncherPath(fixture.dataRoot);
    const outsidePath = path.join(fixture.root, "outside-launcher");
    await writeFile(outsidePath, await readFile(launcherPath), { mode: 0o755 });
    await rm(launcherPath);
    await link(outsidePath, launcherPath);
    const before = await snapshotTree(fixture.dataRoot);

    const diagnostics = await fixture.inspect();

    expect(await snapshotTree(fixture.dataRoot)).toEqual(before);
    expect(diagnostics.launcher?.status).toBe("other");
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CONTROLLER_LAUNCHER_INVALID" })])
    );
  });

  it("reports a symlinked launcher parent as unhealthy without reading it as controller state", async () => {
    const fixture = await controllerFixture();
    const launcherPath = controllerLauncherPath(fixture.dataRoot);
    const launcherParent = path.dirname(launcherPath);
    const outsideParent = path.join(fixture.root, "outside-launcher-parent");
    const launcherBytes = await readFile(launcherPath);
    await mkdir(outsideParent);
    await writeFile(path.join(outsideParent, "rawr"), launcherBytes, { mode: 0o755 });
    await rm(launcherParent, { recursive: true });
    await symlink(outsideParent, launcherParent);
    const beforeData = await snapshotTree(fixture.dataRoot);
    const beforeOutside = await snapshotTree(outsideParent);

    const diagnostics = await fixture.inspect();

    expect(diagnostics.healthy).toBe(false);
    expect(diagnostics.launcher).toMatchObject({
      path: launcherPath,
      status: "alias",
      realpath: null,
      executable: false,
      digest: null,
    });
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CONTROLLER_LAUNCHER_INVALID" })])
    );
    expect(await snapshotTree(fixture.dataRoot)).toEqual(beforeData);
    expect(await snapshotTree(outsideParent)).toEqual(beforeOutside);
  });

  it("keeps malformed or missing selection diagnosable", async () => {
    const malformed = await controllerFixture();
    await writeFile(
      controllerSelectorPath(malformed.dataRoot),
      `${malformed.controllerDigest}\nextra\n`
    );
    const malformedResult = await malformed.inspect();
    expect(malformedResult.selector.status).toBe("invalid");
    expect(malformedResult.release.status).toBe("unavailable");

    const missing = await controllerFixture();
    await rm(controllerSelectorPath(missing.dataRoot));
    const missingResult = await missing.inspect();
    expect(missingResult.selector.status).toBe("missing");
    expect(missingResult.release.status).toBe("unavailable");
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CONTROLLER_SELECTION_MISSING" })])
    );
  });

  it.each([
    "symlink",
    "hardlink",
  ] as const)("reports a byte-identical %s selector as invalid without repairing it", async (aliasKind) => {
    const fixture = await controllerFixture();
    const selectorPath = controllerSelectorPath(fixture.dataRoot);
    const outsidePath = path.join(fixture.root, `${aliasKind}-outside-selector`);
    await writeFile(outsidePath, `${fixture.controllerDigest}\n`);
    await rm(selectorPath);
    if (aliasKind === "symlink") await symlink(outsidePath, selectorPath);
    else await link(outsidePath, selectorPath);
    const before = await snapshotTree(fixture.dataRoot);

    const diagnostics = await fixture.inspect();

    expect(diagnostics.selector.status).toBe("invalid");
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CONTROLLER_SELECTION_ALIAS" })])
    );
    expect(await snapshotTree(fixture.dataRoot)).toEqual(before);
  });
});

type ControllerFixture = Readonly<{
  root: string;
  sourceRoot: string;
  dataRoot: string;
  releaseRoot: string;
  controllerDigest: string;
  inspect(env?: NodeJS.ProcessEnv): Promise<GlobalDoctorData>;
}>;

async function controllerFixture(): Promise<ControllerFixture> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "rawr-doctor-global-"));
  temporaryRoots.push(temporaryRoot);
  const root = await realpath(temporaryRoot);
  const sourceRoot = path.join(root, "deleted-source");
  const dataRoot = path.join(root, "data");
  await mkdir(sourceRoot, { recursive: true });
  await mkdir(dataRoot, { recursive: true });
  await writeFile(path.join(sourceRoot, "source-marker"), "not authority\n");

  const bytes = {
    entry: "console.log('rawr fixture');\n",
    runtime: "fixture bundled bun\n",
    license: "fixture Bun license\n",
    lock: "fixture dependency lock\n",
    cli: "export const cli = true;\n",
  };
  const entries: ControllerPayloadEntryInput[] = [
    { kind: "file", path: CONTROLLER_ENTRY_PATH, mode: 0o644, digest: sha256(bytes.entry) },
    {
      kind: "file",
      path: CONTROLLER_DEPENDENCY_LOCK_PATH,
      mode: 0o644,
      digest: sha256(bytes.lock),
    },
    { kind: "file", path: "app/cli/index.mjs", mode: 0o644, digest: sha256(bytes.cli) },
    {
      kind: "file",
      path: CONTROLLER_RUNTIME_LICENSE_PATH,
      mode: 0o644,
      digest: sha256(bytes.license),
    },
    { kind: "file", path: CONTROLLER_RUNTIME_PATH, mode: 0o755, digest: sha256(bytes.runtime) },
  ];
  const memberDigest = computeControllerMemberPayloadDigest(entries, "app/cli");
  if (!memberDigest.ok)
    throw new Error(memberDigest.issues.map((entry) => entry.message).join("; "));
  const manifest = createControllerPayloadManifest({
    schemaVersion: CONTROLLER_PAYLOAD_SCHEMA_VERSION,
    sourceRevision: "1".repeat(40),
    runtime: {
      path: CONTROLLER_RUNTIME_PATH,
      licensePath: CONTROLLER_RUNTIME_LICENSE_PATH,
      digest: sha256(bytes.runtime),
      version: "1.3.14",
      revision: BUN_REVISION,
      platform: HOST_PLATFORM,
      architecture: HOST_ARCHITECTURE,
    },
    entrypoint: CONTROLLER_ENTRY_PATH,
    officialMembers: [
      {
        packageId: "@rawr/cli",
        role: "command",
        version: "1.0.0",
        root: "app/cli",
        payloadDigest: memberDigest.value,
        commandIds: ["doctor:global"],
        topics: ["doctor"],
        aliases: [],
        hiddenAliases: [],
        hooks: [],
      },
    ],
    dependencyLock: {
      path: CONTROLLER_DEPENDENCY_LOCK_PATH,
      digest: sha256(bytes.lock),
    },
    buildInterfaces: [{ name: "controller-builder", version: "1" }],
    entries,
  });
  if (!manifest.ok) throw new Error(manifest.issues.map((entry) => entry.message).join("; "));
  const envelope = createControllerReleaseEnvelope(manifest.value);
  const releaseRoot = controllerReleasePath(dataRoot, envelope.controllerDigest);

  await writePayloadFile(releaseRoot, CONTROLLER_ENTRY_PATH, bytes.entry, 0o644);
  await writePayloadFile(releaseRoot, CONTROLLER_DEPENDENCY_LOCK_PATH, bytes.lock, 0o644);
  await writePayloadFile(releaseRoot, "app/cli/index.mjs", bytes.cli, 0o644);
  await writePayloadFile(releaseRoot, CONTROLLER_RUNTIME_LICENSE_PATH, bytes.license, 0o644);
  await writePayloadFile(releaseRoot, CONTROLLER_RUNTIME_PATH, bytes.runtime, 0o755);
  await writePayloadFile(
    releaseRoot,
    CONTROLLER_ENVELOPE_PATH,
    canonicalSerializeControllerReleaseEnvelope(envelope),
    0o644
  );

  const selectorPath = controllerSelectorPath(dataRoot);
  await mkdir(path.dirname(selectorPath), { recursive: true });
  await writeFile(selectorPath, `${envelope.controllerDigest}\n`);
  const launcherPath = controllerLauncherPath(dataRoot);
  await mkdir(path.dirname(launcherPath), { recursive: true });
  await writeFile(launcherPath, "#!/bin/sh\nexit 0\n");
  await chmod(launcherPath, 0o755);

  return Object.freeze({
    root,
    sourceRoot,
    dataRoot,
    releaseRoot,
    controllerDigest: envelope.controllerDigest,
    inspect: (env: NodeJS.ProcessEnv = {}) =>
      inspectGlobalController({
        env: {
          RAWR_DATA_DIR: dataRoot,
          RAWR_CONTROLLER_DIGEST: envelope.controllerDigest,
          RAWR_CONTROLLER_RELEASE_ROOT: releaseRoot,
          PATH: path.dirname(launcherPath),
          ...env,
        },
        cwd: root,
        hostPlatform: HOST_PLATFORM,
        hostArchitecture: HOST_ARCHITECTURE,
      }),
  });
}

async function writePayloadFile(
  releaseRoot: string,
  releasePath: string,
  contents: string | Uint8Array,
  mode: number
): Promise<void> {
  const destination = path.join(releaseRoot, releasePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
  await chmod(destination, mode);
}

async function snapshotTree(root: string): Promise<readonly string[]> {
  const rows: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const absolute = path.join(directory, child.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const status = await lstat(absolute);
      const kind = child.isDirectory()
        ? "directory"
        : child.isFile()
          ? "file"
          : child.isSymbolicLink()
            ? "link"
            : "other";
      const target = child.isSymbolicLink() ? await readlink(absolute) : "";
      rows.push(
        [relative, kind, status.mode, status.size, status.mtimeMs, status.ctimeMs, target].join("|")
      );
      if (child.isDirectory()) await visit(absolute);
    }
  };
  await visit(root);
  return Object.freeze(rows);
}
