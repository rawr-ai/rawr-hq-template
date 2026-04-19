#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/logging.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/test/logging-correlation.test.ts"),
  mustExist("scripts/observability/verify-logging-boundary.mjs"),
  mustExist("apps/hq/rawr.hq.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/server/package.json"),
]);

const [scripts, loggingSource, orpcSource, shellSource, manifestCompatSource, serverPackageRaw] = await Promise.all([
  readPackageScripts(),
  readFile("apps/server/src/logging.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/server/package.json"),
]);

const serverPackage = JSON.parse(serverPackageRaw);

assertScriptEquals(
  scripts,
  "observability:gate:logging",
  "bun scripts/observability/verify-logging-boundary.mjs && bunx vitest run --project server apps/server/test/logging-correlation.test.ts && ! rg -n \"from \\\"pino\\\"|from 'pino'\" services/example-todo",
);

assertCondition(
  loggingSource.includes('from "pino"') || loggingSource.includes("from 'pino'"),
  "apps/server/src/logging.ts must be Pino-backed",
);
assertCondition(
  loggingSource.includes("createHostLoggerAdapter")
    && loggingSource.includes("withHostLoggingContext")
    && loggingSource.includes("AsyncLocalStorage")
    && !loggingSource.includes("services/example-todo"),
  "apps/server/src/logging.ts must expose the host adapter and request-scoped logging context seam",
);
assertCondition(
  loggingSource.includes('".rawr", "hq", "runtime.log"')
    && loggingSource.includes("repoRoot")
    && loggingSource.includes("hostLoggersByRepoRoot"),
  "apps/server/src/logging.ts must route correlated host logs into per-repo .rawr/hq/runtime.log files",
);
assertCondition(
  orpcSource.includes("createHostLoggingContext")
    && orpcSource.includes("withHostLoggingContext")
    && orpcSource.includes('surface: "rpc"')
    && orpcSource.includes('surface: "openapi"')
    && orpcSource.includes("repoRoot: context.repoRoot"),
  "apps/server/src/orpc.ts must bind host logging correlation at both routed ingress surfaces",
);
assertCondition(
  !shellSource.includes("hostLogger")
    && !shellSource.includes("apps/server/src/logging")
    && !shellSource.includes('host-adapters/logger/embedded-placeholder')
    && manifestCompatSource.includes('export { createRawrHqManifest } from "../rawr.hq";'),
  "apps/hq manifest must stay declaration-only and avoid server logging adapter construction",
);
assertCondition(
  typeof serverPackage.dependencies?.pino === "string" && serverPackage.dependencies.pino.trim() !== "",
  "apps/server/package.json must declare pino at the real server package boundary",
);

console.log("logging boundary verified");
