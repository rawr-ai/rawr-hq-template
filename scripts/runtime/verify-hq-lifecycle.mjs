#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("apps/cli/src/commands/hq/up.ts"),
  mustExist("apps/cli/src/commands/hq/down.ts"),
  mustExist("apps/cli/src/commands/hq/status.ts"),
  mustExist("apps/cli/src/commands/hq/restart.ts"),
  mustExist("apps/cli/src/commands/hq/attach.ts"),
  mustExist("apps/cli/src/lib/hq.ts"),
  mustExist("apps/cli/src/lib/hq-status.ts"),
  mustExist("apps/cli/test/hq.test.ts"),
  mustExist("apps/cli/test/hq-legacy-surface.test.ts"),
  mustExist("scripts/dev/hq.sh"),
  mustExist("docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md"),
  mustExist("scripts/runtime/verify-hq-lifecycle.mjs"),
]);

const activeRuntimeDocPaths = [
  "docs/process/RUNBOOKS.md",
  "docs/process/HQ_USAGE.md",
  "docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md",
  "docs/process/DESIGN_INTEGRATION_GOALS.md",
  "docs/process/DESIGN_DATA_INTEGRATION_PLAN.md",
];

const [
  scripts,
  rootPackageRaw,
  toolsExportSource,
  hqStatusSource,
  hqShellSource,
  runtimeRunbookSource,
  ...activeRuntimeDocs
] = await Promise.all([
  readPackageScripts(),
  readFile("package.json"),
  readFile("apps/cli/src/commands/tools/export.ts"),
  readFile("apps/cli/src/lib/hq-status.ts"),
  readFile("scripts/dev/hq.sh"),
  readFile("docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md"),
  ...activeRuntimeDocPaths.map((path) => readFile(path)),
]);

const rootPackage = JSON.parse(rootPackageRaw);
const activeRuntimeDocsSource = activeRuntimeDocs.join("\n");
const retiredGuidanceNeedles = [
  ["COORDINATION", "CANVAS", "OPERATIONS.md"].join("_"),
  ["coordination", "canvas"].join(" "),
  `/${"coordination"}`,
  `/rpc/${"coordination"}`,
  ["workflow", "coord"].join(" "),
  `.rawr/${"coordination"}`,
];

assertCondition(
  !("dev:up" in rootPackage.scripts),
  "package.json must remove bun run dev:up from the supported lifecycle surface"
);
assertCondition(
  toolsExportSource.includes('command: "hq up"') &&
    toolsExportSource.includes('command: "hq status"'),
  "tools export must advertise the HQ lifecycle surface"
);
assertCondition(
  toolsExportSource.includes('command: "hq down"') &&
    toolsExportSource.includes('command: "hq restart"') &&
    toolsExportSource.includes('command: "hq attach"'),
  "tools export must advertise down, restart, and attach as first-class HQ lifecycle commands"
);
assertCondition(
  !toolsExportSource.includes('command: "dev up"') &&
    !toolsExportSource.includes('command: "routine start"'),
  "tools export must omit legacy dev up and routine start surfaces"
);
assertCondition(
  !hqShellSource.includes("${WEB_URL:-") &&
    !hqShellSource.includes("${COORDINATION_URL:-") &&
    !hqShellSource.includes("${INNGEST_RUNS_URL:-") &&
    !hqShellSource.includes("${SERVER_HEALTH_URL:-") &&
    !hqShellSource.includes("${OBSERVABILITY_UI_URL:-") &&
    !hqShellSource.includes("${OBSERVABILITY_OTLP_URL:-"),
  "hq.sh must not expose unblessed URL/config environment overrides"
);
assertCondition(
  !hqShellSource.includes("RAWR_HQ_INNGEST_CONNECT_GATEWAY_PORT") &&
    !hqShellSource.includes("RAWR_HQ_INNGEST_CONNECT_GATEWAY_GRPC_PORT") &&
    !hqShellSource.includes("RAWR_HQ_INNGEST_CONNECT_EXECUTOR_GRPC_PORT"),
  "hq.sh must keep the public env contract limited to RAWR_HQ_OPEN and RAWR_HQ_OBSERVABILITY"
);
assertCondition(
  !hqShellSource.includes("--quiet >/dev/null 2>&1 || true"),
  "hq.sh must not silently swallow status writer failures"
);
assertCondition(
  hqStatusSource.includes('statusFile: ".rawr/hq/status.json"') &&
    hqStatusSource.includes('logFile: ".rawr/hq/runtime.log"') &&
    hqStatusSource.includes('stateFile: ".rawr/hq/state.env"'),
  "hq-status.ts must write the canonical HQ artifact contract"
);
assertCondition(
  hqStatusSource.includes("support: {") && hqStatusSource.includes("observability"),
  "hq-status.ts must report observability under support infrastructure rather than as a peer runtime role"
);
assertCondition(
  hqStatusSource.includes("resolveObservabilityMode") &&
    hqStatusSource.includes('"RAWR_HQ_OBSERVABILITY"'),
  "hq-status.ts must validate RAWR_HQ_OBSERVABILITY before emitting the status contract"
);
assertCondition(
  runtimeRunbookSource.includes("rawr hq up") &&
    runtimeRunbookSource.includes("RAWR_HQ_OPEN") &&
    runtimeRunbookSource.includes("RAWR_HQ_OBSERVABILITY"),
  "HQ runtime runbook must teach the canonical HQ lifecycle and env contract"
);
assertCondition(
  !runtimeRunbookSource.includes("dev:up") &&
    !runtimeRunbookSource.includes("RAWR_DEV_UP_OPEN") &&
    !runtimeRunbookSource.includes("RAWR_OPEN_POLICY") &&
    !runtimeRunbookSource.includes("RAWR_OPEN_UI"),
  "HQ runtime runbook must remove legacy lifecycle aliases and env names"
);
assertCondition(
  hqShellSource.includes("none|app|app+inngest|all") &&
    hqStatusSource.includes('"none", "app", "app+inngest", "all"') &&
    runtimeRunbookSource.includes("--open none|app|app+inngest|all"),
  "HQ runtime open policy must be limited to none, app, app+inngest, and all"
);
assertCondition(
  rootPackage.scripts["dev:workflows"] === "bun run --cwd apps/server dev:inngest" &&
    rootPackage.scripts["dev:inngest"] === "bun run dev:workflows",
  "package.json must preserve dev:workflows and dev:inngest"
);
assertCondition(
  runtimeRunbookSource.includes("http://localhost:3000/api/inngest") &&
    runtimeRunbookSource.includes("bun run dev:workflows"),
  "HQ runtime runbook must preserve Inngest runtime checks and dev:workflows debugging guidance"
);
assertCondition(
  retiredGuidanceNeedles.every((needle) => !activeRuntimeDocsSource.includes(needle)),
  "active runtime/process docs must not advertise retired coordination guidance"
);

assertScriptEquals(
  scripts,
  "runtime:gate:hq-lifecycle",
  "bun scripts/runtime/verify-hq-lifecycle.mjs && bunx vitest run --project cli apps/cli/test/hq.test.ts apps/cli/test/hq-legacy-surface.test.ts"
);

console.log("HQ runtime lifecycle verified");
