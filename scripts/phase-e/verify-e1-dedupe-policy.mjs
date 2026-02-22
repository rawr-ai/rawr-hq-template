#!/usr/bin/env bun
import {
  assertCondition,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/workflows/context.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/test/middleware-dedupe.test.ts"),
]);

const [contextSource, orpcSource, middlewareTestSource, scripts] = await Promise.all([
  readFile("apps/server/src/workflows/context.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/test/middleware-dedupe.test.ts"),
  readPackageScripts(),
]);

assertCondition(
  /RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY\s*=/.test(contextSource),
  "context.ts must define RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY",
);
assertCondition(
  /requiredMarkers:\s*\[RAWR_MIDDLEWARE_DEDUPE_MARKERS\.RPC_AUTHORIZATION_DECISION\]/.test(contextSource),
  "heavy middleware dedupe policy must include RPC auth marker",
);
assertCondition(
  /export function assertHeavyMiddlewareDedupeMarkers\(/.test(contextSource),
  "context.ts must expose assertHeavyMiddlewareDedupeMarkers helper",
);

assertCondition(
  /assertHeavyMiddlewareDedupeMarkers\(context,\s*RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY\.requiredMarkers\)/.test(
    orpcSource,
  ),
  "orpc.ts must enforce heavy middleware dedupe marker policy before RPC dispatch",
);

assertCondition(
  middlewareTestSource.includes("enforces heavy middleware marker policy for request contexts"),
  "middleware-dedupe test suite must cover heavy marker policy enforcement",
);

assertCondition(
  scripts["phase-e:gate:drift-core"] === "bun run phase-d:gate:drift-core",
  "package.json must define phase-e:gate:drift-core",
);
assertCondition(
  scripts["phase-e:gate:e1-dedupe-policy"] === "bun scripts/phase-e/verify-e1-dedupe-policy.mjs",
  "package.json must define phase-e:gate:e1-dedupe-policy",
);
assertCondition(
  scripts["phase-e:gate:e1-dedupe-runtime"] ===
    "bunx vitest run --project server apps/server/test/middleware-dedupe.test.ts",
  "package.json must define phase-e:gate:e1-dedupe-runtime",
);
assertCondition(
  scripts["phase-e:e1:quick"] ===
    "bun run phase-e:gate:drift-core && bun run phase-e:gate:e1-dedupe-policy && bun run phase-e:gate:e1-dedupe-runtime",
  "package.json must define phase-e:e1:quick",
);
assertCondition(
  scripts["phase-e:e1:full"] === "bun run phase-e:e1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",
  "package.json must define phase-e:e1:full",
);

console.log("phase-e e1 dedupe policy verified");
