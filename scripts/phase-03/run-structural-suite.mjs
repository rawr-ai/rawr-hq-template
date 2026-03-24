#!/usr/bin/env bun
import path from "node:path";

const root = path.resolve(import.meta.dir, "..", "..");

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    parsed[rawKey] = value;
    if (inlineValue === undefined) {
      index += 1;
    }
  }
  return parsed;
}

function runCommand(command) {
  const result = Bun.spawnSync({
    cmd: ["/bin/sh", "-lc", command],
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

const args = parseArgs(process.argv.slice(2));
const project = args.project;
const suite = args.suite ?? "default";

if (!project) {
  console.error("Usage: bun scripts/phase-03/run-structural-suite.mjs --project <project> [--suite <suite>]");
  process.exit(2);
}

const suiteCommandsByProject = {
  "@rawr/server": {
    default: [
      "bun run phase-a:gate:manifest-smoke-baseline",
      "bun run phase-a:gate:host-composition-guard",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
      "bun run phase-2_5:gate:telemetry-core",
      "bun run phase-2_5:gate:host-metrics",
      "bun run phase-2_5:gate:example-cutover",
      "bun run phase-2_5:gate:logging",
    ],
    "phase-a-baseline": [
      "bun run phase-a:gate:manifest-smoke-baseline",
      "bun run phase-a:gate:host-composition-guard",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
    ],
    "phase-a-completion": [
      "bun run phase-a:gate:manifest-smoke-completion",
      "bun run phase-a:gate:host-composition-guard",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
    ],
    "phase-2_5-quick": [
      "bun run phase-2_5:gate:telemetry-core",
      "bun run phase-2_5:gate:host-metrics",
      "bun run phase-2_5:gate:example-cutover",
    ],
    "phase-2_5-exit": ["bun run phase-2_5:gate:logging"],
  },
  "@rawr/cli": {
    default: ["bun run phase-2_5:gate:hq-runtime"],
    "phase-2_5-quick": ["bun run phase-2_5:gate:hq-runtime"],
    "phase-2_5-exit": ["bun run phase-2_5:gate:hq-runtime"],
  },
  "@rawr/hq": {
    default: [
      "bun run phase-a:gate:metadata-contract",
      "bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",
    ],
    "phase-a-baseline": ["bun run phase-a:gate:metadata-contract"],
    "phase-a-completion": ["bun run phase-a:gate:metadata-contract"],
    "phase-a-exit": ["bun run phase-a:gate:legacy-metadata-hard-delete-static-guard"],
  },
  "@rawr/plugin-plugins": {
    default: ["bun run phase-a:gate:import-boundary"],
    "phase-a-baseline": ["bun run phase-a:gate:import-boundary"],
    "phase-a-completion": ["bun run phase-a:gate:import-boundary"],
  },
};

const suiteCommands = suiteCommandsByProject[project]?.[suite];

if (!suiteCommands) {
  const supportedSuites = Object.keys(suiteCommandsByProject[project] ?? {}).sort().join(", ");
  console.error(
    `Unsupported structural suite "${suite}" for ${project}. Supported suites: ${supportedSuites || "none"}.`,
  );
  process.exit(2);
}

for (const command of suiteCommands) {
  runCommand(command);
}

console.log(`Structural suite passed for ${project}: ${suite}`);
