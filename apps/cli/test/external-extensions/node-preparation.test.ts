import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { create } from "tar";
import { afterEach, describe, expect, it } from "vitest";

import { NodeExternalExtensionPreparationPort } from "../../src/lib/external-extensions/node-preparation";
import { nativeInstallArtifactName } from "../../src/lib/external-extensions/install-provenance";
import { sha256RegularFile } from "../../src/lib/external-extensions/native-manager-protocol";
import { createReservedControllerSurface } from "../../src/lib/external-extensions/reserved-surface";
import {
  ExternalExtensionService,
  type PreparedInstallArtifact,
} from "../../src/lib/external-extensions/service";
import {
  activeState,
  removeFixtureRoots,
  staticExtension,
  tempRoot,
  writeExtensionFixture,
} from "./fixtures";

afterEach(removeFixtureRoots);

describe("Node external extension preparation", () => {
  it("binds and statically inspects a local tgz without running package or command code", async () => {
    const commandSentinel = path.join(tempRoot("candidate-command-sentinel"), "loaded");
    const scriptSentinel = path.join(tempRoot("candidate-script-sentinel"), "loaded");
    const artifact = await extensionTarball({ commandSentinel, scriptSentinel });
    const subject = preparation();

    const inspected = await subject.inspectInstall(artifact);
    const prepared = await subject.stageInstall(inspected);

    expect(prepared.artifactPath).not.toBe(realpathSync(artifact));
    expect(existsSync(prepared.artifactPath)).toBe(true);
    expect(prepared.artifactSha256).toBe(await sha256RegularFile(prepared.artifactPath));
    expect(inspected.candidate.accepted).toBe(true);
    expect(existsSync(commandSentinel)).toBe(false);
    expect(existsSync(scriptSentinel)).toBe(false);
    if (!inspected.candidate.accepted) return;
    const extractedRoot = inspected.candidate.extension.canonicalRoot;
    expect(existsSync(extractedRoot)).toBe(false);

    await prepared.cleanup();
    await prepared.cleanup();

    expect(existsSync(extractedRoot)).toBe(false);
    expect(existsSync(prepared.artifactPath)).toBe(false);
    expect(existsSync(artifact)).toBe(true);
  });

  it("delegates an inspected private copy even when the caller later rewrites its tarball", async () => {
    const artifact = await extensionTarball();
    const subject = preparation();
    const inspected = await subject.inspectInstall(artifact);
    const prepared = await subject.stageInstall(inspected);
    const boundBytes = readFileSync(prepared.artifactPath);
    const boundDigest = prepared.artifactSha256;

    writeFileSync(artifact, "caller replacement");

    expect(readFileSync(prepared.artifactPath)).toEqual(boundBytes);
    expect(await sha256RegularFile(prepared.artifactPath)).toBe(boundDigest);
    expect(await sha256RegularFile(artifact)).not.toBe(boundDigest);
    await prepared.cleanup();
    expect(existsSync(prepared.artifactPath)).toBe(false);
  });

  it("retries cleanup after a guarded path-observation failure", async () => {
    const artifact = await extensionTarball();
    const inspected = await preparation().inspectInstall(artifact);
    const prepared = await preparation().stageInstall(inspected);
    const stagingRoot = path.dirname(prepared.artifactPath);
    const movedRoot = `${stagingRoot}.moved`;
    const outside = tempRoot("staging-cleanup-outside");
    const marker = path.join(outside, "keep");
    writeFileSync(marker, "outside state\n");
    renameSync(stagingRoot, movedRoot);
    symlinkSync(outside, stagingRoot);

    await expect(prepared.cleanup()).rejects.toThrow("CLEANUP_ALIAS_REJECTED");
    expect(readFileSync(marker, "utf8")).toBe("outside state\n");

    rmSync(stagingRoot);
    renameSync(movedRoot, stagingRoot);
    await prepared.cleanup();
    await prepared.cleanup();
    expect(existsSync(prepared.artifactPath)).toBe(false);
  });

  it("refuses recursive cleanup after its staging root becomes a regular file", async () => {
    const artifact = await extensionTarball();
    const inspected = await preparation().inspectInstall(artifact);
    const prepared = await preparation().stageInstall(inspected);
    const stagingRoot = path.dirname(prepared.artifactPath);
    const movedRoot = `${stagingRoot}.moved`;
    renameSync(stagingRoot, movedRoot);
    writeFileSync(stagingRoot, "not a directory\n");

    await expect(prepared.cleanup()).rejects.toThrow("CLEANUP_NOT_DIRECTORY");
    expect(existsSync(path.join(movedRoot, path.basename(prepared.artifactPath)))).toBe(true);

    rmSync(stagingRoot);
    renameSync(movedRoot, stagingRoot);
    await prepared.cleanup();
    expect(existsSync(prepared.artifactPath)).toBe(false);
  });

  it("rejects source bytes changed between read-only inspection and staging", async () => {
    const artifact = await extensionTarball();
    const subject = preparation();
    const inspected = await subject.inspectInstall(artifact);

    writeFileSync(artifact, "caller replacement");

    await expect(subject.stageInstall(inspected)).rejects.toThrow(
      "EXTERNAL_EXTENSION_ARTIFACT_CHANGED_AFTER_INSPECTION"
    );
  });

  it("proves update convergence from the native content-addressed install record after staging cleanup", async () => {
    const artifact = await extensionTarball();
    const subject = preparation();
    const inspected = await subject.inspectInstall(artifact);
    expect(inspected.candidate.accepted).toBe(true);
    if (!inspected.candidate.accepted) return;
    const install = await subject.stageInstall(inspected);
    const current = inspected.candidate.extension;
    const recordedArtifact = install.artifactPath;
    await install.cleanup();
    const state = activeState(current, {
      name: current.packageId,
      type: "user",
      url: pathToFileURL(recordedArtifact).href,
      dependencySpec: pathToFileURL(recordedArtifact).href,
    });

    const prepared = await preparation().prepareUpdate(state);

    expect(prepared.entries).toEqual([
      expect.objectContaining({
        kind: "proven-local",
        extension: expect.objectContaining({ packageId: current.packageId }),
      }),
    ]);
    expect(existsSync(recordedArtifact)).toBe(false);
  });

  it("uses distinct content-addressed basenames for distinct install artifacts", async () => {
    const subject = preparation();
    const firstInspection = await subject.inspectInstall(
      await extensionTarball({ packageId: "@fixture/first" })
    );
    const secondInspection = await subject.inspectInstall(
      await extensionTarball({ packageId: "@fixture/second" })
    );
    const first = await subject.stageInstall(firstInspection);
    const second = await subject.stageInstall(secondInspection);
    try {
      expect(path.basename(first.artifactPath)).not.toBe(path.basename(second.artifactPath));
      expect(path.basename(first.artifactPath)).toContain(first.artifactSha256);
      expect(path.basename(second.artifactPath)).toContain(second.artifactSha256);
    } finally {
      await first.cleanup();
      await second.cleanup();
    }
  });

  it("keeps a converged install read-only before the Node staging boundary", async () => {
    const artifact = await extensionTarball();
    const subject = new StagingTrappedPreparation();
    const inspected = await subject.inspectInstall(artifact);
    expect(inspected.candidate.accepted).toBe(true);
    if (!inspected.candidate.accepted) return;
    const current = inspected.candidate.extension;
    const artifactName = nativeInstallArtifactName({
      artifactSha256: inspected.artifactSha256,
      staticFingerprint: current.fingerprint,
    });
    const removedArtifactUrl = pathToFileURL(path.join("/tmp/removed-stage", artifactName)).href;
    const state = activeState(current, {
      name: current.packageId,
      type: "user",
      url: removedArtifactUrl,
      dependencySpec: removedArtifactUrl,
    });
    const service = new ExternalExtensionService(
      {
        inspectRoot: async () => inspected.candidate,
        read: async () => state,
      },
      subject,
      {
        dispatch: async () => {
          throw new Error("NATIVE_MUTATION_WRITE_TRAP");
        },
      }
    );
    const sourceBytes = readFileSync(artifact);

    const result = await service.install(artifact);

    expect(result.disposition).toBe("converged");
    expect(subject.stageCalls).toBe(0);
    expect(readFileSync(artifact)).toEqual(sourceBytes);
  });

  it("leaves non-local native update bytes unknown for native delegation and postvalidation", async () => {
    const current = staticExtension();
    const state = activeState(current, {
      name: current.packageId,
      type: "user",
      tag: "latest",
      dependencySpec: current.version,
    });
    const prepared = await preparation().prepareUpdate(state);

    expect(prepared.entries).toEqual([
      expect.objectContaining({
        kind: "delegate-native",
        entry: expect.objectContaining({ name: current.packageId }),
      }),
    ]);
  });

  it("classifies local and native update entries separately when local staging is gone", async () => {
    const local = staticExtension({ packageId: "@fixture/local" });
    const native = staticExtension({ packageId: "@fixture/native" });
    const localArtifactUrl = pathToFileURL(
      path.join(
        "/tmp/removed-stage",
        nativeInstallArtifactName({
          artifactSha256: "a".repeat(64),
          staticFingerprint: local.fingerprint,
        })
      )
    ).href;
    const localState = activeState(local, {
      name: local.packageId,
      type: "user",
      url: localArtifactUrl,
      dependencySpec: localArtifactUrl,
    });
    const nativeState = activeState(native);
    const prepared = await preparation().prepareUpdate({
      registryPath: "/native/package.json",
      status: "valid",
      hasResidue: true,
      active: [...localState.active, ...nativeState.active],
      quarantined: [],
    });

    expect(prepared.entries.map(({ kind, entry }) => [entry.name, kind])).toEqual([
      ["@fixture/local", "proven-local"],
      ["@fixture/native", "delegate-native"],
    ]);
  });
});

class StagingTrappedPreparation extends NodeExternalExtensionPreparationPort {
  stageCalls = 0;

  constructor() {
    super(createReservedControllerSurface({ packageIds: ["@rawr/cli"] }));
  }

  override async stageInstall(): Promise<PreparedInstallArtifact> {
    this.stageCalls += 1;
    throw new Error("STAGING_WRITE_TRAP");
  }
}

function preparation(): NodeExternalExtensionPreparationPort {
  return new NodeExternalExtensionPreparationPort(
    createReservedControllerSurface({ packageIds: ["@rawr/cli"] })
  );
}

async function extensionTarball(
  input: { commandSentinel?: string; packageId?: string; scriptSentinel?: string } = {}
): Promise<string> {
  const sourceParent = tempRoot("candidate-package-source");
  const packageRoot = path.join(sourceParent, "package");
  writeExtensionFixture({
    root: packageRoot,
    packageId: input.packageId,
    sentinelPath: input.commandSentinel,
  });
  if (input.scriptSentinel) {
    const manifestPath = path.join(packageRoot, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    manifest.scripts = {
      postinstall: `node -e 'require("node:fs").writeFileSync(${JSON.stringify(input.scriptSentinel)}, "loaded")'`,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  const artifact = path.join(tempRoot("candidate-artifact"), "extension.tgz");
  await create({ cwd: sourceParent, file: artifact, gzip: true, portable: true }, ["package"]);
  return artifact;
}
