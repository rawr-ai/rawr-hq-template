#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function mustExist(relPath) {
  const absPath = path.join(root, relPath);
  try {
    const stat = await fs.stat(absPath);
    assertCondition(stat.isFile(), `${relPath} must be a file`);
  } catch {
    throw new Error(`missing file: ${relPath}`);
  }
}

async function readFile(relPath) {
  const absPath = path.join(root, relPath);
  return fs.readFile(absPath, "utf8");
}

async function readPackageScripts() {
  const pkgRaw = await readFile("package.json");
  const pkg = JSON.parse(pkgRaw);
  return pkg.scripts ?? {};
}

await Promise.all([
  mustExist("packages/coordination-observability/src/events.ts"),
  mustExist("packages/coordination-observability/src/index.ts"),
  mustExist("packages/coordination-observability/test/observability.test.ts"),
  mustExist("packages/coordination-observability/test/storage-lock-telemetry.test.ts"),
  mustExist("apps/server/test/ingress-signature-observability.test.ts"),
  mustExist("scripts/phase-a/verify-gate-scaffold.mjs"),
]);

const [eventsSource, indexSource, observabilityTestSource, storageTelemetryTestSource, ingressTestSource, scripts] =
  await Promise.all([
    readFile("packages/coordination-observability/src/events.ts"),
    readFile("packages/coordination-observability/src/index.ts"),
    readFile("packages/coordination-observability/test/observability.test.ts"),
    readFile("packages/coordination-observability/test/storage-lock-telemetry.test.ts"),
    readFile("apps/server/test/ingress-signature-observability.test.ts"),
    readPackageScripts(),
  ]);

assertCondition(
  /export\s+type\s+CreateDeskEventInput\s*=/.test(eventsSource),
  "events.ts must export CreateDeskEventInput",
);
assertCondition(
  /export\s+type\s+TraceLinkOptions\s*=/.test(eventsSource),
  "events.ts must export TraceLinkOptions",
);
assertCondition(
  /export\s+const\s+REQUIRED_RUN_LIFECYCLE_EVENT_TYPES\s*=/.test(eventsSource),
  "events.ts must export REQUIRED_RUN_LIFECYCLE_EVENT_TYPES",
);
assertCondition(
  /export\s+const\s+REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT\s*=/.test(eventsSource),
  "events.ts must export REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT",
);

for (const requiredEvent of ["run.started", "run.completed", "run.failed"]) {
  assertCondition(
    eventsSource.includes(`"${requiredEvent}"`),
    `events.ts must include required lifecycle event ${requiredEvent}`,
  );
}

assertCondition(
  /assertRunLifecycleStatusContract\s*\(\s*input\.type\s*,\s*input\.status\s*\)/.test(eventsSource),
  "createDeskEvent must enforce lifecycle status contract",
);
assertCondition(
  indexSource.includes('export * from "./events";'),
  "coordination-observability index must re-export events contract",
);

assertCondition(
  observabilityTestSource.includes("invalid lifecycle status"),
  "observability.test.ts must assert invalid lifecycle status hard-fail",
);
assertCondition(
  storageTelemetryTestSource.includes("REQUIRED_RUN_LIFECYCLE_EVENT_TYPES"),
  "storage-lock-telemetry.test.ts must assert required lifecycle event coverage",
);
assertCondition(
  ingressTestSource.includes("/api/inngest") && ingressTestSource.includes("/api/workflows/coordination/workflows"),
  "ingress-signature-observability test must cover ingress rejection and workflow route-family preservation",
);

assertCondition(
  scripts["phase-a:gate:telemetry-contract"] === "bun scripts/phase-a/verify-gate-scaffold.mjs telemetry",
  "package.json must define phase-a:gate:telemetry-contract hard-fail command",
);
assertCondition(
  typeof scripts["phase-a:gates:baseline"] === "string" && scripts["phase-a:gates:baseline"].includes("phase-a:gate:telemetry-contract"),
  "phase-a:gates:baseline must require phase-a:gate:telemetry-contract",
);
assertCondition(
  typeof scripts["phase-a:gates:completion"] === "string" && scripts["phase-a:gates:completion"].includes("phase-a:gate:telemetry-contract"),
  "phase-a:gates:completion must require phase-a:gate:telemetry-contract",
);
assertCondition(
  !Object.prototype.hasOwnProperty.call(scripts, "phase-a:telemetry:optional"),
  "package.json must not keep optional phase-a telemetry command",
);
assertCondition(
  scripts["phase-c:gate:c2-telemetry-contract"] === "bun scripts/phase-c/verify-telemetry-contract.mjs",
  "phase-c:gate:c2-telemetry-contract must run phase-c telemetry verifier",
);
assertCondition(
  scripts["phase-c:gate:c2-telemetry-runtime"] ===
    "bunx vitest run --project coordination-observability packages/coordination-observability/test/storage-lock-telemetry.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts",
  "phase-c:gate:c2-telemetry-runtime must run required c2 telemetry runtime tests",
);
assertCondition(
  scripts["phase-c:c2:quick"] ===
    "bun run phase-c:gate:drift-core && bun run phase-c:gate:c2-telemetry-contract && bun run phase-c:gate:c2-telemetry-runtime",
  "phase-c:c2:quick must run drift-core + c2 contract + c2 runtime gates",
);
assertCondition(
  scripts["phase-c:c2:full"] === "bun run phase-c:c2:quick && bun run phase-a:gate:observability-contract",
  "phase-c:c2:full must include observability contract gate",
);

console.log("phase-c telemetry contract verified");
