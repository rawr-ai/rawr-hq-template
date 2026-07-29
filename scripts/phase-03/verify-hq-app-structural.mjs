#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const hqRoot = path.join(root, "apps", "hq");

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

const [hqPackage, serverPackage, manifestSource, serverSource, asyncSource, devSource] =
  await Promise.all([
    fs.readFile(path.join(hqRoot, "package.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "apps", "server", "package.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(hqRoot, "rawr.hq.ts"), "utf8"),
    fs.readFile(path.join(hqRoot, "server.ts"), "utf8"),
    fs.readFile(path.join(hqRoot, "async.ts"), "utf8"),
    fs.readFile(path.join(hqRoot, "dev.ts"), "utf8"),
  ]);

const requiredTags = ["type:app", "app:hq", "migration-slice:structural-tranche"];
for (const tag of requiredTags) {
  if (!(hqPackage.nx?.tags ?? []).includes(tag)) {
    console.error(`hq-app structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (
  !manifestSource.includes("export function createRawrHqManifest") ||
  !manifestSource.includes('id: "hq"') ||
  !manifestSource.includes("server:") ||
  !manifestSource.includes("async:") ||
  manifestSource.includes("implement(") ||
  manifestSource.includes("createRouterClient(") ||
  manifestSource.includes("hostLogger")
) {
  console.error("hq-app structural failed: rawr.hq.ts must remain a declarative app manifest.");
  process.exit(1);
}

if (
  !serverSource.includes("@rawr/server/host") ||
  !serverSource.includes('role: "server"') ||
  serverSource.includes("legacy-cutover") ||
  !asyncSource.includes('role: "async"') ||
  !devSource.includes("startRawrHqServer")
) {
  console.error(
    "hq-app structural failed: app entrypoints must select roles through the public server host."
  );
  process.exit(1);
}

if (
  hqPackage.dependencies?.["@rawr/server"] !== "workspace:*" ||
  serverPackage.dependencies?.["@rawr/hq-app"] !== undefined
) {
  console.error("hq-app structural failed: the package graph must flow from HQ app to server.");
  process.exit(1);
}

if (
  hqPackage.exports?.["./testing"] !== undefined ||
  hqPackage.exports?.["./legacy-cutover"] !== undefined ||
  hqPackage.exports?.["./manifest"]?.default !== "./rawr.hq.ts"
) {
  console.error("hq-app structural failed: only the canonical manifest may be publicly exported.");
  process.exit(1);
}

for (const retiredPath of ["legacy-cutover.ts", "src/manifest.ts"]) {
  if (await readIfPresent(path.join(hqRoot, retiredPath))) {
    console.error(`hq-app structural failed: ${retiredPath} must remain retired.`);
    process.exit(1);
  }
}

const testingSource = await readIfPresent(path.join(hqRoot, "src", "testing.ts"));
if (
  testingSource !== null &&
  testingSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "") !== "export{};"
) {
  console.error("hq-app structural failed: testing.ts must be absent or inert.");
  process.exit(1);
}

console.log("hq-app structural verified");
