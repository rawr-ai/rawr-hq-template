#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "apps", "hq", "package.json");
const manifestPath = path.join(root, "apps", "hq", "rawr.hq.ts");
const manifestCompatPath = path.join(root, "apps", "hq", "src", "manifest.ts");
const serverEntrypointPath = path.join(root, "apps", "hq", "server.ts");
const asyncEntrypointPath = path.join(root, "apps", "hq", "async.ts");
const devEntrypointPath = path.join(root, "apps", "hq", "dev.ts");
const legacyCutoverPath = path.join(root, "apps", "hq", "legacy-cutover.ts");
const testingPath = path.join(root, "apps", "hq", "src", "testing.ts");

const [pkgRaw, manifestSource, manifestCompatSource, serverEntrypointSource, asyncEntrypointSource, devEntrypointSource, legacyCutoverSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(manifestPath, "utf8"),
  fs.readFile(manifestCompatPath, "utf8"),
  fs.readFile(serverEntrypointPath, "utf8"),
  fs.readFile(asyncEntrypointPath, "utf8"),
  fs.readFile(devEntrypointPath, "utf8"),
  fs.readFile(legacyCutoverPath, "utf8"),
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

if (normalizeSemanticSource(manifestCompatSource) !== 'export{createRawrHqManifest}from"../rawr.hq";exporttype{RawrHqManifest}from"../rawr.hq";') {
  console.error("hq-app structural failed: src/manifest.ts must remain a thin compatibility forwarder to rawr.hq.ts.");
  process.exit(1);
}

if (pkg.exports?.["./testing"] !== undefined) {
  console.error("hq-app structural failed: @rawr/hq-app/testing export must remain removed.");
  process.exit(1);
}

if (pkg.exports?.["./manifest"]?.default !== "./rawr.hq.ts") {
  console.error("hq-app structural failed: @rawr/hq-app/manifest must resolve to rawr.hq.ts.");
  process.exit(1);
}

if (
  !manifestSource.includes('id: "hq"') ||
  !manifestSource.includes("roles:") ||
  !manifestSource.includes("server:") ||
  !manifestSource.includes("async:")
) {
  console.error("hq-app structural failed: canonical shell must author explicit role and surface membership.");
  process.exit(1);
}

if (!manifestSource.includes("registerStateApiPlugin") || !manifestSource.includes("registerExampleTodoApiPlugin")) {
  console.error("hq-app structural failed: manifest must compose plugin-owned ORPC surfaces.");
  process.exit(1);
}

if (
  manifestSource.includes("registerCoordinationApiPlugin") ||
  manifestSource.includes("coordination") ||
  manifestSource.includes("support-example") ||
  manifestSource.includes("supportExample")
) {
  console.error("hq-app structural failed: archived coordination and support-example surfaces must stay out of the HQ app manifest.");
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

if (
  !serverEntrypointSource.includes('from "./rawr.hq"') ||
  !serverEntrypointSource.includes('from "./legacy-cutover"') ||
  !asyncEntrypointSource.includes('from "./rawr.hq"') ||
  !asyncEntrypointSource.includes('from "./legacy-cutover"') ||
  !devEntrypointSource.includes('from "./rawr.hq"') ||
  !devEntrypointSource.includes('from "./legacy-cutover"')
) {
  console.error("hq-app structural failed: entrypoints must import the canonical shell and the sanctioned legacy cutover seam.");
  process.exit(1);
}

if (
  serverEntrypointSource.includes("../server/src/host-composition") ||
  asyncEntrypointSource.includes("../server/src/host-composition") ||
  devEntrypointSource.includes("../server/src/host-composition") ||
  legacyCutoverSource.includes("../server/src/host-composition") ||
  legacyCutoverSource.includes("../server/src/host-seam") ||
  legacyCutoverSource.includes("../server/src/host-realization")
) {
  console.error("hq-app structural failed: entrypoint bridge must not bypass through host-composition internals.");
  process.exit(1);
}

if (testingSource !== null && normalizeSemanticSource(testingSource) !== "export{};") {
  console.error("hq-app structural failed: testing.ts must be absent or stay an inert marker module only.");
  process.exit(1);
}

console.log("hq-app structural verified");
