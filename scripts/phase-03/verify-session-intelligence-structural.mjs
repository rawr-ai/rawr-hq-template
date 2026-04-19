#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { collectImportSites, pathExists, readFile, readJson, root, toPosix } from "../phase-1/_verify-utils.mjs";

const SERVICE_ROOT = "services/session-intelligence";
const HOST_ROOT = "packages/session-intelligence-host";
const PLUGIN_ROOT = "plugins/cli/session-tools";

const SERVICE_MODULES = ["catalog", "transcripts", "search"];
const SERVICE_EXPORTS = [
  ".",
  "./client",
  "./router",
  "./service/contract",
  "./schemas",
  "./ports/session-source-runtime",
  "./ports/session-index-runtime",
];
const SERVICE_RUNTIME_DEP_KEYS = ["sessionSourceRuntime", "sessionIndexRuntime"];
const ROOT_PROJECT_LIST_SCRIPTS = ["build", "typecheck", "pretest:vitest"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".nx", ".git"]);
const FORBIDDEN_SERVICE_IMPORTS = [
  /^node:/u,
  /^bun:/u,
  /^fs$/u,
  /^fs\//u,
  /^path$/u,
  /^os$/u,
  /^readline$/u,
  /^readline\//u,
  /^sqlite$/u,
  /^sqlite3$/u,
  /^better-sqlite3$/u,
];
const FORBIDDEN_SERVICE_SOURCE_PATTERNS = [
  { pattern: /\bprocess\.env\b/u, label: "process.env" },
  { pattern: /\bos\.homedir\s*\(/u, label: "os.homedir()" },
  { pattern: /\bBun\.(?:file|sqlite|env)\b/u, label: "Bun concrete runtime API" },
  { pattern: /\bnew\s+Database\s*\(/u, label: "concrete SQLite Database construction" },
];

async function readJsonIfExists(relPath, findings, label = relPath) {
  if (!(await pathExists(relPath))) {
    findings.push(`${label} is missing`);
    return null;
  }

  try {
    return await readJson(relPath);
  } catch (error) {
    findings.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

async function readFileIfExists(relPath, findings, label = relPath, reportMissing = true) {
  if (!(await pathExists(relPath))) {
    if (reportMissing) findings.push(`${label} is missing`);
    return null;
  }

  return readFile(relPath);
}

async function walkSourceFiles(relPath, files) {
  if (!(await pathExists(relPath))) return;

  const entries = await fs.readdir(path.join(root, relPath), { withFileTypes: true });
  for (const entry of entries) {
    const childRelPath = toPosix(path.join(relPath, entry.name));
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkSourceFiles(childRelPath, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(childRelPath);
  }
}

function collectModuleSpecifiers(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers.sort();
}

function hasForbiddenServiceImport(specifier) {
  return FORBIDDEN_SERVICE_IMPORTS.some((pattern) => pattern.test(specifier));
}

async function verifyServiceShape(findings) {
  if (!(await pathExists(SERVICE_ROOT))) {
    findings.push(`${SERVICE_ROOT} is missing`);
    return;
  }

  const requiredPaths = [
    `${SERVICE_ROOT}/package.json`,
    `${SERVICE_ROOT}/tsconfig.json`,
    `${SERVICE_ROOT}/tsconfig.build.json`,
    `${SERVICE_ROOT}/src/index.ts`,
    `${SERVICE_ROOT}/src/client.ts`,
    `${SERVICE_ROOT}/src/router.ts`,
    `${SERVICE_ROOT}/src/service/base.ts`,
    `${SERVICE_ROOT}/src/service/contract.ts`,
    `${SERVICE_ROOT}/src/service/impl.ts`,
    `${SERVICE_ROOT}/src/service/router.ts`,
    `${SERVICE_ROOT}/src/service/shared/README.md`,
    `${SERVICE_ROOT}/src/service/shared/errors.ts`,
    `${SERVICE_ROOT}/src/service/shared/internal-errors.ts`,
    `${SERVICE_ROOT}/src/service/shared/schemas.ts`,
    `${SERVICE_ROOT}/src/service/shared/ports/session-source-runtime.ts`,
    `${SERVICE_ROOT}/src/service/shared/ports/session-index-runtime.ts`,
    `${SERVICE_ROOT}/test/service-shape.test.ts`,
  ];

  for (const moduleName of SERVICE_MODULES) {
    for (const fileName of ["contract", "middleware", "module", "repository", "router", "schemas"]) {
      requiredPaths.push(`${SERVICE_ROOT}/src/service/modules/${moduleName}/${fileName}.ts`);
    }
  }

  for (const relPath of requiredPaths) {
    if (!(await pathExists(relPath))) findings.push(`missing required session-intelligence path: ${relPath}`);
  }

  const pkg = await readJsonIfExists(`${SERVICE_ROOT}/package.json`, findings);
  if (pkg) {
    if (pkg.name !== "@rawr/session-intelligence") {
      findings.push(`expected ${SERVICE_ROOT}/package.json name @rawr/session-intelligence, got ${pkg.name}`);
    }

    const tags = pkg.nx?.tags ?? [];
    for (const tag of ["type:service", "role:servicepackage"]) {
      if (!tags.includes(tag)) findings.push(`@rawr/session-intelligence must be tagged ${tag}`);
    }

    for (const key of SERVICE_EXPORTS) {
      if (!pkg.exports?.[key]) findings.push(`@rawr/session-intelligence package exports must include ${key}`);
    }

    const structuralScript = "bun ../../scripts/phase-03/run-structural-suite.mjs --project @rawr/session-intelligence";
    if (pkg.scripts?.structural !== structuralScript) {
      findings.push(`@rawr/session-intelligence structural script must be "${structuralScript}"`);
    }
  }

  const [indexSource, clientSource, contractSource, routerSource, baseSource, shapeTestSource] = await Promise.all([
    readFileIfExists(`${SERVICE_ROOT}/src/index.ts`, findings, `${SERVICE_ROOT}/src/index.ts`, false),
    readFileIfExists(`${SERVICE_ROOT}/src/client.ts`, findings, `${SERVICE_ROOT}/src/client.ts`, false),
    readFileIfExists(`${SERVICE_ROOT}/src/service/contract.ts`, findings, `${SERVICE_ROOT}/src/service/contract.ts`, false),
    readFileIfExists(`${SERVICE_ROOT}/src/service/router.ts`, findings, `${SERVICE_ROOT}/src/service/router.ts`, false),
    readFileIfExists(`${SERVICE_ROOT}/src/service/base.ts`, findings, `${SERVICE_ROOT}/src/service/base.ts`, false),
    readFileIfExists(`${SERVICE_ROOT}/test/service-shape.test.ts`, findings, `${SERVICE_ROOT}/test/service-shape.test.ts`, false),
  ]);

  if (indexSource) {
    for (const token of ["createClient", "router", "Client", "Router"]) {
      if (!indexSource.includes(token)) findings.push(`${SERVICE_ROOT}/src/index.ts must keep boundary export ${token}`);
    }
  }

  if (clientSource && !clientSource.includes("defineServicePackage(router)")) {
    findings.push("@rawr/session-intelligence client must keep defineServicePackage(router)");
  }

  for (const moduleName of SERVICE_MODULES) {
    if (contractSource && !contractSource.includes(moduleName)) {
      findings.push(`session-intelligence root contract is missing ${moduleName}`);
    }
    if (routerSource && !routerSource.includes(moduleName)) {
      findings.push(`session-intelligence root router is missing ${moduleName}`);
    }
    if (shapeTestSource && !shapeTestSource.includes(`"${moduleName}"`)) {
      findings.push(`session-intelligence service-shape test must ratchet ${moduleName}`);
    }
  }

  for (const depKey of SERVICE_RUNTIME_DEP_KEYS) {
    if (baseSource && !baseSource.includes(depKey)) {
      findings.push(`session-intelligence base service deps must declare ${depKey}`);
    }
  }
}

async function verifyServiceRuntimePurity(findings) {
  const files = [];
  await walkSourceFiles(`${SERVICE_ROOT}/src/service`, files);

  for (const relPath of files.sort()) {
    const source = await readFile(relPath);
    const specifiers = collectModuleSpecifiers(relPath, source);
    for (const specifier of specifiers) {
      if (hasForbiddenServiceImport(specifier)) {
        findings.push(`${relPath} imports concrete runtime module ${specifier}`);
      }
    }

    for (const { pattern, label } of FORBIDDEN_SERVICE_SOURCE_PATTERNS) {
      if (pattern.test(source)) {
        findings.push(`${relPath} references ${label}; keep concrete runtime access in ${HOST_ROOT}`);
      }
    }
  }
}

async function verifyHostPackage(findings) {
  if (!(await pathExists(HOST_ROOT))) {
    findings.push(`${HOST_ROOT} is missing`);
    return;
  }

  const pkg = await readJsonIfExists(`${HOST_ROOT}/package.json`, findings);
  if (!pkg) return;

  if (pkg.name !== "@rawr/session-intelligence-host") {
    findings.push(`expected ${HOST_ROOT}/package.json name @rawr/session-intelligence-host, got ${pkg.name}`);
  }

  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (!allDeps["@rawr/session-intelligence"]) {
    findings.push("@rawr/session-intelligence-host must depend on @rawr/session-intelligence");
  }
}

async function verifyRootProjectLists(findings) {
  const pkg = await readJsonIfExists("package.json", findings, "root package.json");
  if (!pkg) return;

  for (const scriptName of ROOT_PROJECT_LIST_SCRIPTS) {
    const script = pkg.scripts?.[scriptName] ?? "";
    if (script.includes("@rawr/session-tools")) {
      findings.push(`root package.json script "${scriptName}" must not include @rawr/session-tools`);
    }
    for (const projectName of ["@rawr/session-intelligence", "@rawr/session-intelligence-host", "@rawr/plugin-session-tools"]) {
      if (!script.includes(projectName)) {
        findings.push(`root package.json script "${scriptName}" must include ${projectName}`);
      }
    }
  }

  const gateScript = "bun scripts/phase-03/verify-session-intelligence-structural.mjs";
  if (pkg.scripts?.["phase-03:gate:session-intelligence-structural"] !== gateScript) {
    findings.push(`root package.json must expose phase-03:gate:session-intelligence-structural as "${gateScript}"`);
  }
}

async function verifyVitestConfig(findings) {
  const source = await readFileIfExists("vitest.config.ts", findings);
  if (!source) return;

  for (const staleNeedle of ['root: r("packages/session-tools")', 'name: "session-tools"']) {
    if (source.includes(staleNeedle)) findings.push(`vitest.config.ts must not include stale ${staleNeedle}`);
  }

  for (const requiredNeedle of [
    'root: r("services/session-intelligence")',
    'name: "session-intelligence"',
    'root: r("packages/session-intelligence-host")',
    'name: "session-intelligence-host"',
  ]) {
    if (!source.includes(requiredNeedle)) findings.push(`vitest.config.ts must include ${requiredNeedle}`);
  }
}

async function verifyEslintRatchets(findings) {
  const source = await readFileIfExists("eslint.config.mjs", findings);
  if (!source) return;

  for (const requiredNeedle of [
    "@rawr/session-tools",
    "The legacy @rawr/session-tools package is removed",
    "services/session-intelligence/src/service/**/*",
    "Session Intelligence service files must stay runtime-agnostic",
  ]) {
    if (!source.includes(requiredNeedle)) findings.push(`eslint.config.mjs must include ${requiredNeedle}`);
  }
}

async function verifyLegacyRemoval(findings) {
  if (await pathExists("packages/session-tools")) {
    findings.push("packages/session-tools must not exist after session-intelligence promotion");
  }

  const importSites = await collectImportSites(["@rawr/session-tools"]);
  for (const site of importSites) {
    findings.push(`legacy @rawr/session-tools import remains: ${site}`);
  }
}

async function verifyPluginCutover(findings) {
  const pkg = await readJsonIfExists(`${PLUGIN_ROOT}/package.json`, findings);
  if (!pkg) return;

  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };

  if (allDeps["@rawr/session-tools"]) {
    findings.push("@rawr/plugin-session-tools must not depend on @rawr/session-tools");
  }

  for (const requiredDep of ["@rawr/session-intelligence", "@rawr/session-intelligence-host"]) {
    if (!allDeps[requiredDep]) findings.push(`@rawr/plugin-session-tools must depend on ${requiredDep}`);
  }
}

async function verifyRoutingDocs(findings) {
  const [splitDoc, templateManagedPaths] = await Promise.all([
    readFileIfExists("AGENTS_SPLIT.md", findings),
    readFileIfExists("scripts/githooks/template-managed-paths.txt", findings),
  ]);

  if (splitDoc) {
    if (splitDoc.includes("packages/session-tools")) {
      findings.push("AGENTS_SPLIT.md must not route packages/session-tools as a live template package");
    }
    for (const requiredPath of [SERVICE_ROOT, HOST_ROOT, PLUGIN_ROOT]) {
      if (!splitDoc.includes(requiredPath)) findings.push(`AGENTS_SPLIT.md must route ${requiredPath}`);
    }
  }

  if (templateManagedPaths) {
    if (templateManagedPaths.includes("packages/session-tools/**")) {
      findings.push("template-managed paths must not include packages/session-tools/** after removal");
    }
    for (const requiredPattern of [`${SERVICE_ROOT}/**`, `${HOST_ROOT}/**`, `${PLUGIN_ROOT}/**`]) {
      if (!templateManagedPaths.includes(requiredPattern)) {
        findings.push(`template-managed paths must include ${requiredPattern}`);
      }
    }
  }
}

const findings = [];

await verifyServiceShape(findings);
await verifyServiceRuntimePurity(findings);
await verifyHostPackage(findings);
await verifyRootProjectLists(findings);
await verifyVitestConfig(findings);
await verifyEslintRatchets(findings);
await verifyLegacyRemoval(findings);
await verifyPluginCutover(findings);
await verifyRoutingDocs(findings);

if (findings.length > 0) {
  console.error("verify-session-intelligence-structural failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("verify-session-intelligence-structural: OK");
