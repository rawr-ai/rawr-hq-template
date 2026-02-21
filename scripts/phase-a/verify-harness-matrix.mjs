#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  findConstArrayLiteral,
  parseTypeScript,
  propertyNameText,
  stringArrayValues,
  unwrapExpression,
  visit,
} from "./ts-ast-utils.mjs";

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
  "assertion:reject-rpc-workflows-route-family",
  "assertion:runtime-ingress-no-caller-boundary-semantics",
  "assertion:in-process-no-local-http-self-call",
];

const searchRoots = [
  path.join(process.cwd(), "apps", "server", "test"),
  path.join(process.cwd(), "packages", "hq", "test"),
  path.join(process.cwd(), "plugins", "cli", "plugins", "test"),
];

const routeBoundaryMatrixPath = path.join(process.cwd(), "apps", "server", "test", "route-boundary-matrix.test.ts");

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

function collectObjectPropertyStringValues(sourceFile, propertyName) {
  const values = new Set();
  visit(sourceFile, (node) => {
    if (!ts.isPropertyAssignment(node)) return;
    if (propertyNameText(node.name) !== propertyName) return;
    const initializer = unwrapExpression(node.initializer);
    if (initializer && ts.isStringLiteral(initializer)) {
      values.add(initializer.text);
    }
  });
  return values;
}

function collectSuiteCoverage(files, fileAsts) {
  const coverage = new Map();

  for (const [idx, filePath] of files.entries()) {
    const ast = fileAsts[idx];
    const suiteIds = collectObjectPropertyStringValues(ast, "suiteId");

    for (const suiteId of suiteIds) {
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

const fileSources = await Promise.all(files.map((file) => fs.readFile(file, "utf8")));
const fileAsts = fileSources.map((source, idx) => parseTypeScript(files[idx], source));
const coverage = collectSuiteCoverage(files, fileAsts);

const missingSuites = REQUIRED_SUITES.filter((suiteId) => !coverage.has(suiteId));
if (missingSuites.length > 0) {
  console.error("harness-matrix failed: missing required suite IDs:");
  for (const suiteId of missingSuites) {
    console.error(`  - ${suiteId}`);
  }
  process.exit(1);
}

let routeBoundaryMatrixSource = "";
try {
  routeBoundaryMatrixSource = await fs.readFile(routeBoundaryMatrixPath, "utf8");
} catch {
  routeBoundaryMatrixSource = "";
}

if (!routeBoundaryMatrixSource) {
  console.error(`harness-matrix failed: missing required route matrix file ${routeBoundaryMatrixPath}`);
  process.exit(1);
}
const routeBoundaryMatrixAst = parseTypeScript(routeBoundaryMatrixPath, routeBoundaryMatrixSource);

const routeMatrixDeclaredSuiteArray = findConstArrayLiteral(routeBoundaryMatrixAst, "REQUIRED_SUITE_IDS");
const routeMatrixDeclaredNegativeArray = findConstArrayLiteral(routeBoundaryMatrixAst, "REQUIRED_NEGATIVE_ASSERTION_KEYS");
if (!routeMatrixDeclaredSuiteArray || !routeMatrixDeclaredNegativeArray) {
  console.error("harness-matrix failed: route boundary matrix must declare REQUIRED_SUITE_IDS and REQUIRED_NEGATIVE_ASSERTION_KEYS arrays.");
  process.exit(1);
}

const routeDeclaredSuites = new Set(stringArrayValues(routeMatrixDeclaredSuiteArray));
const routeDeclaredNegatives = new Set(stringArrayValues(routeMatrixDeclaredNegativeArray));
const missingRouteDeclaredSuites = REQUIRED_SUITES.filter((suiteId) => !routeDeclaredSuites.has(suiteId));
if (missingRouteDeclaredSuites.length > 0) {
  console.error("harness-matrix failed: route boundary matrix declaration is missing required suite IDs:");
  for (const suiteId of missingRouteDeclaredSuites) {
    console.error(`  - ${suiteId}`);
  }
  process.exit(1);
}

const missingRouteDeclaredNegatives = REQUIRED_NEGATIVE_ASSERTION_KEYS.filter((key) => !routeDeclaredNegatives.has(key));
if (missingRouteDeclaredNegatives.length > 0) {
  console.error("harness-matrix failed: route boundary matrix declaration is missing required negative assertion keys:");
  for (const key of missingRouteDeclaredNegatives) {
    console.error(`  - ${key}`);
  }
  process.exit(1);
}

const routeCasesArray = findConstArrayLiteral(routeBoundaryMatrixAst, "MATRIX_CASES");
if (!routeCasesArray) {
  console.error("harness-matrix failed: route boundary matrix must declare MATRIX_CASES.");
  process.exit(1);
}

const routeCaseSuiteIds = new Set();
const routeCaseNegativeKeys = new Set();
let hasRpcWorkflowsNegativeCase = false;

for (const element of routeCasesArray.elements) {
  const unwrapped = unwrapExpression(element);
  if (!unwrapped || !ts.isObjectLiteralExpression(unwrapped)) continue;

  let suiteId;
  let assertionKey;
  let routePath;
  let expectedStatus;

  for (const property of unwrapped.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const propName = propertyNameText(property.name);
    const initializer = unwrapExpression(property.initializer);

    if (propName === "suiteId" && initializer && ts.isStringLiteral(initializer)) suiteId = initializer.text;
    if (propName === "assertionKey" && initializer && ts.isStringLiteral(initializer)) assertionKey = initializer.text;
    if (propName === "path" && initializer && ts.isStringLiteral(initializer)) routePath = initializer.text;
    if (propName === "expectedStatus" && initializer && ts.isNumericLiteral(initializer)) {
      expectedStatus = Number(initializer.text);
    }
  }

  if (suiteId) routeCaseSuiteIds.add(suiteId);
  if (assertionKey) routeCaseNegativeKeys.add(assertionKey);

  if (
    assertionKey === "assertion:reject-rpc-workflows-route-family" &&
    typeof routePath === "string" &&
    routePath.startsWith("/rpc/workflows") &&
    typeof expectedStatus === "number" &&
    expectedStatus >= 400
  ) {
    hasRpcWorkflowsNegativeCase = true;
  }
}

const missingMatrixSuiteIds = REQUIRED_SUITES.filter((suiteId) => !routeCaseSuiteIds.has(suiteId));
if (missingMatrixSuiteIds.length > 0) {
  console.error("harness-matrix failed: MATRIX_CASES is missing required suite IDs:");
  for (const suiteId of missingMatrixSuiteIds) {
    console.error(`  - ${suiteId}`);
  }
  process.exit(1);
}

const missingNegativeKeys = REQUIRED_NEGATIVE_ASSERTION_KEYS.filter((key) => !routeCaseNegativeKeys.has(key));
if (missingNegativeKeys.length > 0) {
  console.error("harness-matrix failed: MATRIX_CASES is missing required negative assertion keys:");
  for (const key of missingNegativeKeys) {
    console.error(`  - ${key}`);
  }
  process.exit(1);
}

if (!hasRpcWorkflowsNegativeCase) {
  console.error(
    "harness-matrix failed: MATRIX_CASES must include a /rpc/workflows negative case using assertion:reject-rpc-workflows-route-family.",
  );
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
