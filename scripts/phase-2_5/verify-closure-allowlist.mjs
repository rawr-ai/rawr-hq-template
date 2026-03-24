#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

const root = process.cwd();

const legacyRuntimeTokens = [
  "dev up",
  "routine start",
  "dev:up",
  "RAWR_DEV_UP_OPEN",
  "RAWR_OPEN_POLICY",
  "RAWR_OPEN_UI",
];

const supportExampleTokens = ["support-example", "supportExample"];

const ignoredDirs = new Set([
  ".scratch",
  ".context",
  ".git",
  ".nx",
  ".rawr",
  ".turbo",
  "chatgpt-design-host-shell-architecture",
  "dist",
  "node_modules",
  "research",
]);

const ignoredFiles = new Set(["bun.lock", "output.json"]);

const legacySupportAllowlist = [
  "rawr.hq.ts",
  "apps/hq/src/manifest.ts",
  "package.json",
  "vitest.config.ts",
  "apps/cli/src/commands/workflow/demo-mfe.ts",
  "scripts/phase-2_5/",
  "services/support-example/",
  "plugins/workflows/support-example/",
  "plugins/web/mfe-demo/",
];

const canonicalLegacySurfaceFiles = [
  "apps/cli/src/commands/tools/export.ts",
  "docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md",
  "package.json",
];

await Promise.all([
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/cli/src/commands/tools/export.ts"),
  mustExist("apps/cli/src/commands/workflow/demo-mfe.ts"),
  mustExist("apps/server/test/api-plugin-example-surface.test.ts"),
  mustExist("apps/server/test/rawr.test.ts"),
  mustExist("docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md"),
  mustExist("package.json"),
  mustExist("vitest.config.ts"),
  mustExist("scripts/phase-2_5/verify-closure-allowlist.mjs"),
]);

const [scripts, manifestSource, toolsExportSource, demoMfeSource, runbookSource, apiProofSource, rawrTestSource] =
  await Promise.all([
    readPackageScripts(),
    readFile("apps/hq/src/manifest.ts"),
    readFile("apps/cli/src/commands/tools/export.ts"),
    readFile("apps/cli/src/commands/workflow/demo-mfe.ts"),
    readFile("docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md"),
    readFile("apps/server/test/api-plugin-example-surface.test.ts"),
    readFile("apps/server/test/rawr.test.ts"),
  ]);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:closure",
  "bun scripts/phase-2_5/verify-closure-allowlist.mjs && bun run test:vitest",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:quick",
  "bunx nx run @rawr/server:structural -- --suite=phase-2_5-quick && bunx nx run @rawr/cli:structural -- --suite=phase-2_5-quick",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:exit",
  "bun run phase-2_5:gates:quick && bunx nx run @rawr/server:structural -- --suite=phase-2_5-exit && bun run phase-2_5:gate:closure",
);

assertCondition(!("dev:up" in scripts), "package.json must not define bun run dev:up");

assertCondition(
  !manifestSource.includes("./plugins/api/support-example") && !manifestSource.includes("registerSupportExampleApiPlugin"),
  "apps/hq/src/manifest.ts must not import or register the legacy support-example API plugin",
);
assertCondition(
  /const composedOrpcRouter = \{\s*\.\.\.coordinationApiPlugin\.router,\s*\.\.\.stateApiPlugin\.router,\s*\.\.\.exampleTodoApiPlugin\.router,\s*\};/s.test(manifestSource),
  "apps/hq/src/manifest.ts must compose canonical API projections from coordination, state, and example-todo plugins",
);
assertCondition(
  !toolsExportSource.includes("support-example") && !toolsExportSource.includes("supportExample"),
  "tools export must not advertise support-example as a canonical command surface",
);
assertCondition(
  !runbookSource.includes("support-example") && !runbookSource.includes("supportExample"),
  "canonical runbooks must not teach support-example as an active proof surface",
);
assertCondition(
  apiProofSource.includes("exampleTodo") && apiProofSource.includes("supportExample/triage/getStatus"),
  "apps/server/test/api-plugin-example-surface.test.ts must prove example-todo and assert legacy support-example API paths stay closed",
);
assertCondition(
  rawrTestSource.includes("./plugins/workflows/support-example")
    && rawrTestSource.includes("supportExample/triage/getStatus")
    && rawrTestSource.includes("/api/orpc/support-example/triage/status"),
  "apps/server/test/rawr.test.ts must keep the legacy workflow lane explicit while guarding canonical API closure",
);
assertCondition(
  demoMfeSource.includes("legacy support-example"),
  "workflow demo-mfe must stay explicitly labeled as a legacy demo surface",
);

const activeFiles = await collectActiveFiles(".");
const supportExampleLeakPaths = [];

for (const relPath of activeFiles) {
  const source = await fs.readFile(path.join(root, relPath), "utf8");
  if (!supportExampleTokens.some((token) => source.includes(token))) {
    continue;
  }

  if (isAllowedSupportExamplePath(relPath)) {
    continue;
  }

  supportExampleLeakPaths.push(relPath);
}

assertCondition(
  supportExampleLeakPaths.length === 0,
  `support-example may remain only in the explicit legacy allowlist; found residue in: ${supportExampleLeakPaths.join(", ")}`,
);

for (const relPath of canonicalLegacySurfaceFiles) {
  const source = await fs.readFile(path.join(root, relPath), "utf8");
  const found = legacyRuntimeTokens.filter((token) => source.includes(token));
  assertCondition(
    found.length === 0,
    `${relPath} must not reference deleted runtime aliases: ${found.join(", ")}`,
  );
}

await assertPathMissing("plugins/api/support-example");

console.log("phase-2_5 closure allowlist verified");

function isAllowedSupportExamplePath(relPath) {
  return legacySupportAllowlist.some((entry) => relPath === entry || relPath.startsWith(entry));
}

async function assertPathMissing(relPath) {
  try {
    await fs.stat(path.join(root, relPath));
  } catch {
    return;
  }

  throw new Error(`${relPath} must be removed by closure`);
}

async function collectActiveFiles(relDir) {
  const absoluteDir = path.join(root, relDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relPath = relDir === "." ? entry.name : path.join(relDir, entry.name);

    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(relPath, entry.name)) {
        continue;
      }

      files.push(...await collectActiveFiles(relPath));
      continue;
    }

    if (ignoredFiles.has(entry.name) || shouldIgnoreFile(relPath)) {
      continue;
    }

    files.push(relPath);
  }

  return files;
}

function shouldIgnoreDirectory(relPath, name) {
  if (ignoredDirs.has(name)) {
    return true;
  }

  return relPath.includes(`${path.sep}_archive`) || relPath.includes("/_archive");
}

function shouldIgnoreFile(relPath) {
  return relPath.endsWith(".png")
    || relPath.endsWith(".jpg")
    || relPath.endsWith(".jpeg")
    || relPath.endsWith(".gif")
    || relPath.endsWith(".svg")
    || relPath.endsWith(".pdf")
    || relPath.endsWith(".lock")
    || relPath.includes(`${path.sep}test${path.sep}`)
    || relPath.includes("/test/")
    || relPath.includes(`${path.sep}tests${path.sep}`)
    || relPath.includes("/tests/")
    || relPath.endsWith(".test.ts")
    || relPath.endsWith(".test.tsx")
    || relPath.endsWith(".spec.ts")
    || relPath.endsWith(".spec.tsx");
}
