import {
  lstat,
  open,
  realpath,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import {
  decodeControllerSelection,
  type ControllerDigest,
  type VerifiedControllerPayloadEntry,
} from "@rawr/controller-release";
import { create as createTar } from "tar";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

import { inspectStableControllerLauncher } from "../install-launcher.ts";
import {
  CONTROLLER_DIRECTORY,
  CONTROLLER_ENVELOPE_PATH,
  CONTROLLER_LAUNCHER_PATH,
  CONTROLLER_RELEASES_DIRECTORY,
  CONTROLLER_SELECTOR_FILE,
  controllerReleasePath,
  controllerSelectorPath,
} from "../layout.ts";
import { sha256File } from "./filesystem.ts";
import { requireVerifiedOfficialControllerRelease } from "../production/verify-official.ts";
import { nodeControllerSelectorStore } from "../selector-store.ts";

export const INSTALLED_CONTROLLER_ASSET_SCHEMA_VERSION = 1;
export const INSTALLED_CONTROLLER_ASSET_RECIPE = ".github/workflows/controller-installed-release.yml";

const NonEmptyCanonicalTextSchema = Type.String({
  minLength: 1,
  maxLength: 1_024,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});
const Sha256Schema = Type.String({ pattern: "^[0-9a-f]{64}$" });
const SourceRevisionSchema = Type.String({ pattern: "^[0-9a-f]{40}$" });
const ControllerDigestSchema = Type.Unsafe<ControllerDigest>(Sha256Schema);

export const InstalledControllerProvenanceSchema = Type.Readonly(Type.Object(
  {
    schemaVersion: Type.Literal(INSTALLED_CONTROLLER_ASSET_SCHEMA_VERSION),
    kind: Type.Literal("rawr-installed-controller"),
    sourceRevision: SourceRevisionSchema,
    platform: Type.Union([Type.Literal("darwin"), Type.Literal("linux")]),
    architecture: Type.Union([Type.Literal("arm64"), Type.Literal("x64")]),
    controllerDigest: ControllerDigestSchema,
    runtime: Type.Readonly(Type.Object(
      {
        version: NonEmptyCanonicalTextSchema,
        revision: NonEmptyCanonicalTextSchema,
      },
      { additionalProperties: false },
    )),
    archive: Type.Readonly(Type.Object(
      {
        fileName: NonEmptyCanonicalTextSchema,
        byteLength: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
        sha256: Sha256Schema,
      },
      { additionalProperties: false },
    )),
    recipe: NonEmptyCanonicalTextSchema,
  },
  { additionalProperties: false },
));

export type InstalledControllerProvenance = Static<typeof InstalledControllerProvenanceSchema>;

export type InstalledControllerAsset = Readonly<{
  archivePath: string;
  provenancePath: string;
  provenance: InstalledControllerProvenance;
}>;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function describeIssues(issues: readonly Readonly<{ path: string; message: string }>[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
}

async function failAfterCleanup(
  primaryError: unknown,
  cleanupActions: readonly (() => Promise<void>)[],
  message: string,
): Promise<never> {
  const errors = [primaryError];
  for (const cleanup of cleanupActions) {
    try {
      await cleanup();
    } catch (cleanupError) {
      errors.push(cleanupError);
    }
  }
  if (errors.length > 1) throw new AggregateError(errors, message);
  throw primaryError;
}

function releaseArchivePath(controllerDigest: ControllerDigest, entry: string): string {
  return path.posix.join(
    CONTROLLER_DIRECTORY,
    CONTROLLER_RELEASES_DIRECTORY,
    controllerDigest,
    entry,
  );
}

export function installedControllerArchiveEntries(
  controllerDigest: ControllerDigest,
  releaseEntries: readonly VerifiedControllerPayloadEntry[],
): readonly string[] {
  const entries = [
    CONTROLLER_LAUNCHER_PATH,
    path.posix.join(CONTROLLER_DIRECTORY, CONTROLLER_SELECTOR_FILE),
    releaseArchivePath(controllerDigest, CONTROLLER_ENVELOPE_PATH),
    ...releaseEntries.map((entry) => releaseArchivePath(controllerDigest, entry.path)),
  ].sort(compareCodeUnits);
  if (new Set(entries).size !== entries.length) {
    throw new Error("CONTROLLER_ASSET_ENTRY_COLLISION: installed controller paths must be unique");
  }
  return Object.freeze(entries);
}

function assertArchiveEntry(entry: string): void {
  if (
    entry.length === 0
    || entry.startsWith("/")
    || entry.includes("\\")
    || path.posix.normalize(entry) !== entry
    || entry === ".."
    || entry.startsWith("../")
  ) {
    throw new Error(`CONTROLLER_ASSET_PATH_INVALID: ${entry}`);
  }
}

async function writeExclusiveArchive(
  dataRoot: string,
  archivePath: string,
  entries: readonly string[],
): Promise<void> {
  const output = await open(archivePath, "wx", 0o644);
  try {
    const archive = createTar(
      {
        cwd: dataRoot,
        follow: false,
        noDirRecurse: true,
        noMtime: true,
        onWriteEntry: (entry) => {
          if (!entry.stat) {
            throw new Error("CONTROLLER_ASSET_ENTRY_STAT_MISSING: archive entry has no filesystem identity");
          }
          // tar's portable mode rewrites permission bits. Omit only host-local
          // metadata so the verified payload's exact modes survive extraction.
          const stat: Partial<typeof entry.stat> = entry.stat;
          stat.uid = undefined;
          stat.gid = undefined;
          stat.atime = undefined;
          stat.ctime = undefined;
          stat.dev = undefined;
          stat.ino = undefined;
          stat.nlink = undefined;
        },
        portable: false,
        strict: true,
      },
      [...entries],
    );
    await pipeline(archive, output.createWriteStream());
  } catch (primaryError) {
    return failAfterCleanup(
      primaryError,
      [
        () => output.close(),
        () => rm(archivePath, { force: true }),
      ],
      "installed controller archive write failed and output cleanup also failed",
    );
  }
}

export async function writeInstalledControllerArchive(input: {
  dataRoot: string;
  archivePath: string;
  entries: readonly string[];
}): Promise<void> {
  const dataRoot = await realpath(path.resolve(input.dataRoot));
  const entries = [...input.entries].sort(compareCodeUnits);
  if (entries.length === 0 || new Set(entries).size !== entries.length) {
    throw new Error("CONTROLLER_ASSET_ENTRIES_INVALID: paths must be non-empty and unique");
  }
  for (const entry of entries) assertArchiveEntry(entry);
  await writeExclusiveArchive(dataRoot, input.archivePath, entries);
}

function canonicalProvenanceBytes(provenance: InstalledControllerProvenance): Uint8Array {
  if (!Value.Check(InstalledControllerProvenanceSchema, provenance)) {
    throw new Error("CONTROLLER_ASSET_PROVENANCE_INVALID: provenance must match the closed TypeBox schema");
  }
  return new TextEncoder().encode(`${JSON.stringify(provenance)}\n`);
}

async function writeExclusiveFile(filePath: string, bytes: Uint8Array): Promise<void> {
  const output = await open(filePath, "wx", 0o644);
  try {
    await output.writeFile(bytes);
    await output.sync();
    await output.close();
  } catch (primaryError) {
    return failAfterCleanup(
      primaryError,
      [
        () => output.close(),
        () => rm(filePath, { force: true }),
      ],
      "installed controller provenance write failed and output cleanup also failed",
    );
  }
}

export async function writeInstalledControllerProvenance(input: {
  archivePath: string;
  provenancePath: string;
  sourceRevision: string;
  platform: InstalledControllerProvenance["platform"];
  architecture: InstalledControllerProvenance["architecture"];
  controllerDigest: ControllerDigest;
  runtimeVersion: string;
  runtimeRevision: string;
}): Promise<InstalledControllerProvenance> {
  const archiveStatus = await lstat(input.archivePath);
  if (!archiveStatus.isFile() || archiveStatus.nlink !== 1) {
    throw new Error("CONTROLLER_ASSET_ARCHIVE_INVALID: output must be one independent regular file");
  }
  const provenance: InstalledControllerProvenance = Object.freeze({
    schemaVersion: INSTALLED_CONTROLLER_ASSET_SCHEMA_VERSION,
    kind: "rawr-installed-controller",
    sourceRevision: input.sourceRevision,
    platform: input.platform,
    architecture: input.architecture,
    controllerDigest: input.controllerDigest,
    runtime: Object.freeze({
      version: input.runtimeVersion,
      revision: input.runtimeRevision,
    }),
    archive: Object.freeze({
      fileName: path.basename(input.archivePath),
      byteLength: archiveStatus.size,
      sha256: await sha256File(input.archivePath),
    }),
    recipe: `${INSTALLED_CONTROLLER_ASSET_RECIPE}@${input.sourceRevision}`,
  });
  await writeExclusiveFile(input.provenancePath, canonicalProvenanceBytes(provenance));
  return provenance;
}

async function canonicalDirectory(directory: string, label: string): Promise<string> {
  const resolved = path.resolve(directory);
  const status = await lstat(resolved);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(resolved) !== resolved) {
    throw new Error(`${label} must be a canonical directory: ${directory}`);
  }
  return resolved;
}

function containsOrEquals(root: string, candidate: string): boolean {
  const offset = path.relative(root, candidate);
  return offset === ""
    || (offset !== ".." && !offset.startsWith(`..${path.sep}`) && !path.isAbsolute(offset));
}

function assertDisjointRoots(dataRoot: string, outputDirectory: string): void {
  if (
    containsOrEquals(dataRoot, outputDirectory)
    || containsOrEquals(outputDirectory, dataRoot)
  ) {
    throw new Error(
      "CONTROLLER_ASSET_ROOTS_OVERLAP: controller data root and asset output directory must be disjoint",
    );
  }
}

export async function createInstalledControllerAsset(input: {
  dataRoot: string;
  outputDirectory: string;
  sourceRevision: string;
}): Promise<InstalledControllerAsset> {
  if (!Value.Check(SourceRevisionSchema, input.sourceRevision)) {
    throw new Error("CONTROLLER_ASSET_SOURCE_REVISION_INVALID: expected one lowercase 40-character Git revision");
  }
  const dataRoot = await canonicalDirectory(input.dataRoot, "controller asset data root");
  const outputDirectory = await canonicalDirectory(input.outputDirectory, "controller asset output directory");
  assertDisjointRoots(dataRoot, outputDirectory);
  const selectorPath = controllerSelectorPath(dataRoot);
  const selector = await nodeControllerSelectorStore.read(selectorPath);
  if (selector.kind !== "regular") {
    throw new Error(`CONTROLLER_ASSET_SELECTION_INVALID: ${selector.kind}`);
  }
  const decoded = decodeControllerSelection(selector.bytes);
  if (!decoded.ok) {
    throw new Error(`CONTROLLER_ASSET_SELECTION_INVALID: ${describeIssues(decoded.issues)}`);
  }
  const controllerDigest = decoded.value.controllerDigest;
  const release = await requireVerifiedOfficialControllerRelease({
    releaseRoot: controllerReleasePath(dataRoot, controllerDigest),
    expectedDigest: controllerDigest,
  });
  const launcher = await inspectStableControllerLauncher({ dataRoot });
  if (launcher.kind !== "converged") {
    const reason = launcher.kind === "drifted" ? launcher.reason : launcher.kind;
    throw new Error(`CONTROLLER_ASSET_LAUNCHER_INVALID: ${reason}`);
  }
  const manifest = release.envelope.manifest;
  if (manifest.sourceRevision !== input.sourceRevision) {
    throw new Error(
      `CONTROLLER_ASSET_SOURCE_REVISION_MISMATCH: expected ${input.sourceRevision}, observed ${manifest.sourceRevision}`,
    );
  }
  if (manifest.runtime.platform !== "darwin" && manifest.runtime.platform !== "linux") {
    throw new Error(
      `CONTROLLER_ASSET_RUNTIME_UNSUPPORTED: installed assets support darwin/linux, observed ${manifest.runtime.platform}`,
    );
  }
  if (manifest.runtime.platform !== process.platform || manifest.runtime.architecture !== process.arch) {
    throw new Error(
      `CONTROLLER_ASSET_RUNTIME_HOST_MISMATCH: release ${manifest.runtime.platform}/${manifest.runtime.architecture}, host ${process.platform}/${process.arch}`,
    );
  }

  const assetName = `rawr-controller-${manifest.runtime.platform}-${manifest.runtime.architecture}`;
  const archivePath = path.join(outputDirectory, `${assetName}.tar`);
  const provenancePath = path.join(outputDirectory, `${assetName}.provenance.json`);
  let archiveCreated = false;
  try {
    await writeInstalledControllerArchive({
      dataRoot,
      archivePath,
      entries: installedControllerArchiveEntries(controllerDigest, release.entries),
    });
    archiveCreated = true;
    const provenance = await writeInstalledControllerProvenance({
      archivePath,
      provenancePath,
      sourceRevision: manifest.sourceRevision,
      platform: manifest.runtime.platform,
      architecture: manifest.runtime.architecture,
      controllerDigest,
      runtimeVersion: manifest.runtime.version,
      runtimeRevision: manifest.runtime.revision,
    });
    return Object.freeze({ archivePath, provenancePath, provenance });
  } catch (primaryError) {
    if (!archiveCreated) throw primaryError;
    return failAfterCleanup(
      primaryError,
      [() => rm(archivePath, { force: true })],
      "installed controller asset construction failed and archive cleanup also failed",
    );
  }
}
