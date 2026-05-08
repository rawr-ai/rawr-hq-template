#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  throw new Error(message);
}

async function pathExists(relPath) {
  try {
    await fs.stat(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(relPath) {
  try {
    return await fs.readFile(path.join(root, relPath), "utf8");
  } catch {
    return "";
  }
}

async function listFiles(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (rel.includes("quarantine") || rel.includes(`${path.sep}_archive${path.sep}`)) continue;
      await listFiles(rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function assertNoMatch(contentsByFile, pattern, label) {
  const hits = [];
  for (const [file, contents] of contentsByFile) {
    if (pattern.test(contents)) hits.push(file);
  }
  if (hits.length > 0) fail(`${label} found in active files:\n${hits.join("\n")}`);
}

function assertIncludes(contents, snippet, label) {
  if (!contents.includes(snippet)) fail(`${label} must include ${snippet}`);
}

if (await pathExists("plugins/web/mfe-demo")) fail("plugins/web/mfe-demo must be removed");
if (!(await pathExists("plugins/web/.gitkeep"))) fail("plugins/web/.gitkeep must exist");

const mfeFiles = [
  "package.json",
  "vitest.config.ts",
  "bun.lock",
  "apps/server/test/rawr.test.ts",
  "apps/cli/test/stubs.test.ts",
  "apps/web/src/ui/pages/MountsPage.tsx",
  "services/hq-ops/test/ports-backed-service.test.ts",
];
const mfeContents = new Map(await Promise.all(mfeFiles.map(async (file) => [file, await readIfExists(file)])));
assertNoMatch(mfeContents, /@rawr\/plugin-mfe-demo|mfe-demo/u, "mfe-demo reference");

const activeCoordFiles = [
  ...(await listFiles("docs/process")),
  ...(await listFiles("scripts/runtime")),
];
const coordContents = new Map(await Promise.all(activeCoordFiles.map(async (file) => [file, await readIfExists(file)])));
assertNoMatch(
  coordContents,
  /\/coordination|\/rpc\/coordination|rawr workflow coord|COORDINATION_CANVAS_OPERATIONS|coordination canvas|\.rawr\/coordination/iu,
  "stale coordination canvas reference",
);

const rootPackage = await readIfExists("package.json");
assertIncludes(rootPackage, "dev:workflows", "root package scripts");
assertIncludes(rootPackage, "dev:inngest", "root package scripts");

const serverPackage = await readIfExists("apps/server/package.json");
assertIncludes(serverPackage, "dev:inngest", "server package scripts");

const rawrServer = await readIfExists("apps/server/src/rawr.ts");
assertIncludes(rawrServer, "/api/inngest", "server rawr route spine");
assertIncludes(rawrServer, "/api/workflows/*", "server rawr route spine");

console.log("upstream fallout active surfaces verified");
