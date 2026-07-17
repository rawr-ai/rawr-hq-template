import { randomUUID } from "node:crypto";
import { join } from "node:path";

import type {
  ExportDestinationAsyncPort,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
} from "@rawr/resource-agent-plugin-export-destination";

import { contentDigest } from "../../../shared/release/index";
import {
  ExportFilesystemError,
  failure,
  type CapturedDirectory,
  type CapturedPath,
  type CapturedRegularFile,
  type DestinationIdentity,
} from "./filesystem-model";
import { EXPORT_LEDGER_FILENAME } from "./ledger";
import type { ExportOwnerStateReader } from "./owner-protocol";

const OWNER_INSPECTION_MAX_ENTRIES = 256;
const OWNER_INSPECTION_MAX_BYTES = 96 * 1024 * 1024;

export function createExportOwnerStateReader(
  resource: ExportDestinationAsyncPort,
): ExportOwnerStateReader {
  return Object.freeze({
    async captureDestination(input: string) {
      try {
        const snapshot = await resource.inspect({
          destination: input,
          readToken: readToken(),
          paths: [EXPORT_LEDGER_FILENAME],
          maxEntries: OWNER_INSPECTION_MAX_ENTRIES,
          maxBytes: OWNER_INSPECTION_MAX_BYTES,
        });
        return Object.freeze({
          path: snapshot.canonicalDestination,
          dev: BigInt(snapshot.destinationStat.dev),
          ino: BigInt(snapshot.destinationStat.ino),
        });
      } catch (error) {
        throw ownerFilesystemError(error, "owner-destination-inspect");
      }
    },
    captureDirectFile(
      destination: DestinationIdentity,
      filename: string,
      maximumReadableBytes = OWNER_INSPECTION_MAX_BYTES,
    ) {
      return capturePath(resource, destination, filename, maximumReadableBytes);
    },
    capturePath(
      destination: DestinationIdentity,
      relativePath: string,
      maximumReadableBytes = OWNER_INSPECTION_MAX_BYTES,
    ) {
      return capturePath(resource, destination, relativePath, maximumReadableBytes);
    },
    async captureExistingDirectory(destination: DestinationIdentity, relativePath: string) {
      const observed = await inspectOne(resource, destination, relativePath, 0);
      if (observed.kind !== "Directory") {
        throw new ExportFilesystemError(failure(
          "ManagedStateMismatch",
          "owner-directory-inspect",
          "Expected one live export directory",
          relativePath,
        ));
      }
      return capturedDirectory(destination, observed);
    },
  });
}

async function capturePath(
  resource: ExportDestinationAsyncPort,
  destination: DestinationIdentity,
  relativePath: string,
  maximumReadableBytes: number,
): Promise<CapturedPath> {
  const observed = await inspectOne(resource, destination, relativePath, maximumReadableBytes);
  const absolute = join(destination.path, ...relativePath.split("/"));
  if (observed.kind === "Absent") return Object.freeze({
    kind: "Absent",
    path: absolute,
    missingDirectories: Object.freeze([]),
    parentChain: Object.freeze([]),
  });
  if (observed.kind !== "File") {
    throw new ExportFilesystemError(failure(
      "ManagedStateMismatch",
      "owner-file-inspect",
      "Expected one live export file",
      relativePath,
    ));
  }
  return Object.freeze({
    kind: "Present",
    file: capturedFile(destination, observed),
    missingDirectories: Object.freeze([]),
    parentChain: Object.freeze([]),
  });
}

async function inspectOne(
  resource: ExportDestinationAsyncPort,
  destination: DestinationIdentity,
  relativePath: string,
  maximumReadableBytes: number,
): Promise<ExportDestinationEntryObservation> {
  try {
    const snapshot = await resource.inspect({
      destination: destination.path,
      readToken: readToken(),
      paths: [relativePath],
      maxEntries: OWNER_INSPECTION_MAX_ENTRIES,
      maxBytes: Math.max(0, Math.min(maximumReadableBytes, OWNER_INSPECTION_MAX_BYTES)),
    });
    if (
      snapshot.canonicalDestination !== destination.path
      || snapshot.destinationStat.dev !== destination.dev.toString(10)
      || snapshot.destinationStat.ino !== destination.ino.toString(10)
    ) throw new ExportFilesystemError(failure(
      "PathChanged",
      "owner-destination-identity",
      "Export destination identity changed during owner inspection",
      destination.path,
    ));
    const observed = snapshot.entries[0];
    if (observed === undefined || observed.path !== relativePath) throw new ExportFilesystemError(failure(
      "VerificationFailed",
      "owner-entry-inspect",
      "Destination resource omitted the requested owner entry",
      relativePath,
    ));
    return observed;
  } catch (error) {
    if (error instanceof ExportFilesystemError) throw error;
    throw ownerFilesystemError(error, "owner-entry-inspect");
  }
}

function capturedFile(
  destination: DestinationIdentity,
  observed: Extract<ExportDestinationEntryObservation, { kind: "File" }>,
): CapturedRegularFile {
  return Object.freeze({
    path: join(destination.path, ...observed.path.split("/")),
    dev: BigInt(observed.stat.dev),
    ino: BigInt(observed.stat.ino),
    size: BigInt(observed.stat.size),
    mode: BigInt(observed.mode),
    mtimeNs: BigInt(observed.stat.mtimeNs),
    ctimeNs: BigInt(observed.stat.ctimeNs),
    bytes: new Uint8Array(observed.bytes),
    contentDigest: contentDigest(observed.bytes),
    parentChain: Object.freeze([]),
  });
}

function capturedDirectory(
  destination: DestinationIdentity,
  observed: Extract<ExportDestinationEntryObservation, { kind: "Directory" }>,
): CapturedDirectory {
  return Object.freeze({
    path: join(destination.path, ...observed.path.split("/")),
    relativePath: observed.path,
    dev: BigInt(observed.stat.dev),
    ino: BigInt(observed.stat.ino),
    mode: BigInt(observed.mode),
    birthtimeNs: BigInt(observed.stat.birthtimeNs),
    mtimeNs: BigInt(observed.stat.mtimeNs),
    ctimeNs: BigInt(observed.stat.ctimeNs),
    parentChain: Object.freeze([]),
  });
}

function ownerFilesystemError(error: unknown, phase: string): ExportFilesystemError {
  if (isResourceFailure(error)) return new ExportFilesystemError(failure(
    error.reason === "IdentityChanged"
      ? "PathChanged"
      : error.reason === "LimitExceeded"
        ? "ManagedStateMismatch"
        : "VerificationFailed",
    `${phase}:${error.operation}:${error.reason}`,
    error.detail,
    error.path,
  ));
  return new ExportFilesystemError(failure(
    "VerificationFailed",
    phase,
    error instanceof Error ? error.message : String(error),
  ));
}

function isResourceFailure(error: unknown): error is ExportDestinationResourceFailure {
  return typeof error === "object" && error !== null && "_tag" in error && error._tag === "ExportDestinationFailure";
}

function readToken(): string {
  return `export-owner-read-${randomUUID()}`;
}
