import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import {
  activateControllerRelease,
  inspectControllerActivation,
  type ControllerActivationResult,
} from "../activate.ts";
import {
  inspectStableControllerLauncher,
  installStableControllerLauncher,
  type LauncherInstallResult,
} from "../install-launcher.ts";
import type { AtomicWriteObserver } from "../lib/filesystem.ts";
import {
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerReleasePath,
} from "../layout.ts";
import {
  abortPreparedGlobalControllerAlias,
  commitPreparedGlobalControllerAlias,
  inspectGlobalControllerAlias,
  prepareGlobalControllerAlias,
  type GlobalAliasInstallResult,
  type GlobalAliasWriteObserver,
} from "./global-alias.ts";
import {
  type CommandRunner,
  runCommand,
  scrubbedBunEnvironment,
} from "./process.ts";
import { requireVerifiedOfficialControllerRelease } from "./verify-official.ts";
import type { ControllerSelectorStore } from "../selector-store.ts";

const ACTIVATION_PROBE_PREFIX = "rawr-controller-activation-probe-";
const AMBIENT_ENV_ASSERTION = [
  'if (process.env.RAWR_HOSTILE_ENV !== undefined) {',
  '  console.error("RAWR_HOSTILE_ENV was loaded");',
  "  process.exit(78);",
  "}",
].join("\n");
const CLEAN_START_COMMANDS = Object.freeze([
  Object.freeze({ name: "version", argv: Object.freeze(["--version"]) }),
  Object.freeze({ name: "help", argv: Object.freeze(["--help"]) }),
  Object.freeze({ name: "external-list", argv: Object.freeze(["plugins", "list"]) }),
]);

export type ProductionControllerSelectionResult = Readonly<{
  launcher: LauncherInstallResult;
  activation: ControllerActivationResult;
  globalAlias: GlobalAliasInstallResult | null;
}>;

export type ProductionControllerActivationResult = Readonly<{
  sourceRevision: string;
  release: Readonly<{
    kind: "selected";
    controllerDigest: string;
    releaseRoot: string;
  }>;
  launcher: LauncherInstallResult;
  activation: ControllerActivationResult;
  globalAlias: GlobalAliasInstallResult | null;
}>;

export type ProductionControllerActivationOptions = Readonly<{
  dataRoot: string;
  controllerDigest: string;
  globalBinDir?: string;
  commandRunner?: CommandRunner;
  selectorStore?: ControllerSelectorStore;
  launcherWriteObserver?: AtomicWriteObserver;
  globalAliasWriteObserver?: GlobalAliasWriteObserver;
}>;

function isMissing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}

async function removeActivationProbeRoot(probeRoot: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  const canonicalProbeRoot = await realpath(probeRoot);
  const status = await lstat(probeRoot);
  if (
    !status.isDirectory()
    || canonicalProbeRoot !== probeRoot
    || dirname(canonicalProbeRoot) !== canonicalTemporaryRoot
    || !basename(canonicalProbeRoot).startsWith(ACTIVATION_PROBE_PREFIX)
  ) {
    throw new Error(`refusing to remove invalid controller activation probe root: ${probeRoot}`);
  }
  await rm(canonicalProbeRoot, { recursive: true, force: true });
}

function cleanStartEnvironment(options: {
  dataRoot: string;
  controllerDigest: string;
  releaseRoot: string;
  operatorCwd: string;
  operatorHome: string;
  operatorConfigHome: string;
  operatorDataHome: string;
  preloadPath: string;
}): NodeJS.ProcessEnv {
  const environment = scrubbedBunEnvironment({
    BUN_CONFIG: join(options.operatorCwd, "bunfig.toml"),
    BUN_INSTALL: join(options.operatorCwd, "bun-install"),
    BUN_INSTALL_CACHE_DIR: join(options.operatorCwd, "bun-cache"),
    BUN_OPTIONS: `--preload=${options.preloadPath}`,
    BUN_PRELOAD: options.preloadPath,
    BUN_WORKSPACE: options.operatorCwd,
    NODE_OPTIONS: `--require=${options.preloadPath}`,
    NODE_PATH: options.operatorCwd,
  });
  for (const name of ["BUN_INSTALL", "BUN_INSTALL_CACHE_DIR"]) delete environment[name];
  delete environment.RAWR_HOSTILE_ENV;
  Object.assign(environment, {
    HOME: "/dev/null",
    XDG_CONFIG_HOME: "/dev/null",
    XDG_DATA_HOME: options.operatorDataHome,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    RAWR_DATA_DIR: options.dataRoot,
    RAWR_CONTROLLER_DIGEST: options.controllerDigest,
    RAWR_CONTROLLER_RELEASE_ROOT: options.releaseRoot,
    RAWR_OPERATOR_CWD: options.operatorCwd,
    RAWR_OPERATOR_HOME: options.operatorHome,
    RAWR_OPERATOR_HOME_SET: "1",
    RAWR_OPERATOR_XDG_CONFIG_HOME: options.operatorConfigHome,
    RAWR_OPERATOR_XDG_CONFIG_HOME_SET: "1",
  });
  return environment;
}

export async function probeControllerCleanStart(options: {
  dataRoot: string;
  controllerDigest: string;
  releaseRoot: string;
  runner: CommandRunner;
}): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  const probeRoot = await realpath(
    await mkdtemp(join(canonicalTemporaryRoot, ACTIVATION_PROBE_PREFIX)),
  );
  let primaryError: unknown;
  try {
    const operatorCwd = join(probeRoot, "hostile-cwd");
    const operatorHome = join(probeRoot, "operator-home");
    const operatorConfigHome = join(operatorHome, "config");
    const operatorDataHome = join(operatorHome, "data");
    const sentinelPath = join(probeRoot, "ambient-startup-executed");
    const preloadPath = join(operatorCwd, "preload.cjs");
    await Promise.all([
      mkdir(operatorCwd, { recursive: true }),
      mkdir(operatorConfigHome, { recursive: true }),
      mkdir(operatorDataHome, { recursive: true }),
    ]);
    const preloadSource = `require("node:fs").writeFileSync(${JSON.stringify(sentinelPath)}, "executed");\n`;
    await Promise.all([
      writeFile(preloadPath, preloadSource),
      writeFile(join(operatorCwd, "bunfig.toml"), `preload = [${JSON.stringify(preloadPath)}]\n`),
      writeFile(join(operatorCwd, ".env"), "RAWR_HOSTILE_ENV=loaded\n"),
      writeFile(join(operatorConfigHome, "bunfig.toml"), `preload = [${JSON.stringify(preloadPath)}]\n`),
    ]);

    const runtimePath = join(options.releaseRoot, CONTROLLER_RUNTIME_PATH);
    const entryPath = join(options.releaseRoot, CONTROLLER_ENTRY_PATH);
    const environment = cleanStartEnvironment({
      dataRoot: options.dataRoot,
      controllerDigest: options.controllerDigest,
      releaseRoot: options.releaseRoot,
      operatorCwd,
      operatorHome,
      operatorConfigHome,
      operatorDataHome,
      preloadPath,
    });
    const assertNoAmbientStartup = async (name: string): Promise<void> => {
      try {
        await readFile(sentinelPath);
        throw new Error(`CONTROLLER_CLEAN_START_FAILED:${name}:ambient-startup-executed`);
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    };
    try {
      await options.runner(
        runtimePath,
        [
          "--config=/dev/null",
          "--no-env-file",
          "--no-install",
          "-e",
          AMBIENT_ENV_ASSERTION,
        ],
        { cwd: operatorCwd, env: environment },
      );
    } catch (error) {
      throw new Error("CONTROLLER_CLEAN_START_FAILED:ambient-env", { cause: error });
    }
    await assertNoAmbientStartup("ambient-env");
    for (const command of CLEAN_START_COMMANDS) {
      try {
        await options.runner(
          runtimePath,
          ["--config=/dev/null", "--no-env-file", "--no-install", entryPath, ...command.argv],
          { cwd: options.releaseRoot, env: environment },
        );
      } catch (error) {
        throw new Error(`CONTROLLER_CLEAN_START_FAILED:${command.name}`, { cause: error });
      }
      await assertNoAmbientStartup(command.name);
    }
  } catch (error) {
    primaryError = error;
  }
  let cleanupError: unknown;
  try {
    await removeActivationProbeRoot(probeRoot);
  } catch (error) {
    cleanupError = error;
  }
  if (primaryError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [primaryError, cleanupError],
      "controller clean-start probe failed and guarded cleanup also failed",
    );
  }
  if (primaryError !== undefined) throw primaryError;
  if (cleanupError !== undefined) throw cleanupError;
}

export async function selectProductionControllerRelease(
  input: ProductionControllerActivationOptions,
): Promise<ProductionControllerSelectionResult> {
  const runner = input.commandRunner ?? runCommand;
  const dataRoot = await realpath(resolve(input.dataRoot));
  const releaseRoot = controllerReleasePath(dataRoot, input.controllerDigest);
  const verifyRelease = async (candidateRoot: string, expectedDigest: string): Promise<void> => {
    const verified = await requireVerifiedOfficialControllerRelease({
      releaseRoot: candidateRoot,
      expectedDigest,
    });
    assertHostCompatibleRelease(verified.envelope.manifest.runtime);
  };
  const inspection = await inspectControllerActivation({
    dataRoot,
    controllerDigest: input.controllerDigest,
    verifyRelease,
    selectorStore: input.selectorStore,
  });
  if (inspection.kind === "converged") {
    const launcherInspection = await inspectStableControllerLauncher({ dataRoot });
    const aliasInspection = input.globalBinDir === undefined
      ? null
      : await inspectGlobalControllerAlias({
          globalBinDir: resolve(input.globalBinDir),
          launcherPath: launcherInspection.path,
        });
    const auxiliariesConverged = launcherInspection.kind === "converged"
      && (aliasInspection === null || aliasInspection.kind === "converged");
    if (!auxiliariesConverged) {
      const launcher = launcherInspection.kind === "converged"
        ? launcherInspection
        : await installStableControllerLauncher({
            dataRoot,
            observe: input.launcherWriteObserver,
          });
      const preparedGlobalAlias = input.globalBinDir === undefined
        ? null
        : await prepareGlobalControllerAlias({
            globalBinDir: resolve(input.globalBinDir),
            launcherPath: launcher.path,
            observe: input.globalAliasWriteObserver,
          });
      let beforeCommit;
      try {
        beforeCommit = await inspectControllerActivation({
          dataRoot,
          controllerDigest: input.controllerDigest,
          verifyRelease,
          selectorStore: input.selectorStore,
        });
      } catch (inspectionError) {
        if (preparedGlobalAlias !== null) {
          try {
            await abortPreparedGlobalControllerAlias(preparedGlobalAlias);
          } catch (cleanupError) {
            throw new AggregateError(
              [inspectionError, cleanupError],
              "controller selection inspection failed and prepared global alias cleanup also failed",
            );
          }
        }
        throw inspectionError;
      }
      if (beforeCommit.kind !== "converged") {
        const selectionError = new Error("CONTROLLER_SELECTION_CHANGED_DURING_AUXILIARY_REPAIR");
        if (preparedGlobalAlias !== null) {
          try {
            await abortPreparedGlobalControllerAlias(preparedGlobalAlias);
          } catch (cleanupError) {
            throw new AggregateError(
              [selectionError, cleanupError],
              "controller selection changed and prepared global alias cleanup also failed",
            );
          }
        }
        throw selectionError;
      }
      const globalAlias = preparedGlobalAlias === null
        ? null
        : await commitPreparedGlobalControllerAlias(
            preparedGlobalAlias,
            input.globalAliasWriteObserver,
          );
      const aliasSettlementError = unhealthyGlobalAliasSettlement(globalAlias);
      let afterCommit;
      try {
        afterCommit = await inspectControllerActivation({
          dataRoot,
          controllerDigest: input.controllerDigest,
          verifyRelease,
          selectorStore: input.selectorStore,
        });
      } catch (inspectionError) {
        if (aliasSettlementError !== undefined) {
          throw new AggregateError(
            [aliasSettlementError, inspectionError],
            "global alias settlement and final controller selection inspection both failed",
          );
        }
        throw inspectionError;
      }
      if (afterCommit.kind !== "converged") {
        const selectionError = new Error("CONTROLLER_SELECTION_CHANGED_DURING_AUXILIARY_REPAIR");
        if (aliasSettlementError !== undefined) {
          throw new AggregateError(
            [aliasSettlementError, selectionError],
            "global alias settlement failed while the controller selection changed",
          );
        }
        throw selectionError;
      }
      const activation: ControllerActivationResult = Object.freeze({
        kind: "converged",
        controllerDigest: afterCommit.controllerDigest,
        releaseRoot: afterCommit.releaseRoot,
        selectorPath: afterCommit.selectorPath,
        replaced: null,
        selectorDurability: "unchanged",
      });
      return Object.freeze({ launcher, activation, globalAlias });
    }
    const finalInspection = await inspectControllerActivation({
      dataRoot,
      controllerDigest: input.controllerDigest,
      verifyRelease,
      selectorStore: input.selectorStore,
    });
    if (finalInspection.kind !== "converged") {
      throw new Error("CONTROLLER_SELECTION_CHANGED_DURING_READ_ONLY_ACTIVATION");
    }
    const activation: ControllerActivationResult = Object.freeze({
      kind: "converged",
      controllerDigest: finalInspection.controllerDigest,
      releaseRoot: finalInspection.releaseRoot,
      selectorPath: finalInspection.selectorPath,
      replaced: null,
      selectorDurability: "unchanged",
    });
    return Object.freeze({ launcher: launcherInspection, activation, globalAlias: aliasInspection });
  }

  await probeControllerCleanStart({
    dataRoot,
    controllerDigest: input.controllerDigest,
    releaseRoot,
    runner,
  });
  const launcher = await installStableControllerLauncher({
    dataRoot,
    observe: input.launcherWriteObserver,
  });
  const preparedGlobalAlias = input.globalBinDir === undefined
    ? null
    : await prepareGlobalControllerAlias({
        globalBinDir: resolve(input.globalBinDir),
        launcherPath: launcher.path,
        observe: input.globalAliasWriteObserver,
      });
  let activation: ControllerActivationResult;
  try {
    activation = await activateControllerRelease({
      dataRoot,
      controllerDigest: input.controllerDigest,
      verifyRelease,
      selectorStore: input.selectorStore,
    });
  } catch (activationError) {
    if (preparedGlobalAlias !== null) {
      try {
        await abortPreparedGlobalControllerAlias(preparedGlobalAlias);
      } catch (cleanupError) {
        throw new AggregateError(
          [activationError, cleanupError],
          "controller selector failed and prepared global alias cleanup also failed",
        );
      }
    }
    throw activationError;
  }
  const globalAlias = preparedGlobalAlias === null
    ? null
    : await commitPreparedGlobalControllerAlias(
        preparedGlobalAlias,
        input.globalAliasWriteObserver,
      );
  return Object.freeze({ launcher, activation, globalAlias });
}

export async function activateProductionController(
  input: ProductionControllerActivationOptions,
): Promise<ProductionControllerActivationResult> {
  const dataRoot = await realpath(resolve(input.dataRoot));
  const releaseRoot = controllerReleasePath(dataRoot, input.controllerDigest);
  const verified = await requireVerifiedOfficialControllerRelease({
    releaseRoot,
    expectedDigest: input.controllerDigest,
  });
  assertHostCompatibleRelease(verified.envelope.manifest.runtime);
  const selected = await selectProductionControllerRelease({ ...input, dataRoot });
  return Object.freeze({
    sourceRevision: verified.envelope.manifest.sourceRevision,
    release: Object.freeze({
      kind: "selected",
      controllerDigest: input.controllerDigest,
      releaseRoot,
    }),
    ...selected,
  });
}

function assertHostCompatibleRelease(runtime: Readonly<{
  platform: string;
  architecture: string;
}>): void {
  if (runtime.platform !== process.platform || runtime.architecture !== process.arch) {
    throw new Error(
      `CONTROLLER_RUNTIME_HOST_MISMATCH: release ${runtime.platform}/${runtime.architecture}, host ${process.platform}/${process.arch}`,
    );
  }
}

function unhealthyGlobalAliasSettlement(
  result: GlobalAliasInstallResult | null,
): Error | undefined {
  if (result === null) return undefined;
  if (result.kind === "failed") return new Error(`GLOBAL_ALIAS_SETTLEMENT_FAILED:${result.error}`);
  if (result.durability === "unconfirmed") {
    return new Error(`GLOBAL_ALIAS_DURABILITY_UNCONFIRMED:${result.postCommitError ?? "unknown"}`);
  }
  return undefined;
}
