import { randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  readlink,
  realpath,
  rename,
  symlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  CONTROLLER_STAGING_DIRECTORY,
  controllerDirectory,
  controllerReleasePath,
} from "./layout.ts";
import {
  assertAbsolutePath,
  assertCanonicalContainedParent,
  assertContainedPath,
  ensureCanonicalContainedDirectory,
  fsyncDirectory,
  removeCanonicalDirectChildDirectory,
} from "./lib/filesystem.ts";

export type ControllerPayloadSource =
  | Readonly<{
      kind: "file";
      sourcePath: string;
      releasePath: string;
      mode?: number;
    }>
  | Readonly<{
      kind: "link";
      releasePath: string;
      target: string;
    }>;

export type ControllerMaterializationPlan = Readonly<{
  controllerDigest: string;
  sources: readonly ControllerPayloadSource[];
}>;

export type ControllerMaterializationResult = Readonly<{
  kind: "materialized" | "converged";
  controllerDigest: string;
  releaseRoot: string;
  durability: "confirmed" | "unconfirmed" | "unchanged";
  cleanup: "completed" | "failed" | "not-required";
  postCommitError?: string;
  cleanupError?: string;
}>;

export type ControllerMaterializationPhase = "after-final-replace" | "before-staging-cleanup";

export interface ControllerReleaseFinalizer {
  writeEnvelope(stagingRoot: string): Promise<void>;
  verifyRelease(releaseRoot: string, expectedDigest: string): Promise<void>;
}

const CONTROLLER_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const PROTECTED_WORKSPACE_PATHS = [
  /^plugins\/agents(?:\/|$)/,
  /^tools\/[^/]*-skill-quality(?:\/|$)/,
  /(?:^|\/)research-vault(?:\/|$)/,
];

type CanonicalRoot = Readonly<{ locator: string; canonical: string }>;

function assertReleasePath(path: string, label: string): void {
  if (
    path.length === 0 ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes(":") ||
    path.endsWith("/")
  ) {
    throw new Error(`${label} must be a canonical release-relative path: ${path}`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`${label} contains an unsafe segment: ${path}`);
  }
}

function workspaceRelativePath(workspaceRoot: string, sourcePath: string): string | null {
  const offset = relative(workspaceRoot, sourcePath);
  if (offset === "" || offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    return null;
  }
  return offset.split(sep).join("/");
}

async function assertAllowedSource(
  sourcePath: string,
  workspaceRoot: CanonicalRoot,
  allowedSourceRoots: readonly CanonicalRoot[]
): Promise<void> {
  assertAbsolutePath(sourcePath, "controller payload source");
  const normalizedSource = resolve(sourcePath);
  const canonicalSource = await realpath(normalizedSource);
  const allowed = allowedSourceRoots.some((root) => {
    const offset = relative(root.locator, normalizedSource);
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) return false;
    const expectedCanonicalSource = resolve(root.canonical, offset);
    return canonicalSource === expectedCanonicalSource;
  });
  if (!allowed) {
    throw new Error(
      `controller payload source is outside its canonical source root or traverses an aliased path: ${sourcePath}`
    );
  }

  const workspacePath = workspaceRelativePath(workspaceRoot.canonical, canonicalSource);
  if (
    workspacePath !== null &&
    (workspacePath === ".git" ||
      workspacePath.startsWith(".git/") ||
      PROTECTED_WORKSPACE_PATHS.some((pattern) => pattern.test(workspacePath)))
  ) {
    throw new Error(`protected workspace path cannot enter a controller release: ${workspacePath}`);
  }
}

async function validatePlan(
  plan: ControllerMaterializationPlan,
  workspaceRoot: CanonicalRoot,
  allowedSourceRoots: readonly CanonicalRoot[]
): Promise<void> {
  if (!CONTROLLER_DIGEST_PATTERN.test(plan.controllerDigest)) {
    throw new Error(`invalid controller digest: ${plan.controllerDigest}`);
  }
  const destinations = new Set<string>();
  for (const source of plan.sources) {
    assertReleasePath(source.releasePath, "controller payload destination");
    if (destinations.has(source.releasePath)) {
      throw new Error(`duplicate controller payload destination: ${source.releasePath}`);
    }
    destinations.add(source.releasePath);
    if (source.kind === "file") {
      await assertAllowedSource(source.sourcePath, workspaceRoot, allowedSourceRoots);
      if (
        source.mode !== undefined &&
        (!Number.isInteger(source.mode) || source.mode < 0 || source.mode > 0o777)
      ) {
        throw new Error(`invalid payload mode for ${source.releasePath}: ${String(source.mode)}`);
      }
    } else {
      assertReleasePath(source.target, "controller payload link target");
    }
  }
  for (const required of [
    CONTROLLER_RUNTIME_PATH,
    CONTROLLER_RUNTIME_LICENSE_PATH,
    CONTROLLER_ENTRY_PATH,
    CONTROLLER_DEPENDENCY_LOCK_PATH,
  ]) {
    if (!destinations.has(required)) {
      throw new Error(`controller payload is missing required file: ${required}`);
    }
  }
}

async function syncFile(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function stageSource(stagingRoot: string, source: ControllerPayloadSource): Promise<void> {
  const destination = join(stagingRoot, source.releasePath);
  assertContainedPath(stagingRoot, destination, "controller payload destination");
  await mkdir(dirname(destination), { recursive: true });

  if (source.kind === "file") {
    const status = await lstat(source.sourcePath);
    if (!status.isFile()) {
      throw new Error(`controller payload source must be a regular file: ${source.sourcePath}`);
    }
    await copyFile(source.sourcePath, destination);
    await chmod(destination, source.mode ?? status.mode & 0o777);
    const destinationStatus = await lstat(destination);
    if (destinationStatus.nlink !== 1) {
      throw new Error(`staged controller file shares a mutable inode: ${source.releasePath}`);
    }
    await syncFile(destination);
    return;
  }

  const resolvedTarget = resolve(stagingRoot, source.target);
  assertContainedPath(stagingRoot, resolvedTarget, "controller payload link target");
  await symlink(relative(dirname(destination), resolvedTarget), destination);
}

async function validateStagedLinks(stagingRoot: string): Promise<void> {
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isSymbolicLink()) {
        const target = await readlink(path);
        const resolved = resolve(dirname(path), target);
        assertContainedPath(stagingRoot, resolved, "staged controller link");
        await realpath(path);
      }
    }
  };
  await visit(stagingRoot);
}

async function syncStagedTree(stagingRoot: string): Promise<void> {
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        await syncFile(path);
      }
    }
    await fsyncDirectory(directory);
  };
  await visit(stagingRoot);
}

function isDestinationRace(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EEXIST" || error.code === "ENOTEMPTY")
  );
}

export async function materializeControllerRelease(options: {
  dataRoot: string;
  workspaceRoot: string;
  allowedSourceRoots: readonly string[];
  plan: ControllerMaterializationPlan;
  finalizer: ControllerReleaseFinalizer;
  observe?: (phase: ControllerMaterializationPhase) => void | Promise<void>;
}): Promise<ControllerMaterializationResult> {
  assertAbsolutePath(options.dataRoot, "controller data root");
  assertAbsolutePath(options.workspaceRoot, "controller workspace root");
  for (const root of options.allowedSourceRoots) {
    assertAbsolutePath(root, "controller allowed source root");
  }
  const workspaceRoot = resolve(options.workspaceRoot);
  const canonicalWorkspaceRoot: CanonicalRoot = Object.freeze({
    locator: workspaceRoot,
    canonical: await realpath(workspaceRoot),
  });
  const allowedSourceRoots = await Promise.all(
    options.allowedSourceRoots.map(async (root) => {
      const normalizedRoot = resolve(root);
      return Object.freeze({
        locator: normalizedRoot,
        canonical: await realpath(normalizedRoot),
      });
    })
  );
  await validatePlan(options.plan, canonicalWorkspaceRoot, allowedSourceRoots);

  await mkdir(options.dataRoot, { recursive: true });
  const dataRoot = await realpath(options.dataRoot);

  const finalRoot = controllerReleasePath(dataRoot, options.plan.controllerDigest);
  await assertCanonicalContainedParent(dataRoot, finalRoot, "controller release destination");
  try {
    const status = await lstat(finalRoot);
    if (!status.isDirectory()) {
      throw new Error(`controller release destination is not a directory: ${finalRoot}`);
    }
    await options.finalizer.verifyRelease(finalRoot, options.plan.controllerDigest);
    return Object.freeze({
      kind: "converged",
      controllerDigest: options.plan.controllerDigest,
      releaseRoot: finalRoot,
      durability: "unchanged",
      cleanup: "not-required",
    });
  } catch (error) {
    if (
      !(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }

  const stagingParent = join(controllerDirectory(dataRoot), CONTROLLER_STAGING_DIRECTORY);
  const operationId = randomUUID();
  const stagingOperationRoot = join(stagingParent, operationId);
  const stagingRoot = join(stagingOperationRoot, options.plan.controllerDigest);
  await ensureCanonicalContainedDirectory(dataRoot, stagingParent, "controller staging directory");
  await ensureCanonicalContainedDirectory(
    dataRoot,
    dirname(finalRoot),
    "controller releases directory"
  );
  await ensureCanonicalContainedDirectory(
    stagingParent,
    stagingOperationRoot,
    "controller staging operation"
  );
  const cleanupStaging = async (): Promise<void> => {
    await options.observe?.("before-staging-cleanup");
    await removeCanonicalDirectChildDirectory(
      stagingParent,
      stagingOperationRoot,
      operationId,
      "controller staging cleanup"
    );
  };
  try {
    await ensureCanonicalContainedDirectory(
      stagingOperationRoot,
      stagingRoot,
      "controller staged release"
    );
    for (const source of options.plan.sources) {
      await stageSource(stagingRoot, source);
    }
    await validateStagedLinks(stagingRoot);
    await options.finalizer.writeEnvelope(stagingRoot);
    await options.finalizer.verifyRelease(stagingRoot, options.plan.controllerDigest);
    await syncStagedTree(stagingRoot);
    let kind: "materialized" | "converged";
    let durability: "confirmed" | "unconfirmed" | "unchanged";
    let postCommitError: string | undefined;
    try {
      await rename(stagingRoot, finalRoot);
      kind = "materialized";
      try {
        await options.observe?.("after-final-replace");
        await fsyncDirectory(dirname(finalRoot));
        durability = "confirmed";
      } catch (error) {
        durability = "unconfirmed";
        postCommitError = errorMessage(error);
      }
    } catch (error) {
      if (!isDestinationRace(error)) {
        throw error;
      }
      await options.finalizer.verifyRelease(finalRoot, options.plan.controllerDigest);
      kind = "converged";
      durability = "unchanged";
    }

    try {
      await cleanupStaging();
      return Object.freeze({
        kind,
        controllerDigest: options.plan.controllerDigest,
        releaseRoot: finalRoot,
        durability,
        cleanup: "completed",
        ...(postCommitError === undefined ? {} : { postCommitError }),
      });
    } catch (cleanupError) {
      return Object.freeze({
        kind,
        controllerDigest: options.plan.controllerDigest,
        releaseRoot: finalRoot,
        durability,
        cleanup: "failed",
        ...(postCommitError === undefined ? {} : { postCommitError }),
        cleanupError: errorMessage(cleanupError),
      });
    }
  } catch (error) {
    try {
      await cleanupStaging();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "controller materialization and precommit staging cleanup both failed"
      );
    }
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
