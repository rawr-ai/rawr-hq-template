#!/usr/bin/env bun
import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/workflows/context.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/test/middleware-dedupe.test.ts"),
  mustExist("scripts/phase-d/_verify-utils.mjs"),
]);

const [contextSource, orpcSource, middlewareDedupeTestSource, scripts] = await Promise.all([
  readFile("apps/server/src/workflows/context.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/test/middleware-dedupe.test.ts"),
  readPackageScripts(),
]);

assertCondition(
  /RAWR_MIDDLEWARE_DEDUPE_MARKERS\s*=/.test(contextSource),
  "context.ts must export RAWR_MIDDLEWARE_DEDUPE_MARKERS",
);
assertCondition(
  /RPC_AUTHORIZATION_DECISION:\s*"rpc\.authorization\.decision"/.test(contextSource),
  "context.ts must include RPC_AUTHORIZATION_DECISION marker",
);
assertCondition(
  /markerCache:\s*Map<RawrMiddlewareDedupeMarker,\s*unknown>/.test(contextSource),
  "context.ts must define markerCache in middleware state",
);
assertCondition(
  /middlewareState:\s*getRequestScopedBoundaryMiddlewareState\(request\)/.test(contextSource),
  "createRequestScopedBoundaryContext must hydrate request-scoped middleware state",
);
assertCondition(
  /resolveRequestScopedMiddlewareValue(?:<[^>]+>)?\s*\(/.test(contextSource),
  "context.ts must expose request-scoped middleware value resolver",
);
assertCondition(
  /assertRequestScopedMiddlewareMarker\(/.test(contextSource),
  "context.ts must expose middleware marker assertion helper",
);

assertCondition(
  /const\s+RPC_AUTH_DEDUPE_MARKER\s*=\s*RAWR_MIDDLEWARE_DEDUPE_MARKERS\.RPC_AUTHORIZATION_DECISION/.test(orpcSource),
  "orpc.ts must bind RPC auth dedupe marker constant",
);
assertCondition(
  /isRpcRequestAllowedWithDedupe\(/.test(orpcSource),
  "orpc.ts must evaluate RPC auth through dedupe resolver",
);
const markerAssertionMatches = orpcSource.match(/assertRpcAuthDedupeMarker\(context\)/g) ?? [];
assertCondition(
  markerAssertionMatches.length >= 2,
  "orpc.ts must assert dedupe marker in both /rpc handlers",
);
assertCondition(
  middlewareDedupeTestSource.includes("RPC_AUTHORIZATION_DECISION") &&
    middlewareDedupeTestSource.includes("hard-fails when context factory drifts"),
  "middleware-dedupe.test.ts must cover marker presence and structural drift hard-fail",
);

assertCondition(
  scripts["phase-d:gate:drift-core"] === "bun run phase-c:gate:drift-core",
  "package.json must define phase-d:gate:drift-core",
);
assertCondition(
  scripts["phase-d:gate:d1-middleware-dedupe-contract"] === "bun scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs",
  "package.json must define phase-d:gate:d1-middleware-dedupe-contract",
);
assertCondition(
  scripts["phase-d:gate:d1-middleware-dedupe-runtime"] ===
    "bunx vitest run --project server apps/server/test/middleware-dedupe.test.ts",
  "package.json must define phase-d:gate:d1-middleware-dedupe-runtime",
);
assertCondition(
  scripts["phase-d:d1:quick"] ===
    "bun run phase-d:gate:drift-core && bun run phase-d:gate:d1-middleware-dedupe-contract && bun run phase-d:gate:d1-middleware-dedupe-runtime",
  "package.json must define phase-d:d1:quick chain",
);
assertCondition(
  scripts["phase-d:d1:full"] === "bun run phase-d:d1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",
  "package.json must define phase-d:d1:full chain",
);

console.log("phase-d d1 middleware dedupe contract verified");
