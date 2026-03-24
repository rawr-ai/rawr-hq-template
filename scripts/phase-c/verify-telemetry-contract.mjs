#!/usr/bin/env bun
import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

await Promise.all([
  mustExist("services/coordination/src/domain/events.ts"),
  mustExist("services/coordination/test/run-lifecycle-telemetry.test.ts"),
  mustExist("plugins/workflows/coordination/src/events.ts"),
  mustExist("plugins/workflows/coordination/src/trace-links.ts"),
  mustExist("plugins/workflows/coordination/test/observability.test.ts"),
  mustExist("apps/server/test/ingress-signature-observability.test.ts"),
  mustExist("scripts/phase-a/verify-gate-scaffold.mjs"),
]);

const [
  serviceEventsSource,
  serviceTelemetryTestSource,
  pluginEventsSource,
  traceLinksSource,
  observabilityTestSource,
  ingressTestSource,
  scripts,
] =
  await Promise.all([
    readFile("services/coordination/src/domain/events.ts"),
    readFile("services/coordination/test/run-lifecycle-telemetry.test.ts"),
    readFile("plugins/workflows/coordination/src/events.ts"),
    readFile("plugins/workflows/coordination/src/trace-links.ts"),
    readFile("plugins/workflows/coordination/test/observability.test.ts"),
    readFile("apps/server/test/ingress-signature-observability.test.ts"),
    readPackageScripts(),
  ]);

assertCondition(
  /export\s+const\s+REQUIRED_RUN_LIFECYCLE_EVENT_TYPES\s*=/.test(serviceEventsSource),
  "service events.ts must export REQUIRED_RUN_LIFECYCLE_EVENT_TYPES",
);
assertCondition(
  /export\s+const\s+REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT\s*=/.test(serviceEventsSource),
  "service events.ts must export REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT",
);
assertCondition(
  /assertRunLifecycleStatusContract\s*\(\s*input\.type\s*,\s*input\.status\s*\)/.test(serviceEventsSource),
  "service createDeskEvent must enforce lifecycle status contract",
);
assertCondition(
  /export\s+type\s+CreateDeskEventInput\s*=/.test(pluginEventsSource),
  "workflow plugin events.ts must export CreateDeskEventInput",
);
assertCondition(
  /export\s+type\s+TraceLinkOptions\s*=/.test(traceLinksSource) &&
    /export\s+function\s+defaultTraceLinks/.test(traceLinksSource),
  "workflow plugin trace-links.ts must export TraceLinkOptions and defaultTraceLinks",
);
assertCondition(
  serviceTelemetryTestSource.includes("REQUIRED_RUN_LIFECYCLE_EVENT_TYPES") &&
    serviceTelemetryTestSource.includes("invalid lifecycle status"),
  "run-lifecycle-telemetry.test.ts must assert lifecycle coverage and invalid status hard-fail",
);
assertCondition(
  observabilityTestSource.includes("builds default trace links") &&
    observabilityTestSource.includes("prefers explicit inngest run identifiers"),
  "observability.test.ts must assert workflow trace link behavior",
);
assertCondition(
  ingressTestSource.includes("/api/inngest") &&
    ingressTestSource.includes("/api/workflows/support-example/triage/status"),
  "ingress-signature-observability test must cover ingress rejection and workflow route-family preservation",
);

assertCondition(
  scripts["phase-a:gate:telemetry-contract"] === "bun scripts/phase-a/verify-gate-scaffold.mjs telemetry",
  "package.json must define phase-a:gate:telemetry-contract hard-fail command",
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
    "bunx vitest run --project coordination services/coordination/test/run-lifecycle-telemetry.test.ts && bunx vitest run --project plugin-workflows-coordination plugins/workflows/coordination/test/observability.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts",
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
