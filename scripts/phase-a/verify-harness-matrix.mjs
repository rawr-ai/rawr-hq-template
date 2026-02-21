#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_SUITES = [
  "suite:web:first-party-rpc",
  "suite:web:published-openapi",
  "suite:cli:in-process",
  "suite:api:boundary",
  "suite:workflow:trigger-status",
  "suite:runtime:ingress",
  "suite:cross-surface:metadata-import-boundary",
];

const REQUIRED_NEGATIVE_ASSERTION_KEYS = [
  "assertion:reject-api-inngest-from-caller-paths",
  "assertion:reject-rpc-from-external-callers",
  "assertion:runtime-ingress-no-caller-boundary-semantics",
  "assertion:in-process-no-local-http-self-call",
];

const searchRoots = [
  path.join(process.cwd(), "apps", "server", "test"),
  path.join(process.cwd(), "packages", "hq", "test"),
  path.join(process.cwd(), "plugins", "cli", "plugins", "test"),
];

const routeBoundaryMatrixPath = path.join(process.cwd(), "apps", "server", "test", "route-boundary-matrix.test.ts");
const suiteIdPattern = /\bsuite:[a-z0-9-]+:[a-z0-9-]+\b/gu;

async function listTestFiles(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listTestFiles(abs)));
      continue;
    }

    if (entry.isFile() && /\.(test|spec)\.tsx?$/u.test(entry.name)) {
      out.push(abs);
    }
  }

  return out;
}

async function readFileOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function collectSuiteCoverage(files, fileContents) {
  const coverage = new Map();

  for (let idx = 0; idx < files.length; idx += 1) {
    const filePath = files[idx];
    const text = fileContents[idx];
    const matches = text.match(suiteIdPattern) ?? [];

    for (const suiteId of matches) {
      const paths = coverage.get(suiteId) ?? [];
      paths.push(filePath);
      coverage.set(suiteId, paths);
    }
  }

  return coverage;
}

const files = (await Promise.all(searchRoots.map(listTestFiles))).flat().sort();
if (files.length === 0) {
  console.error("harness-matrix failed: no test files were discovered under configured search roots.");
  process.exit(1);
}

const fileContents = await Promise.all(files.map((file) => readFileOrEmpty(file)));
const coverage = collectSuiteCoverage(files, fileContents);

const missingSuites = REQUIRED_SUITES.filter((suiteId) => !coverage.has(suiteId));
if (missingSuites.length > 0) {
  console.error("harness-matrix failed: missing required suite IDs:");
  for (const suiteId of missingSuites) {
    console.error(`  - ${suiteId}`);
  }
  process.exit(1);
}

const routeBoundaryMatrix = await readFileOrEmpty(routeBoundaryMatrixPath);
if (!routeBoundaryMatrix) {
  console.error(`harness-matrix failed: missing required route matrix file ${routeBoundaryMatrixPath}`);
  process.exit(1);
}

const missingNegativeKeys = REQUIRED_NEGATIVE_ASSERTION_KEYS.filter((key) => !routeBoundaryMatrix.includes(key));
if (missingNegativeKeys.length > 0) {
  console.error("harness-matrix failed: route boundary matrix is missing required negative assertion keys:");
  for (const key of missingNegativeKeys) {
    console.error(`  - ${key}`);
  }
  process.exit(1);
}

console.log(`harness-matrix passed: ${REQUIRED_SUITES.length} required suite IDs present across ${files.length} test files.`);
for (const suiteId of REQUIRED_SUITES) {
  const suiteFiles = coverage.get(suiteId) ?? [];
  for (const filePath of suiteFiles) {
    console.log(`  - ${suiteId} :: ${path.relative(process.cwd(), filePath)}`);
  }
}
console.log(`harness-matrix passed: ${REQUIRED_NEGATIVE_ASSERTION_KEYS.length} negative assertion keys verified in route matrix.`);
