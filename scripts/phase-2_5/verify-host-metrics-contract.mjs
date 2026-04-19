#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/test/orpc-metrics.test.ts"),
  mustExist("apps/server/test/telemetry-bootstrap.test.ts"),
  mustExist("scripts/phase-2_5/verify-host-metrics-contract.mjs"),
]);

const [scripts, orpcSource, metricsTestSource, bootstrapTestSource, serverPackageRaw] = await Promise.all([
  readPackageScripts(),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/test/orpc-metrics.test.ts"),
  readFile("apps/server/test/telemetry-bootstrap.test.ts"),
  readFile("apps/server/package.json"),
]);

const serverPackage = JSON.parse(serverPackageRaw);

assertCondition(
  serverPackage.dependencies?.["@opentelemetry/api"],
  "apps/server/package.json must declare @opentelemetry/api",
);
assertCondition(
  orpcSource.includes("rawr.orpc.requests") && orpcSource.includes("rawr.orpc.request.duration"),
  "apps/server/src/orpc.ts must create host-boundary request metrics",
);
assertCondition(
  orpcSource.includes("withRouteSpan") && orpcSource.includes("startActiveSpan"),
  "apps/server/src/orpc.ts must create host-boundary route spans",
);
assertCondition(
  orpcSource.includes("http.response.status_code") && orpcSource.includes('"rawr.orpc.surface"'),
  "apps/server/src/orpc.ts must record low-cardinality request attributes",
);
assertCondition(
  metricsTestSource.includes("rawr.orpc.rpc.request") && metricsTestSource.includes("rawr.orpc.openapi.request"),
  "apps/server/test/orpc-metrics.test.ts must assert rpc and openapi route spans",
);
assertCondition(
  metricsTestSource.includes("expect(attributes).not.toHaveProperty(\"url.full\")"),
  "apps/server/test/orpc-metrics.test.ts must prove url.full is excluded from metric labels",
);
assertCondition(
  bootstrapTestSource.includes("metrics: { url: undefined, headers: undefined, exportIntervalMillis: 1000 }"),
  "apps/server/test/telemetry-bootstrap.test.ts must reflect the metrics-capable telemetry install result",
);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:host-metrics",
  "bun scripts/phase-2_5/verify-host-metrics-contract.mjs && bunx vitest run --project server apps/server/test/orpc-metrics.test.ts apps/server/test/telemetry-bootstrap.test.ts",
);

console.log("phase-2_5 host metrics contract verified");
