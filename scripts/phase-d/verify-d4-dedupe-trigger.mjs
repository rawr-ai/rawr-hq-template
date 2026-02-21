#!/usr/bin/env bun
import { mustExist, readFile, writeJsonIfChanged } from "./_verify-utils.mjs";

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

const RPC_ROUTE_HANDLER_PATTERN = /app\.all\(\s*"\/rpc(?:\/\*)?"/g;
const HEAVY_CHAIN_DEPTH_THRESHOLD = 3;
const rpcHandlerCount = (orpcSource.match(RPC_ROUTE_HANDLER_PATTERN) ?? []).length;
const rpcRouteHelperInvocationCount = (orpcSource.match(/handleRpcRoute\(\{/g) ?? []).length;
const hasCentralizedAuthGate =
  rpcRouteHelperInvocationCount >= rpcHandlerCount &&
  /async function handleRpcRoute\([\s\S]*isRpcRequestAllowedWithDedupe\(/m.test(orpcSource);
const hasCentralizedContextFactory =
  rpcRouteHelperInvocationCount >= rpcHandlerCount &&
  /async function handleRpcRoute\([\s\S]*const context = contextFactory\(/m.test(orpcSource);
const hasCentralizedMarkerAssertion =
  rpcRouteHelperInvocationCount >= rpcHandlerCount &&
  /async function handleRpcRoute\([\s\S]*assertRpcAuthDedupeMarker\(context\)/m.test(orpcSource);
const hasCentralizedContextCreatedHook =
  rpcRouteHelperInvocationCount >= rpcHandlerCount &&
  /async function handleRpcRoute\([\s\S]*onContextCreated\?\.\(context\)/m.test(orpcSource);
const hasCentralizedHandlerDispatch =
  rpcRouteHelperInvocationCount >= rpcHandlerCount &&
  /async function handleRpcRoute\([\s\S]*rpcHandler\.handle\(/m.test(orpcSource);

const stepCoverage = {
  authGate: hasCentralizedAuthGate ? rpcHandlerCount : (orpcSource.match(/isRpcRequestAllowedWithDedupe\(/g) ?? []).length,
  contextFactory: hasCentralizedContextFactory
    ? rpcHandlerCount
    : (orpcSource.match(/const context = contextFactory\(/g) ?? []).length,
  markerAssertion: hasCentralizedMarkerAssertion
    ? rpcHandlerCount
    : (orpcSource.match(/assertRpcAuthDedupeMarker\(context\)/g) ?? []).length,
  contextCreatedHook: hasCentralizedContextCreatedHook
    ? rpcHandlerCount
    : (orpcSource.match(/options\.onContextCreated\?\.\(context\)/g) ?? []).length,
  handlerDispatch: hasCentralizedHandlerDispatch ? rpcHandlerCount : (orpcSource.match(/rpcHandler\.handle\(/g) ?? []).length,
};
const measuredRpcMiddlewareChainDepth = [
  stepCoverage.authGate >= rpcHandlerCount ? 1 : 0,
  stepCoverage.contextFactory >= rpcHandlerCount ? 1 : 0,
  stepCoverage.markerAssertion >= rpcHandlerCount ? 1 : 0,
  stepCoverage.contextCreatedHook >= rpcHandlerCount ? 1 : 0,
  stepCoverage.handlerDispatch >= rpcHandlerCount ? 1 : 0,
].reduce((sum, value) => sum + value, 0);
const heavyChainDepthCriterionMet = measuredRpcMiddlewareChainDepth >= HEAVY_CHAIN_DEPTH_THRESHOLD;

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
    pass:
      (orpcSource.match(/assertRpcAuthDedupeMarker\(context\)/g) ?? []).length >= rpcHandlerCount ||
      hasCentralizedMarkerAssertion,
  },
  {
    id: "runtime-drift-test",
    message: "middleware-dedupe test keeps structural drift hard-fail",
    pass: middlewareDedupeTestSource.includes("hard-fails when context factory drifts"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
const markerCheckIds = new Set([
  "context-marker-surface",
  "context-rpc-auth-marker",
  "context-marker-cache",
  "orpc-dedupe-evaluation",
  "orpc-marker-assertions",
]);
const failedMarkerCheckIds = failedChecks.filter((check) => markerCheckIds.has(check.id)).map((check) => check.id);
const missingExplicitMarker = failedMarkerCheckIds.length > 0;
const triggered = heavyChainDepthCriterionMet && missingExplicitMarker;

const result = {
  criterion: "d4-dedupe-scan",
  triggerRule: "heavy middleware chain depth >= 3 missing explicit context-cached dedupe marker",
  triggered,
  heavyChainDepthThreshold: HEAVY_CHAIN_DEPTH_THRESHOLD,
  rpcHandlerCount,
  stepCoverage,
  measuredRpcMiddlewareChainDepth,
  heavyChainDepthCriterionMet,
  missingExplicitMarker,
  summary: triggered
    ? "Trigger criterion met: heavy middleware chain depth threshold met and explicit dedupe-marker contract drift detected."
    : heavyChainDepthCriterionMet
      ? "No dedupe-marker drift detected in heavy D1-owned middleware chain."
      : "No heavy middleware chain depth >= 3 detected; D4 dedupe criterion not met.",
  checks,
  failedCheckIds: failedChecks.map((check) => check.id),
  failedMarkerCheckIds,
};

const writeResult = await writeJsonIfChanged(RESULT_PATH, result);

if (triggered) {
  console.log("phase-d d4 dedupe scan: TRIGGERED");
  for (const check of failedChecks.filter((entry) => markerCheckIds.has(entry.id))) {
    console.log(` - ${check.id}: ${check.message}`);
  }
} else if (!heavyChainDepthCriterionMet) {
  console.log(
    `phase-d d4 dedupe scan: clear (measured middleware depth=${measuredRpcMiddlewareChainDepth}, threshold=${HEAVY_CHAIN_DEPTH_THRESHOLD})`,
  );
} else {
  console.log("phase-d d4 dedupe scan: clear");
}
console.log(
  `wrote ${RESULT_PATH}${writeResult.changed ? "" : " (unchanged)"}; depth=${measuredRpcMiddlewareChainDepth}; heavyChain=${heavyChainDepthCriterionMet}; missingMarker=${missingExplicitMarker}`,
);
