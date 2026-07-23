#!/usr/bin/env bun

import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  activateProductionController,
  type ProductionControllerActivationResult,
} from "./production/activation.ts";
import type { ProductionControllerInstallResult } from "./production/builder.ts";
import { runCommand, scrubbedBunEnvironment } from "./production/process.ts";

type CommonCliOptions = Readonly<{
  dataRoot: string;
  globalBinDir: string | null;
  json: boolean;
}>;

type CliOptions =
  | Readonly<
      CommonCliOptions & {
        operation: "install";
        bunBinary: string;
      }
    >
  | Readonly<
      CommonCliOptions & {
        operation: "activate";
        controllerDigest: string;
      }
    >;

const USAGE =
  "usage: cli-build-production.ts install [options] | activate <controller-digest> [options]";

function valueAfter(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

export async function parseProductionControllerCliOptions(
  argv: readonly string[]
): Promise<CliOptions> {
  const operation = argv[0] ?? "install";
  if (operation !== "install" && operation !== "activate") {
    throw new Error(USAGE);
  }
  const controllerDigest = operation === "activate" ? argv[1] : undefined;
  if (
    operation === "activate" &&
    (controllerDigest === undefined || controllerDigest.startsWith("--"))
  ) {
    throw new Error(`activate requires an existing controller digest\n${USAGE}`);
  }
  let dataRoot: string | undefined;
  let bunBinary: string | undefined;
  let globalBinDir: string | null | undefined;
  let json = false;
  for (let index = operation === "activate" ? 2 : 1; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === "--data-root") dataRoot = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--data-root=")) dataRoot = argument.slice("--data-root=".length);
    else if (argument === "--bun-binary") bunBinary = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--bun-binary="))
      bunBinary = argument.slice("--bun-binary=".length);
    else if (argument === "--global-bin-dir") globalBinDir = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--global-bin-dir="))
      globalBinDir = argument.slice("--global-bin-dir=".length);
    else if (argument === "--no-global-alias") globalBinDir = null;
    else if (argument === "--json") json = true;
    else throw new Error(`unknown production controller option: ${argument}`);
  }

  const operatorHome = process.env.HOME;
  dataRoot ??=
    process.env.RAWR_DATA_DIR ??
    (process.env.XDG_DATA_HOME ? join(process.env.XDG_DATA_HOME, "rawr") : undefined) ??
    (operatorHome ? join(operatorHome, ".local", "share", "rawr") : undefined);
  if (dataRoot === undefined || !isAbsolute(dataRoot)) {
    throw new Error("controller data root must be absolute (use --data-root or RAWR_DATA_DIR)");
  }
  bunBinary ??= process.execPath;
  if (!isAbsolute(bunBinary)) throw new Error("Bun binary must be an absolute path");
  if (
    operation === "activate" &&
    argv.some((argument) => argument === "--bun-binary" || argument.startsWith("--bun-binary="))
  ) {
    throw new Error("--bun-binary is valid only for production controller install");
  }
  if (globalBinDir === undefined) {
    const result = await runCommand(
      bunBinary,
      ["--config=/dev/null", "--no-env-file", "--no-install", "pm", "bin", "-g"],
      { cwd: process.cwd(), env: scrubbedBunEnvironment() }
    );
    globalBinDir =
      result.stdout.trim() || (operatorHome ? join(operatorHome, ".bun", "bin") : null);
  }
  if (globalBinDir !== null && !isAbsolute(globalBinDir)) {
    throw new Error("global bin directory must be absolute");
  }
  if (operation === "install") return { operation, dataRoot, bunBinary, globalBinDir, json };
  if (controllerDigest === undefined)
    throw new Error("activate requires an existing controller digest");
  return { operation, dataRoot, controllerDigest, globalBinDir, json };
}

type ProductionControllerCliResult =
  | ProductionControllerInstallResult
  | ProductionControllerActivationResult;

export function isProductionControllerResultHealthy(
  result: ProductionControllerCliResult
): boolean {
  if (
    "durability" in result.release &&
    (result.release.durability === "unconfirmed" || result.release.cleanup === "failed")
  )
    return false;
  if (result.launcher.kind === "drifted" || result.launcher.durability === "unconfirmed")
    return false;
  if (result.activation.selectorDurability === "unconfirmed") return false;
  if (
    result.globalAlias !== null &&
    (result.globalAlias.kind === "drifted" ||
      result.globalAlias.kind === "failed" ||
      result.globalAlias.durability === "unconfirmed")
  )
    return false;
  if ("operationCleanup" in result && result.operationCleanup.status === "failed") return false;
  return true;
}

export function formatProductionControllerResult(result: ProductionControllerCliResult): string {
  const releaseSettlement =
    "durability" in result.release
      ? ` (durability ${result.release.durability}, cleanup ${result.release.cleanup}${result.release.postCommitError ? `, post-commit error: ${result.release.postCommitError}` : ""}${result.release.cleanupError ? `, cleanup error: ${result.release.cleanupError}` : ""})`
      : "";
  const launcherPostCommitError =
    "postCommitError" in result.launcher ? result.launcher.postCommitError : undefined;
  const launcherSettlement = ` (durability ${result.launcher.durability}${result.launcher.kind === "drifted" ? `, drift ${result.launcher.reason}` : ""}${launcherPostCommitError ? `, post-commit error: ${launcherPostCommitError}` : ""})`;
  const aliasSettlement =
    result.globalAlias === null
      ? ""
      : ` (durability ${result.globalAlias.durability}${result.globalAlias.kind === "drifted" ? `, drift ${result.globalAlias.reason}` : ""}${result.globalAlias.kind === "failed" ? `, error ${result.globalAlias.error}` : ""}${"postCommitError" in result.globalAlias && result.globalAlias.postCommitError ? `, post-commit error: ${result.globalAlias.postCommitError}` : ""})`;
  return (
    [
      `Controller release ${result.release.kind}: ${result.release.controllerDigest}${releaseSettlement}`,
      `Stable launcher ${result.launcher.kind}: ${result.launcher.path}${launcherSettlement}`,
      `Selection ${result.activation.kind}: ${result.activation.selectorPath} (replaced ${result.activation.replaced ?? "none"}, durability ${result.activation.selectorDurability})`,
      ...(result.globalAlias === null
        ? []
        : [
            `Global alias ${result.globalAlias.kind}: ${result.globalAlias.path} -> ${result.globalAlias.target}${aliasSettlement}`,
          ]),
      ...("operationCleanup" in result
        ? [
            `Build operation cleanup ${result.operationCleanup.status}${result.operationCleanup.error ? `: ${result.operationCleanup.error}` : ""}`,
          ]
        : []),
    ].join("\n") + "\n"
  );
}

async function main(): Promise<void> {
  const options = await parseProductionControllerCliOptions(process.argv.slice(2));
  const result =
    options.operation === "install"
      ? await (async (): Promise<ProductionControllerInstallResult> => {
          const { installProductionController } = await import("./production/builder.ts");
          return await installProductionController({
            workspaceRoot: await realpath(
              resolve(dirname(fileURLToPath(import.meta.url)), "../..")
            ),
            dataRoot: options.dataRoot,
            bunBinary: options.bunBinary,
            ...(options.globalBinDir === null ? {} : { globalBinDir: options.globalBinDir }),
          });
        })()
      : await activateProductionController({
          dataRoot: options.dataRoot,
          controllerDigest: options.controllerDigest,
          ...(options.globalBinDir === null ? {} : { globalBinDir: options.globalBinDir }),
        });
  const healthy = isProductionControllerResultHealthy(result);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(formatProductionControllerResult(result));
  }
  if (!healthy) process.exitCode = 1;
}

if (import.meta.main) await main();
