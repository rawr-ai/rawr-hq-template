#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectArgIndex = process.argv.indexOf("--project");
const projectFilter = projectArgIndex >= 0 ? process.argv[projectArgIndex + 1] : undefined;

const requiredWorkspaces = [
  "packages/core/sdk",
  "packages/core/runtime/*",
  "packages/core/runtime/harnesses/*",
  "resources/*",
];

const forbiddenWorkspacePrefix = "packages/runtime";

const canonicalProjects = {
  "@rawr/sdk": {
    path: "packages/core/sdk/package.json",
    name: "@rawr/sdk",
    source: "packages/core/sdk/src/index.ts",
    marker: "packages/core/sdk",
  },
  "@rawr/core-runtime-compiler": {
    path: "packages/core/runtime/compiler/package.json",
    name: "@rawr/core-runtime-compiler",
    source: "packages/core/runtime/compiler/src/index.ts",
    marker: "packages/core/runtime/compiler",
  },
  "@rawr/core-runtime-bootgraph": {
    path: "packages/core/runtime/bootgraph/package.json",
    name: "@rawr/core-runtime-bootgraph",
    source: "packages/core/runtime/bootgraph/src/index.ts",
    marker: "packages/core/runtime/bootgraph",
  },
  "@rawr/core-runtime-substrate": {
    path: "packages/core/runtime/substrate/package.json",
    name: "@rawr/core-runtime-substrate",
    source: "packages/core/runtime/substrate/src/index.ts",
    marker: "packages/core/runtime/substrate",
  },
  "@rawr/core-runtime-process": {
    path: "packages/core/runtime/process-runtime/package.json",
    name: "@rawr/core-runtime-process",
    source: "packages/core/runtime/process-runtime/src/index.ts",
    marker: "packages/core/runtime/process-runtime",
  },
  "@rawr/core-runtime-topology": {
    path: "packages/core/runtime/topology/package.json",
    name: "@rawr/core-runtime-topology",
    source: "packages/core/runtime/topology/src/index.ts",
    marker: "packages/core/runtime/topology",
  },
  "@rawr/core-runtime-standard": {
    path: "packages/core/runtime/standard/package.json",
    name: "@rawr/core-runtime-standard",
    source: "packages/core/runtime/standard/src/index.ts",
    marker: "packages/core/runtime/standard",
  },
  "@rawr/core-runtime-harness-elysia": {
    path: "packages/core/runtime/harnesses/elysia/package.json",
    name: "@rawr/core-runtime-harness-elysia",
    source: "packages/core/runtime/harnesses/elysia/src/index.ts",
    marker: "packages/core/runtime/harnesses/elysia",
  },
  "@rawr/core-runtime-harness-inngest": {
    path: "packages/core/runtime/harnesses/inngest/package.json",
    name: "@rawr/core-runtime-harness-inngest",
    source: "packages/core/runtime/harnesses/inngest/src/index.ts",
    marker: "packages/core/runtime/harnesses/inngest",
  },
  "@rawr/resource-clock": {
    path: "resources/clock/package.json",
    name: "@rawr/resource-clock",
    source: "resources/clock/src/index.ts",
    marker: "resources/clock",
  },
};

async function readJson(relPath) {
  return JSON.parse(await fs.readFile(path.join(root, relPath), "utf8"));
}

async function pathExists(relPath) {
  try {
    await fs.access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

const failures = [];
const rootPackage = await readJson("package.json");
const workspaces = new Set(rootPackage.workspaces ?? []);
const lintBoundariesScript = rootPackage.scripts?.["lint:boundaries"];

for (const workspace of requiredWorkspaces) {
  if (!workspaces.has(workspace)) {
    failures.push(`package.json workspaces must include ${workspace}.`);
  }
}

for (const workspace of rootPackage.workspaces ?? []) {
  if (workspace === forbiddenWorkspacePrefix || workspace.startsWith(`${forbiddenWorkspacePrefix}/`)) {
    failures.push(`package.json workspaces must not include stale runtime workspace ${workspace}.`);
  }
}

if (typeof lintBoundariesScript !== "string" || !/\bresources\b/u.test(lintBoundariesScript)) {
  failures.push("package.json lint:boundaries must include resources.");
}

const entries = projectFilter
  ? Object.entries(canonicalProjects).filter(([projectName]) => projectName === projectFilter)
  : Object.entries(canonicalProjects);

if (projectFilter && entries.length === 0) {
  failures.push(`unknown canonical runtime project ${projectFilter}.`);
}

for (const [projectName, project] of entries) {
  if (!(await pathExists(project.path))) {
    failures.push(`${project.path} must exist for ${projectName}.`);
    continue;
  }
  const pkg = await readJson(project.path);
  if (pkg.name !== project.name) {
    failures.push(`${project.path} must be named ${project.name}.`);
  }
  for (const scriptName of ["build", "sync", "structural", "typecheck", "test"]) {
    if (typeof pkg.scripts?.[scriptName] !== "string") {
      failures.push(`${project.path} must declare script ${scriptName}.`);
    }
  }
  for (const tag of ["migration-slice:runtime-production"]) {
    if (!(pkg.nx?.tags ?? []).includes(tag)) {
      failures.push(`${project.path} must include Nx tag ${tag}.`);
    }
  }
  if (!(await pathExists(project.source))) {
    failures.push(`${project.source} must exist for ${projectName}.`);
  } else {
    const source = await fs.readFile(path.join(root, project.source), "utf8");
    if (!source.includes(project.marker)) {
      failures.push(`${project.source} must retain topology marker ${project.marker}.`);
    }
  }
}

if (failures.length > 0) {
  console.error("canonical runtime topology verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`canonical runtime topology verified${projectFilter ? ` for ${projectFilter}` : ""}`);
