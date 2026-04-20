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
      "bun scripts/phase-03/verify-projection-boundary-invocation.mjs",
      "bun run phase-a:gate:manifest-smoke-baseline",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
      "bun run observability:gate:telemetry-core",
      "bun run observability:gate:host-metrics",
      "bun run observability:gate:logging",
    ],
    "phase-a-baseline": [
      "bun run phase-a:gate:manifest-smoke-baseline",
      "bun run phase-a:gate:no-legacy-composition-authority",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
    ],
    "phase-a-completion": [
      "bun run phase-a:gate:manifest-smoke-completion",
      "bun run phase-a:gate:no-legacy-composition-authority",
      "bun run phase-a:gate:route-negative-assertions",
      "bun run phase-a:gate:harness-matrix",
      "bun run phase-a:gate:observability-contract",
      "bun run phase-a:gate:telemetry-contract",
    ],
    observability: [
      "bun run observability:gate:telemetry-core",
      "bun run observability:gate:host-metrics",
      "bun run observability:gate:logging",
    ],
    "m2-u00-current-findings": ["bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings"],
  },
  "@rawr/cli": {
    default: ["bun run runtime:gate:hq-lifecycle"],
    runtime: ["bun run runtime:gate:hq-lifecycle"],
  },
  "@rawr/plugin-plugins": {
    default: [
      "bun scripts/phase-03/verify-projection-boundary-invocation.mjs",
      "bun run phase-a:gate:import-boundary",
    ],
    "phase-a-baseline": ["bun run phase-a:gate:import-boundary"],
    "phase-a-completion": ["bun run phase-a:gate:import-boundary"],
  },
  "@rawr/plugin-chatgpt-corpus": {
    default: ["bun scripts/phase-03/verify-projection-boundary-invocation.mjs"],
  },
  "@rawr/hq-app": {
    default: ["bun scripts/phase-03/verify-hq-app-structural.mjs"],
    "m2-u00-current-findings": ["bun run phase-2:gate:u00:no-legacy-cutover -- --allow-findings"],
  },
  "@rawr/hq-sdk": {
    default: ["bun run architecture:gate:projection-boundaries"],
    "m2-u00-current-findings": ["bun run phase-2:gate:u00:runtime-public-seams -- --allow-findings"],
  },
  "@rawr/bootgraph": {
    default: ["bun scripts/phase-03/verify-bootgraph-structural.mjs"],
  },
  "@rawr/runtime-context": {
    default: ["bun scripts/phase-03/verify-runtime-context-structural.mjs"],
  },
  "@rawr/coordination": {
    default: ["bun scripts/phase-03/verify-coordination-structural.mjs"],
  },
  "@rawr/hq-ops": {
    default: [
      "bun scripts/phase-1/verify-hq-ops-service-shape.mjs",
      "bun scripts/phase-03/verify-hq-ops-resource-binding.mjs",
    ],
  },
  "@rawr/agent-config-sync": {
    default: ["bun scripts/phase-03/verify-agent-config-sync-service-shape.mjs"],
  },
  "@rawr/session-intelligence": {
    default: ["bun scripts/phase-03/verify-session-intelligence-structural.mjs"],
  },
  "@rawr/plugin-session-tools": {
    default: [
      "bun scripts/phase-03/verify-session-intelligence-structural.mjs",
      "bun scripts/phase-03/verify-projection-boundary-invocation.mjs",
    ],
  },
  "@rawr/core": {
    default: ["bun scripts/phase-03/verify-core-support-structural.mjs"],
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
