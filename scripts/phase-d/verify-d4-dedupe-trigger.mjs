#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { mustExist, readFile } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21";
const RESULT_PATH = `${PASS_ROOT}/D4_DEDUPE_SCAN_RESULT.json`;

await Promise.all([
  mustExist("apps/server/src/workflows/context.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/test/middleware-dedupe.test.ts"),
]);

const [contextSource, orpcSource, middlewareDedupeTestSource] = await Promise.all([
  readFile("apps/server/src/workflows/context.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/test/middleware-dedupe.test.ts"),
]);

const checks = [
  {
    id: "context-marker-surface",
    message: "context.ts exports RAWR_MIDDLEWARE_DEDUPE_MARKERS",
    pass: /RAWR_MIDDLEWARE_DEDUPE_MARKERS\s*=/.test(contextSource),
  },
  {
    id: "context-rpc-auth-marker",
    message: "context.ts defines RPC_AUTHORIZATION_DECISION marker",
    pass: /RPC_AUTHORIZATION_DECISION:\s*"rpc\.authorization\.decision"/.test(contextSource),
  },
  {
    id: "context-marker-cache",
    message: "context.ts keeps request-scoped marker cache",
    pass: /markerCache:\s*Map<RawrMiddlewareDedupeMarker,\s*unknown>/.test(contextSource),
  },
  {
    id: "orpc-dedupe-evaluation",
    message: "orpc.ts evaluates RPC auth through request-scoped dedupe",
    pass: /isRpcRequestAllowedWithDedupe\(/.test(orpcSource),
  },
  {
    id: "orpc-marker-assertions",
    message: "orpc.ts asserts dedupe marker in both /rpc handlers",
    pass: (orpcSource.match(/assertRpcAuthDedupeMarker\(context\)/g) ?? []).length >= 2,
  },
  {
    id: "runtime-drift-test",
    message: "middleware-dedupe test keeps structural drift hard-fail",
    pass: middlewareDedupeTestSource.includes("hard-fails when context factory drifts"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
const triggered = failedChecks.length > 0;

const result = {
  criterion: "d4-dedupe-scan",
  triggerRule: "heavy middleware chain depth >= 3 missing explicit context-cached dedupe marker",
  triggered,
  summary: triggered
    ? "Trigger criterion met: explicit dedupe-marker contract drift detected."
    : "No dedupe-marker drift detected in D1-owned contract/runtime assertions.",
  checks,
  failedCheckIds: failedChecks.map((check) => check.id),
  generatedAt: new Date().toISOString(),
};

const absResultPath = path.join(process.cwd(), RESULT_PATH);
await fs.mkdir(path.dirname(absResultPath), { recursive: true });
await fs.writeFile(absResultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (triggered) {
  console.log("phase-d d4 dedupe scan: TRIGGERED");
  for (const check of failedChecks) {
    console.log(` - ${check.id}: ${check.message}`);
  }
} else {
  console.log("phase-d d4 dedupe scan: clear");
}
console.log(`wrote ${RESULT_PATH}`);
