import { afterEach, describe, expect, it } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  realpath,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseControllerDigest } from "@rawr/controller-release";
import { extract as extractTar, list as listTar } from "tar";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import { parseInstalledControllerDistributionOptions } from "../distribute-installed.ts";
import { activateControllerRelease } from "../activate.ts";
import { installStableControllerLauncher } from "../install-launcher.ts";
import {
  createInstalledControllerAsset,
  INSTALLED_CONTROLLER_ASSET_RECIPE,
  InstalledControllerProvenanceSchema,
  type InstalledControllerProvenance,
  writeInstalledControllerArchive,
  writeInstalledControllerProvenance,
} from "../lib/installed-controller-asset.ts";
import { sha256File } from "../lib/filesystem.ts";
import { requireVerifiedOfficialControllerRelease } from "../production/verify-official.ts";
import { buildSemanticFixture } from "./support/semantic-controller-fixture.ts";

const roots: string[] = [];
const TEMPORARY_PREFIX = "rawr-controller-distribution-";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Expect<Value extends true> = Value;
export type InstalledControllerProvenanceComesFromTypeBox = Expect<Equal<
  InstalledControllerProvenance,
  Static<typeof InstalledControllerProvenanceSchema>
>>;

async function temporaryRoot(): Promise<string> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), TEMPORARY_PREFIX)));
  roots.push(root);
  return root;
}

async function installedControllerFixture(root: string, sourceRevision: string): Promise<{
  dataRoot: string;
  outputRoot: string;
  assetName: string;
  controllerDigest: string;
}> {
  const dataRoot = path.join(root, "data");
  const outputRoot = path.join(root, "output");
  const platform = process.platform === "linux" ? "linux" : "darwin";
  const architecture = process.arch === "x64" ? "x64" : "arm64";
  const fixture = await buildSemanticFixture({
    workspaceRoot: path.join(root, "workspace"),
    dataRoot,
    sourceRevision,
    platform,
    architecture,
  });
  await activateControllerRelease({
    dataRoot: fixture.dataRoot,
    controllerDigest: fixture.controllerDigest,
    verifyRelease: async (releaseRoot, expectedDigest) => {
      await requireVerifiedOfficialControllerRelease({ releaseRoot, expectedDigest });
    },
  });
  await installStableControllerLauncher({ dataRoot: fixture.dataRoot });
  await mkdir(outputRoot);
  return {
    dataRoot: fixture.dataRoot,
    outputRoot,
    assetName: `rawr-controller-${platform}-${architecture}`,
    controllerDigest: fixture.controllerDigest,
  };
}

async function expectRootOverlapRefusal(input: {
  dataRoot: string;
  outputRoot: string;
  sourcePath: string;
  expectedDataEntries: readonly string[];
  expectedOutputEntries: readonly string[];
}): Promise<void> {
  const sourceBytes = await readFile(input.sourcePath);
  await expect(createInstalledControllerAsset({
    dataRoot: input.dataRoot,
    outputDirectory: input.outputRoot,
    sourceRevision: "4".repeat(40),
  })).rejects.toThrow("CONTROLLER_ASSET_ROOTS_OVERLAP");
  expect(await readFile(input.sourcePath)).toEqual(sourceBytes);
  expect((await readdir(input.dataRoot)).sort()).toEqual([...input.expectedDataEntries].sort());
  expect((await readdir(input.outputRoot)).sort()).toEqual([...input.expectedOutputEntries].sort());
}

async function removeTemporaryRoot(root: string): Promise<void> {
  const canonicalTemporaryParent = await realpath(tmpdir());
  if (
    path.dirname(root) !== canonicalTemporaryParent
    || !path.basename(root).startsWith(TEMPORARY_PREFIX)
    || await realpath(root) !== root
  ) {
    throw new Error(`refusing to remove unexpected controller distribution test root: ${root}`);
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw new Error(`refusing to remove non-directory controller distribution test root: ${root}`);
  }
  await rm(root, { recursive: true });
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(removeTemporaryRoot));
});

describe("installed controller archive", () => {
  it("is byte-deterministic and contains only the declared installed controller paths", async () => {
    const root = await temporaryRoot();
    const dataRoot = path.join(root, "data");
    const outputRoot = path.join(root, "output");
    const extractRoot = path.join(root, "extract");
    const digest = "a".repeat(64);
    const releaseRoot = path.join(dataRoot, "controller", "releases", digest);
    await mkdir(path.join(dataRoot, "controller", "bin"), { recursive: true });
    await mkdir(path.join(releaseRoot, "app"), { recursive: true });
    await mkdir(outputRoot);
    await mkdir(extractRoot);
    await writeFile(path.join(dataRoot, "controller", "bin", "rawr"), "#!/bin/sh\nexit 0\n");
    await chmod(path.join(dataRoot, "controller", "bin", "rawr"), 0o755);
    await writeFile(path.join(dataRoot, "controller", "current"), `${digest}\n`);
    await writeFile(path.join(releaseRoot, "controller-envelope.json"), "{}\n");
    await writeFile(path.join(releaseRoot, "app", "rawr.mjs"), "export {};\n");
    await symlink("rawr.mjs", path.join(releaseRoot, "app", "entry.mjs"));
    await writeFile(path.join(dataRoot, "not-distributed.txt"), "outside\n");
    await writeFile(path.join(releaseRoot, "not-in-manifest.txt"), "outside\n");

    const entries = [
      `controller/releases/${digest}/app/rawr.mjs`,
      "controller/bin/rawr",
      `controller/releases/${digest}/app/entry.mjs`,
      "controller/current",
      `controller/releases/${digest}/controller-envelope.json`,
    ];
    const firstArchive = path.join(outputRoot, "first.tar");
    const secondArchive = path.join(outputRoot, "second.tar");
    await writeInstalledControllerArchive({ dataRoot, archivePath: firstArchive, entries });

    const later = new Date("2040-01-01T00:00:00.000Z");
    await utimes(path.join(dataRoot, "controller", "bin", "rawr"), later, later);
    await utimes(path.join(releaseRoot, "app", "rawr.mjs"), later, later);
    await writeInstalledControllerArchive({ dataRoot, archivePath: secondArchive, entries });

    expect(await sha256File(secondArchive)).toBe(await sha256File(firstArchive));
    expect(await readFile(secondArchive)).toEqual(await readFile(firstArchive));

    const archivedPaths: string[] = [];
    await listTar({
      file: firstArchive,
      onentry: (entry) => archivedPaths.push(entry.path),
    });
    expect(archivedPaths).toEqual([...entries].sort());

    await extractTar({ cwd: extractRoot, file: firstArchive });
    expect(await readFile(path.join(extractRoot, "controller", "current"), "utf8")).toBe(`${digest}\n`);
    expect(await readlink(path.join(extractRoot, "controller", "releases", digest, "app", "entry.mjs")))
      .toBe("rawr.mjs");
    expect((await lstat(path.join(extractRoot, "controller", "bin", "rawr"))).mode & 0o111).not.toBe(0);
    await expect(readFile(path.join(extractRoot, "not-distributed.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(path.join(
      extractRoot,
      "controller",
      "releases",
      digest,
      "not-in-manifest.txt",
    ))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses to replace an existing archive", async () => {
    const root = await temporaryRoot();
    const dataRoot = path.join(root, "data");
    const outputRoot = path.join(root, "output");
    await mkdir(dataRoot);
    await mkdir(outputRoot);
    await writeFile(path.join(dataRoot, "only.txt"), "payload\n");
    const archivePath = path.join(outputRoot, "controller.tar");
    await writeFile(archivePath, "keep\n");

    await expect(
      writeInstalledControllerArchive({ dataRoot, archivePath, entries: ["only.txt"] }),
    ).rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(archivePath, "utf8")).toBe("keep\n");
  });

  it("records exact canonical provenance bytes, archive length, and archive digest", async () => {
    const root = await temporaryRoot();
    const archivePath = path.join(root, "rawr-controller-darwin-arm64.tar");
    const provenancePath = path.join(root, "rawr-controller-darwin-arm64.provenance.json");
    const archiveBytes = new TextEncoder().encode("deterministic archive fixture\n");
    await writeFile(archivePath, archiveBytes);
    const sourceRevision = "c".repeat(40);
    const parsedControllerDigest = parseControllerDigest("d".repeat(64));
    if (!parsedControllerDigest.ok) throw new Error("fixture controller digest is invalid");
    const controllerDigest = parsedControllerDigest.value;

    const provenance = await writeInstalledControllerProvenance({
      archivePath,
      provenancePath,
      sourceRevision,
      platform: "darwin",
      architecture: "arm64",
      controllerDigest,
      runtimeVersion: "1.3.14",
      runtimeRevision: "e".repeat(40),
    });
    const expected = {
      schemaVersion: 1,
      kind: "rawr-installed-controller",
      sourceRevision,
      platform: "darwin",
      architecture: "arm64",
      controllerDigest,
      runtime: {
        version: "1.3.14",
        revision: "e".repeat(40),
      },
      archive: {
        fileName: "rawr-controller-darwin-arm64.tar",
        byteLength: archiveBytes.byteLength,
        sha256: await sha256File(archivePath),
      },
      recipe: `${INSTALLED_CONTROLLER_ASSET_RECIPE}@${sourceRevision}`,
    };
    expect(provenance).toEqual(expected);
    expect(Value.Check(InstalledControllerProvenanceSchema, provenance)).toBe(true);
    expect(Value.Check(InstalledControllerProvenanceSchema, { ...expected, extra: true })).toBe(false);
    expect(await readFile(provenancePath, "utf8")).toBe(`${JSON.stringify(expected)}\n`);
  });

  it("rejects invalid provenance before publishing its file", async () => {
    const root = await temporaryRoot();
    const archivePath = path.join(root, "rawr-controller-darwin-arm64.tar");
    const provenancePath = path.join(root, "rawr-controller-darwin-arm64.provenance.json");
    await writeFile(archivePath, "archive\n");
    const parsedControllerDigest = parseControllerDigest("d".repeat(64));
    if (!parsedControllerDigest.ok) throw new Error("fixture controller digest is invalid");

    await expect(writeInstalledControllerProvenance({
      archivePath,
      provenancePath,
      sourceRevision: "not-a-git-revision",
      platform: "darwin",
      architecture: "arm64",
      controllerDigest: parsedControllerDigest.value,
      runtimeVersion: "1.3.14",
      runtimeRevision: "revision",
    })).rejects.toThrow("CONTROLLER_ASSET_PROVENANCE_INVALID");
    await expect(readFile(provenancePath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("installed controller root ownership", () => {
  it("refuses an output directory equal to the data root without changing source bytes", async () => {
    const root = await temporaryRoot();
    const combinedRoot = path.join(root, "combined");
    const sourcePath = path.join(combinedRoot, "source.txt");
    await mkdir(combinedRoot);
    await writeFile(sourcePath, "source bytes\n");

    await expectRootOverlapRefusal({
      dataRoot: combinedRoot,
      outputRoot: combinedRoot,
      sourcePath,
      expectedDataEntries: ["source.txt"],
      expectedOutputEntries: ["source.txt"],
    });
  });

  it("refuses an output directory nested under the data root without creating assets", async () => {
    const root = await temporaryRoot();
    const dataRoot = path.join(root, "data");
    const outputRoot = path.join(dataRoot, "output");
    const sourcePath = path.join(dataRoot, "source.txt");
    await mkdir(outputRoot, { recursive: true });
    await writeFile(sourcePath, "source bytes\n");
    await writeFile(path.join(outputRoot, "existing.txt"), "existing output\n");

    await expectRootOverlapRefusal({
      dataRoot,
      outputRoot,
      sourcePath,
      expectedDataEntries: ["output", "source.txt"],
      expectedOutputEntries: ["existing.txt"],
    });
  });

  it("refuses a data root nested under the output directory without creating assets", async () => {
    const root = await temporaryRoot();
    const outputRoot = path.join(root, "output");
    const dataRoot = path.join(outputRoot, "data");
    const sourcePath = path.join(dataRoot, "source.txt");
    await mkdir(dataRoot, { recursive: true });
    await writeFile(sourcePath, "source bytes\n");
    await writeFile(path.join(outputRoot, "existing.txt"), "existing output\n");

    await expectRootOverlapRefusal({
      dataRoot,
      outputRoot,
      sourcePath,
      expectedDataEntries: ["source.txt"],
      expectedOutputEntries: ["data", "existing.txt"],
    });
  });
});

describe("installed controller production orchestration", () => {
  it("constructs an installed-controller archive and exact provenance from the selected release", async () => {
    const root = await temporaryRoot();
    const sourceRevision = "f".repeat(40);
    const fixture = await installedControllerFixture(root, sourceRevision);

    const result = await createInstalledControllerAsset({
      dataRoot: fixture.dataRoot,
      outputDirectory: fixture.outputRoot,
      sourceRevision,
    });

    expect(result.archivePath).toBe(path.join(fixture.outputRoot, `${fixture.assetName}.tar`));
    expect(result.provenancePath).toBe(
      path.join(fixture.outputRoot, `${fixture.assetName}.provenance.json`),
    );
    expect(result.provenance).toMatchObject({
      sourceRevision,
      controllerDigest: fixture.controllerDigest,
      archive: { fileName: `${fixture.assetName}.tar` },
    });
    expect((await lstat(result.archivePath)).isFile()).toBe(true);
    expect(await readFile(result.provenancePath, "utf8")).toBe(
      `${JSON.stringify(result.provenance)}\n`,
    );
  });

  it("rejects a selected release from another source revision before creating output", async () => {
    const root = await temporaryRoot();
    const fixture = await installedControllerFixture(root, "1".repeat(40));

    await expect(createInstalledControllerAsset({
      dataRoot: fixture.dataRoot,
      outputDirectory: fixture.outputRoot,
      sourceRevision: "2".repeat(40),
    })).rejects.toThrow("CONTROLLER_ASSET_SOURCE_REVISION_MISMATCH");

    expect(await readdir(fixture.outputRoot)).toEqual([]);
  });

  it("removes its new archive and preserves an existing provenance file after a collision", async () => {
    const root = await temporaryRoot();
    const sourceRevision = "3".repeat(40);
    const fixture = await installedControllerFixture(root, sourceRevision);
    const archivePath = path.join(fixture.outputRoot, `${fixture.assetName}.tar`);
    const provenancePath = path.join(
      fixture.outputRoot,
      `${fixture.assetName}.provenance.json`,
    );
    const existingProvenance = new TextEncoder().encode("existing provenance\n");
    await writeFile(provenancePath, existingProvenance);

    await expect(createInstalledControllerAsset({
      dataRoot: fixture.dataRoot,
      outputDirectory: fixture.outputRoot,
      sourceRevision,
    })).rejects.toMatchObject({ code: "EEXIST" });

    await expect(lstat(archivePath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(provenancePath)).toEqual(existingProvenance);
    expect(await readdir(fixture.outputRoot)).toEqual([path.basename(provenancePath)]);
  });
});

describe("installed controller distribution CLI", () => {
  it("requires explicit absolute roots and a source revision", () => {
    expect(parseInstalledControllerDistributionOptions([
      "--data-root=/tmp/data",
      "--output-directory=/tmp/output",
      `--source-revision=${"b".repeat(40)}`,
    ])).toEqual({
      dataRoot: "/tmp/data",
      outputDirectory: "/tmp/output",
      sourceRevision: "b".repeat(40),
    });
    expect(() => parseInstalledControllerDistributionOptions([
      "--data-root=relative",
      "--output-directory=/tmp/output",
      `--source-revision=${"b".repeat(40)}`,
    ])).toThrow("--data-root must be absolute");
  });
});
