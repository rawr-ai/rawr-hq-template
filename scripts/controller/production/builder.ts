import { constants } from "node:fs";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import {
  decodeControllerSelection,
  type ControllerArchitecture,
  type ControllerPlatform,
} from "@rawr/controller-release";
// Classification is controller product input; the build app does not own a duplicate copy.
import {
  assertControllerClassification,
  controllerCommandPackages,
} from "../../../apps/cli/src/lib/controller/classification.ts";
import { buildControllerRelease } from "../build-release.ts";
import {
  controllerReleasePath,
  controllerSelectorPath,
} from "../layout.ts";
import {
  removeCanonicalDirectChildDirectory,
  sha256File,
} from "../lib/filesystem.ts";
import { nodeControllerSelectorStore } from "../selector-store.ts";
import {
  assertCanonicalControllerNxProjectRoots,
  resolveControllerNxClosure,
} from "../nx-closure.ts";
import {
  CONTROLLER_PRODUCTION_INTERFACE_VERSION,
  PINNED_BUN_LICENSE_PATH,
  PINNED_BUN_REVISION,
  PINNED_BUN_VERSION,
  PRODUCTION_DEPENDENCY_LOCK_PATH,
  PRODUCTION_DEPENDENCY_MANIFEST_PATH,
} from "./constants.ts";
import {
  assertNoProtectedRuntimeImports,
  assertProductionDependencyClosure,
} from "./dependencies.ts";
import { selectProductionControllerRelease } from "./activation.ts";
import { generateOfficialMemberInputs } from "./official-manifest.ts";
import { createExactPayloadSourcePlan } from "./payload.ts";
import {
  type CommandRunner,
  runCommand,
  scrubbedBunEnvironment,
  scrubbedGitEnvironment,
} from "./process.ts";
import {
  copyIndependentTree,
  loadRuntimePackageVersion,
  sanitizeNativeManagerPackage,
  stageWorkspaceRuntimePackage,
  writeProductionAppManifest,
} from "./runtime-package.ts";
import { requireVerifiedOfficialControllerRelease } from "./verify-official.ts";

const WORKSPACE_CONTROLLER_ROOTS = Object.freeze(
  controllerCommandPackages
    .filter((row) => row.disposition === "controller-member" && row.source === "workspace")
    .map((row) => row.packageId),
);
const PRODUCTION_OPERATION_ROOT_PREFIX = "rawr-controller-production-";

export type ProductionControllerInstallResult = Readonly<{
  sourceRevision: string;
  release: Readonly<{
    kind: "reused" | "materialized" | "converged";
    controllerDigest: string;
    releaseRoot: string;
    durability: "confirmed" | "unconfirmed" | "unchanged";
    cleanup: "completed" | "failed" | "not-required";
    postCommitError?: string;
    cleanupError?: string;
  }>;
  operationCleanup: Readonly<{
    status: "completed" | "failed" | "not-required";
    error?: string;
  }>;
  launcher: Awaited<ReturnType<typeof selectProductionControllerRelease>>["launcher"];
  activation: Awaited<ReturnType<typeof selectProductionControllerRelease>>["activation"];
  globalAlias: Awaited<ReturnType<typeof selectProductionControllerRelease>>["globalAlias"];
}>;

export type ProductionControllerInstallOptions = Readonly<{
  workspaceRoot: string;
  dataRoot: string;
  bunBinary: string;
  globalBinDir?: string;
  commandRunner?: CommandRunner;
}>;

function isMissingFilesystemEntry(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}

async function removeProductionOperationRoot(operationRoot: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  let canonicalOperationRoot: string;
  try {
    canonicalOperationRoot = await realpath(operationRoot);
  } catch (error) {
    if (isMissingFilesystemEntry(error)) return;
    throw error;
  }
  const status = await lstat(operationRoot);
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || canonicalOperationRoot !== operationRoot
    || dirname(canonicalOperationRoot) !== canonicalTemporaryRoot
    || !basename(canonicalOperationRoot).startsWith(PRODUCTION_OPERATION_ROOT_PREFIX)
  ) {
    throw new Error(`refusing to remove invalid controller production root: ${operationRoot}`);
  }
  await rm(canonicalOperationRoot, { recursive: true, force: true });
}

async function requireCleanSource(
  workspaceRoot: string,
  runner: CommandRunner,
): Promise<string> {
  const status = await runner("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: workspaceRoot,
    env: scrubbedGitEnvironment(),
  });
  if (status.stdout.length !== 0) {
    throw new Error("production controller build requires a clean Template source checkout");
  }
  const revision = (await runner("git", ["rev-parse", "HEAD"], {
    cwd: workspaceRoot,
    env: scrubbedGitEnvironment(),
  })).stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(revision)) throw new Error(`invalid Template source revision: ${revision}`);
  return revision;
}

export async function finalizeWithStableSourceRevision<T>(options: {
  workspaceRoot: string;
  expectedRevision: string;
  runner: CommandRunner;
  finalize: () => Promise<T>;
}): Promise<T> {
  const observedRevision = await requireCleanSource(options.workspaceRoot, options.runner);
  if (observedRevision !== options.expectedRevision) {
    throw new Error(
      `production controller source changed during build: expected ${options.expectedRevision}, received ${observedRevision}`,
    );
  }
  return await options.finalize();
}

async function verifyPinnedBun(
  bunBinary: string,
  workspaceRoot: string,
  runner: CommandRunner,
): Promise<void> {
  const status = await lstat(bunBinary);
  if (!status.isFile() || (status.mode & constants.S_IXUSR) === 0) {
    throw new Error(`pinned Bun binary is not executable: ${bunBinary}`);
  }
  const version = (await runner(
    bunBinary,
    ["--config=/dev/null", "--no-env-file", "--no-install", "--version"],
    { cwd: workspaceRoot, env: scrubbedBunEnvironment() },
  )).stdout.trim();
  const revision = (await runner(
    bunBinary,
    ["--config=/dev/null", "--no-env-file", "--no-install", "--revision"],
    { cwd: workspaceRoot, env: scrubbedBunEnvironment() },
  )).stdout.trim();
  if (version !== PINNED_BUN_VERSION) {
    throw new Error(`controller builder requires Bun ${PINNED_BUN_VERSION}, received ${version}`);
  }
  const revisionPrefix = `${PINNED_BUN_VERSION}+`;
  const abbreviatedRevision = revision.startsWith(revisionPrefix)
    ? revision.slice(revisionPrefix.length)
    : "";
  if (
    abbreviatedRevision.length < 8
    || !/^[0-9a-f]+$/u.test(abbreviatedRevision)
    || !PINNED_BUN_REVISION.startsWith(abbreviatedRevision)
  ) {
    throw new Error(`controller builder received unexpected Bun revision: ${revision}`);
  }
  const runtimeIdentityText = (await runner(
    bunBinary,
    [
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
      "-e",
      "process.stdout.write(JSON.stringify({platform:process.platform,architecture:process.arch}))",
    ],
    { cwd: workspaceRoot, env: scrubbedBunEnvironment() },
  )).stdout;
  let runtimeIdentity: { platform?: unknown; architecture?: unknown };
  try {
    runtimeIdentity = JSON.parse(runtimeIdentityText) as typeof runtimeIdentity;
  } catch (error) {
    throw new Error(`controller builder received invalid Bun runtime identity: ${runtimeIdentityText}`, {
      cause: error,
    });
  }
  const expectedRuntime = hostRuntime();
  if (
    runtimeIdentity.platform !== expectedRuntime.platform
    || runtimeIdentity.architecture !== expectedRuntime.architecture
  ) {
    throw new Error(
      `controller builder Bun runtime mismatch: expected ${expectedRuntime.platform}/${expectedRuntime.architecture}, received ${String(runtimeIdentity.platform)}/${String(runtimeIdentity.architecture)}`,
    );
  }
}

export async function stageVerifiedPinnedBun(options: {
  sourcePath: string;
  destinationPath: string;
  workspaceRoot: string;
  runner: CommandRunner;
}): Promise<string> {
  await mkdir(dirname(options.destinationPath), { recursive: true });
  await copyFile(options.sourcePath, options.destinationPath);
  await chmod(options.destinationPath, 0o755);
  await verifyPinnedBun(options.destinationPath, options.workspaceRoot, options.runner);
  return await realpath(options.destinationPath);
}

function hostRuntime(): { platform: ControllerPlatform; architecture: ControllerArchitecture } {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(`unsupported controller platform: ${process.platform}`);
  }
  if (process.arch !== "arm64" && process.arch !== "x64") {
    throw new Error(`unsupported controller architecture: ${process.arch}`);
  }
  return { platform: process.platform, architecture: process.arch };
}

async function loadNxGraph(options: {
  operationRoot: string;
  workspaceRoot: string;
  bunBinary: string;
  runner: CommandRunner;
}): Promise<unknown> {
  const graphPath = join(options.operationRoot, "nx-graph.json");
  await options.runner(
    options.bunBinary,
    ["--config=/dev/null", "--no-env-file", "--no-install", "x", "nx", "graph", `--file=${graphPath}`],
    {
      cwd: options.workspaceRoot,
      env: scrubbedBunEnvironment(),
      stdout: "inherit",
    },
  );
  return JSON.parse(await readFile(graphPath, "utf8")) as unknown;
}

async function buildNxClosure(options: {
  projects: readonly Readonly<{ name: string; root: string }>[];
  workspaceRoot: string;
  bunBinary: string;
  runner: CommandRunner;
}): Promise<void> {
  for (const project of options.projects) {
    const projectRoot = join(options.workspaceRoot, project.root);
    await removeCanonicalDirectChildDirectory(
      projectRoot,
      join(projectRoot, "dist"),
      "dist",
      `controller build output for ${project.name}`,
    );
  }
  await options.runner(
    options.bunBinary,
    [
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
      "x",
      "nx",
      "run-many",
      "-t",
      "build",
      `--projects=${options.projects.map((project) => project.name).join(",")}`,
      "--skipNxCache",
    ],
    {
      cwd: options.workspaceRoot,
      env: scrubbedBunEnvironment(),
      stdout: "inherit",
    },
  );
}

async function matchingSelectedRelease(options: {
  dataRoot: string;
  sourceRevision: string;
  dependencyLockDigest: string;
}): Promise<{ controllerDigest: string; releaseRoot: string } | null> {
  try {
    const dataRoot = await realpath(options.dataRoot);
    const observedSelection = await nodeControllerSelectorStore.read(controllerSelectorPath(dataRoot));
    if (observedSelection.kind !== "regular") return null;
    const selection = decodeControllerSelection(observedSelection.bytes);
    if (!selection.ok) return null;
    const releaseRoot = controllerReleasePath(dataRoot, selection.value.controllerDigest);
    const release = await requireVerifiedOfficialControllerRelease({
      releaseRoot,
      expectedDigest: selection.value.controllerDigest,
    });
    const manifest = release.envelope.manifest;
    const expectedMembers = controllerCommandPackages
      .filter((row) => row.disposition === "controller-member")
      .map((row) => row.packageId)
      .sort();
    const actualMembers = manifest.officialMembers.map((member) => member.packageId).sort();
    const manager = manifest.officialMembers.find(
      (member) => member.packageId === "@oclif/plugin-plugins",
    );
    const expectedRuntime = hostRuntime();
    const hasBuilderInterface = manifest.buildInterfaces.some(
      (entry) => entry.name === "production-controller-builder"
        && entry.version === CONTROLLER_PRODUCTION_INTERFACE_VERSION,
    );
    if (
      manifest.sourceRevision !== options.sourceRevision
      || manifest.dependencyLock.digest !== options.dependencyLockDigest
      || manifest.runtime.version !== PINNED_BUN_VERSION
      || manifest.runtime.revision !== PINNED_BUN_REVISION
      || manifest.runtime.platform !== expectedRuntime.platform
      || manifest.runtime.architecture !== expectedRuntime.architecture
      || JSON.stringify(actualMembers) !== JSON.stringify(expectedMembers)
      || manager === undefined
      || manager.commandIds.length !== 0
      || !hasBuilderInterface
    ) {
      return null;
    }
    return { controllerDigest: selection.value.controllerDigest, releaseRoot };
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return null;
    }
    if (error instanceof Error && error.message.startsWith("CONTROLLER_RELEASE_INVALID:")) return null;
    throw error;
  }
}

async function installProductionDependencies(options: {
  installAppRoot: string;
  cacheRoot: string;
  workspaceRoot: string;
  bunBinary: string;
  runner: CommandRunner;
}): Promise<void> {
  await mkdir(options.installAppRoot, { recursive: true });
  await copyFile(PRODUCTION_DEPENDENCY_MANIFEST_PATH, join(options.installAppRoot, "package.json"));
  await copyFile(PRODUCTION_DEPENDENCY_LOCK_PATH, join(options.installAppRoot, "bun.lock"));
  await options.runner(
    options.bunBinary,
    [
      "--config=/dev/null",
      "--no-env-file",
      "install",
      `--cwd=${options.installAppRoot}`,
      "--frozen-lockfile",
      "--production",
      "--ignore-scripts",
      "--linker=hoisted",
      `--cache-dir=${options.cacheRoot}`,
    ],
    {
      cwd: options.workspaceRoot,
      env: {
        ...scrubbedBunEnvironment(),
        HOME: "/dev/null",
        XDG_CONFIG_HOME: "/dev/null",
        BUN_INSTALL_CACHE_DIR: options.cacheRoot,
      },
      stdout: "inherit",
    },
  );
}

async function createPayload(options: {
  operationRoot: string;
  installAppRoot: string;
  workspaceRoot: string;
  sourceRevision: string;
  projects: readonly Readonly<{ name: string; root: string }>[];
  bunBinary: string;
}): Promise<{
  payloadRoot: string;
  officialMembers: Awaited<ReturnType<typeof generateOfficialMemberInputs>>;
}> {
  const payloadRoot = join(options.operationRoot, "payload");
  const appRoot = join(payloadRoot, "app");
  await copyIndependentTree(options.installAppRoot, appRoot);
  await rm(join(appRoot, "bun.lock"), { force: true });
  const closureVersions = new Map<string, string>();
  for (const project of options.projects) {
    closureVersions.set(
      project.name,
      await loadRuntimePackageVersion(
        join(options.workspaceRoot, project.root),
        options.sourceRevision,
      ),
    );
  }
  for (const project of options.projects) {
    await stageWorkspaceRuntimePackage({
      sourceRoot: join(options.workspaceRoot, project.root),
      destinationRoot: join(appRoot, "node_modules", project.name),
      sourceRevision: options.sourceRevision,
      closurePackageVersions: closureVersions,
    });
  }

  const cliVersion = closureVersions.get("@rawr/cli");
  if (cliVersion === undefined) throw new Error("production controller closure has no @rawr/cli version");
  await writeProductionAppManifest({ appRoot, cliVersion });

  const canonicalAppRoot = await realpath(appRoot);
  const manager = await sanitizeNativeManagerPackage(
    join(canonicalAppRoot, "node_modules", "@oclif/plugin-plugins"),
  );
  const officialMembers = await generateOfficialMemberInputs({
    appRoot: canonicalAppRoot,
    classifications: controllerCommandPackages,
    nativeManager: manager,
  });
  await writeFile(
    join(appRoot, "rawr.mjs"),
    'import { runControllerCli } from "./node_modules/@rawr/cli/dist/index.js";\nawait runControllerCli({ argv: process.argv.slice(2), entryUrl: import.meta.url });\n',
    { mode: 0o644 },
  );

  const runtimeRoot = join(payloadRoot, "runtime");
  await mkdir(runtimeRoot, { recursive: true });
  await copyFile(options.bunBinary, join(runtimeRoot, "bun"));
  await chmod(join(runtimeRoot, "bun"), 0o755);
  await copyFile(PINNED_BUN_LICENSE_PATH, join(runtimeRoot, "LICENSE.txt"));
  await chmod(join(runtimeRoot, "LICENSE.txt"), 0o644);
  return { payloadRoot: await realpath(payloadRoot), officialMembers };
}

export async function installProductionController(
  input: ProductionControllerInstallOptions,
): Promise<ProductionControllerInstallResult> {
  assertControllerClassification();
  const runner = input.commandRunner ?? runCommand;
  const workspaceRoot = await realpath(input.workspaceRoot);
  const bunBinary = await realpath(input.bunBinary);
  const dataRoot = resolve(input.dataRoot);
  const sourceRevision = await requireCleanSource(workspaceRoot, runner);
  await verifyPinnedBun(bunBinary, workspaceRoot, runner);
  const dependencyLockDigest = await sha256File(PRODUCTION_DEPENDENCY_LOCK_PATH);
  const reusable = await matchingSelectedRelease({ dataRoot, sourceRevision, dependencyLockDigest });

  let release: ProductionControllerInstallResult["release"];
  let operationCleanup: ProductionControllerInstallResult["operationCleanup"] = Object.freeze({
    status: "not-required",
  });
  if (reusable !== null) {
    release = Object.freeze({
      kind: "reused",
      ...reusable,
      durability: "unchanged",
      cleanup: "not-required",
    });
  } else {
    const canonicalTemporaryRoot = await realpath(tmpdir());
    const operationRoot = await realpath(
      await mkdtemp(join(canonicalTemporaryRoot, PRODUCTION_OPERATION_ROOT_PREFIX)),
    );
    try {
      const buildBunBinary = await stageVerifiedPinnedBun({
        sourcePath: bunBinary,
        destinationPath: join(operationRoot, "runtime-input", "bun"),
        workspaceRoot,
        runner,
      });
      const nxGraph = await loadNxGraph({
        operationRoot,
        workspaceRoot,
        bunBinary: buildBunBinary,
        runner,
      });
      const projects = resolveControllerNxClosure({
        graph: nxGraph,
        rootProjectNames: WORKSPACE_CONTROLLER_ROOTS,
      });
      await assertCanonicalControllerNxProjectRoots({ workspaceRoot, projects });
      await assertProductionDependencyClosure({ workspaceRoot, projects });
      await buildNxClosure({
        projects,
        workspaceRoot,
        bunBinary: buildBunBinary,
        runner,
      });
      await assertNoProtectedRuntimeImports({ workspaceRoot, projects });

      const installAppRoot = join(operationRoot, "install", "app");
      await installProductionDependencies({
        installAppRoot,
        cacheRoot: join(operationRoot, "bun-cache"),
        workspaceRoot,
        bunBinary: buildBunBinary,
        runner,
      });
      const payload = await createPayload({
        operationRoot,
        installAppRoot,
        workspaceRoot,
        sourceRevision,
        projects,
        bunBinary: buildBunBinary,
      });
      const sources = await createExactPayloadSourcePlan(payload.payloadRoot);
      const stagedInputRoot = join(operationRoot, "release-inputs");
      const stagedDependencyLockPath = join(stagedInputRoot, "bun.lock");
      await mkdir(stagedInputRoot, { recursive: true });
      await copyFile(PRODUCTION_DEPENDENCY_LOCK_PATH, stagedDependencyLockPath);
      if (await sha256File(stagedDependencyLockPath) !== dependencyLockDigest) {
        throw new Error("production controller dependency lock changed during build");
      }
      const runtime = hostRuntime();
      const built = await finalizeWithStableSourceRevision({
        workspaceRoot,
        expectedRevision: sourceRevision,
        runner,
        finalize: async () => await buildControllerRelease({
          dataRoot,
          workspaceRoot,
          allowedSourceRoots: [payload.payloadRoot, stagedInputRoot],
          sourceRevision,
          dependencyLockPath: stagedDependencyLockPath,
          runtime: {
            version: PINNED_BUN_VERSION,
            revision: PINNED_BUN_REVISION,
            ...runtime,
          },
          officialMembers: payload.officialMembers,
          buildInterfaces: [
            { name: "production-controller-builder", version: CONTROLLER_PRODUCTION_INTERFACE_VERSION },
            { name: "oclif-static-manifest", version: "1" },
          ],
          nxGraph,
          nxRootProjectNames: WORKSPACE_CONTROLLER_ROOTS,
          sources,
        }),
      });
      release = Object.freeze({
        kind: built.kind,
        controllerDigest: built.controllerDigest,
        releaseRoot: built.releaseRoot,
        durability: built.durability,
        cleanup: built.cleanup,
        ...(built.postCommitError === undefined ? {} : { postCommitError: built.postCommitError }),
        ...(built.cleanupError === undefined ? {} : { cleanupError: built.cleanupError }),
      });
    } catch (error) {
      try {
        await removeProductionOperationRoot(operationRoot);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "production controller build and precommit operation cleanup both failed",
        );
      }
      throw error;
    }
    try {
      await removeProductionOperationRoot(operationRoot);
      operationCleanup = Object.freeze({ status: "completed" });
    } catch (error) {
      operationCleanup = Object.freeze({ status: "failed", error: errorMessage(error) });
    }
  }

  const selected = await selectProductionControllerRelease({
    dataRoot,
    controllerDigest: release.controllerDigest,
    ...(input.globalBinDir === undefined ? {} : { globalBinDir: input.globalBinDir }),
    commandRunner: runner,
  });
  return Object.freeze({
    sourceRevision,
    release,
    operationCleanup,
    ...selected,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
