import path from "node:path";

import { list, type ReadEntry } from "tar";

import {
  MAX_STATIC_EVIDENCE_TEXT_BYTES,
  type StaticEvidencePort,
  type StaticEvidenceResult,
} from "./static-evidence";

const MANIFEST_PATHS = new Set(["package.json", "oclif.manifest.json"]);
const MAX_ENTRIES = 100_000;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
const MAX_MANIFEST_BYTES = MAX_STATIC_EVIDENCE_TEXT_BYTES;

export class TarballStaticEvidencePort implements StaticEvidencePort {
  readonly root: string;

  private constructor(
    digest: string,
    private readonly files: ReadonlySet<string>,
    private readonly directories: ReadonlySet<string>,
    private readonly text: ReadonlyMap<string, string>,
  ) {
    this.root = path.resolve(path.parse(process.cwd()).root, ".rawr-artifact", digest, "package");
  }

  static async read(artifactPath: string, digest: string): Promise<TarballStaticEvidencePort> {
    const virtualRoot = path.resolve(path.parse(process.cwd()).root, ".rawr-artifact", digest, "package");
    const files = new Set<string>();
    const directories = new Set<string>([virtualRoot]);
    const text = new Map<string, string>();
    const manifestReads: Promise<void>[] = [];
    let entryCount = 0;
    let expandedBytes = 0;
    let deferredFailure: Error | undefined;

    await list({
      file: artifactPath,
      strict: true,
      onReadEntry(entry) {
        if (deferredFailure) return;
        try {
          const archiveEntry = parseArchiveEntry(entry);
          if (archiveEntry === null) return;
          entryCount += 1;
          expandedBytes += entry.size;
          if (entryCount > MAX_ENTRIES || expandedBytes > MAX_EXPANDED_BYTES) {
            throw new Error("EXTERNAL_EXTENSION_ARCHIVE_LIMIT_EXCEEDED");
          }

          const virtualPath = path.join(virtualRoot, ...archiveEntry.relativeSegments);
          addParentDirectories(virtualRoot, virtualPath, files, directories);
          if (archiveEntry.kind === "directory") {
            if (files.has(virtualPath)) throw new Error("EXTERNAL_EXTENSION_ARCHIVE_PATH_DUPLICATE");
            directories.add(virtualPath);
            return;
          }
          if (files.has(virtualPath) || directories.has(virtualPath)) {
            throw new Error("EXTERNAL_EXTENSION_ARCHIVE_PATH_DUPLICATE");
          }
          files.add(virtualPath);
          if (!MANIFEST_PATHS.has(archiveEntry.relativeSegments.join("/"))) return;
          if (entry.size > MAX_MANIFEST_BYTES) {
            throw new Error("EXTERNAL_EXTENSION_ARCHIVE_MANIFEST_TOO_LARGE");
          }
          manifestReads.push(readManifestEntry(entry, virtualPath, text));
        } catch (error) {
          deferredFailure = asError(error);
        }
      },
    });
    await Promise.all(manifestReads);
    if (deferredFailure) throw deferredFailure;
    return new TarballStaticEvidencePort(digest, files, directories, text);
  }

  async canonicalPath(requestedPath: string): Promise<StaticEvidenceResult<string>> {
    const normalized = path.resolve(requestedPath);
    if (!isContained(this.root, normalized) || (!this.files.has(normalized) && !this.directories.has(normalized))) {
      return missing(`Archive path is missing: ${requestedPath}`);
    }
    return { ok: true, value: normalized };
  }

  async isFile(requestedPath: string): Promise<StaticEvidenceResult<boolean>> {
    const normalized = path.resolve(requestedPath);
    if (!isContained(this.root, normalized) || (!this.files.has(normalized) && !this.directories.has(normalized))) {
      return missing(`Archive path is missing: ${requestedPath}`);
    }
    return { ok: true, value: this.files.has(normalized) };
  }

  async isDirectory(requestedPath: string): Promise<StaticEvidenceResult<boolean>> {
    const normalized = path.resolve(requestedPath);
    if (!isContained(this.root, normalized) || (!this.files.has(normalized) && !this.directories.has(normalized))) {
      return missing(`Archive path is missing: ${requestedPath}`);
    }
    return { ok: true, value: this.directories.has(normalized) };
  }

  async readText(requestedPath: string): Promise<StaticEvidenceResult<string>> {
    const normalized = path.resolve(requestedPath);
    const value = this.text.get(normalized);
    if (value === undefined) return missing(`Archive text path is missing: ${requestedPath}`);
    return { ok: true, value };
  }
}

type ParsedArchiveEntry = Readonly<{
  kind: "directory" | "file";
  relativeSegments: readonly string[];
}>;

function parseArchiveEntry(entry: ReadEntry): ParsedArchiveEntry | null {
  if (entry.meta) return null;
  const archivePath = entry.path;
  if (archivePath.includes("\\") || archivePath.includes("\0") || path.posix.isAbsolute(archivePath)) {
    throw new Error("EXTERNAL_EXTENSION_ARCHIVE_PATH_REJECTED");
  }
  const segments = archivePath.split("/").filter(Boolean);
  if (
    segments[0] !== "package"
    || segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("EXTERNAL_EXTENSION_ARCHIVE_LAYOUT_REJECTED");
  }
  if (entry.type === "Directory") {
    return { kind: "directory", relativeSegments: segments.slice(1) };
  }
  if (entry.type !== "File" && entry.type !== "OldFile") {
    throw new Error(`EXTERNAL_EXTENSION_ARCHIVE_ENTRY_REJECTED:${entry.type}`);
  }
  if (segments.length === 1) throw new Error("EXTERNAL_EXTENSION_ARCHIVE_LAYOUT_REJECTED");
  return { kind: "file", relativeSegments: segments.slice(1) };
}

function readManifestEntry(
  entry: ReadEntry,
  virtualPath: string,
  text: Map<string, string>,
): Promise<void> {
  return new Promise((resolveEntry, rejectEntry) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    entry.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes <= MAX_MANIFEST_BYTES) chunks.push(chunk);
    });
    entry.once("error", rejectEntry);
    entry.once("end", () => {
      if (bytes > MAX_MANIFEST_BYTES) {
        rejectEntry(new Error("EXTERNAL_EXTENSION_ARCHIVE_MANIFEST_TOO_LARGE"));
        return;
      }
      try {
        text.set(
          virtualPath,
          new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
        );
        resolveEntry();
      } catch {
        rejectEntry(new Error("EXTERNAL_EXTENSION_ARCHIVE_MANIFEST_NOT_UTF8"));
      }
    });
  });
}

function addParentDirectories(
  root: string,
  filePath: string,
  files: ReadonlySet<string>,
  directories: Set<string>,
): void {
  let current = path.dirname(filePath);
  while (isContained(root, current)) {
    if (files.has(current)) throw new Error("EXTERNAL_EXTENSION_ARCHIVE_PATH_DUPLICATE");
    directories.add(current);
    if (current === root) return;
    current = path.dirname(current);
  }
}

function missing<T>(message: string): StaticEvidenceResult<T> {
  return { ok: false, error: { kind: "missing", message } };
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
