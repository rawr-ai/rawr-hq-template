#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const gate = process.argv[2];
const optional = process.argv.includes("--optional");

if (!gate) {
  console.error("Usage: bun scripts/phase-a/verify-gate-scaffold.mjs <gate-id> [--optional]");
  process.exit(2);
}

const root = process.cwd();

async function mustExist(relPath) {
  const abs = path.join(root, relPath);
  try {
    const st = await fs.stat(abs);
    if (!st.isFile()) throw new Error("not-a-file");
  } catch {
    throw new Error(`missing file: ${relPath}`);
  }
}

async function fileIncludes(relPath, expected) {
  const abs = path.join(root, relPath);
  const text = await fs.readFile(abs, "utf8");
  if (!text.includes(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)} in ${relPath}`);
  }
}

async function verifyMetadataContract() {
  await mustExist("packages/hq/src/workspace/plugins.ts");
  await mustExist("plugins/cli/plugins/src/lib/workspace-plugins.ts");
}

async function verifyImportBoundary() {
  await mustExist("packages/hq/src/workspace/plugins.ts");
  await mustExist("plugins/cli/plugins/src/lib/workspace-plugins.ts");
}

async function verifyHostCompositionGuard() {
  await fileIncludes("apps/server/src/rawr.ts", '"/api/inngest"');
  await fileIncludes("apps/server/src/rawr.ts", "registerOrpcRoutes");
}

async function verifyRouteNegativeAssertions() {
  await mustExist("apps/server/test/rawr.test.ts");
  await mustExist("apps/server/test/orpc-handlers.test.ts");
}

async function verifyObservabilityContract() {
  await mustExist("packages/coordination-observability/package.json");
  await mustExist("packages/coordination-observability/test/observability.test.ts");
}

const checkMap = {
  "metadata-contract": verifyMetadataContract,
  "import-boundary": verifyImportBoundary,
  "host-composition-guard": verifyHostCompositionGuard,
  "route-negative-assertions": verifyRouteNegativeAssertions,
  "observability-contract": verifyObservabilityContract,
  telemetry: async () => {
    if (process.env.RAWR_PHASE_A_TELEMETRY_OPT_IN === "1") {
      console.log("phase-a telemetry opted in (no-op scaffold).");
      return;
    }
    if (optional) {
      console.log("phase-a telemetry not configured; optional/non-blocking.");
      return;
    }
    throw new Error("phase-a telemetry not configured");
  },
};

const check = checkMap[gate];
if (!check) {
  console.error(`Unknown gate scaffold id: ${gate}`);
  process.exit(2);
}

try {
  await check();
  console.log(`Gate scaffold check passed: ${gate}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Gate scaffold check failed (${gate}): ${message}`);
  process.exit(1);
}
