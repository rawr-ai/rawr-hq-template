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
  mustExist("docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md"),
  mustExist("scripts/phase-2_5/verify-hq-runtime-cutover.mjs"),
]);

const [scripts, rootPackageRaw, toolsExportSource, hqStatusSource, runbookSource] = await Promise.all([
  readPackageScripts(),
  readFile("package.json"),
  readFile("apps/cli/src/commands/tools/export.ts"),
  readFile("apps/cli/src/lib/hq-status.ts"),
  readFile("docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md"),
]);

const rootPackage = JSON.parse(rootPackageRaw);

assertCondition(
  !("dev:up" in rootPackage.scripts),
  "package.json must remove bun run dev:up from the supported lifecycle surface",
);
assertCondition(
  toolsExportSource.includes('command: "hq up"') && toolsExportSource.includes('command: "hq status"'),
  "tools export must advertise the HQ lifecycle surface",
);
assertCondition(
  !toolsExportSource.includes('command: "dev up"') && !toolsExportSource.includes('command: "routine start"'),
  "tools export must omit legacy dev up and routine start surfaces",
);
assertCondition(
  hqStatusSource.includes('statusFile: ".rawr/hq/status.json"')
    && hqStatusSource.includes('logFile: ".rawr/hq/runtime.log"')
    && hqStatusSource.includes('stateFile: ".rawr/hq/state.env"'),
  "hq-status.ts must write the canonical HQ artifact contract",
);
assertCondition(
  hqStatusSource.includes('support: {') && hqStatusSource.includes("observability"),
  "hq-status.ts must report observability under support infrastructure rather than as a peer runtime role",
);
assertCondition(
  runbookSource.includes("rawr hq up")
    && runbookSource.includes("RAWR_HQ_OPEN")
    && runbookSource.includes("RAWR_HQ_OBSERVABILITY"),
  "coordination runbook must teach the canonical HQ lifecycle and env contract",
);
assertCondition(
  !runbookSource.includes("dev:up")
    && !runbookSource.includes("RAWR_DEV_UP_OPEN")
    && !runbookSource.includes("RAWR_OPEN_POLICY")
    && !runbookSource.includes("RAWR_OPEN_UI"),
  "coordination runbook must remove legacy lifecycle aliases and env names",
);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:hq-runtime",
  "bun scripts/phase-2_5/verify-hq-runtime-cutover.mjs && bunx vitest run --project cli apps/cli/test/hq.test.ts apps/cli/test/hq-legacy-surface.test.ts",
);

console.log("phase-2_5 hq runtime cutover verified");
