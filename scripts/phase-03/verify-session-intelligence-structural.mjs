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
const FORBIDDEN_HOST_VERB_NAMES = [
  "listSessions",
  "resolveSession",
  "extractSession",
  "searchSessionsByContent",
  "searchSessionsByMetadata",
  "reindexSessions",
  "getSearchTextCached",
];
const MODULE_OWNED_SCHEMA_EXPORTS = new Set([
  "OutputFormatSchema",
  "OutputFormat",
  "SessionFiltersSchema",
  "SessionFilters",
  "ResolveResultSchema",
  "ResolveResult",
  "ExtractOptionsSchema",
  "ExtractOptions",
  "ExtractedSessionSchema",
  "ExtractedSession",
  "SearchHitSchema",
  "SearchHit",
  "MetadataSearchHitSchema",
  "MetadataSearchHit",
  "ReindexResultSchema",
  "ReindexResult",
]);
const FORBIDDEN_SHARED_LOGIC_FILES = [
  `${SERVICE_ROOT}/src/service/shared/catalog-logic.ts`,
  `${SERVICE_ROOT}/src/service/shared/transcript-logic.ts`,
  `${SERVICE_ROOT}/src/service/shared/search-logic.ts`,
];
const FORBIDDEN_SHARED_LOGIC_IMPORTS = [
  "../../shared/catalog-logic",
  "../../shared/transcript-logic",
  "../../shared/search-logic",
];
const FORBIDDEN_PLUGIN_DATABASE_QUERY_PATTERN = /\bdb\.query\s*\(\s*(?:`[^`]*(?:CREATE|SELECT|INSERT|UPDATE|DELETE)\b|["'][^"']*(?:CREATE|SELECT|INSERT|UPDATE|DELETE)\b)/iu;
const FORBIDDEN_PLUGIN_DATABASE_SEMANTIC_TOKENS = [
  "session_cache",
  "codex_file_index",
  "codex_root_scan_state",
  "tryOpenSqliteDb",
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
        findings.push(`${relPath} references ${label}; keep concrete runtime access in plugin/app/runtime resource providers`);
      }
    }
  }
}

async function verifyNoHostPackage(findings) {
  if (await pathExists(HOST_ROOT)) {
    findings.push(`${HOST_ROOT} must not exist; service-specific host packages are forbidden`);
  }

  const hostImports = await collectImportSites(["@rawr/session-intelligence-host"]);
  for (const site of hostImports) {
    findings.push(`forbidden @rawr/session-intelligence-host import remains: ${site}`);
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
  if (allDeps["@rawr/session-intelligence-host"]) {
    findings.push("@rawr/plugin-session-tools must not depend on @rawr/session-intelligence-host");
  }
  if (!allDeps["@rawr/session-intelligence"]) {
    findings.push("@rawr/plugin-session-tools must depend on @rawr/session-intelligence");
  }

  const clientSource = await readFileIfExists(`${PLUGIN_ROOT}/src/lib/session-intelligence-client.ts`, findings, undefined, false);
  if (clientSource) {
    for (const forbidden of ["@rawr/session-intelligence-host", "createNodeSessionIntelligenceBoundary", "RawHostModule"]) {
      if (clientSource.includes(forbidden)) findings.push(`${PLUGIN_ROOT}/src/lib/session-intelligence-client.ts must not reference ${forbidden}`);
    }
    for (const required of ["@rawr/session-intelligence/client", "CreateClientOptions", "satisfies CreateClientOptions"]) {
      if (!clientSource.includes(required)) findings.push(`${PLUGIN_ROOT}/src/lib/session-intelligence-client.ts must statically bind ${required}`);
    }
  }

  const libFiles = [];
  await walkSourceFiles(`${PLUGIN_ROOT}/src/lib`, libFiles);
  for (const relPath of libFiles.sort()) {
    const source = await readFile(relPath);
    if (relPath.endsWith("/session-types.ts")) continue;
    for (const forbidden of FORBIDDEN_HOST_VERB_NAMES) {
      const exportPattern = new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function|const)\\s+${forbidden}\\b`, "u");
      if (exportPattern.test(source)) {
        findings.push(`${relPath} exports forbidden service-level verb ${forbidden}`);
      }
    }
  }
}

async function verifyPluginDoesNotOwnDatabaseSemantics(findings) {
  const files = [];
  await walkSourceFiles(`${PLUGIN_ROOT}/src`, files);

  for (const relPath of files.sort()) {
    const source = await readFile(relPath);
    if (FORBIDDEN_PLUGIN_DATABASE_QUERY_PATTERN.test(source)) {
      findings.push(`${relPath} must not run direct SQL statements that implement session catalog/search/index behavior`);
    }
    for (const token of FORBIDDEN_PLUGIN_DATABASE_SEMANTIC_TOKENS) {
      if (source.includes(token)) {
        findings.push(`${relPath} must not own session database/index semantic token ${token}`);
      }
    }
  }
}

async function verifyModuleSchemaOwnership(findings) {
  const sharedSchemasPath = `${SERVICE_ROOT}/src/service/shared/schemas.ts`;
  const sharedSchemasSource = await readFileIfExists(sharedSchemasPath, findings, sharedSchemasPath, false);
  if (sharedSchemasSource) {
    for (const schemaName of MODULE_OWNED_SCHEMA_EXPORTS) {
      const exportPattern = new RegExp(`\\bexport\\s+(?:const|type)\\s+${schemaName}\\b`, "u");
      if (exportPattern.test(sharedSchemasSource)) {
        findings.push(`${sharedSchemasPath} must not export module-owned schema ${schemaName}`);
      }
    }
  }

  for (const moduleName of SERVICE_MODULES) {
    const relPath = `${SERVICE_ROOT}/src/service/modules/${moduleName}/schemas.ts`;
    const source = await readFileIfExists(relPath, findings, relPath, false);
    if (!source) continue;
    const withoutWhitespace = source.replace(/\s+/g, "");
    if (withoutWhitespace.startsWith("export{") && source.includes("../../shared/schemas")) {
      findings.push(`${relPath} must own module schemas instead of pure re-exporting shared schemas`);
    }
    if (source.includes("../../shared/schemas") && !/\bexport\s+const\s+\w+Schema\s*=\s*Type\./u.test(source)) {
      findings.push(`${relPath} must define module-owned schemas instead of acting as a shared schema re-export shell`);
    }

    const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      if (statement.moduleSpecifier.text !== "../../shared/schemas") continue;
      const namedBindings = statement.importClause?.namedBindings;
      if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;
      for (const element of namedBindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (MODULE_OWNED_SCHEMA_EXPORTS.has(importedName)) {
          findings.push(`${relPath} must define ${importedName} locally instead of importing it from shared schemas`);
        }
      }
    }
  }
}

async function verifyNoSameDomainSharedLogicDelegation(findings) {
  for (const relPath of FORBIDDEN_SHARED_LOGIC_FILES) {
    if (await pathExists(relPath)) {
      findings.push(`${relPath} must not exist; move same-domain service logic into its owning module`);
    }
  }

  for (const moduleName of SERVICE_MODULES) {
    const relPath = `${SERVICE_ROOT}/src/service/modules/${moduleName}/repository.ts`;
    const source = await readFileIfExists(relPath, findings, relPath, false);
    if (!source) continue;
    const specifiers = collectModuleSpecifiers(relPath, source);
    for (const forbidden of FORBIDDEN_SHARED_LOGIC_IMPORTS) {
      if (specifiers.includes(forbidden)) {
        findings.push(`${relPath} must not delegate same-domain behavior to ${forbidden}`);
      }
    }
  }
}

const findings = [];

await verifyServiceShape(findings);
await verifyServiceRuntimePurity(findings);
await verifyNoHostPackage(findings);
await verifyLegacyRemoval(findings);
await verifyPluginCutover(findings);
await verifyPluginDoesNotOwnDatabaseSemantics(findings);
await verifyModuleSchemaOwnership(findings);
await verifyNoSameDomainSharedLogicDelegation(findings);

if (findings.length > 0) {
  console.error("verify-session-intelligence-structural failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("verify-session-intelligence-structural: OK");
