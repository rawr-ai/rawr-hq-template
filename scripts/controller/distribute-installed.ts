#!/usr/bin/env bun

import path from "node:path";

import { createInstalledControllerAsset } from "./lib/installed-controller-asset.ts";

type InstalledControllerDistributionOptions = Readonly<{
  dataRoot: string;
  outputDirectory: string;
  sourceRevision: string;
}>;

const USAGE = [
  "usage: distribute-installed.ts",
  "  --data-root <absolute-path>",
  "  --output-directory <absolute-path>",
  "  --source-revision <40-character-git-revision>",
].join("\n");

function valueAfter(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--"))
    throw new Error(`${flag} requires a value\n${USAGE}`);
  return value;
}

export function parseInstalledControllerDistributionOptions(
  argv: readonly string[]
): InstalledControllerDistributionOptions {
  let dataRoot: string | undefined;
  let outputDirectory: string | undefined;
  let sourceRevision: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) throw new Error(USAGE);
    if (argument === "--data-root") dataRoot = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--data-root=")) dataRoot = argument.slice("--data-root=".length);
    else if (argument === "--output-directory")
      outputDirectory = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--output-directory=")) {
      outputDirectory = argument.slice("--output-directory=".length);
    } else if (argument === "--source-revision")
      sourceRevision = valueAfter(argv, index++, argument);
    else if (argument.startsWith("--source-revision=")) {
      sourceRevision = argument.slice("--source-revision=".length);
    } else {
      throw new Error(`unknown installed controller distribution option: ${argument}\n${USAGE}`);
    }
  }
  if (dataRoot === undefined || !path.isAbsolute(dataRoot)) {
    throw new Error(`--data-root must be absolute\n${USAGE}`);
  }
  if (outputDirectory === undefined || !path.isAbsolute(outputDirectory)) {
    throw new Error(`--output-directory must be absolute\n${USAGE}`);
  }
  if (sourceRevision === undefined) throw new Error(`--source-revision is required\n${USAGE}`);
  return Object.freeze({ dataRoot, outputDirectory, sourceRevision });
}

async function main(): Promise<void> {
  const result = await createInstalledControllerAsset(
    parseInstalledControllerDistributionOptions(process.argv.slice(2))
  );
  process.stdout.write(`${JSON.stringify(result.provenance)}\n`);
}

if (import.meta.main) await main();
