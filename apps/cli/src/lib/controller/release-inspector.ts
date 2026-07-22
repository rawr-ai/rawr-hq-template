import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import path from "node:path";

import {
  decodeControllerReleaseEnvelope,
  MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES,
  verifyControllerPayload,
  type ControllerIssue,
  type ControllerObservedPayloadEntryInput,
  type ControllerReleaseEnvelope,
  type VerifiedControllerPayloadEntry,
} from "@rawr/controller-release";

import { CONTROLLER_ENVELOPE_PATH } from "./layout";

export { CONTROLLER_ENVELOPE_PATH } from "./layout";

export type ControllerReleaseInspectionIssue = Readonly<{
  code: string;
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}>;

export type VerifiedControllerRelease = Readonly<{
  status: "verified";
  releaseRoot: string;
  controllerDigest: string;
  envelope: ControllerReleaseEnvelope;
  entries: readonly VerifiedControllerPayloadEntry[];
  issues: readonly [];
}>;

export type InvalidControllerRelease = Readonly<{
  status: "invalid";
  releaseRoot: string;
  controllerDigest: string;
  issues: readonly ControllerReleaseInspectionIssue[];
}>;

export type ControllerReleaseInspection = VerifiedControllerRelease | InvalidControllerRelease;

export async function inspectControllerRelease(input: {
  releaseRoot: string;
  expectedDigest: string;
  requireDigestDirectory?: boolean;
}): Promise<ControllerReleaseInspection> {
  const releaseRoot = path.resolve(input.releaseRoot);
  try {
    const canonicalRoot = await realpath(releaseRoot);
    if (canonicalRoot !== releaseRoot) {
      return invalid(releaseRoot, input.expectedDigest, [
        issue(
          "RELEASE_ROOT_ALIAS",
          "releaseRoot",
          "Controller release root must be its canonical path",
          releaseRoot,
          canonicalRoot
        ),
      ]);
    }

    const envelopePath = path.join(canonicalRoot, CONTROLLER_ENVELOPE_PATH);
    const envelopeStatus = await lstat(envelopePath);
    if (
      !envelopeStatus.isFile() ||
      envelopeStatus.nlink !== 1 ||
      (await realpath(envelopePath)) !== envelopePath
    ) {
      return invalid(canonicalRoot, input.expectedDigest, [
        issue(
          "RELEASE_ENVELOPE_ALIAS",
          CONTROLLER_ENVELOPE_PATH,
          "Controller release envelope must be one independent in-release regular file"
        ),
      ]);
    }
    if (envelopeStatus.size > MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES) {
      return invalid(canonicalRoot, input.expectedDigest, [
        issue(
          "ENVELOPE_TOO_LARGE",
          CONTROLLER_ENVELOPE_PATH,
          `Controller release envelope exceeds ${MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES} bytes`,
          MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES,
          envelopeStatus.size
        ),
      ]);
    }
    const envelopeBytes = new Uint8Array(await readFile(envelopePath));
    const envelope = decodeControllerReleaseEnvelope(envelopeBytes, {
      controllerDigest: input.expectedDigest,
      ...(input.requireDigestDirectory === false
        ? {}
        : { releaseDirectoryName: path.basename(canonicalRoot) }),
    });
    if (!envelope.ok) {
      return invalid(canonicalRoot, input.expectedDigest, envelope.issues);
    }

    const observed = await observeControllerPayload(canonicalRoot);
    const payload = verifyControllerPayload(envelope.value.manifest, observed);
    if (!payload.ok) {
      return invalid(canonicalRoot, input.expectedDigest, payload.issues);
    }

    return Object.freeze({
      status: "verified",
      releaseRoot: canonicalRoot,
      controllerDigest: envelope.value.controllerDigest,
      envelope: envelope.value,
      entries: payload.value.entries,
      issues: [] as const,
    });
  } catch (error) {
    return invalid(releaseRoot, input.expectedDigest, [filesystemIssue(error)]);
  }
}

export async function requireVerifiedControllerRelease(input: {
  releaseRoot: string;
  expectedDigest: string;
  requireDigestDirectory?: boolean;
}): Promise<VerifiedControllerRelease> {
  const inspection = await inspectControllerRelease(input);
  if (inspection.status === "verified") return inspection;
  throw new ControllerReleaseInspectionError(inspection);
}

export class ControllerReleaseInspectionError extends Error {
  readonly inspection: InvalidControllerRelease;

  constructor(inspection: InvalidControllerRelease) {
    super(
      `CONTROLLER_RELEASE_INVALID: ${inspection.issues
        .map((entry) => `${entry.path}: ${entry.message}`)
        .join("; ")}`
    );
    this.name = "ControllerReleaseInspectionError";
    this.inspection = inspection;
  }
}

export async function observeControllerPayload(
  releaseRoot: string
): Promise<readonly ControllerObservedPayloadEntryInput[]> {
  const canonicalRoot = await realpath(releaseRoot);
  const entries: ControllerObservedPayloadEntryInput[] = [];

  const visit = async (directory: string): Promise<void> => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const absolutePath = path.join(directory, child.name);
      const releasePath = canonicalRelativePath(canonicalRoot, absolutePath);
      if (releasePath === CONTROLLER_ENVELOPE_PATH) continue;
      if (child.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      const status = await lstat(absolutePath);
      if (child.isFile()) {
        entries.push({
          kind: "file",
          path: releasePath,
          mode: status.mode & 0o777,
          digest: await sha256File(absolutePath),
          nlink: status.nlink,
        });
        continue;
      }
      if (child.isSymbolicLink()) {
        const rawTarget = await readlink(absolutePath);
        const targetPath = path.resolve(path.dirname(absolutePath), rawTarget);
        assertContained(canonicalRoot, targetPath, `link ${releasePath}`);
        const canonicalTarget = await realpath(absolutePath);
        assertContained(canonicalRoot, canonicalTarget, `link ${releasePath}`);
        entries.push({
          kind: "link",
          path: releasePath,
          mode: status.mode & 0o777,
          target: canonicalRelativePath(canonicalRoot, targetPath),
          nlink: status.nlink,
        });
        continue;
      }
      throw new Error(`Unsupported controller payload entry: ${releasePath}`);
    }
  };

  await visit(canonicalRoot);
  return Object.freeze(entries);
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function canonicalRelativePath(root: string, candidate: string): string {
  const relative = path.relative(root, candidate);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Controller payload path escapes release root: ${candidate}`);
  }
  return relative.split(path.sep).join("/");
}

function assertContained(root: string, candidate: string, label: string): void {
  const offset = path.relative(root, candidate);
  if (
    offset === "" ||
    (!offset.startsWith(`..${path.sep}`) && offset !== ".." && !path.isAbsolute(offset))
  ) {
    return;
  }
  throw new Error(`Controller payload ${label} resolves outside the release`);
}

function invalid(
  releaseRoot: string,
  controllerDigest: string,
  issues: readonly ControllerReleaseInspectionIssue[] | readonly ControllerIssue[]
): InvalidControllerRelease {
  return Object.freeze({
    status: "invalid",
    releaseRoot,
    controllerDigest,
    issues: Object.freeze(issues.map((entry) => Object.freeze({ ...entry }))),
  });
}

function filesystemIssue(error: unknown): ControllerReleaseInspectionIssue {
  const code = errorCode(error);
  return issue(
    code === "ENOENT" || code === "ENOTDIR" ? "RELEASE_PATH_MISSING" : "RELEASE_FILESYSTEM_ERROR",
    "releaseRoot",
    error instanceof Error ? error.message : String(error)
  );
}

function issue(
  code: string,
  issuePath: string,
  message: string,
  expected?: unknown,
  actual?: unknown
): ControllerReleaseInspectionIssue {
  return {
    code,
    path: issuePath,
    message,
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual }),
  };
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
