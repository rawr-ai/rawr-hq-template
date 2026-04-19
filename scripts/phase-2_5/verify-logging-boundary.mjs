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
  mustExist("apps/server/src/rawr.ts"),
  mustExist("apps/server/test/logging-correlation.test.ts"),
  mustExist("scripts/phase-2_5/verify-logging-boundary.mjs"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/server/package.json"),
]);

const [scripts, loggingSource, orpcSource, rawrSource, manifestSource, serverPackageRaw] = await Promise.all([
  readPackageScripts(),
  readFile("apps/server/src/logging.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/src/rawr.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/server/package.json"),
]);

const serverPackage = JSON.parse(serverPackageRaw);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:logging",
  "bun scripts/phase-2_5/verify-logging-boundary.mjs && bunx vitest run --project server apps/server/test/logging-correlation.test.ts && ! rg -n \"from \\\"pino\\\"|from 'pino'\" services/example-todo services/support-example",
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
  rawrSource.includes('from "./logging"')
    && rawrSource.includes("createRawrHqManifest")
    && rawrSource.includes("createHostLoggerAdapter")
    && manifestSource.includes("hostLogger")
    && !manifestSource.includes("apps/server/src/logging")
    && !manifestSource.includes('host-adapters/logger/embedded-placeholder'),
  "server host must inject the logger adapter into the app-owned manifest seam instead of keeping host logging inside apps/hq",
);
assertCondition(
  typeof serverPackage.dependencies?.pino === "string" && serverPackage.dependencies.pino.trim() !== "",
  "apps/server/package.json must declare pino at the real server package boundary",
);

console.log("phase-2_5 logging boundary verified");
