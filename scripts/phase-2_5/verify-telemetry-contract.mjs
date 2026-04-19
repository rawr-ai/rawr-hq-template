#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("packages/core/src/orpc/telemetry.ts"),
  mustExist("packages/core/test/telemetry.test.ts"),
  mustExist("scripts/phase-2_5/verify-telemetry-contract.mjs"),
]);

const [scripts, telemetrySource, telemetryTestSource, corePackageRaw] = await Promise.all([
  readPackageScripts(),
  readFile("packages/core/src/orpc/telemetry.ts"),
  readFile("packages/core/test/telemetry.test.ts"),
  readFile("packages/core/package.json"),
]);

const corePackage = JSON.parse(corePackageRaw);

assertCondition(
  corePackage.dependencies?.["@opentelemetry/exporter-metrics-otlp-http"],
  "packages/core/package.json must declare @opentelemetry/exporter-metrics-otlp-http",
);
assertCondition(
  corePackage.dependencies?.["@opentelemetry/sdk-metrics"],
  "packages/core/package.json must declare @opentelemetry/sdk-metrics",
);
assertCondition(
  telemetrySource.includes("OTLPMetricExporter") && telemetrySource.includes("PeriodicExportingMetricReader"),
  "telemetry.ts must wire OTLP metrics export and a periodic metric reader",
);
assertCondition(
  telemetrySource.includes("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT")
    && telemetrySource.includes('appendOtlpSignalPath(otlpBaseUrl, "/v1/metrics")'),
  "telemetry.ts must derive metrics endpoint from the base OTLP endpoint with signal-specific overrides",
);
assertCondition(
  telemetrySource.includes('appendOtlpSignalPath(otlpBaseUrl, "/v1/traces")'),
  "telemetry.ts must derive trace endpoint from the base OTLP endpoint when no explicit trace endpoint is provided",
);
assertCondition(
  telemetryTestSource.includes("fails loudly when telemetry is re-installed with incompatible metrics options"),
  "telemetry.test.ts must cover incompatible metrics options",
);
assertCondition(
  telemetryTestSource.includes("derives trace and metrics OTLP HTTP endpoints from the base OTLP endpoint"),
  "telemetry.test.ts must cover OTLP endpoint derivation for traces and metrics",
);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:telemetry-core",
  "bun scripts/phase-2_5/verify-telemetry-contract.mjs && bunx vitest run --project core packages/core/test/telemetry.test.ts",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:quick",
  "bunx nx run @rawr/server:structural -- --suite=phase-2_5-quick && bunx nx run @rawr/cli:structural -- --suite=phase-2_5-quick",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:exit",
  "bun run phase-2_5:gates:quick && bunx nx run @rawr/server:structural -- --suite=phase-2_5-exit && bun run phase-2_5:gate:closure",
);

console.log("phase-2_5 telemetry contract verified");
