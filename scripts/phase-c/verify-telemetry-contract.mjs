#!/usr/bin/env bun
import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/test/ingress-signature-observability.test.ts"),
  mustExist("apps/server/test/logging-correlation.test.ts"),
  mustExist("apps/server/test/route-boundary-matrix.test.ts"),
  mustExist("scripts/phase-a/verify-gate-scaffold.mjs"),
  mustExist("scripts/phase-1/verify-no-live-coordination.mjs"),
  mustExist("scripts/phase-1/verify-no-live-support-example.mjs"),
]);

const [
  ingressTestSource,
  loggingCorrelationTestSource,
  routeBoundaryMatrixSource,
  phaseAGateScaffoldSource,
  phase1NoLiveCoordinationSource,
  phase1NoLiveSupportExampleSource,
  scripts,
] = await Promise.all([
  readFile("apps/server/test/ingress-signature-observability.test.ts"),
  readFile("apps/server/test/logging-correlation.test.ts"),
  readFile("apps/server/test/route-boundary-matrix.test.ts"),
  readFile("scripts/phase-a/verify-gate-scaffold.mjs"),
  readFile("scripts/phase-1/verify-no-live-coordination.mjs"),
  readFile("scripts/phase-1/verify-no-live-support-example.mjs"),
  readPackageScripts(),
]);

assertCondition(
  ingressTestSource.includes("allows unsigned ingress in explicit dev mode") &&
    ingressTestSource.includes("rejects invalid ingress signatures before host side effects") &&
    ingressTestSource.includes("cannot be bypassed by spoofed caller-surface or auth headers"),
  "ingress-signature-observability.test.ts must cover dev ingress, signature rejection, and spoofed-header rejection",
);
assertCondition(
  loggingCorrelationTestSource.includes("writes correlated rpc service logs into .rawr/hq/runtime.log") &&
    loggingCorrelationTestSource.includes("writes correlated openapi service logs into .rawr/hq/runtime.log"),
  "logging-correlation.test.ts must cover correlated RPC and OpenAPI logging",
);
assertCondition(
  routeBoundaryMatrixSource.includes("assertion:reject-rpc-workflows-route-family") &&
    routeBoundaryMatrixSource.includes('path: "/rpc/workflows/state/getRuntimeState"') &&
    routeBoundaryMatrixSource.includes('path: "/api/workflows/state/runtime"') &&
    routeBoundaryMatrixSource.includes('expectedStatus: 404'),
  "route-boundary-matrix.test.ts must keep workflow route-family negatives explicit",
);
assertCondition(
  phaseAGateScaffoldSource.includes("apps/server/test/ingress-signature-observability.test.ts") &&
    phaseAGateScaffoldSource.includes("apps/server/test/logging-correlation.test.ts") &&
    phaseAGateScaffoldSource.includes("assertion:reject-rpc-workflows-route-family"),
  "phase-a scaffold must ratchet the post-U01 telemetry and route-boundary proof band",
);
assertCondition(
  phase1NoLiveCoordinationSource.includes("plugins/workflows/coordination") &&
    phase1NoLiveCoordinationSource.includes("must not exist in the live tree"),
  "phase-1 coordination archive verifier must keep the workflow lane out of the live tree",
);
assertCondition(
  phase1NoLiveSupportExampleSource.includes("plugins/workflows/support-example") &&
    phase1NoLiveSupportExampleSource.includes("must not exist in the live tree"),
  "phase-1 support-example archive verifier must keep the workflow lane out of the live tree",
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
    "bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts apps/server/test/logging-correlation.test.ts",
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
