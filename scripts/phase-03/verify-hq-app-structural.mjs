#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "apps", "hq", "package.json");
const manifestPath = path.join(root, "apps", "hq", "src", "manifest.ts");
const testingPath = path.join(root, "apps", "hq", "src", "testing.ts");
const rawrHqBridgePath = path.join(root, "rawr.hq.ts");

const [pkgRaw, manifestSource, rawrHqBridgeSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(manifestPath, "utf8"),
  fs.readFile(rawrHqBridgePath, "utf8"),
]);

function normalizeSemanticSource(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

async function readIfPresent(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

const testingSource = await readIfPresent(testingPath);

const pkg = JSON.parse(pkgRaw);
const requiredTags = ["type:app", "app:hq", "migration-slice:structural-tranche"];
for (const tag of requiredTags) {
  if (!(pkg.nx?.tags ?? []).includes(tag)) {
    console.error(`hq-app structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!manifestSource.includes("export function createRawrHqManifest")) {
  console.error("hq-app structural failed: manifest factory export missing.");
  process.exit(1);
}

if (pkg.exports?.["./testing"] !== undefined) {
  console.error("hq-app structural failed: @rawr/hq-app/testing export must remain removed.");
  process.exit(1);
}

if (
  !manifestSource.includes("registerCoordinationApiPlugin") ||
  !manifestSource.includes("registerStateApiPlugin") ||
  !manifestSource.includes("registerExampleTodoApiPlugin")
) {
  console.error("hq-app structural failed: manifest must compose plugin-owned ORPC surfaces.");
  process.exit(1);
}

if (manifestSource.includes("createHqRuntimeRouter") || manifestSource.includes("@rawr/core/orpc")) {
  console.error("hq-app structural failed: app authority must not own or import a special HQ router seam.");
  process.exit(1);
}

if (manifestSource.includes("apps/server/src/logging") || manifestSource.includes('from "pino"') || manifestSource.includes("from 'pino'")) {
  console.error("hq-app structural failed: app authority seam must not import host logging implementation.");
  process.exit(1);
}

if (
  manifestSource.includes("implement(") ||
  manifestSource.includes("createRouterClient(") ||
  manifestSource.includes("materializeManifestBridgeSurfaces") ||
  manifestSource.includes("createCoordinationClient(") ||
  manifestSource.includes("createStateClient(") ||
  manifestSource.includes("createEmbeddedInMemoryDbPoolAdapter") ||
  manifestSource.includes("hostLogger")
) {
  console.error("hq-app structural failed: manifest must stay composition-only and free of executable host authority.");
  process.exit(1);
}

if (testingSource !== null && normalizeSemanticSource(testingSource) !== "export{};") {
  console.error("hq-app structural failed: testing.ts must be absent or stay an inert marker module only.");
  process.exit(1);
}

if (
  !/^export\{createRawrHqManifest,typeRawrHqManifest\}from["']@rawr\/hq-app\/manifest["'];?$/.test(
    normalizeSemanticSource(rawrHqBridgeSource),
  )
) {
  console.error("hq-app structural failed: rawr.hq.ts may only re-export HQ manifest composition symbols.");
  process.exit(1);
}

console.log("hq-app structural verified");
