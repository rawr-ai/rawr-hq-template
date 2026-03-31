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
  mustExist("apps/server/src/host-composition.ts"),
  mustExist("apps/server/src/host-satisfiers.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/src/rawr.ts"),
  mustExist("apps/server/test/logging-correlation.test.ts"),
  mustExist("scripts/phase-2_5/verify-logging-boundary.mjs"),
  mustExist("apps/hq/rawr.hq.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/server/package.json"),
]);

const [scripts, loggingSource, hostCompositionSource, hostSatisfiersSource, orpcSource, rawrSource, shellSource, manifestCompatSource, serverPackageRaw] = await Promise.all([
  readPackageScripts(),
  readFile("apps/server/src/logging.ts"),
  readFile("apps/server/src/host-composition.ts"),
  readFile("apps/server/src/host-satisfiers.ts"),
  readFile("apps/server/src/orpc.ts"),
  readFile("apps/server/src/rawr.ts"),
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/server/package.json"),
]);

const serverPackage = JSON.parse(serverPackageRaw);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:logging",
  "bun scripts/phase-2_5/verify-logging-boundary.mjs && bunx vitest run --project server apps/server/test/logging-correlation.test.ts && ! rg -n \"from \\\"pino\\\"|from 'pino'\" services/example-todo",
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
    && rawrSource.includes("createHostLoggerAdapter")
    && rawrSource.includes("createRawrHostComposition")
    && hostCompositionSource.includes("createRawrHqManifest")
    && hostCompositionSource.includes("createRawrHostSatisfiers")
    && hostCompositionSource.includes("hostLogger: input.hostLogger")
    && hostSatisfiersSource.includes("createRawrHostSatisfiers")
    && hostSatisfiersSource.includes("hostLogger: HostServiceLogger")
    && !shellSource.includes("hostLogger")
    && !shellSource.includes("apps/server/src/logging")
    && !shellSource.includes('host-adapters/logger/embedded-placeholder')
    && manifestCompatSource.includes('export { createRawrHqManifest } from "../rawr.hq";'),
  "server host must inject the logger adapter through host-composition/host-satisfiers while apps/hq manifest stays declaration-only",
);
assertCondition(
  typeof serverPackage.dependencies?.pino === "string" && serverPackage.dependencies.pino.trim() !== "",
  "apps/server/package.json must declare pino at the real server package boundary",
);

console.log("phase-2_5 logging boundary verified");
